import { GameState, PlayerId } from "shared";
import { GATE_UNIT_COST, SPAWN_COST_T1 } from "shared";

export function tickGates(state: GameState): void {
  for (const gate of state.gates) {
    if (gate.p1Open && gate.p2Open) continue;

    // Units are contributed explicitly via ContributeGate input — no auto-consumption here.
    // Just check if either player has reached the unlock threshold.
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
