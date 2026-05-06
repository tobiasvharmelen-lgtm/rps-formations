import { GameState, PlayerId, ZoneOwner } from "shared";
import { ZONE_CAPTURE_RATE, ZONE_FULL } from "shared";

export function tickZones(state: GameState): void {
  for (const zone of state.zones) {
    let p1Units = 0;
    let p2Units = 0;

    for (const u of state.units) {
      const dx = u.x - zone.x;
      const dy = u.y - zone.y;
      if (dx * dx + dy * dy > zone.radius * zone.radius) continue;
      if (u.owner === PlayerId.One) p1Units++;
      else p2Units++;
    }

    let delta = 0;
    if (p1Units > 0 && p2Units === 0)      delta =  ZONE_CAPTURE_RATE;
    else if (p2Units > 0 && p1Units === 0) delta = -ZONE_CAPTURE_RATE;
    // Contested: no progress

    zone.captureProgress = Math.max(-ZONE_FULL, Math.min(ZONE_FULL, zone.captureProgress + delta));

    if (zone.captureProgress >= ZONE_FULL)       zone.owner = ZoneOwner.Player1;
    else if (zone.captureProgress <= -ZONE_FULL) zone.owner = ZoneOwner.Player2;
    else                                         zone.owner = ZoneOwner.Neutral;
  }
}
