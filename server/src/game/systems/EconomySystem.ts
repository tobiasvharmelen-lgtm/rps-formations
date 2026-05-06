import { GameState, BuildingType } from "shared";
import { INCOME_TICK_EVERY, BUILDING_STATS } from "shared";
import { computeIncome, applyIncome } from "shared";

export function tickEconomy(state: GameState): void {
  if (state.tick % INCOME_TICK_EVERY !== 0) return;

  for (const player of state.players) {
    const income = computeIncome(player, state.zones, state.units);
    applyIncome(player, income);
  }

  // Refinery bonus (per income tick)
  for (const building of state.buildings) {
    if (building.type !== BuildingType.Refinery) continue;
    const bonus = BUILDING_STATS[BuildingType.Refinery].incomeBonus ?? 0;
    state.players[building.owner - 1].resources += bonus;
  }
}
