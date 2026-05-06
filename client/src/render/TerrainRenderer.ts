import { Container, Graphics } from "pixi.js";
import { Terrain, TerrainType } from "shared";

export class TerrainRenderer {
  container: Container;
  private gfx = new Graphics();
  private tick = 0;

  constructor() {
    this.container = new Container();
    this.container.label = "terrain";
    this.container.addChild(this.gfx);
  }

  render(terrain: Terrain[]): void {
    this.tick++;
    const g = this.gfx;
    g.clear();

    for (const t of terrain) {
      const r = t.radius;

      if (t.type === TerrainType.RockWall) {
        g.circle(t.x, t.y, r).fill({ color: 0x555566, alpha: 0.9 });
        g.circle(t.x, t.y, r * 0.7).fill({ color: 0x333344, alpha: 0.8 });
        g.circle(t.x, t.y, r).stroke({ color: 0x8888aa, width: 30 });
      } else if (t.type === TerrainType.ScissorHazard) {
        const pulse = 0.5 + 0.3 * Math.sin(this.tick * 0.2);
        g.circle(t.x, t.y, r).fill({ color: 0xff4400, alpha: pulse });
        g.circle(t.x, t.y, r).stroke({ color: 0xff8800, width: 25 });
      } else if (t.type === TerrainType.PaperGrass) {
        g.circle(t.x, t.y, r).fill({ color: 0x228833, alpha: 0.55 });
        g.circle(t.x, t.y, r * 0.5).fill({ color: 0x44bb55, alpha: 0.3 });
        g.circle(t.x, t.y, r).stroke({ color: 0x55dd66, width: 20 });
      }
    }
  }
}
