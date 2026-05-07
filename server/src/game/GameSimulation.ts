import {
  GameState, GamePhase, PlayerId, PlayerInput, InputType,
  UnitType, Tier, Unit, ZoneType, BuildingType,
  UNIT_HP, UNIT_RADIUS, STARTING_RESOURCES, BASE_HP,
  ZONE_RADIUS, MAP_WIDTH, MAP_HEIGHT, SPAWN_COST_T1, getStat,
  MERGE_COUNT, MERGE_RADIUS, BUILDING_STATS,
} from "shared";
import { SpatialHash } from "./SpatialHash.js";
import { tickEconomy } from "./systems/EconomySystem.js";
import { tickMovement } from "./systems/MovementSystem.js";
import { tickCombat } from "./systems/CombatSystem.js";
import { tickMerge } from "./systems/MergeSystem.js";
import { tickZones } from "./systems/ZoneSystem.js";
import { tickBuildings } from "./systems/BuildingSystem.js";
import { tickTerrain } from "./systems/TerrainSystem.js";
import { checkWin, resetWinState } from "./systems/WinCondition.js";

let nextUnitId = 1;
let nextMergedUnitId = 200_000;

/** Places unit slotIndex into a concentric-ring formation around the destination.
 *  Guarantees slot spacing >= unitRadius*2.5 so units can settle without oscillating. */
function formationSlot(slotIndex: number, unitRadius: number): { dx: number; dy: number } {
  if (slotIndex === 0) return { dx: 0, dy: 0 };
  const spacing = unitRadius * 3.5;
  let ring = 1, accumulated = 1;
  while (true) {
    const slotsInRing = Math.floor(2 * Math.PI * ring);
    if (slotIndex < accumulated + slotsInRing) {
      const posInRing = slotIndex - accumulated;
      const angle = (posInRing / slotsInRing) * 2 * Math.PI;
      return { dx: Math.cos(angle) * spacing * ring, dy: Math.sin(angle) * spacing * ring };
    }
    accumulated += slotsInRing;
    ring++;
  }
}

