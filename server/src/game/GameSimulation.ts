import {
  GameState, GamePhase, PlayerId, PlayerInput, InputType,
  UnitType, Tier, Unit, ZoneType, BuildingType, MapType, GameConfig,
  UNIT_HP, UNIT_RADIUS, STARTING_RESOURCES, BASE_HP,
  ZONE_RADIUS, MAP_WIDTH, MAP_HEIGHT, SPAWN_COST_T1, getStat,
  MERGE_COUNT, MERGE_RADIUS, BUILDING_STATS,
  GATE_X_LEFT, GATE_X_RIGHT, GATE_RADIUS, GATE_UNIT_COST, MIDDLE_BARRIER_Y,
  BUILDING_UPGRADE_COSTS, BUILDING_UPGRADE_RADII, BASE_CAPTURE_TICKS,
  LOBBY_COLORS,
} from "shared";
import { SpatialHash } from "./SpatialHash.js";
import { tickEconomy } from "./systems/EconomySystem.js";
import { tickMovement } from "./systems/MovementSystem.js";
import { tickCombat } from "./systems/CombatSystem.js";
import { tickMerge } from "./systems/MergeSystem.js";
import { tickZones } from "./systems/ZoneSystem.js";
import { tickBuildings } from "./systems/BuildingSystem.js";
import { tickTerrain } from "./systems/TerrainSystem.js";
import { tickGates } from "./systems/GateSystem.js";
import { checkWin, resetWinState } from "./systems/WinCondition.js";

let nextUnitId = 1;
let nextMergedUnitId = 200_000;

/** Places unit slotIndex into a concentric-ring formation around the destination. */
function formationSlot(slotIndex: number, unitRadius: number): { dx: number; dy: number } {
  if (slotIndex === 0) return { dx: 0, dy: 0 };
  const spacing = unitRadius * 2.5;
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

function makeCylinderState(config: GameConfig): GameState {
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
      { owner: PlayerId.One, x: 0,            y: MAP_HEIGHT / 2, hp: BASE_HP, maxHp: BASE_HP, attackCooldown: 0, captureProgress: 0 },
      { owner: PlayerId.Two, x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2, hp: BASE_HP, maxHp: BASE_HP, attackCooldown: 0, captureProgress: 0 },
    ],
    zones: [
      { type: ZoneType.LeftTop,    x:  45_000, y:  6_000,              radius: ZONE_RADIUS, owner: 0, captureProgress: 0 },
      { type: ZoneType.LeftBottom, x:  45_000, y: MAP_HEIGHT - 6_000,  radius: ZONE_RADIUS, owner: 0, captureProgress: 0 },
      { type: ZoneType.RightTop,   x: 135_000, y:  6_000,              radius: ZONE_RADIUS, owner: 0, captureProgress: 0 },
      { type: ZoneType.RightBottom,x: 135_000, y: MAP_HEIGHT - 6_000,  radius: ZONE_RADIUS, owner: 0, captureProgress: 0 },
    ],
    winnerId: 0,
    mergeEvents: [],
    buildings: [],
    terrain: [],
    gates: [
      { id: nextMergedUnitId++, x: GATE_X_LEFT,  y: MIDDLE_BARRIER_Y, p1Units: 0, p2Units: 0, p1Open: false, p2Open: false },
      { id: nextMergedUnitId++, x: GATE_X_RIGHT, y: MIDDLE_BARRIER_Y, p1Units: 0, p2Units: 0, p1Open: false, p2Open: false },
    ],
    mapType:          MapType.Cylinder,
    incomeMultiplier: config.incomeMultiplier ?? 1,
    p1Color:          config.p1Color ?? LOBBY_COLORS[0].hex,
    p2Color:          config.p2Color ?? LOBBY_COLORS[1].hex,
  };
}

