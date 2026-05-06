import { GameState } from "shared";

/** Clears merge-event data from the previous tick so the client stops rendering burst FX. */
export function tickMerge(state: GameState): void {
  state.mergeEvents = [];
}
