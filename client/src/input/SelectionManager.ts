import { GameState, Unit, PlayerId, UnitType } from "shared";

export type SelectionListener = (selectedUnitIds: ReadonlySet<number>) => void;

export class SelectionManager {
  private selected = new Set<number>();
  private controlGroups = new Map<number, number[]>();
  private listeners: SelectionListener[] = [];

  /** Which player is the human controlling (settable once S_HELLO arrives in online mode) */
  humanPlayer: PlayerId;

  constructor(humanPlayer: PlayerId = PlayerId.One) {
    this.humanPlayer = humanPlayer;
  }

  get selectedIds(): ReadonlySet<number> {
    return this.selected;
  }

  onChange(listener: SelectionListener): void {
    this.listeners.push(listener);
  }

  private notify(): void {
    for (const l of this.listeners) l(this.selected);
  }

  clear(): void {
    if (this.selected.size === 0) return;
    this.selected.clear();
    this.notify();
  }

  set(unitIds: Iterable<number>): void {
    this.selected = new Set(unitIds);
    this.notify();
  }

  addOrToggle(unitIds: Iterable<number>, mode: "add" | "toggle"): void {
    for (const id of unitIds) {
      if (mode === "toggle" && this.selected.has(id)) this.selected.delete(id);
      else this.selected.add(id);
    }
    this.notify();
  }

  /** Filter selection to units that still exist and belong to the human player. */
  reconcile(state: GameState): void {
    const owned = new Set<number>();
    for (const u of state.units) {
      if (u.owner === this.humanPlayer && this.selected.has(u.id)) owned.add(u.id);
    }
    if (owned.size !== this.selected.size) {
      this.selected = owned;
      this.notify();
    }
  }

  // ---- Control groups ----

  assignGroup(n: number): void {
    this.controlGroups.set(n, [...this.selected]);
  }

  recallGroup(n: number, state: GameState): void {
    const ids = this.controlGroups.get(n);
    if (!ids) return;
    const existing = new Set(state.units.filter(u => ids.includes(u.id)).map(u => u.id));
    this.set(existing);
  }

  // ---- Helpers ----

  selectedUnits(state: GameState): Unit[] {
    return state.units.filter(u => this.selected.has(u.id));
  }

  /** Most-common UnitType among the selected units (for default formation type). */
  dominantType(state: GameState): UnitType | null {
    const counts = [0, 0, 0];
    for (const u of this.selectedUnits(state)) counts[u.type]++;
    let best = -1;
    let bestType: UnitType | null = null;
    for (let t = 0; t < 3; t++) {
      if (counts[t] > best) { best = counts[t]; bestType = t as UnitType; }
    }
    return best > 0 ? bestType : null;
  }
}
