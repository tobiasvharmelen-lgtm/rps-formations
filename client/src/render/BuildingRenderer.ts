import { Container, Graphics, Text } from "pixi.js";
import { Building, BuildingType, UnitType, Gate, MAP_WIDTH, GATE_UNIT_COST, GATE_RADIUS } from "shared";
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

const ICON_R = 600; // world-mm radius of SwapTower unit icon

// Unit shape colors (matches UnitRenderer)
const ICON_FILL: Record<UnitType, number>   = { [UnitType.Rock]: 0xe74c3c, [UnitType.Paper]: 0x3498db, [UnitType.Scissors]: 0x2ecc71 };
const ICON_STROKE: Record<UnitType, number> = { [UnitType.Rock]: 0xc0392b, [UnitType.Paper]: 0x2980b9, [UnitType.Scissors]: 0x27ae60 };

export class BuildingRenderer {
  container: Container;
  private gfx = new Graphics();
  private gateGfx = new Graphics();
  private labels = new Map<number, Text>();

  constructor() {
    this.container = new Container();
    this.container.label = "buildings";
    this.container.addChild(this.gfx, this.gateGfx);
  }

  renderGates(gates: Gate[], camera: Camera): void {
    const g = this.gateGfx;
    g.clear();

    for (const gate of gates) {
      for (const offset of camera.tileOffsets(gate.x)) {
        const gx = gate.x + offset;
        const gy = gate.y;
        const r  = GATE_RADIUS;

        // Background circle
        g.circle(gx, gy, r).fill({ color: 0x111133, alpha: 0.85 }).stroke({ color: 0x6666aa, alpha: 0.7, width: 25 });

        // P1 progress arc (red)
        this._drawArc(g, gx, gy, r - 200, gate.p1Open ? 1 : gate.p1Units / GATE_UNIT_COST, 0xe74c3c, true);
        // P2 progress arc (blue, drawn on inner ring)
        this._drawArc(g, gx, gy, r - 500, gate.p2Open ? 1 : gate.p2Units / GATE_UNIT_COST, 0x3498db, false);
      }
    }
  }

  private _drawArc(g: Graphics, cx: number, cy: number, r: number, frac: number, color: number, outer: boolean): void {
    if (frac <= 0) return;
    const startAngle = -Math.PI / 2;
    const endAngle   = startAngle + frac * Math.PI * 2;
    const segments   = Math.max(3, Math.ceil(frac * 32));
    const step       = (endAngle - startAngle) / segments;

    g.moveTo(cx + Math.cos(startAngle) * r, cy + Math.sin(startAngle) * r);
    for (let i = 1; i <= segments; i++) {
      const a = startAngle + i * step;
      g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    g.stroke({ color, alpha: 0.9, width: outer ? 120 : 100 });
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
      for (const offset of camera.tileOffsets(b.x)) {
        const bx = b.x + offset;

        // Conversion radius circle (drawn behind body)
        if (b.conversionRadius > 0) {
          const rc = b.conversionRadius;
          const cc = b.type === BuildingType.SwapTower && b.setType != null
            ? ICON_FILL[b.setType] : 0xffffff;
          this.gfx.circle(bx, b.y, rc)
            .fill({ color: 0xffffff, alpha: 0.04 })
            .stroke({ color: cc, alpha: 0.3, width: 15 });
        }

        if (b.type === BuildingType.SwapTower) {
          this._drawSwapIcon(bx, b.y, b.setType);
        } else {
          const color = BUILDING_COLOR[b.type];
          const size = 400;
          this.gfx.rect(bx - size / 2, b.y - size / 2, size, size)
            .fill({ color, alpha: 0.7 })
            .stroke({ color: 0xffffff, alpha: 0.6, width: 20 });
        }

        // HP bar
        const bodySize = b.type === BuildingType.SwapTower ? ICON_R * 2 : 400;
        const barW = bodySize;
        const barH = 60;
        const barX = bx - bodySize / 2;
        const barY = b.y + bodySize / 2 + 40;
        const hpFrac = b.hp / b.maxHp;
        this.gfx.rect(barX, barY, barW, barH).fill({ color: 0x222222 });
        this.gfx.rect(barX, barY, barW * hpFrac, barH).fill({ color: hpFrac > 0.5 ? 0x00cc44 : 0xcc4400 });
      }

      // Text label — type abbreviation + upgrade level
      if (!this.labels.has(b.id)) {
        const label = new Text({
          text: "",
          style: { fill: 0xffffff, fontSize: 160, fontFamily: "monospace", fontWeight: "bold" },
        });
        label.anchor.set(0.5);
        this.container.addChild(label);
        this.labels.set(b.id, label);
      }
      const lbl = this.labels.get(b.id)!;
      const lvlSuffix = b.upgradeLevel > 0 ? ` L${b.upgradeLevel}` : "";
      lbl.text = b.type !== BuildingType.SwapTower ? `${TYPE_LABEL[b.type]}${lvlSuffix}` : (b.upgradeLevel > 0 ? `L${b.upgradeLevel}` : "");
      const canonX = b.x + Math.round((camera.x - b.x) / MAP_WIDTH) * MAP_WIDTH;
      lbl.position.set(canonX, b.y + ICON_R + 280);
    }
  }

  private _drawSwapIcon(bx: number, by: number, setType: UnitType | null | undefined): void {
    const g = this.gfx;
    if (setType === UnitType.Rock) {
      g.circle(bx, by, ICON_R)
        .fill({ color: ICON_FILL[UnitType.Rock], alpha: 0.9 })
        .stroke({ color: ICON_STROKE[UnitType.Rock], width: 30 });
    } else if (setType === UnitType.Paper) {
      g.rect(bx - ICON_R, by - ICON_R, ICON_R * 2, ICON_R * 2)
        .fill({ color: ICON_FILL[UnitType.Paper], alpha: 0.9 })
        .stroke({ color: ICON_STROKE[UnitType.Paper], width: 30 });
    } else if (setType === UnitType.Scissors) {
      g.poly([bx, by - ICON_R, bx + ICON_R, by + ICON_R, bx - ICON_R, by + ICON_R])
        .fill({ color: ICON_FILL[UnitType.Scissors], alpha: 0.9 })
        .stroke({ color: ICON_STROKE[UnitType.Scissors], width: 30 });
    } else {
      // null or undefined — "off" state: grey X
      g.circle(bx, by, ICON_R).fill({ color: 0x888888, alpha: 0.3 }).stroke({ color: 0x888888, alpha: 0.5, width: 25 });
      const s = ICON_R * 0.6;
      g.moveTo(bx - s, by - s).lineTo(bx + s, by + s).stroke({ color: 0xaaaaaa, alpha: 0.8, width: 40 });
      g.moveTo(bx + s, by - s).lineTo(bx - s, by + s).stroke({ color: 0xaaaaaa, alpha: 0.8, width: 40 });
    }
  }
}
