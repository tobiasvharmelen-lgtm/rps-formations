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

    this.pixi.worldLayer.addChild(
      this.map.container,
      this.terrain.container,
      this.zones.container,
      this.bases.container,
      this.buildings.container,
      this.effects.container,
      this.units.container,
      this.selection.worldContainer,
    );
    this.pixi.uiLayer.addChild(this.ui.container, this.selection.screenContainer);

    this.map.render();

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

  render(
    state: GameState,
    selectedIds: ReadonlySet<number> = new Set(),
    dragBox?: DragBox,
    onSubSelect?: (ids: number[]) => void,
    selectedBuildingId?: number | null,
    onUpgrade?: (buildingId: number) => void,
  ): void {
    const cam = this.camera;

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

    this.map.render(cam);
    this.terrain.render(state.terrain, cam);
    this.zones.render(state.zones, cam);
    this.bases.render(state.bases, cam);
    this.buildings.render(state.buildings, cam);
    this.buildings.renderGates(state.gates, cam);
    this.units.render(state.units, cam);
    this.effects.render(cam);
    this.ui.render(state, selectedIds, onSubSelect ?? (() => {}), selectedBuildingId, onUpgrade);

    if (dragBox) {
      this.selection.render(state, selectedIds, dragBox, cam);
    }
  }
}
