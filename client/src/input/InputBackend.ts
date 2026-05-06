import { GameState, PlayerId, PlayerInput } from "shared";

/**
 * Abstraction over how player inputs reach the simulation.
 * - Local mode: directly applies to in-process GameSimulation
 * - Online mode: sends C_INPUT to the server, simulation runs server-side
 */
export interface InputBackend {
  /** Most recent authoritative state (latest snapshot in online mode). May be null before first snapshot. */
  getState(): GameState | null;

  /** The PlayerId this client controls. */
  playerId: PlayerId;

  /** Send an input. seq is filled in by the backend. */
  send(input: Omit<PlayerInput, "seq">): void;
}
