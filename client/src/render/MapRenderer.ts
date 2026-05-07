import { Container, Graphics } from "pixi.js";
import {
  MAP_WIDTH, MAP_HEIGHT,
  MIDDLE_BARRIER_Y, BARRIER_LEFT_START, BARRIER_LEFT_END, BARRIER_RIGHT_START, BARRIER_RIGHT_END,
  GATE_X_LEFT, GATE_X_RIGHT, GATE_RADIUS,
  P1_HOME_END, P1_HOME_RIGHT_START, P2_HOME_START, P2_HOME_END,
} from "shared";

const TILE_RADIUS = 3;
const HOME_ALPHA  = 0.06;

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

  render(_camera?: Camera): void {
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

      // Left middle barrier: from BARRIER_LEFT_START to BARRIER_LEFT_END
      // Split around gate opening at GATE_X_LEFT
      g.moveTo(ox + BARRIER_LEFT_START, MIDDLE_BARRIER_Y)
        .lineTo(ox + GATE_X_LEFT - GATE_RADIUS, MIDDLE_BARRIER_Y)
        .stroke({ color: 0xaaaaaa, alpha: 0.85, width: 50 });
      g.moveTo(ox + GATE_X_LEFT + GATE_RADIUS, MIDDLE_BARRIER_Y)
        .lineTo(ox + BARRIER_LEFT_END, MIDDLE_BARRIER_Y)
        .stroke({ color: 0xaaaaaa, alpha: 0.85, width: 50 });

      // Right middle barrier: from BARRIER_RIGHT_START to BARRIER_RIGHT_END
      // Split around gate opening at GATE_X_RIGHT
      g.moveTo(ox + BARRIER_RIGHT_START, MIDDLE_BARRIER_Y)
        .lineTo(ox + GATE_X_RIGHT - GATE_RADIUS, MIDDLE_BARRIER_Y)
        .stroke({ color: 0xaaaaaa, alpha: 0.85, width: 50 });
      g.moveTo(ox + GATE_X_RIGHT + GATE_RADIUS, MIDDLE_BARRIER_Y)
        .lineTo(ox + BARRIER_RIGHT_END, MIDDLE_BARRIER_Y)
        .stroke({ color: 0xaaaaaa, alpha: 0.85, width: 50 });

      // Gate circles (decorative — always visible)
      for (const gx of [GATE_X_LEFT, GATE_X_RIGHT]) {
        g.circle(ox + gx, MIDDLE_BARRIER_Y, GATE_RADIUS)
          .fill({ color: 0x222244, alpha: 0.7 })
          .stroke({ color: 0xaaaaaa, alpha: 0.6, width: 30 });
      }
    }
  }
}

