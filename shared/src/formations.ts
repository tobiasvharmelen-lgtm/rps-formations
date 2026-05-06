import { FormationShape, Tier, Vec2 } from "./types.js";
import { SLOT_SPACING } from "./constants.js";

// ---- Slot position algorithms ----
// All return an array of Vec2 world-mm positions for N slots,
// centered on (anchorX, anchorY) and rotated by facing (radians).

function rotate(x: number, y: number, angle: number, cx: number, cy: number): Vec2 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: cx + x * cos - y * sin,
    y: cy + x * sin + y * cos,
  };
}

function circleSlots(n: number, anchorX: number, anchorY: number, facing: number, tier: Tier): Vec2[] {
  const spacing = SLOT_SPACING[0][tier]; // all types share same spacing table
  const slots: Vec2[] = [];
  let ring = 0;

  while (slots.length < n) {
    if (ring === 0) {
      slots.push({ x: anchorX, y: anchorY });
    } else {
      const capacity = ring * 6;
      const count = Math.min(n - slots.length, capacity);
      const radius = ring * spacing;
      for (let i = 0; i < count; i++) {
        const angle = facing + (2 * Math.PI * i) / capacity;
        slots.push({
          x: anchorX + Math.cos(angle) * radius,
          y: anchorY + Math.sin(angle) * radius,
        });
      }
    }
    ring++;
  }

  return slots;
}

function squareSlots(n: number, anchorX: number, anchorY: number, facing: number, tier: Tier): Vec2[] {
  const spacing = SLOT_SPACING[0][tier];
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const slots: Vec2[] = [];

  const startX = -((cols - 1) / 2) * spacing;
  const startY = -((rows - 1) / 2) * spacing;

  outer: for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (slots.length >= n) break outer;
      const lx = startX + col * spacing;
      const ly = startY + row * spacing;
      slots.push(rotate(lx, ly, facing, anchorX, anchorY));
    }
  }

  return slots;
}

function triangleSlots(n: number, anchorX: number, anchorY: number, facing: number, tier: Tier): Vec2[] {
  const spacing = SLOT_SPACING[0][tier];
  const rowHeight = spacing * Math.sin(Math.PI / 3); // sin(60°)
  const slots: Vec2[] = [];
  let row = 0;

  while (slots.length < n) {
    const countInRow = row + 1;
    const rowY = row * rowHeight;
    const rowStartX = -(row * spacing) / 2;

    for (let col = 0; col < countInRow; col++) {
      if (slots.length >= n) break;
      const lx = rowStartX + col * spacing;
      const ly = rowY;
      slots.push(rotate(lx, ly, facing, anchorX, anchorY));
    }
    row++;
  }

  return slots;
}

/** Compute the N slot world positions for a formation. */
export function computeSlots(
  shape: FormationShape,
  n: number,
  anchorX: number,
  anchorY: number,
  facing: number,
  tier: Tier
): Vec2[] {
  if (n <= 0) return [];
  switch (shape) {
    case FormationShape.Circle:
      return circleSlots(n, anchorX, anchorY, facing, tier);
    case FormationShape.Square:
      return squareSlots(n, anchorX, anchorY, facing, tier);
    case FormationShape.Triangle:
      return triangleSlots(n, anchorX, anchorY, facing, tier);
  }
}

/**
 * Assign unit indices to slot indices to minimize total travel distance.
 * Uses a greedy nearest-available-slot algorithm (good enough for ≤30 units).
 * Returns unitIndex → slotIndex mapping.
 */
export function assignSlots(
  unitPositions: Vec2[],
  slotPositions: Vec2[]
): number[] {
  const n = unitPositions.length;
  const assignment = new Array<number>(n).fill(-1);
  const taken = new Set<number>();

  for (let ui = 0; ui < n; ui++) {
    let bestSlot = -1;
    let bestDist = Infinity;
    for (let si = 0; si < slotPositions.length; si++) {
      if (taken.has(si)) continue;
      const dx = unitPositions[ui].x - slotPositions[si].x;
      const dy = unitPositions[ui].y - slotPositions[si].y;
      const d = dx * dx + dy * dy;
      if (d < bestDist) {
        bestDist = d;
        bestSlot = si;
      }
    }
    assignment[ui] = bestSlot;
    taken.add(bestSlot);
  }

  return assignment;
}
