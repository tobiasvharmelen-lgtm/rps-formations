import {
  GameState, Unit, UnitType, Tier, PlayerId, FormationShape,
  Zone, ZoneOwner, ZoneType, Base,
  MAP_WIDTH, MAP_HEIGHT, UNIT_RADIUS, ZONE_RADIUS, getStat,
} from "shared";

const UNIT_COLORS: Record<UnitType, [string, string]> = {
  [UnitType.Rock]:     ["#e74c3c", "#c0392b"],  // red hues
  [UnitType.Paper]:    ["#3498db", "#2980b9"],  // blue hues
  [UnitType.Scissors]: ["#2ecc71", "#27ae60"],  // green hues
};

const ZONE_COLORS: Record<ZoneType, string> = {
  [ZoneType.Circle]:   "#e74c3c",
  [ZoneType.Square]:   "#3498db",
  [ZoneType.Triangle]: "#2ecc71",
};

const OWNER_TINT: Record<ZoneOwner, string> = {
  [ZoneOwner.Neutral]: "rgba(255,255,255,0.05)",
  [ZoneOwner.Player1]: "rgba(255,100,100,0.15)",
  [ZoneOwner.Player2]: "rgba(100,100,255,0.15)",
};

export class DebugRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private scaleX = 1;
  private scaleY = 1;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;
  }

  render(state: GameState, viewW: number, viewH: number): void {
    this.scaleX = viewW / MAP_WIDTH;
    this.scaleY = viewH / MAP_HEIGHT;

    const ctx = this.ctx;
    ctx.clearRect(0, 0, viewW, viewH);

    // Background
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, viewW, viewH);

    this.drawMap(state);
    this.drawZones(state.zones);
    this.drawBases(state.bases);
    this.drawUnits(state.units);
    this.drawHUD(state, viewW, viewH);
  }

  private wx(x: number): number { return x * this.scaleX; }
  private wy(y: number): number { return y * this.scaleY; }
  private wr(r: number): number { return r * Math.min(this.scaleX, this.scaleY); }

  private drawMap(_state: GameState): void {
    const ctx = this.ctx;
    // Center divider
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.wx(MAP_WIDTH / 2), 0);
    ctx.lineTo(this.wx(MAP_WIDTH / 2), this.wy(MAP_HEIGHT));
    ctx.stroke();
  }

  private drawZones(zones: Zone[]): void {
    const ctx = this.ctx;

    for (const zone of zones) {
      const cx = this.wx(zone.x);
      const cy = this.wy(zone.y);
      const r = this.wr(zone.radius);
      const color = ZONE_COLORS[zone.type];

      // Fill tint based on owner
      ctx.fillStyle = OWNER_TINT[zone.owner];

      switch (zone.type) {
        case ZoneType.Circle:
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.stroke();
          break;

        case ZoneType.Square: {
          ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.strokeRect(cx - r, cy - r, r * 2, r * 2);
          break;
        }

        case ZoneType.Triangle: {
          ctx.beginPath();
          ctx.moveTo(cx, cy - r);
          ctx.lineTo(cx + r * Math.cos(Math.PI / 6), cy + r * 0.5);
          ctx.lineTo(cx - r * Math.cos(Math.PI / 6), cy + r * 0.5);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.stroke();
          break;
        }
      }

      // Capture progress bar
      const barW = r * 2;
      const barH = 6;
      const barX = cx - r;
      const barY = cy + r + 4;
      ctx.fillStyle = "#333";
      ctx.fillRect(barX, barY, barW, barH);
      const progress = (zone.captureProgress + 100) / 200; // 0–1
      ctx.fillStyle = progress > 0.5 ? "#e74c3c" : "#3498db";
      ctx.fillRect(barX, barY, barW * progress, barH);
    }
  }

  private drawBases(bases: [Base, Base]): void {
    const ctx = this.ctx;

    for (const base of bases) {
      const cx = this.wx(base.x);
      const cy = this.wy(base.y);
      const r = this.wr(500);

      ctx.strokeStyle = base.owner === PlayerId.One ? "#e74c3c" : "#3498db";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      // HP bar
      const barW = r * 2;
      const barX = cx - r;
      const barY = cy + r + 6;
      ctx.fillStyle = "#333";
      ctx.fillRect(barX, barY, barW, 8);
      ctx.fillStyle = base.owner === PlayerId.One ? "#e74c3c" : "#3498db";
      ctx.fillRect(barX, barY, barW * (base.hp / base.maxHp), 8);

      ctx.fillStyle = "#fff";
      ctx.font = `${Math.round(this.wr(250))}px monospace`;
      ctx.textAlign = "center";
      ctx.fillText(base.owner === PlayerId.One ? "P1" : "P2", cx, cy + this.wr(100));
    }
  }

  private drawUnits(units: Unit[]): void {
    const ctx = this.ctx;

    for (const unit of units) {
      const cx = this.wx(unit.x);
      const cy = this.wy(unit.y);
      const r = this.wr(getStat(UNIT_RADIUS, unit.type, unit.tier));
      const [fill, stroke] = UNIT_COLORS[unit.type];
      const alpha = unit.owner === PlayerId.One ? 1.0 : 0.6;

      ctx.globalAlpha = alpha;
      ctx.fillStyle = fill;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = unit.owner === PlayerId.One ? 2 : 1;

      switch (unit.type) {
        case UnitType.Rock:
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          break;

        case UnitType.Paper:
          ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
          ctx.strokeRect(cx - r, cy - r, r * 2, r * 2);
          break;

        case UnitType.Scissors: {
          ctx.beginPath();
          ctx.moveTo(cx, cy - r);
          ctx.lineTo(cx + r * 0.866, cy + r * 0.5);
          ctx.lineTo(cx - r * 0.866, cy + r * 0.5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;
        }
      }

      // HP bar
      ctx.globalAlpha = 1;
      const hpFrac = unit.hp / unit.maxHp;
      ctx.fillStyle = "#333";
      ctx.fillRect(cx - r, cy + r + 2, r * 2, 3);
      ctx.fillStyle = hpFrac > 0.5 ? "#2ecc71" : hpFrac > 0.25 ? "#f39c12" : "#e74c3c";
      ctx.fillRect(cx - r, cy + r + 2, r * 2 * hpFrac, 3);

      // Tier dots
      if (unit.tier > 0) {
        ctx.fillStyle = "#fff";
        for (let t = 0; t <= unit.tier; t++) {
          ctx.beginPath();
          ctx.arc(cx - r + 4 + t * 6, cy - r - 4, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawHUD(state: GameState, viewW: number, viewH: number): void {
    const ctx = this.ctx;
    ctx.font = "14px monospace";
    ctx.textAlign = "left";

    const p1 = state.players[0];
    const p2 = state.players[1];

    ctx.fillStyle = "#e74c3c";
    ctx.fillText(`P1  R:${p1.resources[0]}  P:${p1.resources[1]}  S:${p1.resources[2]}`, 10, 20);
    ctx.fillStyle = "#3498db";
    ctx.fillText(`P2  R:${p2.resources[0]}  P:${p2.resources[1]}  S:${p2.resources[2]}`, 10, 38);

    ctx.fillStyle = "#888";
    ctx.fillText(`Tick: ${state.tick}  Units: ${state.units.length}`, 10, 56);

    // Game over banner
    if (state.winnerId) {
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(viewW / 2 - 150, viewH / 2 - 30, 300, 60);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 28px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`Player ${state.winnerId} wins!`, viewW / 2, viewH / 2 + 10);
    }
  }
}
