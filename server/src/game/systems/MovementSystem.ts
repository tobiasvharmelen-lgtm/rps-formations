import { GameState, Unit } from "shared";
import { UNIT_SPEED, UNIT_RADIUS, getStat } from "shared";
import { computeSlots } from "shared";
import { SpatialHash } from "../SpatialHash.js";

const SEPARATION_STRENGTH = 1.5;
const ARRIVAL_RADIUS = 50; // mm — snap to slot when within this distance

export function tickMovement(state: GameState, spatialHash: SpatialHash): void {
  const formationMap = new Map(state.formations.map(f => [f.id, f]));

  for (const unit of state.units) {
    const speed = getStat(UNIT_SPEED, unit.type, unit.tier);
    const radius = getStat(UNIT_RADIUS, unit.type, unit.tier);

    // ---- Seek force: steer toward formation slot ----
    let seekX = 0;
    let seekY = 0;

    const formation = unit.formationId ? formationMap.get(unit.formationId) : undefined;
    if (formation && formation.unitIds.length > 0) {
      const slots = computeSlots(
        formation.shape,
        formation.unitIds.length,
        formation.anchorX,
        formation.anchorY,
        formation.facing,
        formation.tier
      );
      const slot = slots[unit.slotIndex] ?? slots[0];
      const dx = slot.x - unit.x;
      const dy = slot.y - unit.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > ARRIVAL_RADIUS) {
        seekX = (dx / dist) * speed;
        seekY = (dy / dist) * speed;
      } else {
        // Snap to slot
        unit.x = slot.x;
        unit.y = slot.y;
        unit.vx = 0;
        unit.vy = 0;
        continue;
      }
    } else if (!formation) {
      // Unassigned unit — stay still
      unit.vx = 0;
      unit.vy = 0;
      continue;
    }

    // ---- Separation force: push away from nearby units ----
    let sepX = 0;
    let sepY = 0;
    const neighbors = spatialHash.query(unit.x, unit.y, radius * 3);

    for (const nid of neighbors) {
      if (nid === unit.id) continue;
      const neighbor = state.units.find(u => u.id === nid);
      if (!neighbor) continue;

      const dx = unit.x - neighbor.x;
      const dy = unit.y - neighbor.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = radius + getStat(UNIT_RADIUS, neighbor.type, neighbor.tier);

      if (dist < minDist && dist > 0) {
        const push = (minDist - dist) / minDist;
        sepX += (dx / dist) * push * SEPARATION_STRENGTH * speed;
        sepY += (dy / dist) * push * SEPARATION_STRENGTH * speed;
      }
    }

    // ---- Combine forces ----
    let vx = seekX + sepX;
    let vy = seekY + sepY;

    // Clamp to max speed
    const mag = Math.sqrt(vx * vx + vy * vy);
    if (mag > speed) {
      vx = (vx / mag) * speed;
      vy = (vy / mag) * speed;
    }

    unit.vx = vx;
    unit.vy = vy;
    unit.x += vx;
    unit.y += vy;

    // Clamp to map bounds
    unit.x = Math.max(0, Math.min(24_000, unit.x));
    unit.y = Math.max(0, Math.min(16_000, unit.y));
  }
}
