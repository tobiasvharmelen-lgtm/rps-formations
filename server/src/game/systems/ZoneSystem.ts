import { GameState, PlayerId, ZoneOwner, ZoneType } from "shared";
import { ZONE_CAPTURE_RATE, ZONE_CAPTURE_BONUS, ZONE_FULL } from "shared";

export function tickZones(state: GameState): void {
  for (const zone of state.zones) {
    let p1Units = 0;
    let p2Units = 0;
    let p1HasCorrectType = false;
    let p2HasCorrectType = false;

    for (const u of state.units) {
      const dx = u.x - zone.x;
      const dy = u.y - zone.y;
      if (dx * dx + dy * dy > zone.radius * zone.radius) continue;

      if (u.owner === PlayerId.One) {
        p1Units++;
        if (u.type === (zone.type as unknown as number)) p1HasCorrectType = true;
      } else {
        p2Units++;
        if (u.type === (zone.type as unknown as number)) p2HasCorrectType = true;
      }
    }

    // Net pressure toward P1 (positive) or P2 (negative)
    let delta = 0;

    if (p1Units > 0 && p2Units === 0) {
      delta = ZONE_CAPTURE_RATE * (p1HasCorrectType ? ZONE_CAPTURE_BONUS : 1);
    } else if (p2Units > 0 && p1Units === 0) {
      delta = -(ZONE_CAPTURE_RATE * (p2HasCorrectType ? ZONE_CAPTURE_BONUS : 1));
    }
    // Contested: no progress

    zone.captureProgress = Math.max(-ZONE_FULL, Math.min(ZONE_FULL, zone.captureProgress + delta));

    // Update ownership
    if (zone.captureProgress >= ZONE_FULL) {
      zone.owner = ZoneOwner.Player1;
    } else if (zone.captureProgress <= -ZONE_FULL) {
      zone.owner = ZoneOwner.Player2;
    } else {
      zone.owner = ZoneOwner.Neutral;
    }
  }
}
