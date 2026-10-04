import { CHILL, DAMAGE } from '../data/damage';
import { bounty, enemyArmor, enemyHp, enemyShield } from '../data/curves';
import { ELITE, ENEMIES, type EnemyKind } from '../data/enemies';
import { GAME } from '../data/game';
import type { Path } from './path';
import type { Enemy, SimState } from './state';

const dt = 1 / GAME.tickRate;
const ticks = (seconds: number): number => Math.round(seconds * GAME.tickRate);

export const SHIELD_REGEN_DELAY_TICKS = ticks(DAMAGE.shieldRegenDelaySeconds);
const FREEZE_TICKS = ticks(CHILL.freezeSeconds);
const FREEZE_IMMUNE_TICKS = ticks(CHILL.immuneSeconds);
const CHILL_DECAY_PER_TICK = CHILL.decayPerSecond * dt;

/**
 * Spawns an enemy of `kind` scaled for `wave` at `dist` along the path. `alsoKind` merges a
 * second boss's traits in (combined bosses from wave 50, GDD §8).
 */
export function spawnEnemy(
  state: SimState,
  path: Path,
  kind: EnemyKind,
  wave: number,
  elite: boolean,
  dist: number,
  alsoKind: EnemyKind | null = null,
): Enemy {
  const def = ENEMIES[kind];
  const also = alsoKind ? ENEMIES[alsoKind] : null;
  const baseHp = Math.max(def.baseHp, also?.baseHp ?? 0);
  const baseShield = Math.max(def.baseShield, also?.baseShield ?? 0);
  const baseArmor = Math.max(def.baseArmor, also?.baseArmor ?? 0);
  const spawns = def.spawns ?? also?.spawns;
  const eliteMult = (m: number): number => (elite ? m : 1);

  const e = state.enemies.acquire();
  e.id = state.nextId++;
  e.kind = kind;
  e.wave = wave;
  e.elite = elite;
  e.boss = def.boss;
  e.dist = dist;
  e.maxHp = enemyHp(baseHp, wave) * eliteMult(ELITE.hpMult);
  e.hp = e.maxHp;
  e.maxShield = enemyShield(baseShield, wave) * eliteMult(ELITE.shieldMult);
  e.shield = e.maxShield;
  e.shieldRegen = e.maxShield * Math.max(def.shieldRegen, also?.shieldRegen ?? 0) * dt;
  e.shieldDelay = 0;
  e.armor = enemyArmor(baseArmor, wave) * eliteMult(ELITE.armorMult);
  e.baseSpeed = def.speed;
  e.speed = def.speed;
  e.bounty = Math.round(bounty(def.baseBounty, wave) * eliteMult(ELITE.bountyMult));
  e.radius = def.radius;
  e.flying = def.flying || (also?.flying ?? false);
  e.leakDamage = def.boss ? -1 : elite ? ELITE.leakDamage : def.leakDamage;
  e.chill = 0;
  e.maxChill = def.boss ? CHILL.bossMaxChill : 1;
  e.frozen = 0;
  e.freezeImmune = 0;
  e.healRadius = def.heal?.radius ?? 0;
  e.healPerTick = (def.heal?.perSecond ?? 0) * dt;
  e.spawnKind = spawns?.kind ?? null;
  e.spawnEvery = spawns ? ticks(spawns.everySeconds) : 0;
  e.spawnCooldown = e.spawnEvery;
  e.splitKind = def.split?.kind ?? null;
  e.splitCount = def.split?.count ?? 0;
  path.positionAt(dist, e);
  return e;
}

/** Adds chill; at full chill the enemy freezes (bosses cap below full, so they only slow). */
export function applyChill(e: Enemy, amount: number): void {
  if (!e.alive || e.frozen > 0) return;
  const cap = e.freezeImmune > 0 ? Math.min(e.maxChill, 0.99) : e.maxChill;
  e.chill = Math.min(cap, e.chill + amount);
  if (e.chill >= 1) {
    e.chill = 1;
    e.frozen = FREEZE_TICKS;
  }
}

/** Shield regen, chill decay and freeze timers; sets the current speed. */
function updateStatus(e: Enemy): void {
  if (e.maxShield > 0 && e.shield < e.maxShield) {
    if (e.shieldDelay > 0) e.shieldDelay--;
    else e.shield = Math.min(e.maxShield, e.shield + e.shieldRegen);
  }
  if (e.frozen > 0) {
    e.frozen--;
    e.speed = 0;
    if (e.frozen === 0) {
      e.chill = 0;
      e.freezeImmune = FREEZE_IMMUNE_TICKS;
    }
    return;
  }
  if (e.freezeImmune > 0) e.freezeImmune--;
  if (e.chill > 0) e.chill = Math.max(0, e.chill - CHILL_DECAY_PER_TICK);
  e.speed = e.baseSpeed * (1 - e.chill * CHILL.maxSlow);
}

/** Medics heal the hull of every other enemy in range. */
function heal(state: SimState, medic: Enemy): void {
  const rSq = medic.healRadius * medic.healRadius;
  for (const o of state.enemies.items) {
    if (!o.alive || o === medic || o.hp >= o.maxHp) continue;
    const dx = o.x - medic.x;
    const dy = o.y - medic.y;
    if (dx * dx + dy * dy <= rSq) o.hp = Math.min(o.maxHp, o.hp + o.maxHp * medic.healPerTick);
  }
}

function leak(state: SimState, e: Enemy): void {
  e.alive = false;
  // Boss rule (GDD §5): remaining base HP minus 1, so a boss leak is nearly fatal but not instant.
  const dmg = e.leakDamage < 0 ? Math.max(state.baseHp - 1, 1) : e.leakDamage;
  state.baseHp = Math.max(0, state.baseHp - dmg);
  state.stats.leaks++;
}

export function updateEnemies(state: SimState, path: Path): void {
  const items = state.enemies.items;
  // Index loop: boss minions spawned here may grow the pool; they start moving next tick.
  const n = items.length;
  for (let i = 0; i < n; i++) {
    const e = items[i]!;
    if (!e.alive) continue;
    updateStatus(e);
    if (e.healRadius > 0) heal(state, e);
    if (e.spawnKind && --e.spawnCooldown <= 0) {
      e.spawnCooldown = e.spawnEvery;
      spawnEnemy(state, path, e.spawnKind, e.wave, false, Math.max(0, e.dist - 4));
    }
    e.dist += e.speed * dt;
    if (e.dist >= path.length) {
      leak(state, e);
      continue;
    }
    path.positionAt(e.dist, e);
  }
}
