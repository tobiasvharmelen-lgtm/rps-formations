import { GameState, Formation, Unit } from "shared";
import { computeSlots, assignSlots } from "shared";
import { UNIT_SPEED, getStat } from "shared";

/**
 * Each tick:
 * 1. Move formation anchor toward destination.
 * 2. Recompute slot positions.
 * 3. Set each unit's slot target (stored as vx/vy direction toward slot target).
 *    Actual velocity integration happens in MovementSystem.
 */
export function tickFormations(state: GameState): void {
  const unitMap = new Map<number, Unit>();
  for (const u of state.units) unitMap.set(u.id, u);

  for (const f of state.formations) {
    if (f.unitIds.length === 0) continue;

    // Advance anchor toward destination
    if (f.moving) {
      const dx = f.destX - f.anchorX;
      const dy = f.destY - f.anchorY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // Formation moves at the speed of the slowest unit type in it
      const speed = getStat(UNIT_SPEED, f.type, f.tier);

      if (dist <= speed) {
        f.anchorX = f.destX;
        f.anchorY = f.destY;
        f.moving = false;
        // Update facing toward destination
        if (dist > 1) {
          f.facing = Math.atan2(dy, dx);
        }
      } else {
        f.facing = Math.atan2(dy, dx);
        f.anchorX += (dx / dist) * speed;
        f.anchorY += (dy / dist) * speed;
      }
    }

    // Recompute slots and re-assign units
    const slots = computeSlots(f.shape, f.unitIds.length, f.anchorX, f.anchorY, f.facing, f.tier);
    const unitPositions = f.unitIds.map(id => {
      const u = unitMap.get(id)!;
      return { x: u.x, y: u.y };
    });
    const assignment = assignSlots(unitPositions, slots);

    for (let i = 0; i < f.unitIds.length; i++) {
      const u = unitMap.get(f.unitIds[i])!;
      u.slotIndex = assignment[i];
    }
  }
}
