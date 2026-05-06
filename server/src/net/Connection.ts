import { WebSocket } from "ws";
import { PlayerId, PlayerInput } from "shared";
import { ServerMessage, ClientMessage, MsgType } from "shared";

export class Connection {
  readonly ws: WebSocket;
  playerId: PlayerId | null = null;
  sessionToken: string | null = null;
  roomId: string | null = null;

  private inputQueue: PlayerInput[] = [];
  private lastAckedSeq = 0;

  constructor(ws: WebSocket) {
    this.ws = ws;
  }

  send(msg: ServerMessage): void {
    if (this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(msg));
  }

  enqueueInput(input: PlayerInput): void {
    if (this.inputQueue.length >= 10) return;
    this.inputQueue.push(input);
    this.lastAckedSeq = Math.max(this.lastAckedSeq, input.seq);
  }

  drainInputs(): PlayerInput[] {
    const inputs = this.inputQueue;
    this.inputQueue = [];
    return inputs;
  }

  get lastAcked(): number {
    return this.lastAckedSeq;
  }
}
