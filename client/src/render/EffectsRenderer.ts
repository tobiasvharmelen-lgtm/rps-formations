import { Container, Graphics } from "pixi.js";
import { Unit } from "shared";

interface DeathFx {
  x: number;
  y: number;
  type: number;
  age: number;
  duration: number;
}

interface MergeFx {
  x: number;
  y: number;
  age: number;
  duration: number;
}

export class EffectsRenderer {
  container: Container;
  private gfx = new Graphics();
  private deaths: DeathFx[] = [];
  private merges: MergeFx[] = [];

  constructor() {
    this.container = new Container();
    this.container.label = "effects";
    this.container.addChild(this.gfx);
  }

  trackDeaths(prevUnits: Map<number, Unit>, currentUnitIds: Set<number>): void {
    for (const [id, unit] of prevUnits) {
      if (!currentUnitIds.has(id)) {
        this.deaths.push({ x: unit.x, y: unit.y, type: unit.type, age: 0, duration: 12 });
      }
    }
  }

  spawnMerge(x: number, y: number): void {
    this.merges.push({ x, y, age: 0, duration: 18 });
  }

  render(): void {
    const g = this.gfx;
    g.clear();

    // Death fades — expanding ring
    for (let i = this.deaths.length - 1; i >= 0; i--) {
      const fx = this.deaths[i];
      const t = fx.age / fx.duration;
      if (t >= 1) { this.deaths.splice(i, 1); continue; }
      const r = 80 + 200 * t;
      const alpha = 1 - t;
      g.circle(fx.x, fx.y, r).stroke({ color: 0xffffff, alpha: alpha * 0.6, width: 12 });
      fx.age++;
    }

    // Merge bursts — expanding gold ring
    for (let i = this.merges.length - 1; i >= 0; i--) {
      const fx = this.merges[i];
      const t = fx.age / fx.duration;
      if (t >= 1) { this.merges.splice(i, 1); continue; }
      const r = 100 + 600 * t;
      const alpha = 1 - t;
      g.circle(fx.x, fx.y, r).stroke({ color: 0xffd700, alpha: alpha * 0.8, width: 30 });
      g.circle(fx.x, fx.y, r * 0.6).stroke({ color: 0xffffff, alpha: alpha * 0.5, width: 15 });
      fx.age++;
    }
  }
}
