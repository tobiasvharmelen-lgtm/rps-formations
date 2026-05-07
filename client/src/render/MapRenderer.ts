import { Container, Graphics } from "pixi.js";
import { MAP_WIDTH, MAP_HEIGHT, TOP_LANE_BARRIER_Y, BOTTOM_LANE_BARRIER_Y } from "shared";

const TILE_RADIUS = 3;

// P1 home: x in [0, 12000] and [108000, 120000] (wraps around seam)
// P2 home: x in [60000, 72000]
const P1_HOME_END         = 12_000;
const P1_HOME_RIGHT_START = 108_000;
const P2_HOME_START       = 60_000;
const P2_HOME_END         = 72_000;
const HOME_ALPHA          = 0.06;

export class MapRenderer {
  container: Container;
  private bgGfx: Graphics;
  private barrierGfx: Graphics;
  private bgDrawn = false;

  constructor() {
    this.container = new Container();
    this.container.label = "map";
    this.bgGfx = new Graphics();
    this.barrierGfx = new Graphics();
    this.container.addChild(this.bgGfx, this.barrierGfx);
  }

  render(_barrierOpen = false, _camera?: Camera): void {
    if (!this.bgDrawn) {
      this.bgDrawn = true;
      this._drawBackground();
      this._drawBarriers();
    }
  }

  private _drawBackground(): void {
    const g = this.bgGfx;
    g.clear();

    for (let n = -TILE_RADIUS; n <= TILE_RADIUS; n++) {
      const ox = n * MAP_WIDTH;

      // Map background
      g.rect(ox, 0, MAP_WIDTH, MAP_HEIGHT).fill({ color: 0x16162a });

      // P1 home: left portion of tile (x=0 to 12000) — red tint
      g.rect(ox, 0, P1_HOME_END, MAP_HEIGHT)
        .fill({ color: 0xe74c3c, alpha: HOME_ALPHA });
      // P1 home: right portion of tile (x=108000 to 120000) — red tint
      g.rect(ox + P1_HOME_RIGHT_START, 0, MAP_WIDTH - P1_HOME_RIGHT_START, MAP_HEIGHT)
        .fill({ color: 0xe74c3c, alpha: HOME_ALPHA });

      // P2 home: x=60000 to 72000 — blue tint
      g.rect(ox + P2_HOME_START, 0, P2_HOME_END - P2_HOME_START, MAP_HEIGHT)
        .fill({ color: 0x3498db, alpha: HOME_ALPHA });

      // Grid lines every 2000 mm
      const grid = 2000;
      for (let x = ox; x <= ox + MAP_WIDTH; x += grid) {
        g.moveTo(x, 0).lineTo(x, MAP_HEIGHT);
      }
      for (let y = 0; y <= MAP_HEIGHT; y += grid) {
        g.moveTo(ox, y).lineTo(ox + MAP_WIDTH, y);
      }
      g.stroke({ color: 0xffffff, alpha: 0.05, width: 20 });

      // Top + bottom borders
      g.moveTo(ox, 0).lineTo(ox + MAP_WIDTH, 0).stroke({ color: 0x444466, width: 40 });
      g.moveTo(ox, MAP_HEIGHT).lineTo(ox + MAP_WIDTH, MAP_HEIGHT).stroke({ color: 0x444466, width: 40 });
    }
  }

  private _drawBarriers(): void {
    const g = this.barrierGfx;
    g.clear();

    for (let n = -TILE_RADIUS; n <= TILE_RADIUS; n++) {
      const ox = n * MAP_WIDTH;

      // Top lane barrier (separates top lane from middle)
      g.moveTo(ox, TOP_LANE_BARRIER_Y).lineTo(ox + MAP_WIDTH, TOP_LANE_BARRIER_Y)
        .stroke({ color: 0xaaaaaa, alpha: 0.85, width: 50 });

      // Bottom lane barrier (separates bottom lane from middle)
      g.moveTo(ox, BOTTOM_LANE_BARRIER_Y).lineTo(ox + MAP_WIDTH, BOTTOM_LANE_BARRIER_Y)
        .stroke({ color: 0xaaaaaa, alpha: 0.85, width: 50 });

      // Gates: small openings in the barriers for lane switching
      // Gate 1 at x=30000, Gate 2 at x=90000, with +/- 2000mm radius
      const gateRadius = 2_000;
      const gates = [30_000, 90_000];
      for (const gateX of gates) {
        const bx = ox + gateX;
        // Render gate as a slightly different color (lighter) to indicate it's closeable
        g.moveTo(bx - gateRadius, TOP_LANE_BARRIER_Y).lineTo(bx + gateRadius, TOP_LANE_BARRIER_Y)
          .stroke({ color: 0x888888, alpha: 0.5, width: 50 });
        g.moveTo(bx - gateRadius, BOTTOM_LANE_BARRIER_Y).lineTo(bx + gateRadius, BOTTOM_LANE_BARRIER_Y)
          .stroke({ color: 0x888888, alpha: 0.5, width: 50 });
      }
    }
  }
}

// Keep Camera import optional — MapRenderer.render() accepts it but doesn't use it
import type { Camera } from "./Camera.js";
