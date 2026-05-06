import { GameState, TerrainType } from "shared";
import { SpatialHash } from "../SpatialHash.js";
import { MAP_WIDTH } from "shared";

const HAZARD_DAMAGE_PER_TICK = 3;

export function tickTerrain(state: GameState, spatialHash: SpatialHash): void {
  if (state.terrain.length === 0) return;

  // Reset slowed flag first (TerrainSystem sets it, MovementSystem consumes it)
  for (const u of state.units) u.slowed = false;

  const toRemove = new Set<number>();

  for (const t of state.terrain) {
    const nearby = spatialHash.queryWrapped(t.x, t.y, t.radius, MAP_WIDTH);
    for (const uid of nearby) {
      const unit = state.units.find(u => u.id === uid);
      if (!unit) continue;
      const dx = unit.x - t.x;
      const dy = unit.y - t.y;
      if (dx * dx + dy * dy > t.radius * t.radius) continue;

      if (t.type === TerrainType.RockWall) {
        // Push unit out of the solid radius
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        unit.x = t.x + (dx / dist) * (t.radius + 1);
        unit.y = t.y + (dy / dist) * (t.radius + 1);
      } else if (t.type === TerrainType.ScissorHazard) {
        unit.hp -= HAZARD_DAMAGE_PER_TICK;
        if (unit.hp <= 0) toRemove.add(unit.id);
      } else if (t.type === TerrainType.PaperGrass) {
        unit.slowed = true;
      }
    }
  }

  if (toRemove.size > 0) {
    state.units = state.units.filter(u => !toRemove.has(u.id));
  }
}
