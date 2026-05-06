import { GameState, Unit, PlayerId } from "shared";
import { UNIT_ATTACK_RANGE, UNIT_ATTACK_COOLDOWN, getStat } from "shared";
import { computeDamage, hasAdvantage } from "shared";
import { BASE_ATTACK_RANGE, BASE_DAMAGE, BASE_ATTACK_COOLDOWN } from "shared";
import { SpatialHash } from "../SpatialHash.js";

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
    const nearbyIds = spatialHash.query(attacker.x, attacker.y, range);

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

    if (!target) continue;
    attacker.targetId = target.id;

    const dmg = computeDamage(attacker, target);
    target.hp -= dmg;

    attacker.attackCooldown = getStat(UNIT_ATTACK_COOLDOWN, attacker.type, attacker.tier);
    if (target.hp <= 0) toRemove.add(target.id);
  }

  // ---- Base auto-attack ----
  for (const base of state.bases) {
    if (base.attackCooldown > 0) { base.attackCooldown--; continue; }

    const enemyOwner = base.owner === PlayerId.One ? PlayerId.Two : PlayerId.One;
    const nearbyIds  = spatialHash.query(base.x, base.y, BASE_ATTACK_RANGE);

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
      if (closest.hp <= 0) toRemove.add(closest.id);
    }
  }

  // ---- Remove dead units ----
  if (toRemove.size > 0) {
    state.units = state.units.filter(u => !toRemove.has(u.id));
  }
}