function makeRectangularState(config: GameConfig): GameState {
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
      { owner: PlayerId.One, x:  9_000,            y: MAP_HEIGHT / 2, hp: BASE_HP, maxHp: BASE_HP, attackCooldown: 0, captureProgress: 0 },
      { owner: PlayerId.Two, x: MAP_WIDTH - 9_000,  y: MAP_HEIGHT / 2, hp: BASE_HP, maxHp: BASE_HP, attackCooldown: 0, captureProgress: 0 },
    ],
    zones: [
      // Top lane
      { type: ZoneType.LeftTop,    x:  45_000, y:  4_000, radius: ZONE_RADIUS, owner: 0, captureProgress: 0 },
      { type: ZoneType.RightTop,   x: 135_000, y:  4_000, radius: ZONE_RADIUS, owner: 0, captureProgress: 0 },
      // Middle lane
      { type: ZoneType.Mid1,       x:  50_000, y: 12_000, radius: ZONE_RADIUS, owner: 0, captureProgress: 0 },
      { type: ZoneType.Mid2,       x: 130_000, y: 12_000, radius: ZONE_RADIUS, owner: 0, captureProgress: 0 },
      // Bottom lane
      { type: ZoneType.LeftBottom, x:  45_000, y: 20_000, radius: ZONE_RADIUS, owner: 0, captureProgress: 0 },
      { type: ZoneType.RightBottom,x: 135_000, y: 20_000, radius: ZONE_RADIUS, owner: 0, captureProgress: 0 },
    ],
    winnerId: 0,
    mergeEvents: [],
    buildings: [],
    terrain: [],
    gates: [
      // Three gates in center vertical column connecting the 3 lanes
      { id: nextMergedUnitId++, x: 90_000, y:  6_000, p1Units: 0, p2Units: 0, p1Open: false, p2Open: false },
      { id: nextMergedUnitId++, x: 90_000, y: 12_000, p1Units: 0, p2Units: 0, p1Open: false, p2Open: false },
      { id: nextMergedUnitId++, x: 90_000, y: 18_000, p1Units: 0, p2Units: 0, p1Open: false, p2Open: false },
    ],
    mapType:          MapType.Rectangular,
    incomeMultiplier: config.incomeMultiplier ?? 1,
    p1Color:          config.p1Color ?? LOBBY_COLORS[0].hex,
    p2Color:          config.p2Color ?? LOBBY_COLORS[1].hex,
  };
}

function makeInitialState(config: GameConfig = {}): GameState {
  return config.mapType === MapType.Rectangular
    ? makeRectangularState(config)
    : makeCylinderState(config);
}

export class GameSimulation {
  state: GameState;
  private spatialHash = new SpatialHash(600);

