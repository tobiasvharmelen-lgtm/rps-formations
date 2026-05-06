import { GameState, MsgType, ServerMessage, CLIENT_BUFFER_MS, PlayerInput } from "shared";
import { ServerConnection } from "./ServerConnection.js";
import { StateBuffer } from "./StateBuffer.js";

/**
 * Read-only client-side view of the authoritative game state.
 * - Receives snapshots from the server
 * - Stores them in StateBuffer
 * - Exposes an interpolated state for rendering
 *
 * Inputs are sent through the server connection (see CommandDispatcher).
 */
export class ClientSimulation {
  private buffer = new StateBuffer();
  /** Current interpolated state, refreshed each frame by sample(). */
  state: GameState | null = null;
  private lastAckedInput = 0;

  constructor(private conn: ServerConnection) {
    conn.onMessage(msg => this.handle(msg));
  }

  private handle(msg: ServerMessage): void {
    if (msg.type === MsgType.S_GAME_STATE) {
      // Stamp the snapshot in server-clock domain so interpolation stays accurate
      // across varying network latency.
      this.buffer.add(msg.state, performance.now() + this.conn.serverTimeOffset);
      this.lastAckedInput = msg.lastAckedInput;
    }
  }

  /** Call once per animation frame to update the interpolated state. */
  sample(): void {
    const serverNow = performance.now() + this.conn.serverTimeOffset;
    const renderTime = serverNow - CLIENT_BUFFER_MS;
    const interp = this.buffer.getInterpolated(renderTime);
    if (interp) this.state = interp;
  }

  /** Latest authoritative snapshot (no interpolation), used for input/selection logic. */
  latestState(): GameState | null {
    return this.buffer.latest();
  }

  get ackedInput(): number {
    return this.lastAckedInput;
  }
}
