import { Container, Graphics } from "pixi.js";
import { Zone, ZoneType, ZoneOwner } from "shared";

const ZONE_COLOR: Record<ZoneType, number> = {
  [ZoneType.TopMid]:    0xf39c12,
  [ZoneType.BottomMid]: 0x9b59b6,
};

const OWNER_FILL: Record<ZoneOwner, { color: number; alpha: number }> = {
  [ZoneOwner.Neutral]: { color: 0xffffff, alpha: 0.04 },
  [ZoneOwner.Player1]: { color: 0xe74c3c, alpha: 0.18 },
  [ZoneOwner.Player2]: { color: 0x3498db, alpha: 0.18 },
};

export class ZoneRenderer {
  container: Container;
  private shapeGfx = new Graphics();
  private barGfx = new Graphics();

  constructor() {
    this.container = new Container();
    this.container.label = "zones";
    this.container.addChild(this.shapeGfx, this.barGfx);
  }

  render(zones: Zone[]): void {
    const sg = this.shapeGfx;
    const bg = this.barGfx;
    sg.clear();
    bg.clear();

    for (const zone of zones) {
      const color = ZONE_COLOR[zone.type];
      const fill = OWNER_FILL[zone.owner];
      const r = zone.radius;

      // Both midfield zones rendered as hexagons
      {
        const sides = 6;
        for (let i = 0; i < sides; i++) {
          const angle = (i / sides) * Math.PI * 2 - Math.PI / 6;
          const px = zone.x + Math.cos(angle) * r;
          const py = zone.y + Math.sin(angle) * r;
          if (i === 0) sg.moveTo(px, py); else sg.lineTo(px, py);
        }
        sg.closePath().fill({ color: fill.color, alpha: fill.alpha }).stroke({ color, width: 30 });
      }

      // Capture progress bar below zone
      const barW = r * 2;
      const barH = 80;
      const barX = zone.x - r;
      const barY = zone.y + r + 80;
      bg.rect(barX, barY, barW, barH).fill({ color: 0x222244 });

      // Progress: -100 (P2 full left) to +100 (P1 full right)
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
  }
}
