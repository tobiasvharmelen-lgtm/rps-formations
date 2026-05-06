import {
  GameState, GamePhase, PlayerId, PlayerInput, InputType,
  UnitType, Tier, Formation, FormationShape, Unit, ZoneType,
  UNIT_HP, UNIT_RADIUS, STARTING_RESOURCES, BASE_HP,
  ZONE_RADIUS, MAP_WIDTH, MAP_HEIGHT, SPAWN_COST_T1, getStat,
} from "shared";
import { SpatialHash } from "./SpatialHash.js";
import { tickEconomy } from "./systems/EconomySystem.js";
import { tickFormations } from "./systems/FormationSystem.js";
import { tickMovement } from "./systems/MovementSystem.js";
import { tickCombat } from "./systems/CombatSystem.js";
import { tickMerge } from "./systems/MergeSystem.js";
import { tickZones } from "./systems/ZoneSystem.js";
import { checkWin, resetWinState } from "./systems/WinCondition.js";

let nextUnitId = 1;
let nextFormationId = 1;

function shapeForType(type: UnitType): FormationShape {
  return type as unknown as FormationShape; // enum values are identical
}

function makeInitialState(): GameState {
  return {
    tick: 0,
    phase: GamePhase.WaitingForPlayers,
    countdown: 0,
    players: [
      { id: PlayerId.One, resources: [STARTING_RESOURCES, STARTING_RESOURCES, STARTING_RESOURCES] },
      { id: PlayerId.Two, resources: [STARTING_RESOURCES, STARTING_RESOURCES, STARTING_RESOURCES] },
    ],
    units: [],
    formations: [],
    bases: [
      { owner: PlayerId.One, x: 2_000, y: MAP_HEIGHT / 2, hp: BASE_HP, maxHp: BASE_HP, attackCooldown: 0 },
      { owner: PlayerId.Two, x: MAP_WIDTH - 2_000, y: MAP_HEIGHT / 2, hp: BASE_HP, maxHp: BASE_HP, attackCooldown: 0 },
    ],
    zones: [
      { type: ZoneType.Circle,   x: MAP_WIDTH / 2, y: MAP_HEIGHT / 4,     radius: ZONE_RADIUS, owner: 0, captureProgress: 0 },
      { type: ZoneType.Square,   x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2,     radius: ZONE_RADIUS, owner: 0, captureProgress: 0 },
      { type: ZoneType.Triangle, x: MAP_WIDTH / 2, y: (MAP_HEIGHT * 3) / 4, radius: ZONE_RADIUS, owner: 0, captureProgress: 0 },
    ],
    winnerId: 0,
    mergeEvents: [],
  };
}

export class GameSimulation {
  state: GameState;
  private spatialHash = new SpatialHash(600);

  constructor() {
    this.state = makeInitialState();
    resetWinState();
  }

  start(): void {
    this.state.phase = GamePhase.Active;
  }

  tick(inputs: Map<PlayerId, PlayerInput[]>): void {
    if (this.state.phase !== GamePhase.Active) return;

    // Apply all queued player inputs
    for (const [playerId, playerInputs] of inputs) {
      for (const input of playerInputs) {
        this.applyInput(playerId, input);
      }
    }

    // Rebuild spatial hash from current unit positions
    this.spatialHash.clear();
    for (const u of this.state.units) {
      this.spatialHash.insert(u.id, u.x, u.y);
    }

    // Run systems in fixed order
    tickEconomy(this.state);
    tickFormations(this.state);
    tickMovement(this.state, this.spatialHash);

    // Rebuild spatial hash after movement for combat queries
    this.spatialHash.clear();
    for (const u of this.state.units) {
      this.spatialHash.insert(u.id, u.x, u.y);
    }

    tickCombat(this.state, this.spatialHash);
    tickMerge(this.state, this.spatialHash);
    tickZones(this.state);
    checkWin(this.state);

    this.state.tick++;
  }

  applyInput(playerId: PlayerId, input: PlayerInput): void {
    switch (input.type) {
      case InputType.SpawnUnit:
        this.spawnUnit(playerId, input);
        break;
      case InputType.CreateFormation:
        this.createFormation(playerId, input);
        break;
      case InputType.MoveFormation:
        this.moveFormation(playerId, input);
        break;
      case InputType.MergeUnits:
        this.mergeUnits(playerId, input);
        break;
    }
  }

  private spawnUnit(playerId: PlayerId, input: PlayerInput): void {
    const type = input.spawnType ?? UnitType.Rock;
    const playerState = this.state.players[playerId - 1];

    if (playerState.resources[type] < SPAWN_COST_T1) return;
    playerState.resources[type] -= SPAWN_COST_T1;

    const base = this.state.bases[playerId - 1];
    const jitter = () => (Math.random() - 0.5) * 400;
    const hp = getStat(UNIT_HP, type, Tier.Small);

    const unit: Unit = {
      id: nextUnitId++,
      owner: playerId,
      type,
      tier: Tier.Small,
      hp,
      maxHp: hp,
      x: base.x + jitter(),
      y: base.y + jitter(),
      vx: 0,
      vy: 0,
      formationId: 0,
      slotIndex: 0,
      attackCooldown: 0,
      targetId: 0,
    };

    this.state.units.push(unit);
  }

  private createFormation(playerId: PlayerId, input: PlayerInput): void {
    const unitIds = input.unitIds ?? [];
    const type = input.unitType ?? UnitType.Rock;
    if (unitIds.length === 0) return;

    // Validate ownership
    const ownedIds = unitIds.filter(id => {
      const u = this.state.units.find(u => u.id === id);
      return u && u.owner === playerId && u.type === type;
    });
    if (ownedIds.length === 0) return;

    // Remove units from existing formations
    for (const f of this.state.formations) {
      f.unitIds = f.unitIds.filter(id => !ownedIds.includes(id));
    }
    this.state.formations = this.state.formations.filter(f => f.unitIds.length > 0);

    const anchorUnit = this.state.units.find(u => u.id === ownedIds[0])!;
    const tier = anchorUnit.tier;

    const formation: Formation = {
      id: nextFormationId++,
      owner: playerId,
      type,
      tier,
      shape: shapeForType(type),
      anchorX: anchorUnit.x,
      anchorY: anchorUnit.y,
      facing: playerId === PlayerId.One ? 0 : Math.PI,
      unitIds: ownedIds,
      moving: false,
      destX: anchorUnit.x,
      destY: anchorUnit.y,
    };

    this.state.formations.push(formation);

    for (const id of ownedIds) {
      const u = this.state.units.find(u => u.id === id)!;
      u.formationId = formation.id;
    }
  }

  private moveFormation(playerId: PlayerId, input: PlayerInput): void {
    const f = this.state.formations.find(f => f.id === input.formationId && f.owner === playerId);
    if (!f || input.destX === undefined || input.destY === undefined) return;

    f.destX = Math.max(0, Math.min(MAP_WIDTH, input.destX));
    f.destY = Math.max(0, Math.min(MAP_HEIGHT, input.destY));
    f.moving = true;
  }

  private mergeUnits(playerId: PlayerId, input: PlayerInput): void {
    // Manual merge triggered by player — MergeSystem handles auto-merge each tick.
    // This input is a hint; the system will handle it next tick automatically.
  }
}
