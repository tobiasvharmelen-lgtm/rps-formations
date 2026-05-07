import { Container, Graphics } from "pixi.js";
import { Unit, UnitType, Tier, PlayerId, UNIT_RADIUS, getStat } from "shared";
import type { Camera } from "./Camera.js";
import { playerColors } from "../playerColors.js";

const UNIT_FILL: Record<UnitType, number> = {
  [UnitType.Rock]:     0xe74c3c,
  [UnitType.Paper]:    0x3498db,
  [UnitType.Scissors]: 0x2ecc71,
};

const UNIT_STROKE: Record<UnitType, number> = {
  [UnitType.Rock]:     0xc0392b,
  [UnitType.Paper]:    0x2980b9,
  [UnitType.Scissors]: 0x27ae60,
};

interface UnitState {
  flashTicks: number;
  prevHp: number;
}

export class UnitRenderer {
  container: Container;
  private gfx = new Graphics();
  private unitState = new Map<number, UnitState>();

  constructor() {
    this.container = new Container();
    this.container.label = "units";
    this.container.addChild(this.gfx);
  }

  render(units: Unit[], camera: Camera): void {
    const g = this.gfx;
    g.clear();

    const seen = new Set<number>();

    for (const unit of units) {
      seen.add(unit.id);

      let st = this.unitState.get(unit.id);
      if (!st) {
        st = { flashTicks: 0, prevHp: unit.hp };
        this.unitState.set(unit.id, st);
      }

      if (unit.hp < st.prevHp) st.flashTicks = 6;
      st.prevHp = unit.hp;

      const flash = st.flashTicks > 0;
      if (flash) st.flashTicks--;

      const ownerColor = unit.owner === PlayerId.One ? playerColors.p1 : playerColors.p2;
      for (const offset of camera.tileOffsets(unit.x)) {
        this.drawUnit(g, unit, unit.x + offset, unit.y, flash, ownerColor);
      }
    }

    for (const id of this.unitState.keys()) {
      if (!seen.has(id)) this.unitState.delete(id);
    }
  }

  private drawUnit(g: Graphics, unit: Unit, x: number, y: number, flash: boolean, ownerColor: number): void {
    const r = getStat(UNIT_RADIUS, unit.type, unit.tier);
    const fill = flash ? 0xffffff : UNIT_FILL[unit.type];
    const stroke = UNIT_STROKE[unit.type];
    const strokeWidth = 20;
    const alpha = unit.owner === PlayerId.Two ? 0.85 : 1.0;

    switch (unit.type) {
      case UnitType.Rock:
        g.circle(x, y, r).fill({ color: fill, alpha }).stroke({ color: stroke, width: strokeWidth });
        break;
      case UnitType.Paper:
        g.rect(x - r, y - r, r * 2, r * 2).fill({ color: fill, alpha }).stroke({ color: stroke, width: strokeWidth });
        break;
      case UnitType.Scissors: {
        const cos30 = Math.cos(Math.PI / 6);
        g.moveTo(x, y - r).lineTo(x + r * cos30, y + r * 0.5).lineTo(x - r * cos30, y + r * 0.5).closePath()
          .fill({ color: fill, alpha }).stroke({ color: stroke, width: strokeWidth });
        break;
      }
    }

    // Owner color ring
    g.circle(x, y, r + strokeWidth).stroke({ color: ownerColor, alpha: 0.7, width: 16 });

    // Tier dots
    if (unit.tier > Tier.Small) {
      for (let t = 0; t <= unit.tier; t++) {
        g.circle(x - r * 0.6 + t * (r * 0.4), y - r - r * 0.3, r * 0.12).fill({ color: 0xffffff });
      }
    }

    // HP bar
    const frac = unit.hp / unit.maxHp;
    const barW = r * 2;
    const barH = Math.max(8, r * 0.12);
    const barY = y + r + r * 0.2;
    g.rect(x - r, barY, barW, barH).fill({ color: 0x222244 });
    const hpColor = frac > 0.5 ? 0x2ecc71 : frac > 0.25 ? 0xf39c12 : 0xe74c3c;
    g.rect(x - r, barY, barW * frac, barH).fill({ color: hpColor });
  }
}
