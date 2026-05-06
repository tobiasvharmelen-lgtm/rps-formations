import { GameState, Unit, UnitType, Tier, PlayerId, FormationShape, MergeEvent } from "shared";
import { MERGE_COUNT, MERGE_RADIUS, UNIT_HP, UNIT_RADIUS, getStat } from "shared";
import { SpatialHash } from "../SpatialHash.js";

let nextUnitId = 100_000;

export function tickMerge(state: GameState, spatialHash: SpatialHash): void {
  state.mergeEvents = [];
  // Group units by owner + type + tier
  const groups = new Map<string, Unit[]>();

  for (const u of state.units) {
    if (u.tier === Tier.Large) continue; // already max tier
    const key = `${u.owner}-${u.type}-${u.tier}`;
    let g = groups.get(key);
    if (!g) { g = []; groups.set(key, g); }
    g.push(u);
  }

  const toRemove = new Set<number>();
  const toAdd: Unit[] = [];

  for (const [, group] of groups) {
    if (group.length < MERGE_COUNT) continue;

    // Find clusters of MERGE_COUNT units within MERGE_RADIUS of each other
    // Simple approach: for each unit, BFS nearby same-group units
    const processed = new Set<number>();

    for (const seed of group) {
      if (processed.has(seed.id) || toRemove.has(seed.id)) continue;

      const nearbyIds = spatialHash.query(seed.x, seed.y, MERGE_RADIUS);
      const cluster = group.filter(
        u => nearbyIds.includes(u.id) && !processed.has(u.id) && !toRemove.has(u.id)
      );

      if (cluster.length < MERGE_COUNT) continue;

      // Take exactly MERGE_COUNT units
      const mergeGroup = cluster.slice(0, MERGE_COUNT);
      const cx = mergeGroup.reduce((s, u) => s + u.x, 0) / MERGE_COUNT;
      const cy = mergeGroup.reduce((s, u) => s + u.y, 0) / MERGE_COUNT;

      for (const u of mergeGroup) {
        toRemove.add(u.id);
        processed.add(u.id);
      }

      state.mergeEvents.push({ x: cx, y: cy });

      const newTier = (seed.tier + 1) as Tier;
      const newHp = getStat(UNIT_HP, seed.type, newTier);

      toAdd.push({
        id: nextUnitId++,
        owner: seed.owner,
        type: seed.type,
        tier: newTier,
        hp: newHp,
        maxHp: newHp,
        x: cx,
        y: cy,
        vx: 0,
        vy: 0,
        formationId: 0,
        slotIndex: 0,
        attackCooldown: 0,
        targetId: 0,
      });
    }
  }

  if (toRemove.size > 0) {
    state.units = state.units.filter(u => !toRemove.has(u.id));
    for (const f of state.formations) {
      f.unitIds = f.unitIds.filter(id => !toRemove.has(id));
    }
    state.formations = state.formations.filter(f => f.unitIds.length > 0);
  }

  state.units.push(...toAdd);
}
