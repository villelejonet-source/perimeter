import { TOWERS } from '../data/towers';
import type { Enemy, SimState, TargetingMode, Tower } from './state';

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
      diff = a.hp + a.shield - (b.hp + b.shield);
      break;
    case 'closest':
      diff = bDistSq - aDistSq;
      break;
  }
  return diff > 0 || (diff === 0 && a.id < b.id);
}

/**
 * The tower's target under its targeting mode. Flying enemies are skipped by towers that
 * can't hit them; the Swarm Launcher (anti-air) picks a flying target first when one is in range.
 */
export function findTarget(state: SimState, tower: Tower): Enemy | null {
  const def = TOWERS[tower.kind];
  const prefersFlying = def.attack.type === 'missiles';
  const rangeSq = def.range * def.range;
  let best: Enemy | null = null;
  let bestSq = 0;
  let bestFlying: Enemy | null = null;
  let bestFlyingSq = 0;
  for (const e of state.enemies.items) {
    if (!e.alive) continue;
    if (e.flying && !def.canHitFlying) continue;
    const dx = e.x - tower.x;
    const dy = e.y - tower.y;
    const dSq = dx * dx + dy * dy;
    if (dSq > rangeSq) continue;
    if (best === null || isBetter(tower.targeting, e, dSq, best, bestSq)) {
      best = e;
      bestSq = dSq;
    }
    if (
      prefersFlying &&
      e.flying &&
      (bestFlying === null || isBetter(tower.targeting, e, dSq, bestFlying, bestFlyingSq))
    ) {
      bestFlying = e;
      bestFlyingSq = dSq;
    }
  }
  return bestFlying ?? best;
}

/**
 * Nearest living enemy to (x, y) within `radius`, skipping flyers if not allowed and any id
 * in `exclude[0..excludeCount)`. Allocation-free.
 */
export function nearestEnemy(
  state: SimState,
  x: number,
  y: number,
  radius: number,
  allowFlying: boolean,
  exclude?: Int32Array,
  excludeCount = 0,
): Enemy | null {
  let best: Enemy | null = null;
  let bestSq = radius * radius;
  outer: for (const e of state.enemies.items) {
    if (!e.alive || (e.flying && !allowFlying)) continue;
    if (exclude) for (let i = 0; i < excludeCount; i++) if (exclude[i] === e.id) continue outer;
    const dSq = (e.x - x) ** 2 + (e.y - y) ** 2;
    if (dSq <= bestSq) {
      best = e;
      bestSq = dSq;
    }
  }
  return best;
}
