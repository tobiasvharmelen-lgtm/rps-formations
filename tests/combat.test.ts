import { describe, it, expect } from "vitest";
import { UnitType, Tier, PlayerId } from "../shared/src/types.js";
import { damageMultiplier, hasAdvantage, computeDamage } from "../shared/src/combat.js";
import { FormationShape } from "../shared/src/types.js";
import { Unit } from "../shared/src/types.js";

function makeUnit(type: UnitType, tier = Tier.Small): Unit {
  return {
    id: 1, owner: PlayerId.One, type, tier,
    hp: 100, maxHp: 100, x: 0, y: 0, vx: 0, vy: 0,
    formationId: 0, slotIndex: 0, attackCooldown: 0, targetId: 0,
  };
}

describe("RPS damage multipliers", () => {
  it("Rock beats Scissors (3x)", () => {
    expect(damageMultiplier(UnitType.Rock, UnitType.Scissors)).toBe(3.0);
  });

  it("Paper beats Rock (3x)", () => {
    expect(damageMultiplier(UnitType.Paper, UnitType.Rock)).toBe(3.0);
  });

  it("Scissors beats Paper (3x)", () => {
    expect(damageMultiplier(UnitType.Scissors, UnitType.Paper)).toBe(3.0);
  });

  it("Rock vs Paper is 0.3x", () => {
    expect(damageMultiplier(UnitType.Rock, UnitType.Paper)).toBe(0.3);
  });

  it("Paper vs Scissors is 0.3x", () => {
    expect(damageMultiplier(UnitType.Paper, UnitType.Scissors)).toBe(0.3);
  });

  it("Scissors vs Rock is 0.3x", () => {
    expect(damageMultiplier(UnitType.Scissors, UnitType.Rock)).toBe(0.3);
  });

  it("Same type is 1.0x", () => {
    expect(damageMultiplier(UnitType.Rock, UnitType.Rock)).toBe(1.0);
    expect(damageMultiplier(UnitType.Paper, UnitType.Paper)).toBe(1.0);
    expect(damageMultiplier(UnitType.Scissors, UnitType.Scissors)).toBe(1.0);
  });
});

describe("hasAdvantage", () => {
  it("Rock has advantage over Scissors", () => {
    expect(hasAdvantage(UnitType.Rock, UnitType.Scissors)).toBe(true);
  });

  it("Rock does NOT have advantage over Paper", () => {
    expect(hasAdvantage(UnitType.Rock, UnitType.Paper)).toBe(false);
  });

  it("Rock does NOT have advantage over Rock", () => {
    expect(hasAdvantage(UnitType.Rock, UnitType.Rock)).toBe(false);
  });
});

describe("computeDamage", () => {
  it("Rock T1 vs Scissors T1: 30 damage (10 * 3.0)", () => {
    const attacker = makeUnit(UnitType.Rock);
    const defender = makeUnit(UnitType.Scissors);
    expect(computeDamage(attacker, defender, null)).toBe(30);
  });

  it("Rock T1 vs Paper T1: 3 damage (floor(10 * 0.3))", () => {
    const attacker = makeUnit(UnitType.Rock);
    const defender = makeUnit(UnitType.Paper);
    expect(computeDamage(attacker, defender, null)).toBe(3);
  });

  it("Rock T1 vs Rock T1: 10 damage (normal)", () => {
    const attacker = makeUnit(UnitType.Rock);
    const defender = makeUnit(UnitType.Rock);
    expect(computeDamage(attacker, defender, null)).toBe(10);
  });

  it("Formation bonus applies when Rock is in Circle formation", () => {
    const attacker = makeUnit(UnitType.Rock);
    const defender = makeUnit(UnitType.Scissors);
    // 10 * 3.0 * 1.25 = 37.5 → floor = 37
    expect(computeDamage(attacker, defender, FormationShape.Circle)).toBe(37);
  });

  it("Formation bonus does NOT apply when Rock is in wrong formation", () => {
    const attacker = makeUnit(UnitType.Rock);
    const defender = makeUnit(UnitType.Scissors);
    expect(computeDamage(attacker, defender, FormationShape.Square)).toBe(30);
  });

  it("Tier 2 units deal more damage", () => {
    const attacker = makeUnit(UnitType.Rock, Tier.Medium);
    const defender = makeUnit(UnitType.Scissors, Tier.Medium);
    // 80 * 3.0 = 240
    expect(computeDamage(attacker, defender, null)).toBe(240);
  });
});
