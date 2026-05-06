import { GameState, PlayerId, PlayerInput } from "shared";
import { LocalSimulation } from "../LocalSimulation.js";
import { InputBackend } from "./InputBackend.js";

let nextSeq = 1;

export class LocalBackend implements InputBackend {
  constructor(private sim: LocalSimulation, public playerId: PlayerId) {}
  getState(): GameState { return this.sim.state; }
  send(input: Omit<PlayerInput, "seq">): void {
    this.sim.applyInput(this.playerId, { ...input, seq: nextSeq++ });
  }
}
