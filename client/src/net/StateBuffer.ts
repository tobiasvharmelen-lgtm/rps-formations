import { GameState, Unit, Zone } from "shared";

interface Snapshot {
  serverTime: number; // performance.now() at the moment we received it
  state: GameState;
}

const MAX_SNAPSHOTS = 12;

/**
 * Ring buffer of recently-received game state snapshots, used for client interpolation.
 * The renderer asks for an interpolated state at a specific render time
 * (typically serverTime - CLIENT_BUFFER_MS).
 */
export class StateBuffer {
  private snapshots: Snapshot[] = [];

  /** timestamp should be performance.now() + serverTimeOffset (server clock in client domain). */
  add(state: GameState, timestamp: number): void {
    this.snapshots.push({ serverTime: timestamp, state });
    if (this.snapshots.length > MAX_SNAPSHOTS) this.snapshots.shift();
  }

  /** Most recent snapshot (or null). */
  latest(): GameState | null {
    return this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1].state : null;
  }

  /**
   * Get an interpolated state at renderTime (performance.now()-domain).
   * Returns the latest known state if we don't have two snapshots bracketing renderTime.
   */
  getInterpolated(renderTime: number): GameState | null {
    if (this.snapshots.length === 0) return null;
    if (this.snapshots.length === 1) return this.snapshots[0].state;

    // Find two snapshots: prev (<= renderTime) and next (> renderTime)
    let prev = this.snapshots[0];
    let next = this.snapshots[this.snapshots.length - 1];
    for (let i = 0; i < this.snapshots.length - 1; i++) {
      if (this.snapshots[i].serverTime <= renderTime && this.snapshots[i + 1].serverTime >= renderTime) {
        prev = this.snapshots[i];
        next = this.snapshots[i + 1];
        break;
      }
    }

    if (prev === next) return prev.state;
    if (renderTime >= next.serverTime) return next.state;

    const span = next.serverTime - prev.serverTime;
    const alpha = span > 0 ? (renderTime - prev.serverTime) / span : 0;
    const t = Math.max(0, Math.min(1, alpha));

    return interpolate(prev.state, next.state, t);
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Lerp positions and zone capture progress; snap everything else to next state. */
function interpolate(prev: GameState, next: GameState, t: number): GameState {
  // Build a unit map from prev for cross-tick lookups
  const prevUnitMap = new Map<number, Unit>();
  for (const u of prev.units) prevUnitMap.set(u.id, u);

  const units: Unit[] = next.units.map(nu => {
    const pu = prevUnitMap.get(nu.id);
    if (!pu) return { ...nu };
    return {
      ...nu,
      x: lerp(pu.x, nu.x, t),
      y: lerp(pu.y, nu.y, t),
    };
  });

  const zones: Zone[] = next.zones.map((nz, i) => ({
    ...nz,
    captureProgress: lerp(prev.zones[i].captureProgress, nz.captureProgress, t),
  }));

  return {
    ...next,
    units,
    zones,
  };
}
