import { UnitType, Unit } from "./types.js";
import { DAMAGE_MULT, FORMATION_BONUS, UNIT_DAMAGE, getStat } from "./constants.js";
import { FormationShape } from "./types.js";

/** Damage multiplier from attacker type vs defender type. */
export function damageMultiplier(attacker: UnitType, defender: UnitType): number {
  return DAMAGE_MULT[attacker][defender];
}

/** True if attacker has strong advantage over defender (3x). */
export function hasAdvantage(attacker: UnitType, defender: UnitType): boolean {
  return damageMultiplier(attacker, defender) > 1.0;
}

/** The shape that gives a formation bonus for this unit type. */
const CORRECT_SHAPE: Record<UnitType, FormationShape> = {
  [UnitType.Rock]: FormationShape.Circle,
  [UnitType.Paper]: FormationShape.Square,
  [UnitType.Scissors]: FormationShape.Triangle,
};

/**
 * Compute raw damage dealt by attacker to defender in one attack.
 * inCorrectFormation: whether the attacker's formation matches its type's shape.
 */
export function computeDamage(
  attacker: Unit,
  defender: Unit,
  attackerFormationShape: FormationShape | null
): number {
  const base = getStat(UNIT_DAMAGE, attacker.type, attacker.tier);
  const rps = damageMultiplier(attacker.type, defender.type);
  const formation =
    attackerFormationShape !== null &&
    attackerFormationShape === CORRECT_SHAPE[attacker.type]
      ? FORMATION_BONUS
      : 1.0;
  return Math.floor(base * rps * formation);
}
