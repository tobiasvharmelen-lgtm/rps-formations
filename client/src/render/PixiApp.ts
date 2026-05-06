import { Application, Container } from "pixi.js";

export class PixiApp {
  app!: Application;
  /** Layer that scrolls/zooms with the camera (map, units, zones, bases) */
  worldLayer!: Container;
  /** Effects layer above world but below UI */
  effectsLayer!: Container;
  /** Layer that stays fixed in screen space (HUD) */
  uiLayer!: Container;

  async init(): Promise<HTMLCanvasElement> {
    this.app = new Application();
    await this.app.init({
      background: "#1a1a2e",
      resizeTo: window,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
    });

    this.worldLayer = new Container();
    this.worldLayer.label = "world";
    this.app.stage.addChild(this.worldLayer);

    this.effectsLayer = new Container();
    this.effectsLayer.label = "effects";
    this.app.stage.addChild(this.effectsLayer);

    this.uiLayer = new Container();
    this.uiLayer.label = "ui";
    this.app.stage.addChild(this.uiLayer);

    return this.app.canvas as HTMLCanvasElement;
  }

  get screenWidth(): number { return window.innerWidth; }
  get screenHeight(): number { return window.innerHeight; }
}
