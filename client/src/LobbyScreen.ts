import { LobbyChoice, MapType, LOBBY_COLORS } from "shared";

const ECON_RATES = [0.5, 1, 1.5, 2, 3] as const;

export class LobbyScreen {
  private el: HTMLDivElement;
  private p1Choice: LobbyChoice = { colorIndex: 0, incomeMultiplier: 1, mapType: MapType.Cylinder, ready: false };
  private p2Choice: LobbyChoice = { colorIndex: 1, incomeMultiplier: 1, mapType: MapType.Cylinder, ready: false };

  constructor(
    private onUpdate: (choice: Partial<LobbyChoice>) => void,
    private onReady: () => void,
    private humanPlayer: 1 | 2,
  ) {
    this.el = this._build();
    document.body.appendChild(this.el);
  }

  private _build(): HTMLDivElement {
    const overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position: "fixed", inset: "0", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "#1a1a2e", color: "#e0e0ff",
      fontFamily: "monospace", zIndex: "300",
    });

    const title = document.createElement("h2");
    title.textContent = "Game Lobby";
    Object.assign(title.style, { marginBottom: "24px", fontSize: "1.8rem", letterSpacing: "2px" });
    overlay.appendChild(title);

    const panels = document.createElement("div");
    Object.assign(panels.style, { display: "flex", gap: "40px", alignItems: "flex-start" });

    panels.appendChild(this._buildPlayerPanel(1));
    panels.appendChild(this._buildSeparator());
    panels.appendChild(this._buildPlayerPanel(2));
    overlay.appendChild(panels);

    return overlay;
  }

  private _buildSeparator(): HTMLDivElement {
    const sep = document.createElement("div");
    sep.textContent = "VS";
    Object.assign(sep.style, {
      fontSize: "2rem", color: "#666", alignSelf: "center",
      padding: "0 20px",
    });
    return sep;
  }

  private _buildPlayerPanel(player: 1 | 2): HTMLDivElement {
    const isHuman = player === this.humanPlayer;
    const panel = document.createElement("div");
    panel.setAttribute("data-player", player.toString());
    Object.assign(panel.style, {
      background: "rgba(255,255,255,0.05)", borderRadius: "12px",
      padding: "24px", minWidth: "260px",
      border: isHuman ? "1px solid #445" : "1px solid #222",
    });

    const heading = document.createElement("h3");
    heading.textContent = `Player ${player}${isHuman ? " (You)" : ""}`;
    Object.assign(heading.style, { marginTop: "0", marginBottom: "16px" });
    panel.appendChild(heading);

    // Color swatches
    const colorLabel = document.createElement("div");
    colorLabel.textContent = "Color";
    Object.assign(colorLabel.style, { fontSize: "12px", color: "#aaa", marginBottom: "8px" });
    panel.appendChild(colorLabel);

    const swatches = document.createElement("div");
    Object.assign(swatches.style, { display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" });
    const swatchEls: HTMLDivElement[] = [];

    LOBBY_COLORS.forEach((c, i) => {
      const sw = document.createElement("div");
      const hex = "#" + c.hex.toString(16).padStart(6, "0");
      Object.assign(sw.style, {
        width: "32px", height: "32px", borderRadius: "50%",
        background: hex, cursor: isHuman ? "pointer" : "default",
        border: "3px solid transparent", boxSizing: "border-box",
        transition: "border-color 0.15s",
      });
      swatchEls.push(sw);
      if (isHuman) {
        sw.addEventListener("click", () => {
          this._updateChoice(player, { colorIndex: i });
        });
      }
      swatches.appendChild(sw);
    });
    panel.appendChild(swatches);

    const updateSwatches = (idx: number) => {
      swatchEls.forEach((sw, i) => {
        sw.style.borderColor = i === idx ? "#fff" : "transparent";
      });
    };

    // Econ rate
    const econLabel = document.createElement("div");
    econLabel.textContent = "Economy Rate";
    Object.assign(econLabel.style, { fontSize: "12px", color: "#aaa", marginBottom: "8px" });
    panel.appendChild(econLabel);

    const econBtns = document.createElement("div");
    Object.assign(econBtns.style, { display: "flex", gap: "6px", marginBottom: "20px", flexWrap: "wrap" });
    const econBtnEls: HTMLButtonElement[] = [];

    ECON_RATES.forEach(rate => {
      const btn = document.createElement("button");
      btn.textContent = `${rate}×`;
      Object.assign(btn.style, {
        padding: "4px 10px", borderRadius: "6px", border: "1px solid #444",
        background: "transparent", color: "#ccc", cursor: isHuman ? "pointer" : "default",
        fontSize: "13px",
      });
      econBtnEls.push(btn);
      if (isHuman) {
        btn.addEventListener("click", () => {
          this._updateChoice(player, { incomeMultiplier: rate });
        });
      }
      econBtns.appendChild(btn);
    });
    panel.appendChild(econBtns);

    const updateEconBtns = (rate: number) => {
      econBtnEls.forEach((btn, i) => {
        btn.style.background = ECON_RATES[i] === rate ? "#2244aa" : "transparent";
        btn.style.borderColor = ECON_RATES[i] === rate ? "#6688dd" : "#444";
      });
    };

    // Map type
    if (player === this.humanPlayer || player === 1) {
      const mapLabel = document.createElement("div");
      mapLabel.textContent = "Map";
      Object.assign(mapLabel.style, { fontSize: "12px", color: "#aaa", marginBottom: "8px" });
      panel.appendChild(mapLabel);

      const mapBtns = document.createElement("div");
      Object.assign(mapBtns.style, { display: "flex", gap: "6px", marginBottom: "20px" });

      const maps = [
        { label: "Cylinder", type: MapType.Cylinder },
        { label: "Rectangular", type: MapType.Rectangular },
      ];
      const mapBtnEls: HTMLButtonElement[] = [];

      maps.forEach(({ label, type }) => {
        const btn = document.createElement("button");
        btn.textContent = label;
        Object.assign(btn.style, {
          padding: "4px 12px", borderRadius: "6px", border: "1px solid #444",
          background: "transparent", color: "#ccc", cursor: isHuman ? "pointer" : "default",
          fontSize: "13px",
        });
        mapBtnEls.push(btn);
        if (isHuman) {
          btn.addEventListener("click", () => {
            this._updateChoice(player, { mapType: type });
          });
        }
        mapBtns.appendChild(btn);
      });
      panel.appendChild(mapBtns);

      // Store update fn on panel element for refreshing
      (panel as any).__updateMap = (t: MapType) => {
        mapBtnEls.forEach((btn, i) => {
          btn.style.background = maps[i].type === t ? "#224422" : "transparent";
          btn.style.borderColor = maps[i].type === t ? "#44aa44" : "#444";
        });
      };
    }

    // Ready button (only for human)
    let readyBtn: HTMLButtonElement | null = null;
    if (isHuman) {
      readyBtn = document.createElement("button");
      readyBtn.textContent = "Ready ✓";
      Object.assign(readyBtn.style, {
        marginTop: "8px", padding: "10px 24px", borderRadius: "8px",
        background: "#1a3a1a", color: "#88cc88", border: "1px solid #44aa44",
        cursor: "pointer", fontSize: "15px", fontFamily: "monospace", width: "100%",
      });
      readyBtn.addEventListener("click", () => {
        this._updateChoice(player, { ready: true });
        this.onReady();
        readyBtn!.disabled = true;
        readyBtn!.textContent = "Waiting…";
        readyBtn!.style.opacity = "0.5";
      });
      panel.appendChild(readyBtn);
    } else {
      const waitLabel = document.createElement("div");
      waitLabel.textContent = "Waiting for opponent…";
      Object.assign(waitLabel.style, { color: "#666", marginTop: "8px", fontSize: "13px" });
      panel.appendChild(waitLabel);
    }

    // Status indicator
    const statusEl = document.createElement("div");
    Object.assign(statusEl.style, { marginTop: "8px", fontSize: "12px", color: "#666" });
    panel.appendChild(statusEl);

    // Store updater functions on panel for external refresh
    (panel as any).__updateSwatches = updateSwatches;
    (panel as any).__updateEconBtns = updateEconBtns;
    (panel as any).__statusEl = statusEl;
    (panel as any).__playerNum = player;

    // Apply initial state
    const choice = player === 1 ? this.p1Choice : this.p2Choice;
    updateSwatches(choice.colorIndex);
    updateEconBtns(choice.incomeMultiplier);
    if ((panel as any).__updateMap) (panel as any).__updateMap(choice.mapType);

    return panel;
  }

  private _updateChoice(player: 1 | 2, delta: Partial<LobbyChoice>): void {
    if (player === 1) {
      this.p1Choice = { ...this.p1Choice, ...delta };
    } else {
      this.p2Choice = { ...this.p2Choice, ...delta };
    }
    this.onUpdate(delta);
    this._refreshPanel(player);
  }

  private _refreshPanel(player: 1 | 2): void {
    const panels = this.el.querySelectorAll("[data-player]");
    const panel = Array.from(panels).find(p => (p as any).__playerNum === player) as any;
    if (!panel) return;
    const choice = player === 1 ? this.p1Choice : this.p2Choice;
    panel.__updateSwatches?.(choice.colorIndex);
    panel.__updateEconBtns?.(choice.incomeMultiplier);
    panel.__updateMap?.(choice.mapType);
    if (panel.__statusEl) {
      panel.__statusEl.textContent = choice.ready ? "✓ Ready" : "";
    }
  }

  /** Called when a server S_LOBBY_STATE arrives (online mode). */
  updateOpponentChoice(opponentChoice: LobbyChoice): void {
    const opponent = this.humanPlayer === 1 ? 2 : 1;
    if (opponent === 1) this.p1Choice = { ...this.p1Choice, ...opponentChoice };
    else this.p2Choice = { ...this.p2Choice, ...opponentChoice };
    this._refreshPanel(opponent);
  }

  getP1Choice(): LobbyChoice { return this.p1Choice; }
  getP2Choice(): LobbyChoice { return this.p2Choice; }

  remove(): void {
    this.el.remove();
  }
}
