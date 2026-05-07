import { GameState, PlayerId } from "shared";
import {
  UNIT_SPEED, UNIT_RADIUS, MAP_WIDTH, MAP_HEIGHT, getStat,
  MIDDLE_BARRIER_Y,
  BARRIER_LEFT_START, BARRIER_LEFT_END,
  BARRIER_RIGHT_START, BARRIER_RIGHT_END,
  GATE_X_LEFT, GATE_X_RIGHT, GATE_HALF_WIDTH,
} from "shared";
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

    // Speed boost (+20%) if the unit's player has opened the gate in this middle area
    const ux = unit.x;
    if (
      (ux >= BARRIER_LEFT_START && ux <= BARRIER_LEFT_END &&
        (unit.owner === PlayerId.One ? state.gates[0].p1Open : state.gates[0].p2Open)) ||
      (ux >= BARRIER_RIGHT_START && ux <= BARRIER_RIGHT_END &&
        (unit.owner === PlayerId.One ? state.gates[1].p1Open : state.gates[1].p2Open))
    ) {
      effectiveSpeed *= 1.2;
    }

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

    // ---- Single horizontal barrier through middle areas (not through bases) ----
    {
      const crossedBarrier =
        (prevY < MIDDLE_BARRIER_Y && unit.y >= MIDDLE_BARRIER_Y) ||
        (prevY > MIDDLE_BARRIER_Y && unit.y <= MIDDLE_BARRIER_Y);

      if (crossedBarrier) {
        const ux = unit.x;
        const inLeftMiddle  = ux >= BARRIER_LEFT_START  && ux <= BARRIER_LEFT_END;
        const inRightMiddle = ux >= BARRIER_RIGHT_START && ux <= BARRIER_RIGHT_END;

        if (inLeftMiddle || inRightMiddle) {
          const gateIndex = inLeftMiddle ? 0 : 1;
          const gateX     = inLeftMiddle ? GATE_X_LEFT : GATE_X_RIGHT;
          const gate      = state.gates[gateIndex];
          const gateOpen  = unit.owner === PlayerId.One ? gate.p1Open : gate.p2Open;
          const atGate    = Math.abs(ux - gateX) <= GATE_HALF_WIDTH;

          if (!atGate || !gateOpen) {
            unit.y = prevY;
            vy = 0;
            if (prevY < MIDDLE_BARRIER_Y) {
              unit.targetY = Math.min(unit.targetY, MIDDLE_BARRIER_Y - 100);
            } else {
              unit.targetY = Math.max(unit.targetY, MIDDLE_BARRIER_Y + 100);
            }
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
