/**
 * Phase 1+2+3: local sandbox running the authoritative simulation in-browser.
 * The user controls Player 1; Player 2 is dormant (or spawned via Shift+Z/X/C for testing).
 * No networking — replaced in Phase 4.
 */
import { PlayerId, TICK_MS, UnitType } from "shared";
import { LocalSimulation } from "./LocalSimulation.js";
import { LocalBackend } from "./input/LocalBackend.js";
import { WorldRenderer } from "./render/WorldRenderer.js";
import { SelectionManager } from "./input/SelectionManager.js";
import { CommandDispatcher } from "./input/CommandDispatcher.js";
import { InputHandler } from "./input/InputHandler.js";

export class LocalGame {
  private sim = new LocalSimulation();
  private backend = new LocalBackend(this.sim, PlayerId.One);
  private renderer = new WorldRenderer();
  private selection = new SelectionManager(PlayerId.One);
  private dispatcher!: CommandDispatcher;
  private input!: InputHandler;
  private lastFrameTime = 0;
  private tickAccum = 0;
  private rafId = 0;

  async init(): Promise<void> {
    const canvas = await this.renderer.init();
    document.body.appendChild(canvas);

    this.dispatcher = new CommandDispatcher(this.backend, this.selection);
    this.input = new InputHandler(canvas, this.renderer.camera, this.backend, this.selection, this.dispatcher);

    (window as any).__GAME__ = this;
    (window as any).__RENDERER__ = this.renderer;
  }

  start(): void {
    this.sim.start();
    this.spawnStarterUnits();
    this.lastFrameTime = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
  }

  /** Give each side a few starter units so the player has something to play with. */
  private spawnStarterUnits(): void {
    for (let i = 0; i < 4; i++) {
      this.dispatcher.spawnUnit(PlayerId.One, UnitType.Rock);
      this.dispatcher.spawnUnit(PlayerId.One, UnitType.Paper);
      this.dispatcher.spawnUnit(PlayerId.One, UnitType.Scissors);
      this.dispatcher.spawnUnit(PlayerId.Two, UnitType.Rock);
      this.dispatcher.spawnUnit(PlayerId.Two, UnitType.Paper);
      this.dispatcher.spawnUnit(PlayerId.Two, UnitType.Scissors);
    }
  }

  private loop = (now: number): void => {
    const dtMs = now - this.lastFrameTime;
    this.lastFrameTime = now;
    this.tickAccum += dtMs;

    while (this.tickAccum >= TICK_MS) {
      this.sim.tick();
      this.tickAccum -= TICK_MS;
    }

    // Drop selected units that died or got captured
    this.selection.reconcile(this.sim.state);

    this.renderer.update(dtMs / 1000);
    this.renderer.render(this.sim.state, this.selection.selectedIds, this.input.dragBox);
    this.rafId = requestAnimationFrame(this.loop);
  };

  stop(): void { cancelAnimationFrame(this.rafId); }
}
