import { describe, expect, it } from 'vitest';
import { waveEnemyCount } from '../data/curves';
import { ENEMIES } from '../data/enemies';
import { WAVES } from '../data/waves';
import { spawnEnemy } from './enemies';
import { Rng } from './rng';
import { bossFor, buildWave, enemyPool, waveType } from './waves';
import { labSim } from './testUtils';

describe('wave composition generator', () => {
  it('every 5th wave is elite and every 10th is a boss', () => {
    expect([1, 4, 5, 9, 10, 15, 20].map(waveType)).toEqual([
      'normal',
      'normal',
      'elite',
      'normal',
      'boss',
      'elite',
      'boss',
    ]);
  });

  it('introduces enemy types gradually and never early', () => {
    const rng = new Rng(7);
    for (let w = 1; w <= 60; w++) {
      for (const spec of buildWave(w, rng)) {
        if (ENEMIES[spec.kind].boss) continue;
        expect(WAVES.introWave[spec.kind]!).toBeLessThanOrEqual(w);
      }
    }
    expect(enemyPool(1)).toEqual(['drone']);
    expect(enemyPool(25).length).toBe(7);
  });

  it('features a type heavily on its intro wave', () => {
    let featured = 0;
    let total = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const q = buildWave(6, new Rng(seed));
      featured += q.filter((s) => s.kind === 'bulwark').length;
      total += q.length;
    }
    expect(featured / total).toBeGreaterThan(WAVES.introShare * 0.8);
  });

  it('elite waves mark every spawn elite', () => {
    const q = buildWave(15, new Rng(3));
    expect(q.length).toBe(waveEnemyCount(15));
    expect(q.every((s) => s.elite)).toBe(true);
  });

  it('boss waves are a short escort followed by the rotating boss', () => {
    const q = buildWave(10, new Rng(3));
    const boss = q[q.length - 1]!;
    expect(boss.kind).toBe('juggernaut');
    expect(boss.delay).toBeGreaterThan(0);
    expect(q.length - 1).toBeLessThan(waveEnemyCount(10));
    expect([10, 20, 30, 40].map((w) => bossFor(w).kind)).toEqual([
      'juggernaut',
      'aegis',
      'hiveCarrier',
      'juggernaut',
    ]);
  });

  it('from wave 50 bosses combine two bosses’ traits', () => {
    expect(bossFor(40).also).toBeNull();
    const b = bossFor(50);
    expect(b.also).not.toBeNull();
    const sim = labSim();
    const e = spawnEnemy(sim.state, sim.path, b.kind, 50, false, 10, b.also);
    // Wave 50 = Aegis + Hive Carrier: shield and flight.
    expect(b).toEqual({ kind: 'aegis', also: 'hiveCarrier' });
    expect(e.maxShield).toBeGreaterThan(0);
    expect(e.flying).toBe(true);
  });

  it('mixes defenses once both armor and shields are in the pool', () => {
    const rng = new Rng(11);
    let mixed = 0;
    for (let w = 21; w <= 29; w++) {
      if (waveType(w) === 'boss') continue;
      const kinds = new Set(buildWave(w, rng).map((s) => s.kind));
      if (kinds.has('bulwark') && kinds.has('warden')) mixed++;
    }
    expect(mixed).toBeGreaterThanOrEqual(6);
  });

  it('is deterministic per seed', () => {
    expect(buildWave(23, new Rng(99))).toEqual(buildWave(23, new Rng(99)));
    expect(buildWave(23, new Rng(99))).not.toEqual(buildWave(23, new Rng(100)));
  });
});
