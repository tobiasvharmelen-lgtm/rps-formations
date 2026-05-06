import { Container, Graphics, Text } from "pixi.js";
import { Base, PlayerId } from "shared";

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

  render(bases: [Base, Base]): void {
    const g = this.gfx;
    g.clear();

    // Lazy-create labels first time
    if (!this.initialized) {
      for (const base of bases) {
        const label = new Text({
          text: base.owner === PlayerId.One ? "P1" : "P2",
          style: { fill: 0xffffff, fontSize: 240, fontFamily: "monospace", fontWeight: "bold" },
        });
        label.anchor.set(0.5);
        label.position.set(base.x, base.y);
        this.container.addChild(label);
        this.labels.push(label);
      }
      this.initialized = true;
    }

    for (const base of bases) {
      const color = base.owner === PlayerId.One ? 0xe74c3c : 0x3498db;
      const r = 500;

      // Base circle
      g.circle(base.x, base.y, r).stroke({ color, width: 50 });
      g.circle(base.x, base.y, r * 0.85).stroke({ color, alpha: 0.4, width: 30 });

      // HP bar
      const barW = r * 2;
      const barH = 100;
      const barX = base.x - r;
      const barY = base.y + r + 60;
      g.rect(barX, barY, barW, barH).fill({ color: 0x222244 });
      g.rect(barX, barY, barW * (base.hp / base.maxHp), barH).fill({ color });
      g.rect(barX, barY, barW, barH).stroke({ color: 0x000000, alpha: 0.5, width: 4 });
    }
  }
}
