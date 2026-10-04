import { CURVES, callEarlyBonus, waveEnemyCount } from '../data/curves';
import type { EnemyKind } from '../data/enemies';
import { GAME } from '../data/game';
import { WAVES } from '../data/waves';
import { spawnEnemy } from './enemies';
import type { Path } from './path';
import type { Rng } from './rng';
import type { SimState, SpawnSpec } from './state';

const spawnSpacingTicks = Math.round(CURVES.spawnSpacingSeconds * GAME.tickRate);
const bossDelayTicks = Math.round(WAVES.bossDelaySeconds * GAME.tickRate);

export type WaveType = 'normal' | 'elite' | 'boss';

export function waveType(wave: number): WaveType {
  if (wave % WAVES.bossEvery === 0) return 'boss';
  if (wave % WAVES.eliteEvery === 0) return 'elite';
  return 'normal';
}

/** Enemy types available on this wave (introduced gradually, GDD §8). */
export function enemyPool(wave: number): EnemyKind[] {
  const pool: EnemyKind[] = [];
  for (const [kind, intro] of Object.entries(WAVES.introWave) as [EnemyKind, number][]) {
    if (intro <= wave) pool.push(kind);
  }
  return pool;
}

/** Boss for a boss wave, and (from wave 50) the second boss whose traits it also carries. */
export function bossFor(wave: number): { kind: EnemyKind; also: EnemyKind | null } {
  const rot = WAVES.bossRotation;
  const i = (wave / WAVES.bossEvery - 1) % rot.length;
  return {
    kind: rot[i]!,
    also: wave >= WAVES.bossesCombineFrom ? rot[(i + 1) % rot.length]! : null,
  };
}

function pickWeighted(pool: readonly EnemyKind[], rng: Rng): EnemyKind {
  let total = 0;
  for (const k of pool) total += WAVES.weight[k] ?? 1;
  let r = rng.next() * total;
  for (const k of pool) {
    r -= WAVES.weight[k] ?? 1;
    if (r < 0) return k;
  }
  return pool[pool.length - 1]!;
}

/**
 * Builds a wave's spawn queue. Types unlock by wave; a type's intro wave features it
 * heavily; every 5th wave is elite; every 10th is a boss with a short escort.
 */
export function buildWave(wave: number, rng: Rng): SpawnSpec[] {
  const type = waveType(wave);
  const pool = enemyPool(wave);
  const newest = pool.find((k) => WAVES.introWave[k] === wave && wave > 1) ?? null;
  let count = waveEnemyCount(wave);
  if (type === 'boss') count = Math.max(2, Math.round(count * WAVES.bossEscortFraction));

  const queue: SpawnSpec[] = [];
  for (let i = 0; i < count; i++) {
    const kind = newest && rng.next() < WAVES.introShare ? newest : pickWeighted(pool, rng);
    queue.push({ kind, elite: type === 'elite', delay: 0, alsoKind: null });
  }
  if (type === 'boss') {
    const boss = bossFor(wave);
    queue.push({ kind: boss.kind, elite: false, delay: bossDelayTicks, alsoKind: boss.also });
  }
  return queue;
}

export function startWave(state: SimState, rng: Rng): void {
  state.wave++;
  state.nextWaveIn = state.waveIntervalTicks;
  state.spawns.push({ wave: state.wave, queue: buildWave(state.wave, rng), next: 0, cooldown: 0 });
}

/** Start the next wave now, paying a bonus proportional to the remaining timer. */
export function callEarly(state: SimState, rng: Rng): void {
  const remainingSeconds = state.nextWaveIn / GAME.tickRate;
  const bonus = Math.floor(
    callEarlyBonus(remainingSeconds, GAME.callEarlyCreditsPerSecond, state.wave + 1) *
      state.meta.callEarlyMult,
  );
  state.credits += bonus;
  state.stats.creditsEarned += bonus;
  startWave(state, rng);
}

export function updateWaves(state: SimState, path: Path, rng: Rng): void {
  state.nextWaveIn--;
  if (state.nextWaveIn <= 0) startWave(state, rng);

  for (let i = state.spawns.length - 1; i >= 0; i--) {
    const group = state.spawns[i]!;
    group.cooldown--;
    if (group.cooldown > 0) continue;
    const spec = group.queue[group.next]!;
    spawnEnemy(state, path, spec.kind, group.wave, spec.elite, 0, spec.alsoKind);
    group.next++;
    if (group.next >= group.queue.length) {
      state.spawns.splice(i, 1);
      continue;
    }
    group.cooldown = spawnSpacingTicks + group.queue[group.next]!.delay;
  }
}
