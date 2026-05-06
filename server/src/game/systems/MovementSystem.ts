import { GameState, ZoneOwner, ZoneType } from "shared";
import { UNIT_SPEED, UNIT_RADIUS, MAP_WIDTH, MAP_HEIGHT, WAR_ZONE_DEPTH, BARRIER_MIDDLE_X_MIN, BARRIER_MIDDLE_X_MAX, LANE_SPEED_BUFF, getStat } from "shared";
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

    // ---- Lane polarity speed buff ----
    let effectiveSpeed = speed;
    if (!state.barrierOpen) {
      const inTopLane = unit.y < MAP_HEIGHT / 2;
      const laneZoneType = inTopLane ? ZoneType.TopMid : ZoneType.BottomMid;
      const laneZone = state.zones.find(z => z.type === laneZoneType);
      const laneOwner = inTopLane ? ZoneOwner.Player1 : ZoneOwner.Player2;
      if (laneZone && laneZone.owner !== ZoneOwner.Neutral) {
        const beneficiary = laneZone.owner === ZoneOwner.Player1 ? 1 : 2;
        if (unit.owner === beneficiary) effectiveSpeed *= LANE_SPEED_BUFF;
      }
    }
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

    const prevY = unit.y;
    unit.x += vx;
    unit.y += vy;

    // ---- Barrier collision (horizontal line at MAP_HEIGHT/2) ----
    // Three segments: two permanent walls + one breakable middle
    {
      const barrierY = MAP_HEIGHT / 2;
      const ux = unit.x;
      const inPermanent1 = ux > WAR_ZONE_DEPTH && ux < BARRIER_MIDDLE_X_MIN;
      const inMiddle     = ux >= BARRIER_MIDDLE_X_MIN && ux <= BARRIER_MIDDLE_X_MAX;
      const inPermanent2 = ux > BARRIER_MIDDLE_X_MAX && ux < MAP_WIDTH - WAR_ZONE_DEPTH;
      const wallActive   = inPermanent1 || inPermanent2 || (inMiddle && !state.barrierOpen);
      if (wallActive && ((prevY < barrierY && unit.y >= barrierY) || (prevY > barrierY && unit.y <= barrierY))) {
        unit.y = prevY;
        vy = 0;
        if (unit.targetY > barrierY && prevY < barrierY) unit.targetY = barrierY - radius;
        if (unit.targetY < barrierY && prevY > barrierY) unit.targetY = barrierY + radius;
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
