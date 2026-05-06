import { Container, Graphics } from "pixi.js";
import { MAP_WIDTH, MAP_HEIGHT } from "shared";

export class MapRenderer {
  container: Container;
  private gfx: Graphics;
  private drawn = false;

  constructor() {
    this.container = new Container();
    this.container.label = "map";
    this.gfx = new Graphics();
    this.container.addChild(this.gfx);
  }

  render(): void {
    if (this.drawn) return;
    this.drawn = true;

    const g = this.gfx;
    g.clear();

    // Map background
    g.rect(0, 0, MAP_WIDTH, MAP_HEIGHT).fill({ color: 0x16162a });

    // Grid lines every 2000 mm
    const grid = 2000;
    for (let x = 0; x <= MAP_WIDTH; x += grid) {
      g.moveTo(x, 0).lineTo(x, MAP_HEIGHT);
    }
    for (let y = 0; y <= MAP_HEIGHT; y += grid) {
      g.moveTo(0, y).lineTo(MAP_WIDTH, y);
    }
    g.stroke({ color: 0xffffff, alpha: 0.05, width: 20 });

    // Center divider
    g.moveTo(MAP_WIDTH / 2, 0).lineTo(MAP_WIDTH / 2, MAP_HEIGHT);
    g.stroke({ color: 0xffffff, alpha: 0.15, width: 30 });

    // Map border
    g.rect(0, 0, MAP_WIDTH, MAP_HEIGHT).stroke({ color: 0x444466, width: 40 });
  }
}
