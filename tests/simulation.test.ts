import { describe, it, expect } from "vitest";
import { PlayerId, UnitType, Tier, InputType, GamePhase } from "../shared/src/types.js";
import { GameSimulation } from "../server/src/game/GameSimulation.js";

function makeSim(): GameSimulation {
  const sim = new GameSimulation();
  sim.start();
  return sim;
}

describe("GameSimulation — spawn", () => {
  it("spawns a unit when player has enough resources", () => {
    const sim = makeSim();
    sim.applyInput(PlayerId.One, { seq: 1, type: InputType.SpawnUnit, spawnType: UnitType.Rock });
    expect(sim.state.units).toHaveLength(1);
    expect(sim.state.units[0].type).toBe(UnitType.Rock);
    expect(sim.state.units[0].owner).toBe(PlayerId.One);
    expect(sim.state.units[0].tier).toBe(Tier.Small);
  });

  it("deducts resources on spawn", () => {
    const sim = makeSim();
    const before = sim.state.players[0].resources[UnitType.Rock];
    sim.applyInput(PlayerId.One, { seq: 1, type: InputType.SpawnUnit, spawnType: UnitType.Rock });
    expect(sim.state.players[0].resources[UnitType.Rock]).toBe(before - 10);
  });

  it("does not spawn when resources are insufficient", () => {
    const sim = makeSim();
    sim.state.players[0].resources = [0, 0, 0];
    sim.applyInput(PlayerId.One, { seq: 1, type: InputType.SpawnUnit, spawnType: UnitType.Rock });
    expect(sim.state.units).toHaveLength(0);
  });

  it("spawned unit has targetX/Y matching its spawn position", () => {
    const sim = makeSim();
    sim.applyInput(PlayerId.One, { seq: 1, type: InputType.SpawnUnit, spawnType: UnitType.Rock });
    const u = sim.state.units[0];
    expect(u.targetX).toBe(u.x);
    expect(u.targetY).toBe(u.y);
  });
});

describe("GameSimulation — MoveUnits", () => {
  it("sets individual targetX/Y for each unit near the destination", () => {
    const sim = makeSim();
    sim.applyInput(PlayerId.One, { seq: 1, type: InputType.SpawnUnit, spawnType: UnitType.Rock });
    sim.applyInput(PlayerId.One, { seq: 2, type: InputType.SpawnUnit, spawnType: UnitType.Rock });
    const ids = sim.state.units.map(u => u.id);
    sim.applyInput(PlayerId.One, { seq: 3, type: InputType.MoveUnits, unitIds: ids, destX: 5000, destY: 8000 });
    for (const u of sim.state.units) {
      // Each target is within 500mm of the click (offset radius is sqrt(2)*120 ≈ 170mm max for 2 units)
      const dx = u.targetX - 5000;
      const dy = u.targetY - 8000;
      expect(Math.sqrt(dx * dx + dy * dy)).toBeLessThan(500);
    }
  });

  it("cannot move enemy units", () => {
    const sim = makeSim();
    sim.applyInput(PlayerId.Two, { seq: 1, type: InputType.SpawnUnit, spawnType: UnitType.Rock });
    const enemyId = sim.state.units[0].id;
    const originalTarget = { x: sim.state.units[0].targetX, y: sim.state.units[0].targetY };
    sim.applyInput(PlayerId.One, { seq: 2, type: InputType.MoveUnits, unitIds: [enemyId], destX: 9999, destY: 9999 });
    expect(sim.state.units[0].targetX).toBe(originalTarget.x);
    expect(sim.state.units[0].targetY).toBe(originalTarget.y);
  });
});

describe("GameSimulation — tick increments", () => {
  it("increments tick counter on each tick", () => {
    const sim = makeSim();
    sim.tick(new Map());
    expect(sim.state.tick).toBe(1);
    sim.tick(new Map());
    expect(sim.state.tick).toBe(2);
  });
});

describe("GameSimulation — determinism", () => {
  it("produces identical state from identical inputs", () => {
    const sim1 = makeSim();
    const sim2 = makeSim();

    const input = { seq: 1, type: InputType.SpawnUnit, spawnType: UnitType.Rock };
    sim1.applyInput(PlayerId.One, input);
    sim2.applyInput(PlayerId.One, input);

    for (let i = 0; i < 10; i++) {
      sim1.tick(new Map());
      sim2.tick(new Map());
    }

    expect(sim1.state.tick).toBe(sim2.state.tick);
    expect(sim1.state.units.length).toBe(sim2.state.units.length);
  });
});

describe("GameSimulation — phase", () => {
  it("is Active after start()", () => {
    const sim = makeSim();
    expect(sim.state.phase).toBe(GamePhase.Active);
  });
});
