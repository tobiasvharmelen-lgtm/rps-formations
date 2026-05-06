import { GameState, Unit, BuildingType } from "shared";
import { PixiApp } from "./PixiApp.js";
import { Camera } from "./Camera.js";
import { MapRenderer } from "./MapRenderer.js";
import { ZoneRenderer } from "./ZoneRenderer.js";
import { BaseRenderer } from "./BaseRenderer.js";
import { UnitRenderer } from "./UnitRenderer.js";
import { BuildingRenderer } from "./BuildingRenderer.js";
import { TerrainRenderer } from "./TerrainRenderer.js";
import { EffectsRenderer } from "./EffectsRenderer.js";
import { UIRenderer } from "./UIRenderer.js";
import { SelectionRenderer } from "./SelectionRenderer.js";
import type { DragBox } from "../input/InputHandler.js";

export class WorldRenderer {
  pixi: PixiApp;
  camera!: Camera;

  private map = new MapRenderer();
  private zones = new ZoneRenderer();
  private bases = new BaseRenderer();
  private terrain = new TerrainRenderer();
  private units = new UnitRenderer();
  private buildings = new BuildingRenderer();
  private effects = new EffectsRenderer();
  private ui!: UIRenderer;
  selection = new SelectionRenderer();

  /** Snapshot of last frame's units (for death detection) */
  private prevUnits = new Map<number, Unit>();
  private prevTick = -1;

  constructor() {
    this.pixi = new PixiApp();
  }

  async init(): Promise<HTMLCanvasElement> {
    const canvas = await this.pixi.init();

    const sw = () => this.pixi.screenWidth;
    const sh = () => this.pixi.screenHeight;

    this.camera = new Camera(this.pixi.worldLayer, sw, sh);
    this.ui = new UIRenderer(sw, sh);

    // Add world-space layers in z-order
    this.pixi.worldLayer.addChild(
      this.map.container,
      this.terrain.container,   // terrain scars below units
      this.zones.container,
      this.bases.container,
      this.buildings.container, // buildings above ground
      this.effects.container,   // effects above ground but below units
      this.units.container,
      this.selection.worldContainer, // selection rings above units
    );
    this.pixi.uiLayer.addChild(this.ui.container, this.selection.screenContainer);

    this.map.render(false);

    // Re-fit camera on window resize
    window.addEventListener("resize", () => {
      this.camera.fitToView();
    });

    return canvas;
  }

  update(dtSec: number): void {
    this.camera.update(dtSec);
  }

  showPlacingMode(type: BuildingType | null): void {
    this.ui.showPlacingMode(type);
  }

  render(state: GameState, selectedIds: ReadonlySet<number> = new Set(), dragBox?: DragBox): void {
    // Effects: only detect deaths once per tick
    if (state.tick !== this.prevTick) {
      const currentIds = new Set(state.units.map(u => u.id));
      this.effects.trackDeaths(this.prevUnits, currentIds);
      for (const e of state.mergeEvents) {
        this.effects.spawnMerge(e.x, e.y);
      }
      this.prevTick = state.tick;
      this.prevUnits.clear();
      for (const u of state.units) this.prevUnits.set(u.id, { ...u });
    }

    this.map.render(state.barrierOpen);
    this.terrain.render(state.terrain);
    this.zones.render(state.zones);
    this.bases.render(state.bases);
    this.buildings.render(state.buildings);
    this.units.render(state.units);
    this.effects.render();
    this.ui.render(state, selectedIds.size);

    if (dragBox) {
      this.selection.render(state, selectedIds, dragBox, this.camera);
    }
  }
}
