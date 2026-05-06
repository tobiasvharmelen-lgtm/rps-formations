import { Container, Graphics } from "pixi.js";
import { MAP_WIDTH, MAP_HEIGHT, WAR_ZONE_DEPTH } from "shared";

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

  render(barrierOpen = false): void {
    if (!this.bgDrawn) {
      this.bgDrawn = true;
      this._drawBackground();
    }
    if (barrierOpen !== this.barrierWasOpen) {
      this.barrierWasOpen = barrierOpen;
      this._drawBarrier(barrierOpen);
    }
  }

  private _drawBackground(): void {
    const g = this.bgGfx;
    g.clear();

    // Map background
    g.rect(0, 0, MAP_WIDTH, MAP_HEIGHT).fill({ color: 0x16162a });

    // War zone overlays (D-shaped via rect — exact shape is cosmetic)
    g.rect(0, 0, WAR_ZONE_DEPTH, MAP_HEIGHT).fill({ color: 0xff0000, alpha: 0.06 });
    g.rect(MAP_WIDTH - WAR_ZONE_DEPTH, 0, WAR_ZONE_DEPTH, MAP_HEIGHT).fill({ color: 0x0088ff, alpha: 0.06 });

    // War zone inner boundary arcs
    g.arc(2_000, MAP_HEIGHT / 2, WAR_ZONE_DEPTH - 2_000, -Math.PI / 2, Math.PI / 2)
      .stroke({ color: 0xff4444, alpha: 0.5, width: 40 });
    g.arc(MAP_WIDTH - 2_000, MAP_HEIGHT / 2, WAR_ZONE_DEPTH - 2_000, Math.PI / 2, -Math.PI / 2)
      .stroke({ color: 0x4488ff, alpha: 0.5, width: 40 });

    // Grid lines every 2000 mm
    const grid = 2000;
    for (let x = 0; x <= MAP_WIDTH; x += grid) {
      g.moveTo(x, 0).lineTo(x, MAP_HEIGHT);
    }
    for (let y = 0; y <= MAP_HEIGHT; y += grid) {
      g.moveTo(0, y).lineTo(MAP_WIDTH, y);
    }
    g.stroke({ color: 0xffffff, alpha: 0.05, width: 20 });

    // Center vertical divider (midfield reference)
    g.moveTo(MAP_WIDTH / 2, 0).lineTo(MAP_WIDTH / 2, MAP_HEIGHT);
    g.stroke({ color: 0xffffff, alpha: 0.15, width: 30 });

    // Map border
    g.rect(0, 0, MAP_WIDTH, MAP_HEIGHT).stroke({ color: 0x444466, width: 40 });
  }

  private _drawBarrier(open: boolean): void {
    const g = this.barrierGfx;
    g.clear();
    if (open) return;

    // Dashed horizontal barrier line at MAP_HEIGHT/2
    const y = MAP_HEIGHT / 2;
    const x0 = WAR_ZONE_DEPTH;
    const x1 = MAP_WIDTH - WAR_ZONE_DEPTH;
    const dashLen = 600;
    const gap = 300;
    let x = x0;
    while (x < x1) {
      const end = Math.min(x + dashLen, x1);
      g.moveTo(x, y).lineTo(end, y);
      x = end + gap;
    }
    g.stroke({ color: 0xff2222, alpha: 0.8, width: 50 });
  }
}
