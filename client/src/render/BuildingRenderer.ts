import { Container, Graphics, Text } from "pixi.js";
import { Building, BuildingType, MAP_WIDTH } from "shared";
import type { Camera } from "./Camera.js";

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

  render(buildings: Building[], camera: Camera): void {
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

      for (const offset of camera.tileOffsets(b.x)) {
        const bx = b.x + offset;

        this.gfx.rect(bx - size / 2, b.y - size / 2, size, size)
          .fill({ color, alpha: 0.7 })
          .stroke({ color: 0xffffff, alpha: 0.6, width: 20 });

        const barW = size;
        const barH = 60;
        const barX = bx - size / 2;
        const barY = b.y + size / 2 + 40;
        const hpFrac = b.hp / b.maxHp;
        this.gfx.rect(barX, barY, barW, barH).fill({ color: 0x222222 });
        this.gfx.rect(barX, barY, barW * hpFrac, barH).fill({ color: hpFrac > 0.5 ? 0x00cc44 : 0xcc4400 });
      }

      // Label at canonical x
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
      const canonX = b.x + Math.round((camera.x - b.x) / MAP_WIDTH) * MAP_WIDTH;
      lbl.position.set(canonX, b.y);
    }
  }
}
