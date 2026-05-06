import { UnitType, Tier } from "./types.js";

// ---- Timing ----
export const TICK_RATE = 20;           // ticks per second
export const TICK_MS = 1000 / TICK_RATE;
export const COUNTDOWN_TICKS = 3 * TICK_RATE; // 3-second countdown

// ---- Map ----
export const MAP_WIDTH = 24_000;       // world-mm
export const MAP_HEIGHT = 16_000;

// ---- Economy ----
export const STARTING_RESOURCES = 500; // shared gold pool
export const INCOME_BASE = 3;          // gold per income tick
export const INCOME_ZONE_BONUS = 5;    // bonus gold per owned zone per income tick
export const INCOME_TICK_EVERY = 20;   // game ticks between income ticks (1/sec)
export const SPAWN_COST_T1 = 10;       // gold cost to spawn any T1 unit

// ---- Merge ----
export const MERGE_COUNT = 10;
export const MERGE_RADIUS = 600;       // world-mm

// ---- Base ----
export const BASE_HP = 10_000;
export const BASE_ATTACK_RANGE = 1_500;
export const BASE_DAMAGE = 20;
export const BASE_ATTACK_COOLDOWN = 10; // ticks

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
export const ZONE_CAPTURE_RATE = 2;     // progress points per tick when units inside
export const ZONE_CAPTURE_BONUS = 2.0;  // multiplier for correct unit type
export const ZONE_FULL = 100;           // |captureProgress| threshold to own a zone

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
