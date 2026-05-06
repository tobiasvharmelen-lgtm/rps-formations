import { describe, it, expect } from "vitest";
import { FormationShape, Tier } from "../shared/src/types.js";
import { computeSlots, assignSlots } from "../shared/src/formations.js";

function noOverlap(slots: { x: number; y: number }[], minDist: number): boolean {
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const dx = slots[i].x - slots[j].x;
      const dy = slots[i].y - slots[j].y;
      if (Math.sqrt(dx * dx + dy * dy) < minDist) return false;
    }
  }
  return true;
}

describe("computeSlots — count", () => {
  it("returns exactly N slots for circle (N=1,6,10,20)", () => {
    for (const n of [1, 6, 10, 20]) {
      expect(computeSlots(FormationShape.Circle, n, 0, 0, 0, Tier.Small)).toHaveLength(n);
    }
  });

  it("returns exactly N slots for square", () => {
    for (const n of [1, 4, 9, 10, 20]) {
      expect(computeSlots(FormationShape.Square, n, 0, 0, 0, Tier.Small)).toHaveLength(n);
    }
  });

  it("returns exactly N slots for triangle", () => {
    for (const n of [1, 3, 6, 10, 15]) {
      expect(computeSlots(FormationShape.Triangle, n, 0, 0, 0, Tier.Small)).toHaveLength(n);
    }
  });

  it("returns empty array for n=0", () => {
    expect(computeSlots(FormationShape.Circle, 0, 0, 0, 0, Tier.Small)).toHaveLength(0);
  });
});

describe("computeSlots — no overlap", () => {
  const MIN_DIST = 100; // slots should be well separated

  it("circle slots don't overlap for N=10", () => {
    const slots = computeSlots(FormationShape.Circle, 10, 0, 0, 0, Tier.Small);
    expect(noOverlap(slots, MIN_DIST)).toBe(true);
  });

  it("square slots don't overlap for N=9", () => {
    const slots = computeSlots(FormationShape.Square, 9, 0, 0, 0, Tier.Small);
    expect(noOverlap(slots, MIN_DIST)).toBe(true);
  });

  it("triangle slots don't overlap for N=10", () => {
    const slots = computeSlots(FormationShape.Triangle, 10, 0, 0, 0, Tier.Small);
    expect(noOverlap(slots, MIN_DIST)).toBe(true);
  });
});

describe("computeSlots — centering", () => {
  it("circle center slot is at anchor when N=1", () => {
    const slots = computeSlots(FormationShape.Circle, 1, 500, 300, 0, Tier.Small);
    expect(slots[0].x).toBeCloseTo(500);
    expect(slots[0].y).toBeCloseTo(300);
  });
});

describe("assignSlots", () => {
  it("assigns each unit to a unique slot", () => {
    const units = [
      { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 },
    ];
    const slots = [
      { x: 5, y: 0 }, { x: 15, y: 0 }, { x: 25, y: 0 },
    ];
    const assignment = assignSlots(units, slots);
    expect(new Set(assignment).size).toBe(3); // all unique
    expect(assignment).toHaveLength(3);
  });

  it("assigns closest slot to each unit", () => {
    const units = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
    const slots = [{ x: 5, y: 0 }, { x: 95, y: 0 }];
    const assignment = assignSlots(units, slots);
    expect(assignment[0]).toBe(0); // unit at 0 → slot at 5
    expect(assignment[1]).toBe(1); // unit at 100 → slot at 95
  });
});
