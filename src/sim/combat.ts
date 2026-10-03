import { towerDamage } from '../data/curves';
import { GAME } from '../data/game';
import { TOWERS } from '../data/towers';
import type { Path } from './path';
import type { Enemy, SimState, TargetingMode, Tower } from './state';

const dt = 1 / GAME.tickRate;

export function moveEnemies(state: SimState, path: Path): void {
  for (const e of state.enemies.items) {
    if (!e.alive) continue;
    e.dist += e.speed * dt;
    if (e.dist >= path.length) {
      e.alive = false;
      state.baseHp = Math.max(0, state.baseHp - e.leakDamage);
      state.stats.leaks++;
      continue;
    }
    path.positionAt(e.dist, e);
  }
}

/** Better-than comparison per targeting mode; ties break on lower id for determinism. */
function isBetter(
  mode: TargetingMode,
  a: Enemy,
  aDistSq: number,
  b: Enemy,
  bDistSq: number,
): boolean {
  let diff: number;
  switch (mode) {
    case 'first':
      diff = a.dist - b.dist;
      break;
    case 'last':
      diff = b.dist - a.dist;
      break;
    case 'strongest':
      diff = a.hp - b.hp;
      break;
    case 'closest':
      diff = bDistSq - aDistSq;
      break;
  }
  return diff > 0 || (diff === 0 && a.id < b.id);
}

export function findTarget(state: SimState, tower: Tower): Enemy | null {
  const def = TOWERS[tower.kind];
  const rangeSq = def.range * def.range;
  let best: Enemy | null = null;
  let bestDistSq = 0;
  for (const e of state.enemies.items) {
    if (!e.alive) continue;
    if (e.flying && !def.canHitFlying) continue;
    const dx = e.x - tower.x;
    const dy = e.y - tower.y;
    const dSq = dx * dx + dy * dy;
    if (dSq > rangeSq) continue;
    if (best === null || isBetter(tower.targeting, e, dSq, best, bestDistSq)) {
      best = e;
      bestDistSq = dSq;
    }
  }
  return best;
}

export function updateTowers(state: SimState): void {
  for (const t of state.towers.items) {
    if (!t.alive) continue;
    if (t.cooldown > 0) t.cooldown--;
    const target = findTarget(state, t);
    t.targetId = target ? target.id : -1;
    if (!target || t.cooldown > 0) continue;

    const def = TOWERS[t.kind];
    const p = state.projectiles.acquire();
    p.x = t.x;
    p.y = t.y;
    p.target = target;
    p.targetId = target.id;
    p.damage = towerDamage(def.damage, t.level);
    p.speed = def.projectileSpeed;
    t.cooldown = Math.max(1, Math.round(GAME.tickRate / def.fireRate));
  }
}

export function updateProjectiles(state: SimState): void {
  for (const p of state.projectiles.items) {
    if (!p.alive) continue;
    const target = p.target;
    // Target died or its pooled slot was reused: fizzle.
    if (!target || !target.alive || target.id !== p.targetId) {
      p.alive = false;
      p.target = null;
      continue;
    }
    const dx = target.x - p.x;
    const dy = target.y - p.y;
    const dist = Math.hypot(dx, dy);
    const step = p.speed * dt;
    if (dist <= step + target.radius) {
      p.alive = false;
      p.target = null;
      applyDamage(state, target, p.damage);
      continue;
    }
    p.x += (dx / dist) * step;
    p.y += (dy / dist) * step;
  }
}

export function applyDamage(state: SimState, e: Enemy, amount: number): void {
  const dealt = Math.min(e.hp, amount);
  e.hp -= dealt;
  state.stats.damageDealt += dealt;
  if (e.hp <= 0) {
    e.alive = false;
    state.credits += e.bounty;
    state.stats.creditsEarned += e.bounty;
    state.stats.kills++;
  }
}