  constructor(config: GameConfig = {}) {
    this.state = makeInitialState(config);
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
    tickGates(this.state);

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
      case InputType.SpawnUnit:       this.spawnUnit(playerId, input);       break;
      case InputType.MoveUnits:       this.moveUnits(playerId, input);       break;
      case InputType.MergeUnits:      this.mergeUnits(playerId, input);      break;
      case InputType.PlaceBuilding:   this.placeBuilding(playerId, input);   break;
      case InputType.SetTowerType:    this.setTowerType(playerId, input);    break;
      case InputType.SetZoneType:     this.setZoneType(playerId, input);     break;
      case InputType.UpgradeBuilding: this.upgradeBuilding(playerId, input); break;
      case InputType.ContributeGate:  this.contributeGate(playerId, input);  break;
      case InputType.CheatGold:       this.cheatGold(playerId);              break;
    }
  }

  private cheatGold(playerId: PlayerId): void {
    this.state.players[playerId - 1].resources += 1000;
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
      waypointQueue: [],
    });
  }

  private moveUnits(playerId: PlayerId, input: PlayerInput): void {
    const ids    = input.unitIds ?? [];
    const destX  = input.destX  ?? 0;
    const destY  = input.destY  ?? 0;
    const append = input.appendWaypoint === true;

    const units: Unit[] = [];
    for (const id of ids) {
      const u = this.state.units.find(u => u.id === id && u.owner === playerId);
      if (u) units.push(u);
    }

    // Sort big units first — they get inner ring slots, small units form outer rings
    units.sort((a, b) =>
      getStat(UNIT_RADIUS, b.type, b.tier) - getStat(UNIT_RADIUS, a.type, a.tier)
    );

    // Use max radius for all spacing calculations to prevent overlaps
    const maxR = units.length > 0
      ? Math.max(...units.map(u => getStat(UNIT_RADIUS, u.type, u.tier)))
      : 0;

    const n = units.length;
    for (let i = 0; i < n; i++) {
      const u = units[i];
      const r = getStat(UNIT_RADIUS, u.type, u.tier);
      const off = formationSlot(i, maxR);

      let wx = destX + off.dx;
      let wy = destY + off.dy;

      // Wall lineup: if formation slot is near a wall, spread units along the wall
      const margin = r * 1.5;
      if (wx < margin) {
        wx = margin;
        wy = destY + (i - (n - 1) / 2) * r * 2.5;
      } else if (wx > MAP_WIDTH - margin) {
        wx = MAP_WIDTH - margin;
        wy = destY + (i - (n - 1) / 2) * r * 2.5;
      }
      wy = Math.max(margin, Math.min(MAP_HEIGHT - margin, wy));

      // Player-issued move command clears aggro-pursuit flag
      u.isAggro = false;

      if (append) {
        if (!u.waypointQueue) u.waypointQueue = [];
        if (u.waypointQueue.length < 8) u.waypointQueue.push({ x: wx, y: wy });
      } else {
        u.waypointQueue = [];
        u.targetX = wx;
        u.targetY = wy;
      }
    }
  }

  private contributeGate(playerId: PlayerId, input: PlayerInput): void {
    const gateIndex = input.gateIndex;
    if (gateIndex === undefined || gateIndex < 0 || gateIndex >= this.state.gates.length) return;
    const gate = this.state.gates[gateIndex];
    const isP1 = playerId === PlayerId.One;
    if (isP1 && gate.p1Open) return;
    if (!isP1 && gate.p2Open) return;

    const ids = new Set(input.unitIds ?? []);
    const toRemove: number[] = [];
    for (const u of this.state.units) {
      if (u.owner !== playerId || !ids.has(u.id)) continue;
      toRemove.push(u.id);
      if (isP1) gate.p1Units++;
      else       gate.p2Units++;
    }
    if (toRemove.length > 0) {
      const removeSet = new Set(toRemove);
      this.state.units = this.state.units.filter(u => !removeSet.has(u.id));
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
      waypointQueue: [],
    });
  }

  private buildingAreasOverlap(x: number, y: number, radius: number, excludeId?: number): boolean {
    const wrap = this.state.mapType !== MapType.Rectangular;
    for (const b of this.state.buildings) {
      if (b.id === excludeId) continue;
      if (b.conversionRadius === 0) continue;
      const dx = wrappedDx(x, b.x, wrap);
      const dy = y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < radius + b.conversionRadius) return true;
    }
    return false;
  }

  private placeBuilding(playerId: PlayerId, input: PlayerInput): void {
    const bType = input.buildingType;
    if (bType === undefined) return;
    const x = input.destX ?? 0;
    const y = input.destY ?? 0;
    const player = this.state.players[playerId - 1];
    const stats = BUILDING_STATS[bType];
    if (player.resources < stats.cost) return;

    // Reject if new building area overlaps an existing one
    if (stats.conversionRadius > 0 && this.buildingAreasOverlap(x, y, stats.conversionRadius)) return;

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
      upgradeLevel: 0,
    });
  }

  private setTowerType(playerId: PlayerId, input: PlayerInput): void {
    const bid = input.buildingId;
    const utype = input.unitType;
    if (bid === undefined) return;
    const building = this.state.buildings.find(b => b.id === bid && b.owner === playerId && b.type === BuildingType.SwapTower);
    // utype === undefined means "off"
    if (building) building.setType = utype ?? null;
  }

  private setZoneType(playerId: PlayerId, input: PlayerInput): void {
    const idx = input.zoneIndex;
    if (idx === undefined) return;
    const zone = this.state.zones[idx];
    if (!zone) return;
    // Only the owner can set the zone type
    const ownerPlayer = zone.owner === 1 ? PlayerId.One : zone.owner === 2 ? PlayerId.Two : null;
    if (ownerPlayer !== playerId) return;
    zone.setType = input.unitType ?? null;
  }

  private upgradeBuilding(playerId: PlayerId, input: PlayerInput): void {
    const bid = input.buildingId;
    if (bid === undefined) return;
    const building = this.state.buildings.find(b => b.id === bid && b.owner === playerId);
    if (!building) return;
    if (building.type === BuildingType.Refinery) return;
    if (building.upgradeLevel >= 3) return;

    const cost = BUILDING_UPGRADE_COSTS[building.upgradeLevel];
    const newRadius = BUILDING_UPGRADE_RADII[building.type as BuildingType.SwapTower | BuildingType.MirrorGate][building.upgradeLevel + 1];

    // Reject if upgraded radius would overlap another building
    if (this.buildingAreasOverlap(building.x, building.y, newRadius, building.id)) return;

    // Find the N nearest friendly units within 15,000mm
    const UPGRADE_SEARCH_RADIUS = 15_000;
    const candidates = this.state.units
      .filter(u => u.owner === playerId)
      .map(u => {
        const dx = wrappedDx(u.x, building.x);
        const dy = u.y - building.y;
        return { u, dist2: dx * dx + dy * dy };
      })
      .filter(({ dist2 }) => dist2 <= UPGRADE_SEARCH_RADIUS * UPGRADE_SEARCH_RADIUS)
      .sort((a, b) => a.dist2 - b.dist2)
      .slice(0, cost)
      .map(({ u }) => u);

    if (candidates.length < cost) return;

    const toRemove = new Set(candidates.map(u => u.id));
    this.state.units = this.state.units.filter(u => !toRemove.has(u.id));
    building.upgradeLevel++;
    building.conversionRadius = newRadius;
  }
}

function wrappedDx(ax: number, bx: number, wrap = true): number {
  if (!wrap) return ax - bx;
  let d = ax - bx;
  if (d >  MAP_WIDTH / 2) d -= MAP_WIDTH;
  if (d < -MAP_WIDTH / 2) d += MAP_WIDTH;
  return d;
}
