import { Container, Graphics } from "pixi.js";
import { MAP_WIDTH, MAP_HEIGHT, VERT_BARRIER_XS, LANE_GAP_HEIGHT } from "shared";

const TILE_RADIUS = 3;

// P1 home: x in [21000, 24000] and [0, 3000] (wraps around seam at 0)
// P2 home: x in [9000, 15000]
const P1_HOME_RIGHT_START = VERT_BARRIER_XS[3]; // 21000
const P2_HOME_START       = VERT_BARRIER_XS[1]; // 9000
const P2_HOME_END         = VERT_BARRIER_XS[2]; // 15000
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

      // P1 home: right portion of tile (x=21000 to 24000) — red tint
      g.rect(ox + P1_HOME_RIGHT_START, 0, MAP_WIDTH - P1_HOME_RIGHT_START, MAP_HEIGHT)
        .fill({ color: 0xe74c3c, alpha: HOME_ALPHA });
      // P1 home: left portion of tile (x=0 to 3000) — red tint
      g.rect(ox, 0, VERT_BARRIER_XS[0], MAP_HEIGHT)
        .fill({ color: 0xe74c3c, alpha: HOME_ALPHA });

      // P2 home: x=9000 to 15000 — blue tint
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

    const y0 = LANE_GAP_HEIGHT;
    const y1 = MAP_HEIGHT - LANE_GAP_HEIGHT;

    for (let n = -TILE_RADIUS; n <= TILE_RADIUS; n++) {
      const ox = n * MAP_WIDTH;
      for (const barrierX of VERT_BARRIER_XS) {
        const bx = ox + barrierX;
        g.moveTo(bx, y0).lineTo(bx, y1)
          .stroke({ color: 0xaaaaaa, alpha: 0.85, width: 50 });
      }
    }
  }
}

// Keep Camera import optional — MapRenderer.render() accepts it but doesn't use it
import type { Camera } from "./Camera.js";
