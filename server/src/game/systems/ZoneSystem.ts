import { GameState, PlayerId, ZoneOwner } from "shared";
import { ZONE_FULL, ZONE_CAPTURE_TICKS_BASE } from "shared";

export function tickZones(state: GameState): void {
  for (const zone of state.zones) {
    let p1Units = 0;
    let p2Units = 0;

    for (const u of state.units) {
      const dx = u.x - zone.x;
      const dy = u.y - zone.y;
      if (dx * dx + dy * dy > zone.radius * zone.radius) continue;
      if (u.owner === PlayerId.One) p1Units++;
      else if (u.owner === PlayerId.Two) p2Units++;
    }

    // Capture progress: scales linearly with unit count
    // 10 units takes ZONE_CAPTURE_TICKS_BASE ticks (2 min) to fully capture
    let delta = 0;
    if (p1Units > 0 && p2Units === 0) {
      delta = (p1Units * ZONE_FULL) / ZONE_CAPTURE_TICKS_BASE;
    } else if (p2Units > 0 && p1Units === 0) {
      delta = -(p2Units * ZONE_FULL) / ZONE_CAPTURE_TICKS_BASE;
    }
    // Contested: no progress

    zone.captureProgress = Math.max(-ZONE_FULL, Math.min(ZONE_FULL, zone.captureProgress + delta));

    const prevOwner = zone.owner;
    if (zone.captureProgress >= ZONE_FULL)       zone.owner = ZoneOwner.Player1;
    else if (zone.captureProgress <= -ZONE_FULL) zone.owner = ZoneOwner.Player2;
    else                                         zone.owner = ZoneOwner.Neutral;

    // Reset setType when zone changes ownership or becomes neutral
    if (zone.owner !== prevOwner) zone.setType = null;

    // Post-capture free conversion: change type of owner's units in the zone
    if (zone.setType != null && zone.owner !== ZoneOwner.Neutral) {
      const ownerPlayer = zone.owner === ZoneOwner.Player1 ? PlayerId.One : PlayerId.Two;
      for (const u of state.units) {
        if (u.owner !== ownerPlayer) continue;
        const dx = u.x - zone.x;
        const dy = u.y - zone.y;
        if (dx * dx + dy * dy <= zone.radius * zone.radius) {
          u.type = zone.setType!;
        }
      }
    }
  }
}
