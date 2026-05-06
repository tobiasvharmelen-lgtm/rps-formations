import { UnitType, Unit } from "./types.js";
import { DAMAGE_MULT, UNIT_DAMAGE, getStat } from "./constants.js";

/** Damage multiplier from attacker type vs defender type. */
export function damageMultiplier(attacker: UnitType, defender: UnitType): number {
  return DAMAGE_MULT[attacker][defender];
}

/** True if attacker has strong advantage over defender (3×). */
export function hasAdvantage(attacker: UnitType, defender: UnitType): boolean {
  return damageMultiplier(attacker, defender) > 1.0;
}

/** Compute raw damage dealt by attacker to defender in one attack. */
export function computeDamage(attacker: Unit, defender: Unit): number {
  const base = getStat(UNIT_DAMAGE, attacker.type, attacker.tier);
  const rps  = damageMultiplier(attacker.type, defender.type);
  return Math.floor(base * rps);
}
