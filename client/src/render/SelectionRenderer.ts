import { Container, Graphics } from "pixi.js";
import { GameState, UNIT_RADIUS, getStat } from "shared";
import { Camera } from "./Camera.js";
import type { DragBox } from "../input/InputHandler.js";

export class SelectionRenderer {
  /** Lives in world space — selection rings around units */
  worldContainer: Container;
  /** Lives in screen space — drag box */
  screenContainer: Container;

  private worldGfx = new Graphics();
  private screenGfx = new Graphics();

  constructor() {
    this.worldContainer = new Container();
    this.worldContainer.label = "selection-world";
    this.worldContainer.addChild(this.worldGfx);

    this.screenContainer = new Container();
    this.screenContainer.label = "selection-screen";
    this.screenContainer.addChild(this.screenGfx);
  }

  render(state: GameState, selectedIds: ReadonlySet<number>, dragBox: DragBox, camera: Camera): void {
    // Selection rings (world space)
    const wg = this.worldGfx;
    wg.clear();

    for (const id of selectedIds) {
      const u = state.units.find(u => u.id === id);
      if (!u) continue;
      const r = getStat(UNIT_RADIUS, u.type, u.tier);
      wg.circle(u.x, u.y, r * 1.35).stroke({ color: 0xffd700, alpha: 0.9, width: 18 });
    }

    // Drag box (screen space)
    const sg = this.screenGfx;
    sg.clear();
    if (dragBox.active) {
      const x = Math.min(dragBox.startScreen.x, dragBox.endScreen.x);
      const y = Math.min(dragBox.startScreen.y, dragBox.endScreen.y);
      const w = Math.abs(dragBox.endScreen.x - dragBox.startScreen.x);
      const h = Math.abs(dragBox.endScreen.y - dragBox.startScreen.y);
      sg.rect(x, y, w, h).fill({ color: 0xffd700, alpha: 0.1 }).stroke({ color: 0xffd700, alpha: 0.8, width: 2 });
    }
  }
}
