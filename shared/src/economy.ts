import { PlayerState, Zone, Unit, ZoneOwner, ZoneType, PlayerId } from "./types.js";
import { INCOME_BASE, INCOME_ZONE_BONUS, INCOME_PER_UNIT } from "./constants.js";

/** Compute resource income for one player for one income tick.
 *  Returns [rockIncome, paperIncome, scissorsIncome]. */
export function computeIncome(
  player: PlayerState,
  zones: Zone[],
  units: Unit[],
): [number, number, number] {
  const income: [number, number, number] = [INCOME_BASE, INCOME_BASE, INCOME_BASE];
  const ownerVal = player.id === PlayerId.One ? ZoneOwner.Player1 : ZoneOwner.Player2;

  for (const zone of zones) {
    if (zone.owner === ownerVal) {
      income[zone.type as ZoneType] += INCOME_ZONE_BONUS;
    }
  }

  for (const unit of units) {
    if (unit.owner === player.id) {
      income[unit.type] += INCOME_PER_UNIT;
    }
  }

  return income;
}

/** Apply income to a player's resource pools (mutates). */
export function applyIncome(player: PlayerState, income: [number, number, number]): void {
  player.resources[0] += income[0];
  player.resources[1] += income[1];
  player.resources[2] += income[2];
}