function makeInitialState(): GameState {
  return {
    tick: 0,
    phase: GamePhase.WaitingForPlayers,
    countdown: 0,
    players: [
      { id: PlayerId.One, resources: STARTING_RESOURCES },
      { id: PlayerId.Two, resources: STARTING_RESOURCES },
    ],
    units: [],
    bases: [
      { owner: PlayerId.One, x: 6_000,           y: MAP_HEIGHT / 2, hp: BASE_HP, maxHp: BASE_HP, attackCooldown: 0 },
      { owner: PlayerId.Two, x: 60_000,          y: MAP_HEIGHT / 2, hp: BASE_HP, maxHp: BASE_HP, attackCooldown: 0 },
    ],
    zones: [
      { type: ZoneType.LeftTop,    x: 30_000,      y: 2_500,                  radius: ZONE_RADIUS, owner: 0, captureProgress: 0 },
      { type: ZoneType.LeftBottom, x: 30_000,      y: MAP_HEIGHT - 2_500,     radius: ZONE_RADIUS, owner: 0, captureProgress: 0 },
      { type: ZoneType.RightTop,   x: 90_000,      y: 2_500,                  radius: ZONE_RADIUS, owner: 0, captureProgress: 0 },
      { type: ZoneType.RightBottom,x: 90_000,      y: MAP_HEIGHT - 2_500,     radius: ZONE_RADIUS, owner: 0, captureProgress: 0 },
    ],
    winnerId: 0,
    mergeEvents: [],
    buildings: [
      { id: nextMergedUnitId++, owner: PlayerId.Neutral, type: BuildingType.SwapTower, x: 30_000, y: 2_500,              hp: 99_999, maxHp: 99_999, setType: UnitType.Rock, conversionRadius: BUILDING_STATS[BuildingType.SwapTower].conversionRadius },
      { id: nextMergedUnitId++, owner: PlayerId.Neutral, type: BuildingType.SwapTower, x: 30_000, y: MAP_HEIGHT - 2_500, hp: 99_999, maxHp: 99_999, setType: UnitType.Rock, conversionRadius: BUILDING_STATS[BuildingType.SwapTower].conversionRadius },
      { id: nextMergedUnitId++, owner: PlayerId.Neutral, type: BuildingType.SwapTower, x: 90_000, y: 2_500,              hp: 99_999, maxHp: 99_999, setType: UnitType.Rock, conversionRadius: BUILDING_STATS[BuildingType.SwapTower].conversionRadius },
      { id: nextMergedUnitId++, owner: PlayerId.Neutral, type: BuildingType.SwapTower, x: 90_000, y: MAP_HEIGHT - 2_500, hp: 99_999, maxHp: 99_999, setType: UnitType.Rock, conversionRadius: BUILDING_STATS[BuildingType.SwapTower].conversionRadius },
    ],
    terrain: [],
    gatesOpen: [false, false], // both gates start closed
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

    for (const [playerId, playerInputs] of inputs) {
      for (const input of playerInputs) {
        this.applyInput(playerId, input);
      }
    }

    this.spatialHash.clear();
    for (const u of this.state.units) this.spatialHash.insert(u.id, u.x, u.y);

    tickEconomy(this.state);
    tickMovement(this.state, this.spatialHash);

    this.spatialHash.clear();
    for (const u of this.state.units) this.spatialHash.insert(u.id, u.x, u.y);

    tickTerrain(this.state, this.spatialHash);
    tickBuildings(this.state, this.spatialHash);
    tickCombat(this.state, this.spatialHash);
    tickMerge(this.state);
    tickZones(this.state);
    checkWin(this.state);

    this.state.tick++;
  }

  applyInput(playerId: PlayerId, input: PlayerInput): void {
    switch (input.type) {
      case InputType.SpawnUnit:     this.spawnUnit(playerId, input);     break;
      case InputType.MoveUnits:     this.moveUnits(playerId, input);     break;
      case InputType.MergeUnits:    this.mergeUnits(playerId, input);    break;
      case InputType.PlaceBuilding: this.placeBuilding(playerId, input); break;
      case InputType.SetTowerType:  this.setTowerType(playerId, input);  break;
    }
  }

  private spawnUnit(playerId: PlayerId, input: PlayerInput): void {
    const type = input.spawnType ?? UnitType.Rock;
    const playerState = this.state.players[playerId - 1];

    if (playerState.resources < SPAWN_COST_T1) return;
    playerState.resources -= SPAWN_COST_T1;

    const base   = this.state.bases[playerId - 1];
    const jitter = () => (Math.random() - 0.5) * 400;
    const hp     = getStat(UNIT_HP, type, Tier.Small);
    const sx     = base.x + jitter();
    const sy     = base.y + jitter();

    this.state.units.push({
      id: nextUnitId++,
      owner: playerId,
      type,
      tier: Tier.Small,
      hp,
      maxHp: hp,
      x: sx,
      y: sy,
      vx: 0,
      vy: 0,
      targetX: sx,
      targetY: sy,
      attackCooldown: 0,
      targetId: 0,
      slowed: false,
    });
  }

  private moveUnits(playerId: PlayerId, input: PlayerInput): void {
    const ids   = input.unitIds ?? [];
    const destX = input.destX  ?? 0;
    const destY = input.destY  ?? 0;

    const units: Unit[] = [];
    for (const id of ids) {
      const u = this.state.units.find(u => u.id === id && u.owner === playerId);
      if (u) units.push(u);
    }

    const maxRadius = units.reduce(
      (m, u) => Math.max(m, getStat(UNIT_RADIUS, u.type, u.tier)), 80
    );

    for (let i = 0; i < units.length; i++) {
      const u   = units[i];
      const off = formationSlot(i, maxRadius);
      u.targetX = Math.max(0, Math.min(MAP_WIDTH,  destX + off.dx));
      u.targetY = Math.max(0, Math.min(MAP_HEIGHT, destY + off.dy));
    }
  }

  private mergeUnits(playerId: PlayerId, input: PlayerInput): void {
    const ids = input.mergeUnitIds;
    if (!ids || ids.length < MERGE_COUNT) return;

    const unitMap    = new Map(this.state.units.map(u => [u.id, u]));
    const candidates = ids.map(id => unitMap.get(id)).filter(Boolean) as Unit[];
    if (candidates.length < MERGE_COUNT) return;

    const seed = candidates[0];
    if (seed.tier === Tier.Large) return;
    if (!candidates.every(u => u.type === seed.type && u.tier === seed.tier && u.owner === playerId)) return;

    const mergeGroup = candidates.slice(0, MERGE_COUNT);
    const cx = mergeGroup.reduce((s, u) => s + u.x, 0) / MERGE_COUNT;
    const cy = mergeGroup.reduce((s, u) => s + u.y, 0) / MERGE_COUNT;

    const withinRange = mergeGroup.every(u => {
      const dx = u.x - cx;
      const dy = u.y - cy;
      return dx * dx + dy * dy <= MERGE_RADIUS * MERGE_RADIUS;
    });
    if (!withinRange) return;

    const toRemove = new Set(mergeGroup.map(u => u.id));
    this.state.units = this.state.units.filter(u => !toRemove.has(u.id));
    this.state.mergeEvents.push({ x: cx, y: cy });

    const newTier = (seed.tier + 1) as Tier;
    const newHp   = getStat(UNIT_HP, seed.type, newTier);
    this.state.units.push({
      id: nextMergedUnitId++,
      owner: playerId,
      type: seed.type,
      tier: newTier,
      hp: newHp,
      maxHp: newHp,
      x: cx,
      y: cy,
      vx: 0,
      vy: 0,
      targetX: cx,
      targetY: cy,
      attackCooldown: 0,
      targetId: 0,
      slowed: false,
    });
  }

  private placeBuilding(playerId: PlayerId, input: PlayerInput): void {
    const bType = input.buildingType;
    if (bType === undefined) return;
    const x = input.destX ?? 0;
    const y = input.destY ?? 0;
    const player = this.state.players[playerId - 1];
    const stats = BUILDING_STATS[bType];
    if (player.resources < stats.cost) return;

    player.resources -= stats.cost;
    this.state.buildings.push({
      id: nextMergedUnitId++,
      owner: playerId,
      type: bType,
      x,
      y,
      hp: stats.hp,
      maxHp: stats.hp,
      setType: bType === BuildingType.SwapTower ? UnitType.Rock : undefined,
      conversionRadius: stats.conversionRadius,
    });
  }

  private setTowerType(playerId: PlayerId, input: PlayerInput): void {
    const bid = input.buildingId;
    const utype = input.unitType;
    if (bid === undefined || utype === undefined) return;
    const building = this.state.buildings.find(b => b.id === bid && b.owner === playerId && b.type === BuildingType.SwapTower);
    if (building) building.setType = utype;
  }
}
