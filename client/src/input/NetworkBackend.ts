import { GameState, MsgType, PlayerId, PlayerInput } from "shared";
import { ServerConnection } from "../net/ServerConnection.js";
import { ClientSimulation } from "../net/ClientSimulation.js";
import { InputBackend } from "./InputBackend.js";

let nextSeq = 1;

export class NetworkBackend implements InputBackend {
  constructor(private conn: ServerConnection, private clientSim: ClientSimulation) {}

  /** Set after S_HELLO arrives */
  get playerId(): PlayerId {
    return this.conn.playerId ?? PlayerId.One;
  }
  set playerId(_v: PlayerId) { /* read-only from network */ }

  getState(): GameState | null {
    return this.clientSim.latestState();
  }

  send(input: Omit<PlayerInput, "seq">): void {
    this.conn.send({
      type: MsgType.C_INPUT,
      input: { ...input, seq: nextSeq++ },
    });
  }
}
