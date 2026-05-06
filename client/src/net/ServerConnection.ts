import { MsgType, ServerMessage, ClientMessage, PlayerId } from "shared";

export type ServerMessageHandler = (msg: ServerMessage) => void;
export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "reconnecting";
export type StatusListener = (status: ConnectionStatus) => void;

const RECONNECT_DELAYS = [500, 1000, 2000, 4000, 8000]; // ms, exponential

export class ServerConnection {
  private ws: WebSocket | null = null;
  private url: string;
  private status: ConnectionStatus = "disconnected";

  private messageListeners: ServerMessageHandler[] = [];
  private statusListeners: StatusListener[] = [];

  /** Server-assigned info filled in once S_HELLO arrives. */
  playerId: PlayerId | null = null;
  sessionToken: string | null = null;
  serverTickRate: number | null = null;

  /** Median round-trip time (ms), set after 5-ping clock sync. */
  rttMs: number | null = null;

  /**
   * Estimated offset: add to performance.now() to get approximate server wall-clock time.
   * 0 until the first clock sync completes.
   */
  serverTimeOffset = 0;

  private reconnectAttempt = 0;
  private wantConnected = false;

  constructor(url: string) {
    this.url = url;
  }

  connect(): void {
    this.wantConnected = true;
    this.openSocket();
  }

  disconnect(): void {
    this.wantConnected = false;
    this.setStatus("disconnected");
    this.ws?.close();
    this.ws = null;
  }

  send(msg: ClientMessage): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(msg));
  }

  onMessage(handler: ServerMessageHandler): void {
    this.messageListeners.push(handler);
  }

  onStatus(listener: StatusListener): void {
    this.statusListeners.push(listener);
    listener(this.status);
  }

  joinQueue(): void {
    this.send({ type: MsgType.C_JOIN_QUEUE });
  }

  ping(): void {
    this.send({ type: MsgType.C_PING, clientTime: performance.now() });
  }

  private openSocket(): void {
    this.setStatus(this.reconnectAttempt > 0 ? "reconnecting" : "connecting");

    try {
      this.ws = new WebSocket(this.url);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.addEventListener("open", () => {
      this.reconnectAttempt = 0;
      this.setStatus("connected");

      // If we have a session, attempt reconnect to existing match
      if (this.sessionToken) {
        this.send({
          type: MsgType.C_RECONNECT,
          sessionToken: this.sessionToken,
          lastKnownTick: 0,
        });
      }

      // Measure clock offset via 5 pings; non-blocking
      this.pingClock().catch(() => {});
    });

    this.ws.addEventListener("message", (e) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(e.data) as ServerMessage;
      } catch {
        return;
      }

      // Capture session info from S_HELLO
      if (msg.type === MsgType.S_HELLO) {
        this.playerId = msg.playerId;
        this.sessionToken = msg.sessionToken;
        this.serverTickRate = msg.serverTickRate;
      }

      // Update RTT from S_PONG
      if (msg.type === MsgType.S_PONG) {
        this.rttMs = performance.now() - msg.clientTime;
      }

      for (const h of this.messageListeners) h(msg);
    });

    this.ws.addEventListener("close", () => {
      this.ws = null;
      if (this.wantConnected) this.scheduleReconnect();
    });

    this.ws.addEventListener("error", () => {
      this.ws?.close();
    });
  }

  /** Run 5 pings, compute median RTT + server time offset. */
  private async pingClock(): Promise<void> {
    const PING_COUNT = 5;
    const rtts: number[] = [];
    const offsets: number[] = [];

    for (let i = 0; i < PING_COUNT; i++) {
      const result = await this.singlePing();
      if (result !== null) {
        rtts.push(result.rtt);
        offsets.push(result.offset);
      }
      if (i < PING_COUNT - 1) await new Promise<void>(r => setTimeout(r, 20));
    }

    if (rtts.length === 0) return;
    rtts.sort((a, b) => a - b);
    offsets.sort((a, b) => a - b);
    const mid = Math.floor(rtts.length / 2);
    this.rttMs = rtts[mid];
    this.serverTimeOffset = offsets[mid];
  }

  /** Send one ping and resolve with RTT + estimated server time offset. */
  private singlePing(): Promise<{ rtt: number; offset: number } | null> {
    return new Promise(resolve => {
      const t0 = performance.now();
      const timeout = setTimeout(() => {
        this.messageListeners = this.messageListeners.filter(h => h !== handler);
        resolve(null);
      }, 2000);

      const handler = (msg: ServerMessage) => {
        if (msg.type !== MsgType.S_PONG) return;
        clearTimeout(timeout);
        this.messageListeners = this.messageListeners.filter(h => h !== handler);
        const rtt = performance.now() - t0;
        // Estimate server clock: serverTime was captured at send, add half RTT for one-way
        const offset = (msg.serverTime + rtt / 2) - performance.now();
        resolve({ rtt, offset });
      };

      this.messageListeners.push(handler);
      this.send({ type: MsgType.C_PING, clientTime: t0 });
    });
  }

  private scheduleReconnect(): void {
    const delay = RECONNECT_DELAYS[Math.min(this.reconnectAttempt, RECONNECT_DELAYS.length - 1)];
    this.reconnectAttempt++;
    this.setStatus("reconnecting");
    setTimeout(() => {
      if (this.wantConnected) this.openSocket();
    }, delay);
  }

  private setStatus(status: ConnectionStatus): void {
    if (this.status === status) return;
    this.status = status;
    for (const l of this.statusListeners) l(status);
  }

  get connectionStatus(): ConnectionStatus {
    return this.status;
  }
}
