import { Container } from "pixi.js";
import { MAP_WIDTH, MAP_HEIGHT } from "shared";

const MIN_ZOOM = 0.02;
const MAX_ZOOM = 0.5;
const PAN_SPEED = 800; // world-mm per second when key held
const ZOOM_FACTOR = 1.15;

export class Camera {
  private worldLayer: Container;
  private screenW: () => number;
  private screenH: () => number;

  /** Camera target in world coords (center of view) */
  x = MAP_WIDTH / 2;
  y = MAP_HEIGHT / 2;
  /** Zoom factor: pixels per world-mm */
  zoom = 0.05;

  private keys = new Set<string>();
  private dragging = false;
  private dragStartScreen = { x: 0, y: 0 };
  private dragStartCam = { x: 0, y: 0 };

  // Touch state (two-finger pan + pinch zoom)
  private lastPinchDist = 0;
  private lastPinchCenter = { x: 0, y: 0 };

  constructor(worldLayer: Container, screenW: () => number, screenH: () => number) {
    this.worldLayer = worldLayer;
    this.screenW = screenW;
    this.screenH = screenH;

    this.fitToView();
    this.setupInput();
    this.applyTransform();
  }

  /** Fit the entire map into the viewport on first load */
  fitToView(): void {
    const sw = this.screenW();
    const sh = this.screenH();
    const zX = sw / MAP_WIDTH;
    const zY = sh / MAP_HEIGHT;
    this.zoom = Math.min(zX, zY) * 0.95;
    this.x = MAP_WIDTH / 2;
    this.y = MAP_HEIGHT / 2;
  }

  private setupInput(): void {
    window.addEventListener("keydown", (e) => this.keys.add(e.key.toLowerCase()));
    window.addEventListener("keyup", (e) => this.keys.delete(e.key.toLowerCase()));

    window.addEventListener("mousedown", (e) => {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        this.dragging = true;
        this.dragStartScreen = { x: e.clientX, y: e.clientY };
        this.dragStartCam = { x: this.x, y: this.y };
        e.preventDefault();
      }
    });
    window.addEventListener("mouseup", () => { this.dragging = false; });
    window.addEventListener("mousemove", (e) => {
      if (!this.dragging) return;
      const dx = (e.clientX - this.dragStartScreen.x) / this.zoom;
      const dy = (e.clientY - this.dragStartScreen.y) / this.zoom;
      this.x = this.dragStartCam.x - dx;
      this.y = this.dragStartCam.y - dy;
      this.clamp();
    });

    window.addEventListener("wheel", (e) => {
      const factor = e.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.zoom * factor));

      // Zoom toward cursor: keep world point under cursor stationary
      const sw = this.screenW();
      const sh = this.screenH();
      const wxBefore = (e.clientX - sw / 2) / this.zoom + this.x;
      const wyBefore = (e.clientY - sh / 2) / this.zoom + this.y;

      this.zoom = newZoom;

      const wxAfter = (e.clientX - sw / 2) / this.zoom + this.x;
      const wyAfter = (e.clientY - sh / 2) / this.zoom + this.y;
      this.x += wxBefore - wxAfter;
      this.y += wyBefore - wyAfter;
      this.clamp();
      e.preventDefault();
    }, { passive: false });

    // Disable middle-mouse autoscroll
    window.addEventListener("auxclick", (e) => { if (e.button === 1) e.preventDefault(); });

    this.setupTouchInput();
  }

  private setupTouchInput(): void {
    // Two-finger touchstart: record initial pinch distance + center
    window.addEventListener("touchstart", (e) => {
      if (e.touches.length >= 2) {
        const [a, b] = [e.touches[0], e.touches[1]];
        const cx = (a.clientX + b.clientX) / 2;
        const cy = (a.clientY + b.clientY) / 2;
        this.lastPinchDist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
        this.lastPinchCenter = { x: cx, y: cy };
        e.preventDefault();
      }
    }, { passive: false });

    // Two-finger touchmove: pan + pinch zoom
    window.addEventListener("touchmove", (e) => {
      if (e.touches.length >= 2) {
        const [a, b] = [e.touches[0], e.touches[1]];
        const cx = (a.clientX + b.clientX) / 2;
        const cy = (a.clientY + b.clientY) / 2;

        // Pan: move camera by how much the midpoint shifted (in world coords)
        const dx = (cx - this.lastPinchCenter.x) / this.zoom;
        const dy = (cy - this.lastPinchCenter.y) / this.zoom;
        this.x -= dx;
        this.y -= dy;

        // Pinch zoom: scale by ratio of new vs old finger distance
        const newDist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
        if (this.lastPinchDist > 0) {
          const factor = newDist / this.lastPinchDist;
          const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.zoom * factor));

          // Zoom toward the pinch midpoint (world point under fingers stays fixed)
          const sw = this.screenW();
          const sh = this.screenH();
          const worldCxBefore = (cx - sw / 2) / this.zoom + this.x;
          const worldCyBefore = (cy - sh / 2) / this.zoom + this.y;
          this.zoom = newZoom;
          const worldCxAfter = (cx - sw / 2) / this.zoom + this.x;
          const worldCyAfter = (cy - sh / 2) / this.zoom + this.y;
          this.x += worldCxBefore - worldCxAfter;
          this.y += worldCyBefore - worldCyAfter;
        }

        this.lastPinchDist = newDist;
        this.lastPinchCenter = { x: cx, y: cy };
        this.clamp();
        e.preventDefault();
      }
    }, { passive: false });
  }

  /** Per-frame update — handle WASD pan */
  update(dtSec: number): void {
    let dx = 0, dy = 0;
    if (this.keys.has("w") || this.keys.has("arrowup")) dy -= 1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) dy += 1;
    if (this.keys.has("a") || this.keys.has("arrowleft")) dx -= 1;
    if (this.keys.has("d") || this.keys.has("arrowright")) dx += 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      const move = PAN_SPEED * dtSec / this.zoom;
      this.x += (dx / len) * move * this.zoom;  // pan is screen-space-aware
      this.y += (dy / len) * move * this.zoom;
      this.clamp();
    }

    this.applyTransform();
  }

  private clamp(): void {
    const sw = this.screenW();
    const sh = this.screenH();
    const halfW = sw / 2 / this.zoom;
    const halfH = sh / 2 / this.zoom;
    this.x = Math.max(halfW * 0.3, Math.min(MAP_WIDTH - halfW * 0.3, this.x));
    this.y = Math.max(halfH * 0.3, Math.min(MAP_HEIGHT - halfH * 0.3, this.y));
  }

  private applyTransform(): void {
    const sw = this.screenW();
    const sh = this.screenH();
    this.worldLayer.scale.set(this.zoom);
    this.worldLayer.position.set(sw / 2 - this.x * this.zoom, sh / 2 - this.y * this.zoom);
  }

  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    const sw = this.screenW();
    const sh = this.screenH();
    return {
      x: (sx - sw / 2) / this.zoom + this.x,
      y: (sy - sh / 2) / this.zoom + this.y,
    };
  }
}
