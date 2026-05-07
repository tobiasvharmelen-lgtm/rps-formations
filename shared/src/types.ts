// ---- Enums ----

export const enum UnitType {
  Rock = 0,
  Paper = 1,
  Scissors = 2,
}

export const enum Tier {
  Small = 0,
  Medium = 1,
  Large = 2,
}

export const enum PlayerId {
  Neutral = 0,
  One = 1,
  Two = 2,
}

export const enum ZoneType {
  LeftTop    = 0,
  LeftBottom = 1,
  RightTop   = 2,
  RightBottom= 3,
  Mid1       = 4,
  Mid2       = 5,
}

export const enum MapType {
  Cylinder    = 0,
  Rectangular = 1,
}

export const enum ZoneOwner {
  Neutral = 0,
  Player1 = 1,
  Player2 = 2,
}

export const enum GamePhase {
  WaitingForPlayers = 0,
  Countdown = 1,
  Active = 2,
  Ended = 3,
}

export const enum InputType {
  MoveUnits       = 0,
  SpawnUnit       = 3,
  MergeUnits      = 4,
  PlaceBuilding   = 6,
  SetTowerType    = 7,
  SetZoneType     = 8,
  UpgradeBuilding = 9,
  ContributeGate  = 10,
  CheatGold       = 11,
}

export const enum BuildingType {
  SwapTower  = 0,
  MirrorGate = 1,
  Refinery   = 2,
}

export const enum TerrainType {
  RockWall      = 0,
  ScissorHazard = 1,
  PaperGrass    = 2,
}

// ---- Value types ----

export interface Vec2 {
  x: number;
  y: number;
}

// ---- Game entities ----

export interface Unit {
  id: number;
  owner: PlayerId;
  type: UnitType;
  tier: Tier;
  hp: number;
  maxHp: number;
  /** World position in mm */
  x: number;
  y: number;
  /** Velocity in mm/tick */
  vx: number;
  vy: number;
  /** Individual steering destination assigned by right-click */
  targetX: number;
  targetY: number;
  attackCooldown: number;
  targetId: number;
  slowed: boolean;
  /** Queued waypoints for ctrl+right-click movement sequences */
  waypointQueue?: { x: number; y: number }[];
  /** True when target was set by auto-aggro rather than a player command */
  isAggro?: boolean;
}

export interface Base {
  owner: PlayerId;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  attackCooldown: number;
  /** 0 to BASE_CAPTURE_TICKS; fills when enemy units are inside, drains when they leave */
  captureProgress: number;
}

export interface Zone {
  type: ZoneType;
  x: number;
  y: number;
  radius: number;
  owner: ZoneOwner;
  /** -100 (full P2) to +100 (full P1). 0 = neutral */
  captureProgress: number;
  /** Unit type to convert passing owner units to; null = conversion off */
  setType?: UnitType | null;
}

export interface PlayerState {
  id: PlayerId;
  /** Shared gold pool */
  resources: number;
}

export interface Building {
  id: number;
  owner: PlayerId;
  type: BuildingType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  /** Unit type to convert; null = off */
  setType?: UnitType | null;
  conversionRadius: number;
  /** 0–3: how many times this building has been upgraded */
  upgradeLevel: number;
}

export interface Terrain {
  id: number;
  type: TerrainType;
  x: number;
  y: number;
  radius: number;
}

export interface MergeEvent {
  x: number;
  y: number;
}

export interface Gate {
  id: number;
  x: number;
  y: number;
  /** Units P1 has contributed toward opening (0–GATE_UNIT_COST) */
  p1Units: number;
  /** Units P2 has contributed toward opening (0–GATE_UNIT_COST) */
  p2Units: number;
  /** P1 has permanently opened this gate */
  p1Open: boolean;
  /** P2 has permanently opened this gate */
  p2Open: boolean;
}

export interface LobbyChoice {
  colorIndex: number;        // 0–5
  incomeMultiplier: number;  // 0.5 | 1 | 1.5 | 2 | 3
  mapType: MapType;
  ready: boolean;
}

export interface GameConfig {
  mapType?: MapType;
  incomeMultiplier?: number;
  p1Color?: number;
  p2Color?: number;
}

export interface GameState {
  tick: number;
  phase: GamePhase;
  countdown: number;
  players: [PlayerState, PlayerState];
  units: Unit[];
  bases: [Base, Base];
  zones: Zone[];
  winnerId: PlayerId | 0;
  mergeEvents: MergeEvent[];
  buildings: Building[];
  terrain: Terrain[];
  gates: Gate[];
  /** Which map layout is active */
  mapType: MapType;
  /** Gold income multiplier (set from lobby) */
  incomeMultiplier: number;
  /** P1 chosen team color hex */
  p1Color: number;
  /** P2 chosen team color hex */
  p2Color: number;
}

// ---- Network inputs ----

export interface PlayerInput {
  seq: number;
  type: InputType;
  // MoveUnits
  unitIds?: number[];
  destX?: number;
  destY?: number;
  appendWaypoint?: boolean;
  // SpawnUnit
  spawnType?: UnitType;
  // MergeUnits
  mergeUnitIds?: number[];
  // PlaceBuilding
  buildingType?: BuildingType;
  // SetTowerType / UpgradeBuilding
  buildingId?: number;
  unitType?: UnitType;
  // SetZoneType
  zoneIndex?: number;
  // ContributeGate
  gateIndex?: number;
}
