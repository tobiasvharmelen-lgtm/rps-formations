import { Container, Graphics, Text } from "pixi.js";
import { Building, BuildingType } from "shared";

const BUILDING_COLOR: Record<BuildingType, number> = {
  [BuildingType.SwapTower]:  0xf1c40f,
  [BuildingType.MirrorGate]: 0xe74c3c,
  [BuildingType.Refinery]:   0x2ecc71,
};

const TYPE_LABEL: Record<BuildingType, string> = {
  [BuildingType.SwapTower]:  "SW",
  [BuildingType.MirrorGate]: "MG",
  [BuildingType.Refinery]:   "RF",
};

export class BuildingRenderer {
  container: Container;
  private gfx = new Graphics();
  private labels = new Map<number, Text>();

  constructor() {
    this.container = new Container();
    this.container.label = "buildings";
    this.container.addChild(this.gfx);
  }

  render(buildings: Building[]): void {
    this.gfx.clear();

    // Remove stale labels
    const activeIds = new Set(buildings.map(b => b.id));
    for (const [id, label] of this.labels) {
      if (!activeIds.has(id)) {
        this.container.removeChild(label);
        this.labels.delete(id);
      }
    }

    for (const b of buildings) {
      const color = BUILDING_COLOR[b.type];
      const size = 400;

      // Body
      this.gfx.rect(b.x - size / 2, b.y - size / 2, size, size)
        .fill({ color, alpha: 0.7 })
        .stroke({ color: 0xffffff, alpha: 0.6, width: 20 });

      // HP bar
      const barW = size;
      const barH = 60;
      const barX = b.x - size / 2;
      const barY = b.y + size / 2 + 40;
      const hpFrac = b.hp / b.maxHp;
      this.gfx.rect(barX, barY, barW, barH).fill({ color: 0x222222 });
      this.gfx.rect(barX, barY, barW * hpFrac, barH).fill({ color: hpFrac > 0.5 ? 0x00cc44 : 0xcc4400 });

      // Label
      if (!this.labels.has(b.id)) {
        const label = new Text({
          text: TYPE_LABEL[b.type],
          style: { fill: 0xffffff, fontSize: 160, fontFamily: "monospace", fontWeight: "bold" },
        });
        label.anchor.set(0.5);
        this.container.addChild(label);
        this.labels.set(b.id, label);
      }
      const lbl = this.labels.get(b.id)!;
      lbl.position.set(b.x, b.y);
    }
  }
}
