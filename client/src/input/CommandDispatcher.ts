import {
  PlayerId, InputType, UnitType, Tier,
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
    if (player.resources[type] < SPAWN_COST_T1) return false;

    // For local mode the dispatcher knows the exact playerId; for online mode
    // we always send as our own playerId (server validates).
    if (playerId !== this.backend.playerId) {
      // Spawning for the opponent in online mode is not allowed; only used in local sandbox
      // (LocalBackend ignores the field and always uses its own playerId, but for spawn-for-opponent
      // testing we cheat by directly applying inputs via the underlying sim if available).
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

  /** Form a formation from the currently-selected units.
   *  Mixed selections produce one formation per type (per spec). */
  formFormation(): boolean {
    const state = this.backend.getState();
    if (!state) return false;

    const selected = state.units.filter(u => this.selection.selectedIds.has(u.id));
    if (selected.length === 0) return false;

    const byType = new Map<UnitType, number[]>();
    for (const u of selected) {
      let g = byType.get(u.type);
      if (!g) { g = []; byType.set(u.type, g); }
      g.push(u.id);
    }

    let any = false;
    for (const [type, ids] of byType) {
      if (ids.length === 0) continue;
      this.backend.send({ type: InputType.CreateFormation, unitIds: ids, unitType: type });
      any = true;
    }
    return any;
  }

  /** Right-click move command. If no formation exists yet, auto-form one first. */
  moveSelected(destX: number, destY: number): boolean {
    const state = this.backend.getState();
    if (!state) return false;

    const selectedUnits = state.units.filter(u => this.selection.selectedIds.has(u.id));
    if (selectedUnits.length === 0) return false;

    const formationIds = new Set<number>();
    let unassigned = 0;
    for (const u of selectedUnits) {
      if (u.formationId) formationIds.add(u.formationId);
      else unassigned++;
    }

    if (formationIds.size === 0 && unassigned > 0) {
      this.formFormation();
      // Note: formation IDs assigned by the server; for online mode the move command
      // arriving the same tick won't see those formations yet. The user can re-issue
      // the move next click. (LocalBackend applies synchronously so this works.)
      const fresh = this.backend.getState();
      if (fresh) {
        for (const u of fresh.units.filter(u => this.selection.selectedIds.has(u.id))) {
          if (u.formationId) formationIds.add(u.formationId);
        }
      }
    }

    if (formationIds.size === 0) return false;

    for (const fid of formationIds) {
      this.backend.send({ type: InputType.MoveFormation, formationId: fid, destX, destY });
    }
    return true;
  }

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

    for (const group of groups.values()) {
      if (group.length < MERGE_COUNT) continue;
      const seed = group[0];
      const cluster = group.filter(u => {
        const dx = u.x - seed.x;
        const dy = u.y - seed.y;
        return dx * dx + dy * dy <= MERGE_RADIUS * MERGE_RADIUS;
      });
      if (cluster.length >= MERGE_COUNT) {
        this.backend.send({
          type: InputType.MergeUnits,
          mergeUnitIds: cluster.slice(0, MERGE_COUNT).map(u => u.id),
        });
        return true;
      }
    }
    return false;
  }
}
