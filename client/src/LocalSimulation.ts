/**
 * Thin wrapper: re-uses the server GameSimulation logic directly in the browser.
 * This works because shared/ and server/src/game/ are pure TypeScript with no Node APIs.
 */
import { GameState, PlayerId, PlayerInput, GamePhase } from "shared";
import { GameSimulation } from "server/game/GameSimulation.js";

export class LocalSimulation {
  private sim = new GameSimulation();

  get state(): GameState {
    return this.sim.state;
  }

  start(): void {
    this.sim.start();
  }

  tick(): void {
    this.sim.tick(new Map());
  }

  applyInput(playerId: PlayerId, input: PlayerInput): void {
    this.sim.applyInput(playerId, input);
  }
}
