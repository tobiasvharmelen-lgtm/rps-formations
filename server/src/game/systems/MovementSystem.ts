import { GameState } from "shared";
import { UNIT_SPEED, UNIT_RADIUS, MAP_WIDTH, MAP_HEIGHT, TOP_LANE_BARRIER_Y, BOTTOM_LANE_BARRIER_Y, getStat } from "shared";
import { SpatialHash } from "../SpatialHash.js";

function wrappedDx(ax: number, bx: number): number {
  let d = ax - bx;
  if (d >  MAP_WIDTH / 2) d -= MAP_WIDTH;
  if (d < -MAP_WIDTH / 2) d += MAP_WIDTH;
  return d;
}

/** Units brake when within this many mm of their individual target. */
const STOPPING_DISTANCE = 20;
const SEPARATION_STRENGTH = 1.2;

export function tickMovement(state: GameState, spatialHash: SpatialHash): void {
  for (const unit of state.units) {
    const speed  = getStat(UNIT_SPEED,  unit.type, unit.tier);
    const radius = getStat(UNIT_RADIUS, unit.type, unit.tier);

    unit.slowed = false;

    // ---- Brake: stop when close enough to target ----
    // Use shortest wrapped path to target
    const dx   = wrappedDx(unit.targetX, unit.x);
    const dy   = unit.targetY - unit.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= STOPPING_DISTANCE) {
      unit.x  = unit.targetX;
      unit.y  = unit.targetY;
      unit.vx = 0;
      unit.vy = 0;
      continue;
    }

    let effectiveSpeed = speed;
    // Apply slowing from PaperGrass terrain (set by TerrainSystem earlier)
    if (unit.slowed) effectiveSpeed *= 0.5;

    // ---- Seek force toward individual target ----
    // Clamp seek speed to distance remaining to prevent overshoot
    const clampedSpeed = Math.min(effectiveSpeed, dist);
    let vx = (dx / dist) * clampedSpeed;
    let vy = (dy / dist) * clampedSpeed;

    // ---- Separation: push away from overlapping neighbours ----
    const sepRadius = radius * 2.2;
    const neighbors = spatialHash.queryWrapped(unit.x, unit.y, sepRadius, MAP_WIDTH);

    for (const nid of neighbors) {
      if (nid === unit.id) continue;
      const n = state.units.find(u => u.id === nid);
      if (!n) continue;

      const ndx   = wrappedDx(unit.x, n.x);
      const ndy   = unit.y - n.y;
      const ndist = Math.sqrt(ndx * ndx + ndy * ndy);
      const minDist = radius + getStat(UNIT_RADIUS, n.type, n.tier);

      if (ndist < minDist && ndist > 0) {
        const push = (minDist - ndist) / minDist;
        vx += (ndx / ndist) * push * SEPARATION_STRENGTH * speed;
        vy += (ndy / ndist) * push * SEPARATION_STRENGTH * speed;
      }
    }

    // Clamp to max speed (use effectiveSpeed as cap)
    const mag = Math.sqrt(vx * vx + vy * vy);
    if (mag > effectiveSpeed) {
      vx = (vx / mag) * effectiveSpeed;
      vy = (vy / mag) * effectiveSpeed;
    }

    const prevX = unit.x;
    const prevY = unit.y;
    unit.x += vx;
    unit.y += vy;

    // ---- Horizontal lane barriers (top and bottom) with gates for lane switching ----
    {
      // Detect crossing from lane to middle or middle to lane
      const crossedTopBarrier = prevY <= TOP_LANE_BARRIER_Y && unit.y > TOP_LANE_BARRIER_Y;
      const crossedBottomBarrier = prevY >= BOTTOM_LANE_BARRIER_Y && unit.y < BOTTOM_LANE_BARRIER_Y;

      if (crossedTopBarrier || crossedBottomBarrier) {
        // Determine which gate to check based on unit's x position
        const gateIndex = unit.x < 60_000 ? 0 : 1; // gate 1 at x=30k, gate 2 at x=90k

        if (!state.gatesOpen[gateIndex]) {
          // Gate is closed - block the movement
          unit.y = prevY;
          vy = 0;
          // Adjust target to stay on the correct side of the barrier
          if (crossedTopBarrier) {
            unit.targetY = Math.min(unit.targetY, TOP_LANE_BARRIER_Y - 100);
          } else {
            unit.targetY = Math.max(unit.targetY, BOTTOM_LANE_BARRIER_Y + 100);
          }
        }
      }
    }

    // ---- Horizontal wrap (cylinder map) ----
    if (unit.x < 0)          unit.x += MAP_WIDTH;
    if (unit.x > MAP_WIDTH)  unit.x -= MAP_WIDTH;

    // ---- Vertical hard bounds ----
    if (unit.y < 0)           { unit.y = 0;           vy = Math.max(0, vy); }
    if (unit.y > MAP_HEIGHT)  { unit.y = MAP_HEIGHT;  vy = Math.min(0, vy); }

    unit.vx = vx;
    unit.vy = vy;
  }
}
