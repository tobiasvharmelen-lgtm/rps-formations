import { Camera } from "../render/Camera.js";
import { SelectionManager } from "./SelectionManager.js";
import { CommandDispatcher } from "./CommandDispatcher.js";
import { InputBackend } from "./InputBackend.js";
import { UnitType, PlayerId, UNIT_RADIUS, getStat, Unit, BuildingType, MAP_WIDTH, Building } from "shared";

function wrappedDx(ax: number, bx: number): number {
  let d = ax - bx;
  if (d > MAP_WIDTH / 2) d -= MAP_WIDTH;
  else if (d < -MAP_WIDTH / 2) d += MAP_WIDTH;
  return d;
}

export interface DragBox {
  active: boolean;
  startScreen: { x: number; y: number };
  endScreen: { x: number; y: number };
}

export class InputHandler {
  dragBox: DragBox = { active: false, startScreen: { x: 0, y: 0 }, endScreen: { x: 0, y: 0 } };
  /** Non-null when the player has chosen a building type to place */
  placingBuilding: BuildingType | null = null;

  private mouseDownPos: { x: number; y: number } | null = null;
  private readonly DRAG_THRESHOLD = 6;

  // Single-finger touch state
  private touchStart: { x: number; y: number } | null = null;

  constructor(
    private canvas: HTMLCanvasElement,
    private camera: Camera,
    private backend: InputBackend,
    private selection: SelectionManager,
    private dispatcher: CommandDispatcher,
  ) {
    this.attach();
  }

