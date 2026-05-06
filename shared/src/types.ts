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
  One = 1,
  Two = 2,
}

export const enum ZoneType {
  Circle = 0,
  Square = 1,
  Triangle = 2,
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
  MoveUnits  = 0,
  SpawnUnit  = 3,
  MergeUnits = 4,
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
}

export interface Base {
  owner: PlayerId;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  attackCooldown: number;
}

export interface Zone {
  type: ZoneType;
  x: number;
  y: number;
  radius: number;
  owner: ZoneOwner;
  /** -100 (full P2) to +100 (full P1). 0 = neutral */
  captureProgress: number;
}

export interface PlayerState {
  id: PlayerId;
  /** Resources per unit type: [rock, paper, scissors] */
  resources: [number, number, number];
}

export interface MergeEvent {
  x: number;
  y: number;
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
}

// ---- Network inputs ----

export interface PlayerInput {
  seq: number;
  type: InputType;
  // MoveUnits
  unitIds?: number[];
  destX?: number;
  destY?: number;
  // SpawnUnit
  spawnType?: UnitType;
  // MergeUnits
  mergeUnitIds?: number[];
}
