import { describe, it, expect, beforeEach } from "vitest";
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

describe("GameSimulation — formation", () => {
  it("creates a formation from selected units", () => {
    const sim = makeSim();
    for (let i = 0; i < 5; i++) {
      sim.applyInput(PlayerId.One, { seq: i, type: InputType.SpawnUnit, spawnType: UnitType.Paper });
    }
    const unitIds = sim.state.units.map(u => u.id);
    sim.applyInput(PlayerId.One, {
      seq: 10, type: InputType.CreateFormation,
      unitIds, unitType: UnitType.Paper,
    });
    expect(sim.state.formations).toHaveLength(1);
    expect(sim.state.formations[0].unitIds).toHaveLength(5);
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