  private attach(): void {
    this.canvas.addEventListener("mousedown", this.onMouseDown);
    this.canvas.addEventListener("mousemove", this.onMouseMove);
    this.canvas.addEventListener("mouseup", this.onMouseUp);
    this.canvas.addEventListener("contextmenu", e => e.preventDefault());
    window.addEventListener("keydown", this.onKeyDown);

    // Touch: single-finger only (two-finger is handled by Camera)
    this.canvas.addEventListener("touchstart", this.onTouchStart, { passive: false });
    this.canvas.addEventListener("touchmove",  this.onTouchMove,  { passive: false });
    this.canvas.addEventListener("touchend",   this.onTouchEnd);
  }

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button !== 0) {
      if (e.button === 2) this.onRightClick(e);
      return;
    }
    if (e.altKey) return;
    this.mouseDownPos = { x: e.clientX, y: e.clientY };
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.mouseDownPos) return;
    const dx = e.clientX - this.mouseDownPos.x;
    const dy = e.clientY - this.mouseDownPos.y;
    if (!this.dragBox.active && dx * dx + dy * dy > this.DRAG_THRESHOLD * this.DRAG_THRESHOLD) {
      this.dragBox.active = true;
      this.dragBox.startScreen = { ...this.mouseDownPos };
    }
    if (this.dragBox.active) {
      this.dragBox.endScreen = { x: e.clientX, y: e.clientY };
    }
  };

  private onMouseUp = (e: MouseEvent): void => {
    if (e.button !== 0 || !this.mouseDownPos) return;
    const isDrag = this.dragBox.active;
    const additive = e.shiftKey;
    if (isDrag) this.commitBoxSelect(additive);
    else this.commitClickSelect(e.clientX, e.clientY, additive);
    this.mouseDownPos = null;
    this.dragBox.active = false;
  };

  private onRightClick = (e: MouseEvent): void => {
    e.preventDefault();
    const world = this.camera.screenToWorldNormalized(e.clientX, e.clientY);

    // Right-click on own SwapTower → cycle its target type (R→P→S→R)
    const state = this.backend.getState();
    if (state) {
      const tower = state.buildings.find((b: Building) => {
        if (b.type !== BuildingType.SwapTower || b.owner !== this.selection.humanPlayer) return false;
        const dx = wrappedDx(b.x, world.x);
        const dy = b.y - world.y;
        return dx * dx + dy * dy < 400 * 400;
      });
      if (tower) {
        const cycle: Record<UnitType, UnitType> = {
          [UnitType.Rock]:     UnitType.Paper,
          [UnitType.Paper]:    UnitType.Scissors,
          [UnitType.Scissors]: UnitType.Rock,
        };
        this.dispatcher.setTowerType(tower.id, cycle[tower.setType ?? UnitType.Rock]);
        return;
      }
    }

    if (this.placingBuilding !== null) {
      this.dispatcher.placeBuilding(this.placingBuilding, world.x, world.y);
      this.placingBuilding = null;
      return;
    }
    this.dispatcher.moveSelected(world.x, world.y);
  };

  private commitClickSelect(sx: number, sy: number, additive: boolean): void {
    const world = this.camera.screenToWorldNormalized(sx, sy);
    const hit = this.findUnitAt(world.x, world.y);

    if (hit) {
      if (additive) this.selection.addOrToggle([hit.id], "toggle");
      else this.selection.set([hit.id]);
    } else if (!additive) {
      this.selection.clear();
    }
  }

  private commitBoxSelect(additive: boolean): void {
    const state = this.backend.getState();
    if (!state) return;
    const start = this.camera.screenToWorldNormalized(this.dragBox.startScreen.x, this.dragBox.startScreen.y);
    const end = this.camera.screenToWorldNormalized(this.dragBox.endScreen.x, this.dragBox.endScreen.y);
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);

    const ids: number[] = [];
    for (const u of state.units) {
      if (u.owner !== this.selection.humanPlayer) continue;
      if (u.x < minX || u.x > maxX) continue;
      if (u.y < minY || u.y > maxY) continue;
      ids.push(u.id);
    }
    if (additive) this.selection.addOrToggle(ids, "add");
    else this.selection.set(ids);
  }

  private findUnitAt(wx: number, wy: number): Unit | null {
    const state = this.backend.getState();
    if (!state) return null;
    let bestUnit: Unit | null = null;
    let bestDist = Infinity;
    for (const u of state.units) {
      if (u.owner !== this.selection.humanPlayer) continue;
      const r = getStat(UNIT_RADIUS, u.type, u.tier);
      const dx = wrappedDx(u.x, wx);
      const dy = u.y - wy;
      const d2 = dx * dx + dy * dy;
      if (d2 <= r * r && d2 < bestDist) {
        bestDist = d2;
        bestUnit = u;
      }
    }
    return bestUnit;
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if ((e.target as HTMLElement)?.tagName === "INPUT") return;
    const key = e.key.toLowerCase();

    if (key === "z") this.handleSpawn(UnitType.Rock, e.shiftKey);
    else if (key === "x") this.handleSpawn(UnitType.Paper, e.shiftKey);
    else if (key === "c") this.handleSpawn(UnitType.Scissors, e.shiftKey);
    else if (key === "u") this.dispatcher.upgradeSelected();
    else if (key === "m") this.dispatcher.openMiddle();
    else if (key === "q") this.placingBuilding = BuildingType.SwapTower;
    else if (key === "e") this.placingBuilding = BuildingType.MirrorGate;
    else if (key === "f") this.placingBuilding = BuildingType.Refinery;
    else if (/^[1-9]$/.test(key)) {
      const n = parseInt(key, 10);
      const state = this.backend.getState();
      if (e.ctrlKey || e.metaKey) {
        this.selection.assignGroup(n);
        e.preventDefault();
      } else if (state) {
        this.selection.recallGroup(n, state);
      }
    }
    else if (key === "a" && (e.ctrlKey || e.metaKey)) {
      const state = this.backend.getState();
      if (state) {
        const ids = state.units
          .filter(u => u.owner === this.selection.humanPlayer)
          .map(u => u.id);
        this.selection.set(ids);
      }
      e.preventDefault();
    }
    else if (key === "escape") this.selection.clear();
  };

  private handleSpawn(type: UnitType, asEnemy: boolean): void {
    const playerId = asEnemy
      ? (this.selection.humanPlayer === PlayerId.One ? PlayerId.Two : PlayerId.One)
      : this.selection.humanPlayer;
    this.dispatcher.spawnUnit(playerId, type);
  }

  // ── Touch handlers (single finger) ────────────────────────────────────────

  private onTouchStart = (e: TouchEvent): void => {
    // Multi-touch is handled by Camera; cancel any single-touch action
    if (e.touches.length !== 1) {
      this.touchStart = null;
      this.dragBox.active = false;
      return;
    }
    const t = e.touches[0];
    this.touchStart = { x: t.clientX, y: t.clientY };
    e.preventDefault(); // prevent ghost mouse events on iOS
  };

  private onTouchMove = (e: TouchEvent): void => {
    if (e.touches.length !== 1 || !this.touchStart) return;
    const t = e.touches[0];
    const dx = t.clientX - this.touchStart.x;
    const dy = t.clientY - this.touchStart.y;
    if (!this.dragBox.active && dx * dx + dy * dy > this.DRAG_THRESHOLD * this.DRAG_THRESHOLD) {
      this.dragBox.active = true;
      this.dragBox.startScreen = { x: this.touchStart.x, y: this.touchStart.y };
    }
    if (this.dragBox.active) {
      this.dragBox.endScreen = { x: t.clientX, y: t.clientY };
    }
    e.preventDefault();
  };

  private onTouchEnd = (e: TouchEvent): void => {
    if (!this.touchStart) return;
    const wasDrag = this.dragBox.active;
    const changed = e.changedTouches[0];

    if (wasDrag) {
      // Finger dragged → commit box selection
      this.commitBoxSelect(false);
    } else {
      // Finger tapped → select unit OR issue move command
      const sx = changed.clientX;
      const sy = changed.clientY;
      const world = this.camera.screenToWorldNormalized(sx, sy);
      const hit = this.findUnitAt(world.x, world.y);

      if (hit) {
        // Tap on own unit → select it
        this.selection.set([hit.id]);
      } else if (this.selection.selectedIds.size > 0) {
        // Tap on empty ground with selection → move (mirrors right-click)
        this.dispatcher.moveSelected(world.x, world.y);
      } else {
        this.selection.clear();
      }
    }

    this.touchStart = null;
    this.dragBox.active = false;
  };
}
