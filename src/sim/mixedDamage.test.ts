import { describe, expect, it } from 'vitest';
import type { EnemyKind } from '../data/enemies';
import { TOWERS, type TowerKind } from '../data/towers';
import { spawnEnemy } from './enemies';
import { besidePath, labSim, towerAt } from './testUtils';

/**
 * Phase 3 acceptance: "mixed waves demonstrably need mixed damage types".
 * Equal-budget loadouts face a stream of shielded Wardens, armored Bulwarks, or both,
 * across several pressure points. Leaks are summed.
 */
function leaks(
  loadout: readonly TowerKind[],
  stream: readonly EnemyKind[],
  wave: number,
  level: number,
): number {
  const sim = labSim(1);
  sim.state.baseHp = 1e6;
  const spots = [180, 330, 480, 630, 780, 930].map((d, i) => besidePath(sim, d, i % 2 ? 44 : -44));
  loadout.forEach((k, i) => towerAt(sim, k, spots[i]!.x, spots[i]!.y, level));
  let spawned = 0;
  for (let tick = 0; tick < 60 * 120; tick++) {
    if (spawned < stream.length && tick % 48 === 0) {
      spawnEnemy(sim.state, sim.path, stream[spawned]!, wave, false, 0);
      spawned++;
    }
    sim.step();
    if (spawned === stream.length && sim.state.enemies.countAlive() === 0) break;
  }
  return sim.state.stats.leaks;
}

const cost = (l: readonly TowerKind[]): number => l.reduce((sum, k) => sum + TOWERS[k].cost, 0);

const LOADOUTS = {
  energy: Array<TowerKind>(6).fill('pulseLaser'),
  kinetic: Array<TowerKind>(3).fill('railgun'),
  mixed: ['railgun', 'pulseLaser', 'railgun', 'pulseLaser'] as TowerKind[],
};
const STREAMS: Record<string, EnemyKind[]> = {
  shields: Array<EnemyKind>(16).fill('warden'),
  armor: Array<EnemyKind>(16).fill('bulwark'),
  mixed: Array.from({ length: 16 }, (_, i) => (i % 2 ? 'warden' : 'bulwark')),
};
const PRESSURE: [wave: number, level: number][] = [
  [12, 3],
  [14, 3],
  [14, 4],
  [16, 4],
  [16, 5],
  [18, 5],
];

function total(loadout: readonly TowerKind[], stream: readonly EnemyKind[]): number {
  return PRESSURE.reduce((sum, [w, lvl]) => sum + leaks(loadout, stream, w, lvl), 0);
}

describe('mixed waves need mixed damage types', () => {
  it('loadouts cost roughly the same', () => {
    const costs = Object.values(LOADOUTS).map(cost);
    expect(Math.max(...costs) - Math.min(...costs)).toBeLessThanOrEqual(30);
  });

  it('energy beats kinetic against shields, kinetic beats energy against armor', () => {
    expect(total(LOADOUTS.energy, STREAMS.shields!) * 2).toBeLessThan(
      total(LOADOUTS.kinetic, STREAMS.shields!),
    );
    expect(total(LOADOUTS.kinetic, STREAMS.armor!) * 2).toBeLessThan(
      total(LOADOUTS.energy, STREAMS.armor!),
    );
  });

  it('against a mixed wave, a mixed loadout beats both single-type loadouts', () => {
    const mixed = total(LOADOUTS.mixed, STREAMS.mixed!);
    const energy = total(LOADOUTS.energy, STREAMS.mixed!);
    const kinetic = total(LOADOUTS.kinetic, STREAMS.mixed!);
    expect(mixed).toBeLessThan(energy * 0.8);
    expect(mixed).toBeLessThan(kinetic * 0.8);
  });
});
