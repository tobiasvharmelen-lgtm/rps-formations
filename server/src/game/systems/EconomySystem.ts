import { GameState } from "shared";
import { INCOME_TICK_EVERY } from "shared";
import { computeIncome, applyIncome } from "shared";

export function tickEconomy(state: GameState): void {
  if (state.tick % INCOME_TICK_EVERY !== 0) return;

  for (const player of state.players) {
    const income = computeIncome(player, state.zones, state.units);
    applyIncome(player, income);
  }
}
