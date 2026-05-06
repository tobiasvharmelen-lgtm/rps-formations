import { Container, Graphics } from "pixi.js";
import { MAP_WIDTH, MAP_HEIGHT, WAR_ZONE_DEPTH, BARRIER_MIDDLE_X_MIN, BARRIER_MIDDLE_X_MAX } from "shared";
import type { Camera } from "./Camera.js";

// Draw this many tile copies in each direction so any zoom level is covered.
const TILE_RADIUS = 3;

export class MapRenderer {
  container: Container;
  private bgGfx: Graphics;
  private barrierGfx: Graphics;
  private bgDrawn = false;
  private barrierWasOpen = false;

  constructor() {
    this.container = new Container();
    this.container.label = "map";
    this.bgGfx = new Graphics();
    this.barrierGfx = new Graphics();
    this.container.addChild(this.bgGfx, this.barrierGfx);
  }

  render(barrierOpen = false, _camera?: Camera): void {
    if (!this.bgDrawn) {
      this.bgDrawn = true;
      this._drawBackground();
      this._drawBarrier(barrierOpen);
      this.barrierWasOpen = barrierOpen;
    } else if (barrierOpen !== this.barrierWasOpen) {
      this.barrierWasOpen = barrierOpen;
      this._drawBarrier(barrierOpen);
    }
  }

  private _drawBackground(): void {
    const g = this.bgGfx;
    g.clear();

    for (let n = -TILE_RADIUS; n <= TILE_RADIUS; n++) {
      const ox = n * MAP_WIDTH;

      // Map background
      g.rect(ox, 0, MAP_WIDTH, MAP_HEIGHT).fill({ color: 0x16162a });

      // War zone overlays
      g.rect(ox, 0, WAR_ZONE_DEPTH, MAP_HEIGHT).fill({ color: 0xff0000, alpha: 0.06 });
      g.rect(ox + MAP_WIDTH - WAR_ZONE_DEPTH, 0, WAR_ZONE_DEPTH, MAP_HEIGHT).fill({ color: 0x0088ff, alpha: 0.06 });

      // War zone inner boundary arcs
      g.arc(ox + 2_000, MAP_HEIGHT / 2, WAR_ZONE_DEPTH - 2_000, -Math.PI / 2, Math.PI / 2)
        .stroke({ color: 0xff4444, alpha: 0.5, width: 40 });
      g.arc(ox + MAP_WIDTH - 2_000, MAP_HEIGHT / 2, WAR_ZONE_DEPTH - 2_000, Math.PI / 2, -Math.PI / 2)
        .stroke({ color: 0x4488ff, alpha: 0.5, width: 40 });

      // Grid lines every 2000 mm
      const grid = 2000;
      for (let x = ox; x <= ox + MAP_WIDTH; x += grid) {
        g.moveTo(x, 0).lineTo(x, MAP_HEIGHT);
      }
      for (let y = 0; y <= MAP_HEIGHT; y += grid) {
        g.moveTo(ox, y).lineTo(ox + MAP_WIDTH, y);
      }
      g.stroke({ color: 0xffffff, alpha: 0.05, width: 20 });

      // Center vertical divider
      g.moveTo(ox + MAP_WIDTH / 2, 0).lineTo(ox + MAP_WIDTH / 2, MAP_HEIGHT);
      g.stroke({ color: 0xffffff, alpha: 0.15, width: 30 });

      // Top + bottom borders only (no left/right — seamless cylinder)
      g.moveTo(ox, 0).lineTo(ox + MAP_WIDTH, 0).stroke({ color: 0x444466, width: 40 });
      g.moveTo(ox, MAP_HEIGHT).lineTo(ox + MAP_WIDTH, MAP_HEIGHT).stroke({ color: 0x444466, width: 40 });
    }
  }

  private _drawBarrier(open: boolean): void {
    const g = this.barrierGfx;
    g.clear();

    const y = MAP_HEIGHT / 2;

    for (let n = -TILE_RADIUS; n <= TILE_RADIUS; n++) {
      const ox = n * MAP_WIDTH;

      // Permanent wall 1 (always blocks): WAR_ZONE_DEPTH → BARRIER_MIDDLE_X_MIN
      g.moveTo(ox + WAR_ZONE_DEPTH, y).lineTo(ox + BARRIER_MIDDLE_X_MIN, y)
        .stroke({ color: 0xaaaaaa, alpha: 0.85, width: 50 });

      // Permanent wall 2 (always blocks): BARRIER_MIDDLE_X_MAX → MAP_WIDTH - WAR_ZONE_DEPTH
      g.moveTo(ox + BARRIER_MIDDLE_X_MAX, y).lineTo(ox + MAP_WIDTH - WAR_ZONE_DEPTH, y)
        .stroke({ color: 0xaaaaaa, alpha: 0.85, width: 50 });

      // Breakable middle section (dashed yellow — only when not open)
      if (!open) {
        const midLen = BARRIER_MIDDLE_X_MAX - BARRIER_MIDDLE_X_MIN;
        const segW = midLen / 5;
        for (let s = 0; s < 5; s += 2) {
          const sx = ox + BARRIER_MIDDLE_X_MIN + s * segW;
          g.moveTo(sx, y).lineTo(sx + segW, y)
            .stroke({ color: 0xffd700, alpha: 0.9, width: 50 });
        }
      }
    }
  }
}
