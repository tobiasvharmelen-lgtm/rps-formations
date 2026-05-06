import { Container, Graphics, Text } from "pixi.js";
import { GameState, PlayerId } from "shared";

const RESOURCE_LABELS = ["Rock", "Paper", "Scissors"] as const;
const RESOURCE_COLORS = [0xe74c3c, 0x3498db, 0x2ecc71];

class PlayerHUD {
  container: Container;
  private bg: Graphics;
  private resourceTexts: Text[] = [];
  private label: Text;
  private tickText: Text | null = null;

  constructor(playerId: PlayerId, isLeft: boolean) {
    this.container = new Container();
    this.bg = new Graphics();
    this.container.addChild(this.bg);

    const color = playerId === PlayerId.One ? 0xe74c3c : 0x3498db;

    this.label = new Text({
      text: `Player ${playerId}`,
      style: { fill: color, fontSize: 18, fontFamily: "monospace", fontWeight: "bold" },
    });
    this.label.position.set(16, 10);
    this.container.addChild(this.label);

    for (let i = 0; i < 3; i++) {
      const t = new Text({
        text: `${RESOURCE_LABELS[i]}: 0`,
        style: { fill: RESOURCE_COLORS[i], fontSize: 16, fontFamily: "monospace" },
      });
      t.position.set(16, 36 + i * 22);
      this.container.addChild(t);
      this.resourceTexts.push(t);
    }

    // Background panel
    this.bg.roundRect(0, 0, 200, 110, 8).fill({ color: 0x000000, alpha: 0.6 }).stroke({ color, width: 2, alpha: 0.5 });
  }

  update(resources: readonly [number, number, number]): void {
    for (let i = 0; i < 3; i++) {
      this.resourceTexts[i].text = `${RESOURCE_LABELS[i]}: ${resources[i]}`;
    }
  }
}

export class UIRenderer {
  container: Container;
  private hudP1: PlayerHUD;
  private hudP2: PlayerHUD;
  private statsText: Text;
  private winText: Text;
  private hintText: Text;
  private selectionText!: Text;
  private screenW: () => number;
  private screenH: () => number;

  constructor(screenW: () => number, screenH: () => number) {
    this.container = new Container();
    this.container.label = "ui";
    this.screenW = screenW;
    this.screenH = screenH;

    this.hudP1 = new PlayerHUD(PlayerId.One, true);
    this.hudP2 = new PlayerHUD(PlayerId.Two, false);
    this.container.addChild(this.hudP1.container, this.hudP2.container);

    this.statsText = new Text({
      text: "",
      style: { fill: 0xaaaaaa, fontSize: 14, fontFamily: "monospace" },
    });
    this.container.addChild(this.statsText);

    this.hintText = new Text({
      text:
        "WASD/scroll: camera   |   Z/X/C: spawn Rock/Paper/Scissors   |   " +
        "Click+drag: select   |   Right-click: move   |   F: form   |   U: upgrade   |   Ctrl+1..9: assign group   |   1..9: recall",
      style: { fill: 0x888888, fontSize: 12, fontFamily: "monospace" },
    });
    this.container.addChild(this.hintText);

    this.selectionText = new Text({
      text: "",
      style: { fill: 0xffd700, fontSize: 14, fontFamily: "monospace", fontWeight: "bold" },
    });
    this.container.addChild(this.selectionText);

    this.winText = new Text({
      text: "",
      style: { fill: 0xffffff, fontSize: 48, fontFamily: "monospace", fontWeight: "bold", align: "center" },
    });
    this.winText.anchor.set(0.5);
    this.winText.visible = false;
    this.container.addChild(this.winText);
  }

  render(state: GameState, selectedCount: number = 0): void {
    const sw = this.screenW();
    const sh = this.screenH();

    this.hudP1.update(state.players[0].resources);
    this.hudP2.update(state.players[1].resources);

    this.hudP1.container.position.set(16, 16);
    this.hudP2.container.position.set(sw - 216, 16);

    this.statsText.text = `Tick: ${state.tick}   Units: ${state.units.length}   Formations: ${state.formations.length}`;
    this.statsText.position.set(sw / 2 - this.statsText.width / 2, 20);

    this.hintText.position.set(16, sh - 26);

    if (selectedCount > 0) {
      this.selectionText.text = `${selectedCount} selected`;
      this.selectionText.position.set(16, sh - 50);
      this.selectionText.visible = true;
    } else {
      this.selectionText.visible = false;
    }

    if (state.winnerId) {
      this.winText.visible = true;
      this.winText.text = `Player ${state.winnerId} wins!`;
      const color = state.winnerId === PlayerId.One ? 0xe74c3c : 0x3498db;
      this.winText.style.fill = color;
      this.winText.position.set(sw / 2, sh / 2);
    } else {
      this.winText.visible = false;
    }
  }
}
