/**
 * Phase 1+2+3: local sandbox running the authoritative simulation in-browser.
 * The user controls Player 1; Player 2 is dormant (or spawned via Shift+Z/X/C for testing).
 * No networking — replaced in Phase 4.
 */
import { PlayerId, TICK_MS, UnitType, InputType, LOBBY_COLORS } from "shared";
import { LocalSimulation } from "./LocalSimulation.js";
import { LocalBackend } from "./input/LocalBackend.js";
import { WorldRenderer } from "./render/WorldRenderer.js";
import { SelectionManager } from "./input/SelectionManager.js";
import { CommandDispatcher } from "./input/CommandDispatcher.js";
import { InputHandler } from "./input/InputHandler.js";
import { LobbyScreen } from "./LobbyScreen.js";
import { playerColors } from "./playerColors.js";

export class LocalGame {
  private sim!: LocalSimulation;
  private backend!: LocalBackend;
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

    (window as any).__GAME__ = this;
    (window as any).__RENDERER__ = this.renderer;
  }

  start(): void {
    // Show lobby screen before starting
    const canvas = document.querySelector("canvas")!;
    canvas.style.display = "none";

    const lobby = new LobbyScreen(
      () => {}, // local: no network update needed
      () => {
        const p1 = lobby.getP1Choice();
        const p2 = lobby.getP2Choice();

        // Apply colors
        playerColors.p1 = LOBBY_COLORS[p1.colorIndex]?.hex ?? playerColors.p1;
        playerColors.p2 = LOBBY_COLORS[p2.colorIndex]?.hex ?? playerColors.p2;

        lobby.remove();
        canvas.style.display = "block";
        this._startGame({
          mapType: p1.mapType,
          incomeMultiplier: p1.incomeMultiplier,
          p1Color: playerColors.p1,
          p2Color: playerColors.p2,
        });
      },
      1,
    );
  }

  private _startGame(config: { mapType?: number; incomeMultiplier?: number; p1Color?: number; p2Color?: number }): void {
    this.sim = new LocalSimulation(config);
    this.backend = new LocalBackend(this.sim, PlayerId.One);

    this.dispatcher = new CommandDispatcher(this.backend, this.selection);
    this.input = new InputHandler(
      document.querySelector("canvas")!,
      this.renderer.camera,
      this.backend,
      this.selection,
      this.dispatcher,
    );

    // Expose gold cheat for settings panel G-key
    (window as any).__cheatGold = () => {
      this.backend.send({ type: InputType.CheatGold });
    };

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
    this.renderer.showPlacingMode(this.input.placingBuilding);
    this.renderer.render(
      this.sim.state,
      this.selection.selectedIds,
      this.input.dragBox,
      ids => this.selection.set(ids),
      this.input.selectedBuildingId,
      id => this.dispatcher.upgradeBuilding(id),
      ids => this.dispatcher.fuseGroup(ids),
    );
    this.rafId = requestAnimationFrame(this.loop);
  };

  stop(): void { cancelAnimationFrame(this.rafId); }
}
