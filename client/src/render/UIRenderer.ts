import { Container, Graphics, Text } from "pixi.js";
import { GameState, PlayerId, BuildingType, Building, Unit } from "shared";
import { BUILDING_UPGRADE_COSTS } from "shared";

class PlayerHUD {
  container: Container;
  private bg: Graphics;
  private goldText: Text;
  private label: Text;

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

    this.goldText = new Text({
      text: "Gold: 0",
      style: { fill: 0xffd700, fontSize: 16, fontFamily: "monospace" },
    });
    this.goldText.position.set(16, 36);
    this.container.addChild(this.goldText);

    this.bg.roundRect(0, 0, 200, 68, 8).fill({ color: 0x000000, alpha: 0.6 }).stroke({ color, width: 2, alpha: 0.5 });
  }

  update(resources: number): void {
    this.goldText.text = `Gold: ${resources}`;
  }
}

const TYPE_COLORS  = [0xe74c3c, 0x3498db, 0x2ecc71]; // Rock, Paper, Scissors
const TYPE_NAMES   = ["Rock", "Paper", "Scissors"];
const TIER_NAMES   = ["T1", "T2", "T3"];
const TYPE_ICONS   = ["●", "■", "▲"];

interface PanelRow {
  bg: Graphics;
  label: Text;
  count: Text;
}

class SelectionPanel {
  container: Container;
  private rows: PanelRow[] = [];
  private prevKey = "";

  readonly ROW_H = 38;
  readonly ROW_W = 240;
  readonly GAP   = 4;

  constructor() {
    this.container = new Container();
    this.container.visible = false;
  }

  get totalHeight(): number {
    return this.rows.length * (this.ROW_H + this.GAP);
  }

  update(
    units: Unit[],
    selectedIds: ReadonlySet<number>,
    onSubSelect: (ids: number[]) => void,
  ): void {
    if (selectedIds.size === 0) {
      this.container.visible = false;
      this.prevKey = "";
      return;
    }

    // Group selected units by type+tier
    const groupMap = new Map<string, { type: number; tier: number; ids: number[] }>();
    for (const u of units) {
      if (!selectedIds.has(u.id)) continue;
      const key = `${u.type}-${u.tier}`;
      if (!groupMap.has(key)) groupMap.set(key, { type: u.type, tier: u.tier, ids: [] });
      groupMap.get(key)!.ids.push(u.id);
    }
    const groups = [...groupMap.values()].sort((a, b) => a.type - b.type || a.tier - b.tier);
    const newKey = groups.map(g => `${g.type}-${g.tier}:${g.ids.length}`).join(",");

    if (newKey !== this.prevKey) {
      this.prevKey = newKey;
      this._rebuild(groups, onSubSelect);
    }

    this.container.visible = true;
  }

