import { GameState } from "shared";
import { UNIT_SPEED, UNIT_RADIUS, MAP_WIDTH, MAP_HEIGHT, getStat } from "shared";
import { SpatialHash } from "../SpatialHash.js";

/** Units brake when within this many mm of their individual target. */
const STOPPING_DISTANCE = 20;
const SEPARATION_STRENGTH = 1.2;

export function tickMovement(state: GameState, spatialHash: SpatialHash): void {
  for (const unit of state.units) {
    const speed  = getStat(UNIT_SPEED,  unit.type, unit.tier);
    const radius = getStat(UNIT_RADIUS, unit.type, unit.tier);

    // ---- Brake: stop when close enough to target ----
    const dx   = unit.targetX - unit.x;
    const dy   = unit.targetY - unit.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= STOPPING_DISTANCE) {
      unit.x  = unit.targetX;
      unit.y  = unit.targetY;
      unit.vx = 0;
      unit.vy = 0;
      continue;
    }

    // ---- Seek force toward individual target ----
    // Clamp seek speed to distance remaining to prevent overshoot
    const clampedSpeed = Math.min(speed, dist);
    let vx = (dx / dist) * clampedSpeed;
    let vy = (dy / dist) * clampedSpeed;

    // ---- Separation: push away from overlapping neighbours ----
    const sepRadius = radius * 2.2;
    const neighbors = spatialHash.query(unit.x, unit.y, sepRadius);

    for (const nid of neighbors) {
      if (nid === unit.id) continue;
      const n = state.units.find(u => u.id === nid);
      if (!n) continue;

      const ndx   = unit.x - n.x;
      const ndy   = unit.y - n.y;
      const ndist = Math.sqrt(ndx * ndx + ndy * ndy);
      const minDist = radius + getStat(UNIT_RADIUS, n.type, n.tier);

      if (ndist < minDist && ndist > 0) {
        const push = (minDist - ndist) / minDist;
        vx += (ndx / ndist) * push * SEPARATION_STRENGTH * speed;
        vy += (ndy / ndist) * push * SEPARATION_STRENGTH * speed;
      }
    }

    // Clamp to max speed
    const mag = Math.sqrt(vx * vx + vy * vy);
    if (mag > speed) {
      vx = (vx / mag) * speed;
      vy = (vy / mag) * speed;
    }

    unit.x += vx;
    unit.y += vy;

    // ---- Edge sliding: zero only the wall-perpendicular velocity component ----
    if (unit.x < 0)           { unit.x = 0;          vx = Math.max(0, vx); }
    if (unit.x > MAP_WIDTH)   { unit.x = MAP_WIDTH;   vx = Math.min(0, vx); }
    if (unit.y < 0)           { unit.y = 0;           vy = Math.max(0, vy); }
    if (unit.y > MAP_HEIGHT)  { unit.y = MAP_HEIGHT;  vy = Math.min(0, vy); }

    unit.vx = vx;
    unit.vy = vy;
  }
}
