import { Container, Graphics, Text } from "pixi.js";
import { Base, PlayerId, MAP_WIDTH, BASE_CAPTURE_TICKS } from "shared";
import type { Camera } from "./Camera.js";

export class BaseRenderer {
  container: Container;
  private gfx = new Graphics();
  private labels: Text[] = [];
  private initialized = false;

  constructor() {
    this.container = new Container();
    this.container.label = "bases";
    this.container.addChild(this.gfx);
  }

  render(bases: [Base, Base], camera: Camera): void {
    const g = this.gfx;
    g.clear();

    if (!this.initialized) {
      for (const base of bases) {
        const label = new Text({
          text: base.owner === PlayerId.One ? "P1" : "P2",
          style: { fill: 0xffffff, fontSize: 240, fontFamily: "monospace", fontWeight: "bold" },
        });
        label.anchor.set(0.5);
        this.container.addChild(label);
        this.labels.push(label);
      }
      this.initialized = true;
    }

    bases.forEach((base, i) => {
      const color = base.owner === PlayerId.One ? 0xe74c3c : 0x3498db;
      const r = 500;

      for (const offset of camera.tileOffsets(base.x)) {
        const bx = base.x + offset;

        g.moveTo(bx + r, base.y);
        g.circle(bx, base.y, r).stroke({ color, width: 50 });
        g.moveTo(bx + r * 0.85, base.y);
        g.circle(bx, base.y, r * 0.85).stroke({ color, alpha: 0.4, width: 30 });

        const barW = r * 2;
        const barH = 100;
        const barX = bx - r;
        const barY = base.y + r + 60;
        g.rect(barX, barY, barW, barH).fill({ color: 0x222244 });
        g.rect(barX, barY, barW * (base.hp / base.maxHp), barH).fill({ color });
        g.rect(barX, barY, barW, barH).stroke({ color: 0x000000, alpha: 0.5, width: 4 });

        // Capture progress bar (orange) — only shown when being contested
        if (base.captureProgress > 0) {
          const capY = barY + barH + 20;
          const capH = 80;
          g.rect(barX, capY, barW, capH).fill({ color: 0x222222 });
          g.rect(barX, capY, barW * (base.captureProgress / BASE_CAPTURE_TICKS), capH).fill({ color: 0xff8800 });
          g.rect(barX, capY, barW, capH).stroke({ color: 0x000000, alpha: 0.5, width: 4 });
        }
      }

      // Label at canonical x (tile copy closest to camera center)
      const canonX = base.x + Math.round((camera.x - base.x) / MAP_WIDTH) * MAP_WIDTH;
      this.labels[i].position.set(canonX, base.y);
    });
  }
}
