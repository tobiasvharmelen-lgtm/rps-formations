import { Container, Graphics, Text } from "pixi.js";
import { Zone, ZoneType, ZoneOwner, UnitType, MAP_WIDTH } from "shared";
import type { Camera } from "./Camera.js";

const ZONE_COLOR: Record<ZoneType, number> = {
  [ZoneType.LeftTop]:    0xf39c12,
  [ZoneType.LeftBottom]: 0xf39c12,
  [ZoneType.RightTop]:   0x9b59b6,
  [ZoneType.RightBottom]:0x9b59b6,
};

const OWNER_FILL: Record<ZoneOwner, { color: number; alpha: number }> = {
  [ZoneOwner.Neutral]: { color: 0xffffff, alpha: 0.04 },
  [ZoneOwner.Player1]: { color: 0xe74c3c, alpha: 0.18 },
  [ZoneOwner.Player2]: { color: 0x3498db, alpha: 0.18 },
};

const TYPE_ICONS = ["●", "■", "▲"]; // Rock, Paper, Scissors

export class ZoneRenderer {
  container: Container;
  private shapeGfx = new Graphics();
  private barGfx   = new Graphics();
  private iconLabels = new Map<number, Text>();

  constructor() {
    this.container = new Container();
    this.container.label = "zones";
    this.container.addChild(this.shapeGfx, this.barGfx);
  }

  render(zones: Zone[], camera: Camera): void {
    const sg = this.shapeGfx;
    const bg = this.barGfx;
    sg.clear();
    bg.clear();

    const renderedKeys = new Set<number>();

    for (let zi = 0; zi < zones.length; zi++) {
      const zone = zones[zi];
      renderedKeys.add(zi);

      for (const offset of camera.tileOffsets(zone.x)) {
        const zx = zone.x + offset;
        const color = ZONE_COLOR[zone.type];
        const fill = OWNER_FILL[zone.owner];
        const r = zone.radius;

        // Hexagon
        const sides = 6;
        for (let i = 0; i < sides; i++) {
          const angle = (i / sides) * Math.PI * 2 - Math.PI / 6;
          const px = zx + Math.cos(angle) * r;
          const py = zone.y + Math.sin(angle) * r;
          if (i === 0) sg.moveTo(px, py); else sg.lineTo(px, py);
        }
        sg.closePath().fill({ color: fill.color, alpha: fill.alpha }).stroke({ color, width: 30 });

        // Capture progress bar
        const barW = r * 2;
        const barH = 80;
        const barX = zx - r;
        const barY = zone.y + r + 80;
        bg.rect(barX, barY, barW, barH).fill({ color: 0x222244 });

        const center = barX + barW / 2;
        if (zone.captureProgress > 0) {
          const w = (zone.captureProgress / 100) * (barW / 2);
          bg.rect(center, barY, w, barH).fill({ color: 0xe74c3c });
        } else if (zone.captureProgress < 0) {
          const w = (-zone.captureProgress / 100) * (barW / 2);
          bg.rect(center - w, barY, w, barH).fill({ color: 0x3498db });
        }
        bg.moveTo(center, barY).lineTo(center, barY + barH).stroke({ color: 0xffffff, alpha: 0.5, width: 4 });
      }

      // setType icon label (only show for primary tile offset)
      if (zone.owner !== ZoneOwner.Neutral && zone.setType != null) {
        if (!this.iconLabels.has(zi)) {
          const lbl = new Text({ text: "", style: { fill: 0xffffff, fontSize: 700, fontFamily: "monospace", fontWeight: "bold" } });
          lbl.anchor.set(0.5);
          this.container.addChild(lbl);
          this.iconLabels.set(zi, lbl);
        }
        const lbl = this.iconLabels.get(zi)!;
        lbl.visible = true;
        lbl.text = TYPE_ICONS[zone.setType as UnitType];
        const canonX = zone.x + Math.round((camera.x - zone.x) / MAP_WIDTH) * MAP_WIDTH;
        // Background highlight so icon is legible over the zone fill
        sg.circle(canonX, zone.y, 420).fill({ color: 0x000000, alpha: 0.45 });
        lbl.position.set(canonX, zone.y);
      } else {
        const lbl = this.iconLabels.get(zi);
        if (lbl) lbl.visible = false;
      }
    }
  }
}
