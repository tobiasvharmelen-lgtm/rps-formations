import { PlayerState, Zone, Unit, ZoneOwner, PlayerId } from "./types.js";
import { INCOME_BASE, INCOME_ZONE_BONUS } from "./constants.js";

/** Compute gold income for one player for one income tick. */
export function computeIncome(
  player: PlayerState,
  zones: Zone[],
  _units: Unit[],
): number {
  let income = INCOME_BASE;
  const ownerVal = player.id === PlayerId.One ? ZoneOwner.Player1 : ZoneOwner.Player2;
  for (const zone of zones) {
    if (zone.owner === ownerVal) income += INCOME_ZONE_BONUS;
  }
  return income;
}

/** Apply income to a player's gold pool (mutates). */
export function applyIncome(player: PlayerState, income: number): void {
  player.resources += income;
}
