import { GameState, Unit, PlayerId, Tier, TerrainType, UnitType } from "shared";
import { UNIT_ATTACK_RANGE, UNIT_ATTACK_COOLDOWN, UNIT_DAMAGE, getStat } from "shared";
import { computeDamage, hasAdvantage } from "shared";
import { BASE_ATTACK_RANGE, BASE_DAMAGE, BASE_ATTACK_COOLDOWN } from "shared";
import { SpatialHash } from "../SpatialHash.js";
import { MAP_WIDTH } from "shared";

let nextTerrainId = 1_000_000;

const TERRAIN_FROM_UNIT: Record<UnitType, TerrainType> = {
  [UnitType.Rock]:     TerrainType.RockWall,
  [UnitType.Paper]:    TerrainType.PaperGrass,
  [UnitType.Scissors]: TerrainType.ScissorHazard,
};

function spawnBattleScar(state: GameState, unit: Unit): void {
  state.terrain.push({
    id: nextTerrainId++,
    type: TERRAIN_FROM_UNIT[unit.type],
    x: unit.x,
    y: unit.y,
    radius: 500,
  });
}

export function tickCombat(state: GameState, spatialHash: SpatialHash): void {
  const unitMap  = new Map<number, Unit>();
  for (const u of state.units) unitMap.set(u.id, u);

  const toRemove = new Set<number>();

  // ---- Unit vs unit combat ----
  for (const attacker of state.units) {
    if (attacker.attackCooldown > 0) {
      attacker.attackCooldown--;
      continue;
    }

    const range    = getStat(UNIT_ATTACK_RANGE, attacker.type, attacker.tier);
    const nearbyIds = spatialHash.queryWrapped(attacker.x, attacker.y, range, MAP_WIDTH);

    // Check buildings too (prefer units over buildings)
    let target: Unit | null = null;
    let bestScore = -1;

    for (const nid of nearbyIds) {
      const candidate = unitMap.get(nid);
      if (!candidate || candidate.owner === attacker.owner) continue;
      const dx   = candidate.x - attacker.x;
      const dy   = candidate.y - attacker.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > range) continue;

      const advantageScore = hasAdvantage(attacker.type, candidate.type) ? 2 : 1;
      const distScore      = 1 - dist / range;
      const score          = advantageScore + distScore;

      if (score > bestScore) { bestScore = score; target = candidate; }
    }

    // If no unit target, attack nearby enemy buildings
    if (!target) {
      for (const building of state.buildings) {
        if (building.owner === attacker.owner) continue;
        const dx = building.x - attacker.x;
        const dy = building.y - attacker.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= range) {
          const dmg = getStat(UNIT_DAMAGE, attacker.type, attacker.tier);
          building.hp -= dmg;
          attacker.attackCooldown = getStat(UNIT_ATTACK_COOLDOWN, attacker.type, attacker.tier);
          break;
        }
      }
      // Remove destroyed buildings
      state.buildings = state.buildings.filter(b => b.hp > 0);
      continue;
    }

    attacker.targetId = target.id;

    const dmg = computeDamage(attacker, target);
    target.hp -= dmg;
    attacker.attackCooldown = getStat(UNIT_ATTACK_COOLDOWN, attacker.type, attacker.tier);
    if (target.hp <= 0) toRemove.add(target.id);

    // ---- Cleave: Large units deal 50% flat damage to all other nearby enemies ----
    if (attacker.tier === Tier.Large) {
      for (const nid of nearbyIds) {
        if (nid === target.id || nid === attacker.id) continue;
        const splash = unitMap.get(nid);
        if (!splash || splash.owner === attacker.owner) continue;
        const dx = splash.x - attacker.x;
        const dy = splash.y - attacker.y;
        if (dx * dx + dy * dy > range * range) continue;
        const splashDmg = Math.floor(dmg * 0.5);
        splash.hp -= splashDmg;
        if (splash.hp <= 0) toRemove.add(splash.id);
      }
    }
  }

  // ---- Remove dead units + spawn Battle Scars for Large deaths ----
  if (toRemove.size > 0) {
    const dying = state.units.filter(u => toRemove.has(u.id));
    for (const u of dying) {
      if (u.tier === Tier.Large) spawnBattleScar(state, u);
    }
    state.units = state.units.filter(u => !toRemove.has(u.id));
  }

  // ---- Base auto-attack ----
  for (const base of state.bases) {
    if (base.attackCooldown > 0) { base.attackCooldown--; continue; }

    const enemyOwner = base.owner === PlayerId.One ? PlayerId.Two : PlayerId.One;
    const nearbyIds  = spatialHash.queryWrapped(base.x, base.y, BASE_ATTACK_RANGE, MAP_WIDTH);

    let closest: Unit | null = null;
    let closestDist = Infinity;

    for (const nid of nearbyIds) {
      const u = unitMap.get(nid);
      if (!u || u.owner !== enemyOwner) continue;
      const dx   = u.x - base.x;
      const dy   = u.y - base.y;
      const dist = dx * dx + dy * dy;
      if (dist < closestDist) { closestDist = dist; closest = u; }
    }

    if (closest) {
      closest.hp -= BASE_DAMAGE;
      base.attackCooldown = BASE_ATTACK_COOLDOWN;
      if (closest.hp <= 0) {
        if (closest.tier === Tier.Large) spawnBattleScar(state, closest);
        state.units = state.units.filter(u => u.id !== closest!.id);
      }
    }
  }
}