  private _rebuild(
    groups: Array<{ type: number; tier: number; ids: number[] }>,
    onSubSelect: (ids: number[]) => void,
  ): void {
    // Remove old rows
    for (const row of this.rows) {
      this.container.removeChild(row.bg, row.label, row.count);
      row.bg.destroy();
      row.label.destroy();
      row.count.destroy();
    }
    this.rows = [];

    const { ROW_H, ROW_W, GAP } = this;

    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      const y = i * (ROW_H + GAP);
      const color = TYPE_COLORS[g.type];
      const ids = [...g.ids];

      const bg = new Graphics();
      bg.rect(0, y, ROW_W, ROW_H).fill({ color: 0x111130, alpha: 0.88 });
      bg.rect(0, y, 5, ROW_H).fill({ color, alpha: 1 });
      bg.rect(0, y, ROW_W, ROW_H).stroke({ color: 0x334, width: 2, alpha: 0.9 });
      bg.eventMode = "static";
      bg.cursor = "pointer";
      bg.on("pointerdown", () => onSubSelect(ids));

      const label = new Text({
        text: `${TYPE_ICONS[g.type]} ${TYPE_NAMES[g.type]} ${TIER_NAMES[g.tier]}`,
        style: { fill: 0xffffff, fontSize: 15, fontFamily: "monospace" },
      });
      label.position.set(16, y + 10);

      const count = new Text({
        text: `×${g.ids.length}`,
        style: { fill: 0xffd700, fontSize: 15, fontFamily: "monospace", fontWeight: "bold" },
      });
      count.anchor.set(1, 0);
      count.position.set(ROW_W - 10, y + 10);

      this.container.addChild(bg, label, count);
      this.rows.push({ bg, label, count });
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
  private placingText: Text;
  private selectionPanel: SelectionPanel;
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
        "WASD/scroll: camera   |   Z/X/C: spawn   |   U: fuse   |   " +
        "Q: SwapTower (60g)   |   E: MirrorGate (120g)   |   F: Refinery (100g)   →   right-click to place" +
        "   |   right-click tower to cycle type",
      style: { fill: 0x888888, fontSize: 11, fontFamily: "monospace" },
    });
    this.container.addChild(this.hintText);

    this.placingText = new Text({
      text: "",
      style: { fill: 0x00ff88, fontSize: 16, fontFamily: "monospace", fontWeight: "bold" },
    });
    this.placingText.visible = false;
    this.container.addChild(this.placingText);

    this.winText = new Text({
      text: "",
      style: { fill: 0xffffff, fontSize: 48, fontFamily: "monospace", fontWeight: "bold", align: "center" },
    });
    this.winText.anchor.set(0.5);
    this.winText.visible = false;
    this.container.addChild(this.winText);

    this.selectionPanel = new SelectionPanel();
    this.container.addChild(this.selectionPanel.container);

    this.upgradeBg = new Graphics();
    this.upgradeText = new Text({ text: "", style: { fill: 0xffd700, fontSize: 15, fontFamily: "monospace" } });
    this.upgradeBtn = new Graphics();
    this.upgradeBtnText = new Text({ text: "", style: { fill: 0xffffff, fontSize: 14, fontFamily: "monospace", fontWeight: "bold" } });
    this.upgradeBtn.eventMode = "static";
    this.upgradeBtn.cursor = "pointer";
    this.container.addChild(this.upgradeBg, this.upgradeText, this.upgradeBtn, this.upgradeBtnText);
  }

  private upgradeBg: Graphics;
  private upgradeText: Text;
  private upgradeBtn: Graphics;
  private upgradeBtnText: Text;

  showPlacingMode(type: BuildingType | null): void {
    if (type === null) {
      this.placingText.visible = false;
    } else {
      const names = ["Swap Tower", "Mirror Gate", "Refinery"];
      this.placingText.text = `Placing: ${names[type]} — right-click to place   [Esc cancels]`;
      this.placingText.visible = true;
    }
  }

  render(
    state: GameState,
    selectedIds: ReadonlySet<number>,
    onSubSelect: (ids: number[]) => void,
    selectedBuildingId?: number | null,
    onUpgrade?: (buildingId: number) => void,
  ): void {
    const sw = this.screenW();
    const sh = this.screenH();

    this.hudP1.update(state.players[0].resources);
    this.hudP2.update(state.players[1].resources);

    this.hudP1.container.position.set(16, 16);
    this.hudP2.container.position.set(sw - 216, 16);

    this.statsText.text = `Tick: ${state.tick}   Units: ${state.units.length}`;
    this.statsText.position.set(sw / 2 - this.statsText.width / 2, 20);

    this.placingText.position.set(sw / 2 - this.placingText.width / 2, 60);

    this.hintText.position.set(16, sh - 22);

    // Selection breakdown panel
    this.selectionPanel.update(state.units, selectedIds, onSubSelect);
    if (this.selectionPanel.container.visible) {
      const panelH = this.selectionPanel.totalHeight;
      this.selectionPanel.container.position.set(16, sh - 30 - panelH);
    }

    // Upgrade panel for selected building
    const building = selectedBuildingId != null
      ? state.buildings.find((b: Building) => b.id === selectedBuildingId) ?? null
      : null;
    this._renderUpgradePanel(building, sw, sh, onUpgrade);

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

  private _renderUpgradePanel(building: Building | null, sw: number, sh: number, onUpgrade?: (id: number) => void): void {
    const g = this.upgradeBg;
    const btn = this.upgradeBtn;
    g.clear();
    btn.clear();

    const canUpgrade = building &&
      building.type !== BuildingType.Refinery &&
      building.upgradeLevel < 3;

    if (!canUpgrade || !building) {
      this.upgradeText.visible = false;
      this.upgradeBtnText.visible = false;
      return;
    }

    const cost = BUILDING_UPGRADE_COSTS[building.upgradeLevel];
    const names = ["Swap Tower", "Mirror Gate", "Refinery"];
    const panelW = 260;
    const panelH = 80;
    const panelX = sw - panelW - 16;
    const panelY = sh - panelH - 90;

    g.roundRect(panelX, panelY, panelW, panelH, 6)
      .fill({ color: 0x111130, alpha: 0.9 })
      .stroke({ color: 0x334, width: 2, alpha: 0.9 });

    this.upgradeText.visible = true;
    this.upgradeText.text = `${names[building.type]}  LV${building.upgradeLevel} → LV${building.upgradeLevel + 1}`;
    this.upgradeText.position.set(panelX + 10, panelY + 8);

    const btnX = panelX + 10;
    const btnY = panelY + 36;
    const btnW = panelW - 20;
    const btnH = 32;

    btn.roundRect(btnX, btnY, btnW, btnH, 4)
      .fill({ color: 0x225522, alpha: 1 })
      .stroke({ color: 0x44aa44, width: 1, alpha: 0.9 });

    this.upgradeBtnText.visible = true;
    this.upgradeBtnText.text = `▲ Upgrade  (${cost} units nearby)`;
    this.upgradeBtnText.position.set(btnX + 8, btnY + 8);

    btn.removeAllListeners();
    btn.on("pointerdown", () => onUpgrade?.(building.id));
  }
}
