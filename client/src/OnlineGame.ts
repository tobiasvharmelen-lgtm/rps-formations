import { PlayerId, MsgType } from "shared";
import { ServerConnection } from "./net/ServerConnection.js";
import { ClientSimulation } from "./net/ClientSimulation.js";
import { NetworkBackend } from "./input/NetworkBackend.js";
import { SelectionManager } from "./input/SelectionManager.js";
import { CommandDispatcher } from "./input/CommandDispatcher.js";
import { InputHandler } from "./input/InputHandler.js";
import { WorldRenderer } from "./render/WorldRenderer.js";

function wsUrl(): string {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  // In dev Vite proxies /ws, in prod same host serves WS
  return `${proto}//${location.host}/ws`;
}

export class OnlineGame {
  private conn: ServerConnection;
  private clientSim: ClientSimulation;
  private backend: NetworkBackend;
  private selection = new SelectionManager(PlayerId.One);
  private renderer = new WorldRenderer();
  private dispatcher!: CommandDispatcher;
  private input!: InputHandler;
  private rafId = 0;
  private lastFrameTime = 0;
  private canvas: HTMLCanvasElement | null = null;

  /** DOM overlay shown while connecting / waiting for a match. */
  private overlay: HTMLDivElement;

  constructor() {
    this.conn = new ServerConnection(wsUrl());
    this.clientSim = new ClientSimulation(this.conn);
    this.backend = new NetworkBackend(this.conn, this.clientSim);

    this.overlay = this.buildOverlay("Connecting…");
    document.body.appendChild(this.overlay);
  }

  async init(): Promise<void> {
    this.canvas = await this.renderer.init();
    this.canvas.style.display = "none";
    document.body.appendChild(this.canvas);

    this.dispatcher = new CommandDispatcher(this.backend, this.selection);
    this.input = new InputHandler(
      this.canvas,
      this.renderer.camera,
      this.backend,
      this.selection,
      this.dispatcher,
    );

    // Status overlay text
    this.conn.onStatus(status => {
      if (status === "connecting" || status === "reconnecting") {
        this.setOverlayText(status === "reconnecting" ? "Reconnecting…" : "Connecting…");
        this.showOverlay();
      } else if (status === "connected") {
        this.setOverlayText("Waiting for opponent…");
      }
    });

    // When matched: server sends S_HELLO with our playerId
    this.conn.onMessage(msg => {
      if (msg.type === MsgType.S_HELLO) {
        this.selection.humanPlayer = msg.playerId;
        this.setOverlayText("Match found! Starting…");
      }
      if (msg.type === MsgType.S_GAME_STATE && this.rafId === 0) {
        // First snapshot received — hide overlay, show game
        this.hideOverlay();
        this.canvas!.style.display = "block";
        this.lastFrameTime = performance.now();
        this.rafId = requestAnimationFrame(this.loop);
      }
    });
  }

  start(): void {
    this.conn.connect();
    // Auto-join matchmaking queue once WS opens
    this.conn.onStatus(status => {
      if (status === "connected" && !this.conn.sessionToken) {
        this.conn.joinQueue();
      }
    });
  }

  private loop = (now: number): void => {
    this.rafId = requestAnimationFrame(this.loop);
    const dtSec = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;

    this.clientSim.sample();
    const state = this.clientSim.state;
    if (!state) return;

    this.selection.reconcile(state);
    this.renderer.update(dtSec);
    this.renderer.showPlacingMode(this.input.placingBuilding);
    this.renderer.render(
      state,
      this.selection.selectedIds,
      this.input.dragBox,
      ids => this.selection.set(ids),
      this.input.selectedBuildingId,
      id => this.dispatcher.upgradeBuilding(id),
    );
  };

  stop(): void {
    cancelAnimationFrame(this.rafId);
    this.conn.disconnect();
    this.overlay.remove();
    this.canvas?.remove();
  }

  private buildOverlay(text: string): HTMLDivElement {
    const div = document.createElement("div");
    div.id = "online-overlay";
    div.style.cssText = [
      "position:fixed;inset:0;display:flex;align-items:center;justify-content:center;",
      "background:#1a1a2e;color:#e0e0ff;font-family:monospace;font-size:1.4rem;",
      "z-index:10;",
    ].join("");
    div.textContent = text;
    return div;
  }

  private setOverlayText(text: string): void {
    this.overlay.textContent = text;
  }

  private showOverlay(): void {
    this.overlay.style.display = "flex";
  }

  private hideOverlay(): void {
    this.overlay.style.display = "none";
  }
}
