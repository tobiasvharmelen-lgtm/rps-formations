import { PlayerId, PlayerInput, GamePhase, InputType, LobbyChoice, MapType, GameConfig } from "shared";
import { MsgType } from "shared";
import { TICK_MS, MAP_WIDTH, MAP_HEIGHT, LOBBY_COLORS } from "shared";
import { Connection } from "../net/Connection.js";
import { GameSimulation } from "./GameSimulation.js";

const MAX_INPUTS_PER_TICK = 10;

const defaultLobbyChoice = (): LobbyChoice => ({
  colorIndex: 0,
  incomeMultiplier: 1,
  mapType: MapType.Cylinder,
  ready: false,
});

export class GameRoom {
  readonly id: string;
  private sim: GameSimulation;
  private connections = new Map<PlayerId, Connection>();
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private expectedNextTick = 0;
  private inputsThisTick = new Map<PlayerId, number>();
  private lobbyChoices = new Map<PlayerId, LobbyChoice>([
    [PlayerId.One, defaultLobbyChoice()],
    [PlayerId.Two, { ...defaultLobbyChoice(), colorIndex: 1 }],
  ]);
  onEnd?: () => void;

  constructor(id: string, p1: Connection, p2: Connection) {
    this.id = id;
    this.sim = new GameSimulation();

    this.addPlayer(p1, PlayerId.One);
    this.addPlayer(p2, PlayerId.Two);

    // Broadcast initial lobby state to both players
    this.broadcastLobbyState();
  }

  private addPlayer(conn: Connection, playerId: PlayerId): void {
    conn.playerId = playerId;
    conn.roomId = this.id;
    this.connections.set(playerId, conn);

    conn.send({
      type: MsgType.S_MATCH_FOUND,
      roomId: this.id,
    });
  }

  handleLobbyUpdate(playerId: PlayerId, choice: Partial<LobbyChoice>): void {
    const current = this.lobbyChoices.get(playerId)!;
    this.lobbyChoices.set(playerId, { ...current, ...choice, ready: false });
    this.broadcastLobbyState();
  }

  handleLobbyReady(playerId: PlayerId): void {
    const current = this.lobbyChoices.get(playerId)!;
    this.lobbyChoices.set(playerId, { ...current, ready: true });
    this.broadcastLobbyState();

    const p1 = this.lobbyChoices.get(PlayerId.One)!;
    const p2 = this.lobbyChoices.get(PlayerId.Two)!;
    if (p1.ready && p2.ready) {
      const config: GameConfig = {
        mapType: p1.mapType,
        incomeMultiplier: p1.incomeMultiplier,
        p1Color: LOBBY_COLORS[p1.colorIndex]?.hex ?? LOBBY_COLORS[0].hex,
        p2Color: LOBBY_COLORS[p2.colorIndex]?.hex ?? LOBBY_COLORS[1].hex,
      };
      this.startWithConfig(config);
    }
  }

  private broadcastLobbyState(): void {
    const p1 = this.lobbyChoices.get(PlayerId.One)!;
    const p2 = this.lobbyChoices.get(PlayerId.Two)!;
    for (const conn of this.connections.values()) {
      conn.send({ type: MsgType.S_LOBBY_STATE, p1, p2 });
    }
  }

  private startWithConfig(config: GameConfig): void {
    this.sim = new GameSimulation(config);
    this.sim.start();
    this.broadcastState();

    this.expectedNextTick = Date.now() + TICK_MS;
    this.tickInterval = setInterval(() => this.runTick(), TICK_MS);
  }

  start(): void {
    this.sim.start();
    this.broadcastState();

    this.expectedNextTick = Date.now() + TICK_MS;
    this.tickInterval = setInterval(() => this.runTick(), TICK_MS);
  }

  private runTick(): void {
    // Reset per-tick input counters
    this.inputsThisTick.clear();

    const inputs = new Map<PlayerId, PlayerInput[]>();

    for (const [playerId, conn] of this.connections) {
      inputs.set(playerId, conn.drainInputs());
    }

    this.sim.tick(inputs);
    this.broadcastState();

    if (this.sim.state.phase === GamePhase.Ended) {
      this.end();
    }
  }

  private broadcastState(): void {
    const msg = {
      type: MsgType.S_GAME_STATE as const,
      tick: this.sim.state.tick,
      state: this.sim.state,
      lastAckedInput: 0,
    };

    for (const [playerId, conn] of this.connections) {
      conn.send({ ...msg, lastAckedInput: conn.lastAcked });
    }
  }

  handleInput(playerId: PlayerId, input: PlayerInput): void {
    const conn = this.connections.get(playerId);
    if (!conn) return;

    // Rate limit
    const count = this.inputsThisTick.get(playerId) ?? 0;
    if (count >= MAX_INPUTS_PER_TICK) return;
    this.inputsThisTick.set(playerId, count + 1);

    // Bounds check on move destinations
    if (!this.validateBounds(input)) return;

    // Ownership check
    if (!this.validateOwnership(playerId, input)) return;

    conn.enqueueInput(input);
    conn.send({ type: MsgType.S_INPUT_ACK, seq: input.seq });
  }

  private validateBounds(input: PlayerInput): boolean {
    if (input.destX !== undefined && (input.destX < 0 || input.destX > MAP_WIDTH)) return false;
    if (input.destY !== undefined && (input.destY < 0 || input.destY > MAP_HEIGHT)) return false;
    return true;
  }

  private validateOwnership(playerId: PlayerId, input: PlayerInput): boolean {
    const state = this.sim.state;

    if (input.type === InputType.MoveUnits && input.unitIds) {
      for (const uid of input.unitIds) {
        const u = state.units.find(u => u.id === uid);
        if (u && u.owner !== playerId) return false;
      }
    }

    if (input.type === InputType.MergeUnits && input.mergeUnitIds) {
      for (const uid of input.mergeUnitIds) {
        const u = state.units.find(u => u.id === uid);
        if (u && u.owner !== playerId) return false;
      }
    }

    return true;
  }

  handleDisconnect(playerId: PlayerId): void {
    // Connection dropped — keep room alive for reconnect window (SessionStore TTL)
    this.connections.delete(playerId);
  }

  reconnectPlayer(conn: Connection, playerId: PlayerId): void {
    conn.playerId = playerId;
    conn.roomId = this.id;
    this.connections.set(playerId, conn);

    // Send full state immediately
    conn.send({
      type: MsgType.S_GAME_STATE,
      tick: this.sim.state.tick,
      state: this.sim.state,
      lastAckedInput: 0,
    });
  }

  private end(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    for (const conn of this.connections.values()) {
      conn.send({ type: MsgType.S_GAME_OVER, winnerId: this.sim.state.winnerId });
    }

    this.onEnd?.();
  }

  getState() {
    return this.sim.state;
  }
}
