import { GameState, BuildingType, PlayerId, UnitType } from "shared";
import { SpatialHash } from "../SpatialHash.js";
import { MAP_WIDTH } from "shared";

const COUNTER_TYPE: Record<UnitType, UnitType> = {
  [UnitType.Rock]:     UnitType.Paper,
  [UnitType.Paper]:    UnitType.Scissors,
  [UnitType.Scissors]: UnitType.Rock,
};

export function tickBuildings(state: GameState, spatialHash: SpatialHash): void {
  for (const building of state.buildings) {
    if (building.type === BuildingType.SwapTower) {
      if (building.setType === undefined) continue;
      const nearby = spatialHash.queryWrapped(building.x, building.y, building.conversionRadius, MAP_WIDTH);
      for (const uid of nearby) {
        const u = state.units.find(u => u.id === uid);
        if (!u) continue;
        if (building.owner !== PlayerId.Neutral && u.owner !== building.owner) continue;
        u.type = building.setType;
      }
    } else if (building.type === BuildingType.MirrorGate) {
      // Find most common enemy type within detection range
      const detectRange = building.conversionRadius * 2;
      const nearby = spatialHash.queryWrapped(building.x, building.y, detectRange, MAP_WIDTH);
      const typeCounts = [0, 0, 0];
      for (const uid of nearby) {
        const u = state.units.find(u => u.id === uid && u.owner !== building.owner);
        if (u) typeCounts[u.type]++;
      }
      const total = typeCounts.reduce((a, b) => a + b, 0);
      if (total === 0) continue;
      const dominantType = typeCounts.indexOf(Math.max(...typeCounts)) as UnitType;
      const counterType = COUNTER_TYPE[dominantType];

      const friendlyNearby = spatialHash.queryWrapped(building.x, building.y, building.conversionRadius, MAP_WIDTH);
      for (const uid of friendlyNearby) {
        const u = state.units.find(u => u.id === uid && u.owner === building.owner);
        if (u) u.type = counterType;
      }
    }
    // Refinery income handled in EconomySystem
  }
}
