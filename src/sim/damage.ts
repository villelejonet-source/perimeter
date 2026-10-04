import { ARTIFACT_TUNING } from '../data/artifacts';
import { DAMAGE, type DamageType } from '../data/damage';
import { SPEC_TUNING } from '../data/specs';
import type { TowerKind } from '../data/towers';
import { SHIELD_REGEN_DELAY_TICKS, spawnEnemy } from './enemies';
import type { Path } from './path';
import { NO_MODS, type HitMods } from './specs';
import type { Enemy, SimState } from './state';
import { emitFx } from './fx';
import { nearestEnemy } from './targeting';

const SHATTER_FX_TICKS = 14;

const BRITTLE_ARMOR = 1 - SPEC_TUNING.brittle.armorLoss;
const AT = ARTIFACT_TUNING;

/**
 * True while applying an artifact's follow-up hit (Ricochet, Overflow, Cryo Lattice), so
 * follow-ups never chain into more follow-ups.
 */
let followUp = false;
/** Scratch exclude list for Ricochet (no per-hit allocation). */
const bounceExclude = new Int32Array(1);

/**
 * Applies one hit (GDD §6, order decided 2026-10-04): the shield absorbs first with its
 * type multiplier, then armor reduces what reaches the hull (flat, with a 10% floor).
 * Frozen enemies take +50% kinetic. `mods` carries specialization effects (boss bonus, EMP
 * shield break, execute, stun). Returns the damage actually dealt.
 */
export function applyHit(
  state: SimState,
  path: Path,
  e: Enemy,
  amount: number,
  type: DamageType,
  source: TowerKind,
  mods: Readonly<HitMods> = NO_MODS,
): number {
  if (!e.alive || amount <= 0 || type === 'utility') return 0;
  const art = state.art;
  let dmg = amount;
  if (e.boss) dmg *= 1 + mods.bossBonus;
  if (e.frozen > 0 && type === 'kinetic') dmg *= DAMAGE.frozenKineticBonus;
  if (e.frozen > 0 || e.stunned > 0) dmg *= 1 + art.shatterPoint;
  if (e.boss || e.elite) dmg *= 1 + art.priorityTargeting;
  if (e.flying) dmg *= 1 + art.skyguard;

  let dealt = 0;
  if (e.shield > 0) {
    const mult =
      DAMAGE.vsShield[type] *
      mods.shieldMult *
      (1 + (type === 'energy' ? art.superconductor : art.shieldBreaker));
    const absorbed = dmg * mult;
    if (absorbed <= e.shield) {
      e.shield -= absorbed;
      dealt += absorbed;
      dmg = 0;
    } else {
      dealt += e.shield;
      dmg -= e.shield / mult;
      e.shield = 0;
    }
  }
  if (e.maxShield > 0) e.shieldDelay = SHIELD_REGEN_DELAY_TICKS;

  let overkill = 0;
  if (dmg > 0) {
    let armor = e.brittle > 0 ? e.armor * BRITTLE_ARMOR : e.armor;
    if (type === 'kinetic') armor *= 1 - art.penetratorRounds;
    const through = Math.max(dmg - armor, dmg * DAMAGE.armorFloor);
    const hull = Math.min(e.hp, through);
    overkill = through - hull;
    e.hp -= hull;
    dealt += hull;
  }
  // Executioner: finish off non-bosses left below the threshold.
  if (mods.execute > 0 && !e.boss && e.hp > 0 && e.hp < e.maxHp * mods.execute) {
    dealt += e.hp;
    e.hp = 0;
  }
  if (mods.stunTicks > 0 && !e.boss && e.hp > 0) e.stunned = Math.max(e.stunned, mods.stunTicks);

  const stats = state.stats;
  stats.damageDealt += dealt;
  stats.damageByType[type] += dealt;
  stats.damageByTower[source] = (stats.damageByTower[source] ?? 0) + dealt;
  const x = e.x;
  const y = e.y;
  if (e.hp <= 0) kill(state, path, e, source);
  if (!followUp) {
    followUp = true;
    // Ricochet Matrix: kinetic hits bounce once to the nearest other enemy.
    if (art.ricochetMatrix > 0 && type === 'kinetic') {
      bounceExclude[0] = e.id;
      const next = nearestEnemy(state, x, y, AT.bounceRadius, true, bounceExclude, 1);
      if (next) applyHit(state, path, next, amount * art.ricochetMatrix, type, source, mods);
    }
    // Overflow Reactor: part of the overkill carries to the nearest enemy.
    if (art.overflowReactor > 0 && overkill > 0) {
      const next = nearestEnemy(state, x, y, AT.bounceRadius, true);
      if (next) applyHit(state, path, next, overkill * art.overflowReactor, type, source);
    }
    followUp = false;
  }
  return dealt;
}

function kill(state: SimState, path: Path, e: Enemy, source: TowerKind): void {
  e.alive = false;
  const bounty = Math.round(e.bounty * (1 + state.art.bountyProtocol));
  state.credits += bounty;
  state.stats.creditsEarned += bounty;
  state.stats.kills++;
  if (e.boss) {
    state.stats.bossesKilled++;
    // GDD §9: every boss down offers an artifact pick (sim.ts builds it).
    state.offersQueued++;
  }
  // Cryo Lattice: a frozen enemy shatters, hurting everything close by.
  if (state.art.cryoLattice > 0 && e.frozen > 0 && !followUp) shatter(state, path, e, source);
  if (e.splitKind) {
    // Copy first: the dead splitter's pool slot is reused by its first child.
    const kind = e.splitKind;
    const count = e.splitCount;
    const dist = e.dist;
    const wave = e.wave;
    // Children spread around where it died.
    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) / 2) * 6;
      spawnEnemy(state, path, kind, wave, false, Math.max(0, dist + offset));
    }
  }
}

function shatter(state: SimState, path: Path, e: Enemy, source: TowerKind): void {
  const dmg = e.maxHp * state.art.cryoLattice;
  const r = AT.shatterRadius;
  const bornAfter = state.nextId;
  followUp = true;
  for (const o of state.enemies.items) {
    if (!o.alive || o.id >= bornAfter) continue;
    const reach = r + o.radius;
    if ((o.x - e.x) ** 2 + (o.y - e.y) ** 2 <= reach * reach)
      applyHit(state, path, o, dmg, 'kinetic', source);
  }
  followUp = false;
  emitFx(state, 'blast', e.x, e.y, e.x, e.y, SHATTER_FX_TICKS, r);
}
