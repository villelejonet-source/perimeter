import { describe, expect, it } from 'vitest';
import { Sim } from '../../src/sim/sim';
import { placementError } from '../../src/sim/placement';
import { balancedMix } from './bots/balanced';
import { greedyDps } from './bots/greedy';
import { specFocused } from './bots/specFocused';
import { runOne } from './runner';
import { SpotIndex } from './spots';

describe('balance sim', () => {
  it('runs are deterministic per seed', () => {
    const a = runOne(balancedMix(), 'fresh', 7);
    const b = runOne(balancedMix(), 'fresh', 7);
    expect(a.wall).toBe(b.wall);
    expect(a.seconds).toBe(b.seconds);
    expect(a.damageByTower).toEqual(b.damageByTower);
  });

  it('every bot plays a real run to a wall', () => {
    for (const bot of [greedyDps(), balancedMix(), specFocused('best')]) {
      const r = runOne(bot, 'fresh', 1);
      expect(r.survived).toBe(false);
      expect(r.wall).toBeGreaterThan(10);
      expect(r.build.length).toBeGreaterThan(3);
    }
  });

  it('spot index only offers valid spots, best coverage first', () => {
    const sim = new Sim({ seed: 1 });
    const spots = new SpotIndex(sim);
    const best = spots.best(80)!;
    expect(placementError(sim.state, sim.path, sim.map, best.x, best.y)).toBeNull();
    expect(best.coverage).toBeGreaterThan(0);
    expect(spots.coverageAt(best.x, best.y, 80)).toBe(best.coverage);
  });
});
