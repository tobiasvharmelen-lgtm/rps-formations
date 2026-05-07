import { UnitType, Tier, BuildingType } from "./types.js";

// ---- Timing ----
export const TICK_RATE = 20;           // ticks per second
export const TICK_MS = 1000 / TICK_RATE;
export const COUNTDOWN_TICKS = 3 * TICK_RATE; // 3-second countdown

// ---- Map ----
export const MAP_WIDTH = 120_000;
export const MAP_HEIGHT = 16_000;

// Single horizontal barrier through both middle areas (not through bases)
export const MIDDLE_BARRIER_Y    = 8_000;   // y position of the barrier (MAP_HEIGHT / 2)
export const BARRIER_LEFT_START  = 6_000;   // barrier begins after P1 home
export const BARRIER_LEFT_END    = 54_000;  // barrier ends before P2 home
export const BARRIER_RIGHT_START = 66_000;  // barrier resumes after P2 home
export const BARRIER_RIGHT_END   = 114_000; // barrier ends before P1 right home

// Gate structures (on the barrier line, at center of each middle area)
export const GATE_X_LEFT    = 30_000;  // left gate X
export const GATE_X_RIGHT   = 90_000;  // right gate X
export const GATE_HALF_WIDTH = 1_500;  // half-width of the passable gap when a gate is open
export const GATE_RADIUS     = 1_800;  // radius of the gate circle (visual + unit contribution zone)
export const GATE_UNIT_COST  = 50;     // units a player must contribute to open a gate

// Home territory boundaries (for rendering — symmetric: P1 at seam, P2 at center)
export const P1_HOME_END          = 6_000;
export const P1_HOME_RIGHT_START  = 114_000;
export const P2_HOME_START        = 54_000;
export const P2_HOME_END          = 66_000;

// ---- Economy ----
export const STARTING_RESOURCES = 500; // shared gold pool
export const INCOME_BASE = 3;          // gold per income tick
export const INCOME_ZONE_BONUS = 5;    // bonus gold per owned zone per income tick
export const INCOME_TICK_EVERY = 20;   // game ticks between income ticks (1/sec)
export const SPAWN_COST_T1 = 10;       // gold cost to spawn any T1 unit

// ---- Merge ----
export const MERGE_COUNT = 10;
export const MERGE_RADIUS = 5_000;     // world-mm — covers full formation spread

// ---- Base ----
export const BASE_HP = 10_000;
export const BASE_ATTACK_RANGE = 1_500;
export const BASE_DAMAGE = 20;
export const BASE_ATTACK_COOLDOWN = 10; // ticks
export const BASE_CAPTURE_RANGE = 2_500; // enemy units within this radius count as "in the base"
export const BASE_CAPTURE_TICKS = 400;  // 20 seconds × 20 TPS to capture

// ---- Unit stats by [type][tier] ----
// All three unit types share the same base stats — RPS advantage is purely from multipliers.

export const UNIT_HP: readonly [number, number, number][] = [
  [100, 900, 7_500],   // Rock
  [100, 900, 7_500],   // Paper
  [100, 900, 7_500],   // Scissors
] as const;

export const UNIT_DAMAGE: readonly [number, number, number][] = [
  [10, 80, 600],
  [10, 80, 600],
  [10, 80, 600],
] as const;

export const UNIT_ATTACK_RANGE: readonly [number, number, number][] = [
  [350, 400, 500],
  [350, 400, 500],
  [350, 400, 500],
] as const;

export const UNIT_ATTACK_COOLDOWN: readonly [number, number, number][] = [
  [10, 12, 15],
  [10, 12, 15],
  [10, 12, 15],
] as const;

/** mm per tick */
export const UNIT_SPEED: readonly [number, number, number][] = [
  [180, 160, 130],
  [180, 160, 130],
  [180, 160, 130],
] as const;

/** Collision radius in mm */
export const UNIT_RADIUS: readonly [number, number, number][] = [
  [80, 160, 280],
  [80, 160, 280],
  [80, 160, 280],
] as const;

// ---- Combat multiplier table ----
// DAMAGE_MULT[attackerType][defenderType]
export const DAMAGE_MULT: readonly [number, number, number][] = [
  //  Rock   Paper  Scissors
  [1.0,  0.3,  3.0],   // Rock attacker
  [3.0,  1.0,  0.3],   // Paper attacker
  [0.3,  3.0,  1.0],   // Scissors attacker
] as const;

// ---- Zone capture ----
export const ZONE_RADIUS = 1_200;       // world-mm
export const ZONE_FULL = 100;           // |captureProgress| threshold to own a zone
// Time for 10 units to fully capture (ticks). Scales linearly with unit count.
// 24_000 ticks = 2 minutes at 20 tps.
export const ZONE_CAPTURE_TICKS_BASE = 24_000;


// ---- Buildings ----
export const BUILDING_STATS: Record<BuildingType, { hp: number; cost: number; conversionRadius: number; incomeBonus?: number }> = {
  [BuildingType.SwapTower]:  { hp: 300, cost:  60, conversionRadius: 1_500 },
  [BuildingType.MirrorGate]: { hp: 500, cost: 120, conversionRadius: 1_500 },
  [BuildingType.Refinery]:   { hp: 400, cost: 100, conversionRadius:     0, incomeBonus: 3 },
};

/** Gold deducted from building owner per unit converted by SwapTower */
export const SWAP_TOWER_CONVERSION_COST = 1;

/** Units consumed per upgrade level (index 0 = tier 0→1, etc.) */
export const BUILDING_UPGRADE_COSTS = [10, 20, 30] as const;

/** conversionRadius after each upgrade level [lvl0, lvl1, lvl2, lvl3] */
export const BUILDING_UPGRADE_RADII: Record<BuildingType.SwapTower | BuildingType.MirrorGate, readonly [number, number, number, number]> = {
  [BuildingType.SwapTower]:  [1_500, 2_500, 3_800, 5_500],
  [BuildingType.MirrorGate]: [1_500, 2_500, 3_800, 5_500],
};

// ---- Render ----
export const CLIENT_BUFFER_MS = 100;    // snapshot interpolation delay

// Helper to get stat for a unit type and tier
export function getStat(
  table: readonly [number, number, number][],
  type: UnitType,
  tier: Tier
): number {
  return table[type][tier];
}
