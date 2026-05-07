import { Container, Graphics } from "pixi.js";
import { Unit } from "shared";
import type { Camera } from "./Camera.js";

interface DeathFx {
  x: number;
  y: number;
  type: number;
  tier: number;
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
        this.deaths.push({ x: unit.x, y: unit.y, type: unit.type, tier: unit.tier, age: 0, duration: 12 });
      }
    }
  }

  spawnMerge(x: number, y: number): void {
    this.merges.push({ x, y, age: 0, duration: 18 });
  }

  render(camera: Camera): void {
    const g = this.gfx;
    g.clear();

    for (let i = this.deaths.length - 1; i >= 0; i--) {
      const fx = this.deaths[i];
      const t = fx.age / fx.duration;
      if (t >= 1) { this.deaths.splice(i, 1); continue; }
      const sizeScale = fx.tier === 2 ? 2 : 1;
      const r = (80 + 200 * t) * sizeScale;
      const alpha = 1 - t;
      for (const offset of camera.tileOffsets(fx.x)) {
        g.circle(fx.x + offset, fx.y, r).stroke({ color: 0xffffff, alpha: alpha * 0.6, width: 12 * sizeScale });
      }
      fx.age++;
    }

    for (let i = this.merges.length - 1; i >= 0; i--) {
      const fx = this.merges[i];
      const t = fx.age / fx.duration;
      if (t >= 1) { this.merges.splice(i, 1); continue; }
      const r = 100 + 600 * t;
      const alpha = 1 - t;
      for (const offset of camera.tileOffsets(fx.x)) {
        g.circle(fx.x + offset, fx.y, r).stroke({ color: 0xffd700, alpha: alpha * 0.8, width: 30 });
        g.circle(fx.x + offset, fx.y, r * 0.6).stroke({ color: 0xffffff, alpha: alpha * 0.5, width: 15 });
      }
      fx.age++;
    }
  }
}
