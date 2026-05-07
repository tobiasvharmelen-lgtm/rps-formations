import { GameState, PlayerId, GamePhase, ZoneOwner } from "shared";
import { BASE_CAPTURE_RANGE, BASE_CAPTURE_TICKS, MAP_WIDTH } from "shared";

const ZONE_DOMINATION_TICKS = 20 * 30; // 30 seconds of full zone control

// Tracks consecutive ticks a player has held all 3 zones
let p1DominationTicks = 0;
let p2DominationTicks = 0;

export function resetWinState(): void {
  p1DominationTicks = 0;
  p2DominationTicks = 0;
}

function wrappedDx(ax: number, bx: number): number {
  let d = ax - bx;
  if (d >  MAP_WIDTH / 2) d -= MAP_WIDTH;
  if (d < -MAP_WIDTH / 2) d += MAP_WIDTH;
  return d;
}

export function checkWin(state: GameState): void {
  if (state.phase !== GamePhase.Active) return;

  // Base destruction
  for (const base of state.bases) {
    if (base.hp <= 0) {
      const winnerId = base.owner === PlayerId.One ? PlayerId.Two : PlayerId.One;
      state.phase = GamePhase.Ended;
      state.winnerId = winnerId;
      return;
    }
  }

  // Base capture: hold enemy base for 20 seconds to win
  for (const base of state.bases) {
    const enemyOwner = base.owner === PlayerId.One ? PlayerId.Two : PlayerId.One;
    const captureSq = BASE_CAPTURE_RANGE * BASE_CAPTURE_RANGE;
    const hasEnemy = state.units.some(u => {
      if (u.owner !== enemyOwner) return false;
      const dx = wrappedDx(u.x, base.x);
      const dy = u.y - base.y;
      return dx * dx + dy * dy <= captureSq;
    });

    if (hasEnemy) {
      base.captureProgress = Math.min(BASE_CAPTURE_TICKS, base.captureProgress + 1);
    } else {
      base.captureProgress = Math.max(0, base.captureProgress - 0.5);
    }

    if (base.captureProgress >= BASE_CAPTURE_TICKS) {
      state.phase = GamePhase.Ended;
      state.winnerId = enemyOwner;
      return;
    }
  }

  // Zone domination: hold all 3 zones for 30 seconds
  const p1OwnsAll = state.zones.every(z => z.owner === ZoneOwner.Player1);
  const p2OwnsAll = state.zones.every(z => z.owner === ZoneOwner.Player2);

  if (p1OwnsAll) {
    p1DominationTicks++;
    p2DominationTicks = 0;
  } else if (p2OwnsAll) {
    p2DominationTicks++;
    p1DominationTicks = 0;
  } else {
    p1DominationTicks = 0;
    p2DominationTicks = 0;
  }

  if (p1DominationTicks >= ZONE_DOMINATION_TICKS) {
    state.phase = GamePhase.Ended;
    state.winnerId = PlayerId.One;
  } else if (p2DominationTicks >= ZONE_DOMINATION_TICKS) {
    state.phase = GamePhase.Ended;
    state.winnerId = PlayerId.Two;
  }
}
