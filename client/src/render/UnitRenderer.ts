import { Container, Graphics } from "pixi.js";
import { Unit, UnitType, Tier, PlayerId, UNIT_RADIUS, getStat } from "shared";

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

class UnitView {
  container: Container;
  body: Graphics;
  hpBar: Graphics;
  /** Last damage frame — used for hit flash */
  flashTicks = 0;
  /** Cached HP fraction so we only redraw HP bar when it changes */
  lastHpFrac = -1;
  lastTier: Tier | -1 = -1;

  constructor() {
    this.container = new Container();
    this.body = new Graphics();
    this.hpBar = new Graphics();
    this.container.addChild(this.body, this.hpBar);
  }

  setVisible(v: boolean): void { this.container.visible = v; }
}

/**
 * UnitRenderer maintains a pool of UnitView objects keyed by unit ID.
 * Views are reused across ticks; dead units' views are returned to a free pool.
 */
export class UnitRenderer {
  container: Container;
  private views = new Map<number, UnitView>();
  private freePool: UnitView[] = [];
  private prevHp = new Map<number, number>();

  constructor() {
    this.container = new Container();
    this.container.label = "units";
  }

  render(units: Unit[]): void {
    const seen = new Set<number>();

    for (const unit of units) {
      seen.add(unit.id);
      let view = this.views.get(unit.id);

      if (!view) {
        view = this.acquireView();
        this.views.set(unit.id, view);
        this.drawBody(view, unit);
      }

      // Detect HP drop → trigger flash
      const lastHp = this.prevHp.get(unit.id);
      if (lastHp !== undefined && unit.hp < lastHp) {
        view.flashTicks = 6;
      }
      this.prevHp.set(unit.id, unit.hp);

      // Re-draw body if tier changed (e.g., merge)
      if (view.lastTier !== unit.tier) {
        this.drawBody(view, unit);
        view.lastTier = unit.tier;
      }

      view.container.position.set(unit.x, unit.y);

      // Hit flash
      if (view.flashTicks > 0) {
        view.body.tint = 0xffffff;
        view.flashTicks--;
      } else {
        view.body.tint = 0xffffff;
        // Apply slight tint for player 2 (faded)
        if (unit.owner === PlayerId.Two) view.body.alpha = 0.85;
        else view.body.alpha = 1.0;
      }

      // HP bar (re-draw only when fraction changed)
      const frac = unit.hp / unit.maxHp;
      if (Math.abs(frac - view.lastHpFrac) > 0.01) {
        view.lastHpFrac = frac;
        this.drawHpBar(view, unit, frac);
      }
    }

    // Recycle views for units that disappeared (death)
    for (const [id, view] of this.views) {
      if (!seen.has(id)) {
        this.releaseView(view);
        this.views.delete(id);
        this.prevHp.delete(id);
      }
    }
  }

  private drawBody(view: UnitView, unit: Unit): void {
    const r = getStat(UNIT_RADIUS, unit.type, unit.tier);
    const fill = UNIT_FILL[unit.type];
    const stroke = UNIT_STROKE[unit.type];
    const isP1 = unit.owner === PlayerId.One;
    const strokeWidth = isP1 ? 24 : 16;

    const g = view.body;
    g.clear();

    switch (unit.type) {
      case UnitType.Rock:
        g.circle(0, 0, r).fill({ color: fill }).stroke({ color: stroke, width: strokeWidth });
        break;
      case UnitType.Paper:
        g.rect(-r, -r, r * 2, r * 2).fill({ color: fill }).stroke({ color: stroke, width: strokeWidth });
        break;
      case UnitType.Scissors: {
        const cos30 = Math.cos(Math.PI / 6);
        g.moveTo(0, -r).lineTo(r * cos30, r * 0.5).lineTo(-r * cos30, r * 0.5).closePath()
          .fill({ color: fill }).stroke({ color: stroke, width: strokeWidth });
        break;
      }
    }

    // Tier dots above the unit
    if (unit.tier > 0) {
      for (let t = 0; t <= unit.tier; t++) {
        g.circle(-r * 0.6 + t * (r * 0.4), -r - r * 0.3, r * 0.12).fill({ color: 0xffffff });
      }
    }
  }

  private drawHpBar(view: UnitView, unit: Unit, frac: number): void {
    const r = getStat(UNIT_RADIUS, unit.type, unit.tier);
    const barW = r * 2;
    const barH = Math.max(8, r * 0.12);
    const barY = r + r * 0.2;

    const g = view.hpBar;
    g.clear();
    g.rect(-r, barY, barW, barH).fill({ color: 0x222244 });
    const color = frac > 0.5 ? 0x2ecc71 : frac > 0.25 ? 0xf39c12 : 0xe74c3c;
    g.rect(-r, barY, barW * frac, barH).fill({ color });
  }

  private acquireView(): UnitView {
    const v = this.freePool.pop() ?? new UnitView();
    v.setVisible(true);
    v.flashTicks = 0;
    v.lastHpFrac = -1;
    v.lastTier = -1;
    this.container.addChild(v.container);
    return v;
  }

  private releaseView(view: UnitView): void {
    view.setVisible(false);
    this.container.removeChild(view.container);
    this.freePool.push(view);
  }
}
