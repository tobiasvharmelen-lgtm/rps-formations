import { GameState, PlayerId } from "shared";
import { GATE_RADIUS, GATE_UNIT_COST, SPAWN_COST_T1, MAP_WIDTH } from "shared";

function wrappedDx(ax: number, bx: number): number {
  let d = ax - bx;
  if (d >  MAP_WIDTH / 2) d -= MAP_WIDTH;
  if (d < -MAP_WIDTH / 2) d += MAP_WIDTH;
  return d;
}

export function tickGates(state: GameState): void {
  for (const gate of state.gates) {
    if (gate.p1Open && gate.p2Open) continue;

    const toRemove: number[] = [];

    for (const unit of state.units) {
      if (unit.owner !== PlayerId.One && unit.owner !== PlayerId.Two) continue;

      const isP1 = unit.owner === PlayerId.One;
      if (isP1 && gate.p1Open) continue;
      if (!isP1 && gate.p2Open) continue;

      const dx = wrappedDx(unit.x, gate.x);
      const dy = unit.y - gate.y;
      if (dx * dx + dy * dy > GATE_RADIUS * GATE_RADIUS) continue;

      // Unit is inside the gate circle — contribute it
      toRemove.push(unit.id);
      if (isP1) gate.p1Units++;
      else       gate.p2Units++;
    }

    // Remove contributed units
    if (toRemove.length > 0) {
      const removeSet = new Set(toRemove);
      state.units = state.units.filter(u => !removeSet.has(u.id));
    }

    // Check if either player has reached the threshold
    if (!gate.p1Open && gate.p1Units >= GATE_UNIT_COST) {
      gate.p1Open = true;
      // Refund P2's contributed units as gold
      state.players[PlayerId.Two - 1].resources += gate.p2Units * SPAWN_COST_T1;
      gate.p2Units = 0;
      gate.p1Units = 0;
    }
    if (!gate.p2Open && gate.p2Units >= GATE_UNIT_COST) {
      gate.p2Open = true;
      // Refund P1's contributed units as gold
      state.players[PlayerId.One - 1].resources += gate.p1Units * SPAWN_COST_T1;
      gate.p1Units = 0;
      gate.p2Units = 0;
    }
  }
}
