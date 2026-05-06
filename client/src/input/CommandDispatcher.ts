import {
  PlayerId, InputType, UnitType, Tier, BuildingType,
  MERGE_COUNT, MERGE_RADIUS, SPAWN_COST_T1,
} from "shared";
import { SelectionManager } from "./SelectionManager.js";
import { InputBackend } from "./InputBackend.js";

/**
 * Translates user actions into PlayerInputs and pushes them through the InputBackend
 * (local sim in offline mode, server connection in online mode).
 */
export class CommandDispatcher {
  constructor(
    private backend: InputBackend,
    private selection: SelectionManager,
  ) {}

  spawnUnit(playerId: PlayerId, type: UnitType): boolean {
    const state = this.backend.getState();
    if (!state) return false;
    const player = state.players[playerId - 1];
    if (player.resources < SPAWN_COST_T1) return false;

    if (playerId !== this.backend.playerId) {
      const localSim = (this.backend as any).sim;
      if (localSim?.applyInput) {
        localSim.applyInput(playerId, { seq: 0, type: InputType.SpawnUnit, spawnType: type });
        return true;
      }
      return false;
    }

    this.backend.send({ type: InputType.SpawnUnit, spawnType: type });
    return true;
  }

  /** Right-click move: send a single MoveUnits command with all selected unit IDs. */
  moveSelected(destX: number, destY: number): boolean {
    const state = this.backend.getState();
    if (!state) return false;

    const ids = state.units
      .filter(u => this.selection.selectedIds.has(u.id))
      .map(u => u.id);
    if (ids.length === 0) return false;

    this.backend.send({ type: InputType.MoveUnits, unitIds: ids, destX, destY });
    return true;
  }

  placeBuilding(buildingType: BuildingType, destX: number, destY: number): boolean {
    this.backend.send({ type: InputType.PlaceBuilding, buildingType, destX, destY });
    return true;
  }

  setTowerType(buildingId: number, unitType: UnitType): boolean {
    this.backend.send({ type: InputType.SetTowerType, buildingId, unitType });
    return true;
  }

  /** Fuse: emit one MergeUnits command per valid cluster of 10, exhausting the selection. */
  upgradeSelected(): boolean {
    const state = this.backend.getState();
    if (!state) return false;

    const units = state.units.filter(u => this.selection.selectedIds.has(u.id));
    if (units.length < MERGE_COUNT) return false;

    const groups = new Map<string, typeof units>();
    for (const u of units) {
      if (u.tier === Tier.Large) continue;
      const key = `${u.type}-${u.tier}`;
      let g = groups.get(key);
      if (!g) { g = []; groups.set(key, g); }
      g.push(u);
    }

    let any = false;
    for (const group of groups.values()) {
      if (group.length < MERGE_COUNT) continue;

      const remaining = [...group];
      while (remaining.length >= MERGE_COUNT) {
        const seed    = remaining[0];
        const cluster = remaining.filter(u => {
          const dx = u.x - seed.x;
          const dy = u.y - seed.y;
          return dx * dx + dy * dy <= MERGE_RADIUS * MERGE_RADIUS;
        });

        if (cluster.length < MERGE_COUNT) { remaining.shift(); continue; }

        const toMerge   = cluster.slice(0, MERGE_COUNT);
        const mergedIds = new Set(toMerge.map(u => u.id));
        this.backend.send({ type: InputType.MergeUnits, mergeUnitIds: toMerge.map(u => u.id) });
        for (let i = remaining.length - 1; i >= 0; i--) {
          if (mergedIds.has(remaining[i].id)) remaining.splice(i, 1);
        }
        any = true;
      }
    }
    return any;
  }
}
