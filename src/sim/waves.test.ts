import { describe, expect, it } from 'vitest';
import { bounty, callEarlyBonus, enemyHp, waveEnemyCount, CURVES } from '../data/curves';
import { ENEMIES } from '../data/enemies';
import { GAME } from '../data/game';
import { Sim } from './sim';
import { runTicks } from './testUtils';

const T = GAME.tickRate;

describe('waves', () => {
  it('starts wave 1 after the first-wave delay', () => {
    const sim = new Sim({ seed: 1 });
    runTicks(sim, GAME.firstWaveDelaySeconds * T - 1);
    expect(sim.state.wave).toBe(0);
    sim.step();
    expect(sim.state.wave).toBe(1);
  });

  it('auto-starts the next wave on the wave timer', () => {
    const sim = new Sim({ seed: 1 });
    runTicks(sim, GAME.firstWaveDelaySeconds * T);
    runTicks(sim, GAME.waveIntervalSeconds * T);
    expect(sim.state.wave).toBe(2);
  });

  it('spawns the wave count, spaced out, with scaled HP and bounty', () => {
    const sim = new Sim({ seed: 1 });
    runTicks(sim, GAME.firstWaveDelaySeconds * T);
    expect(sim.state.enemies.countAlive()).toBe(1);
    const n = waveEnemyCount(1);
    runTicks(sim, Math.round(CURVES.spawnSpacingSeconds * T) * (n - 1));
    expect(sim.state.enemies.countAlive()).toBe(n);
    expect(sim.state.spawns.length).toBe(0);
    const e = sim.state.enemies.items.find((x) => x.alive)!;
    expect(e.maxHp).toBeCloseTo(enemyHp(ENEMIES.drone.baseHp, 1));
    expect(e.bounty).toBe(bounty(ENEMIES.drone.baseBounty, 1));
  });

  it('scaling curves follow GDD §5', () => {
    expect(enemyHp(10, 10) / enemyHp(10, 9)).toBeCloseTo(1.08);
    expect(waveEnemyCount(1000)).toBe(CURVES.waveCountMax);
    // HP outgrows bounty: this is what creates the wall.
    expect(enemyHp(1, 40) / bounty(100, 40)).toBeGreaterThan(enemyHp(1, 1) / bounty(100, 1));
  });

  it('call early starts the next wave and pays a bonus proportional to remaining time', () => {
    const sim = new Sim({ seed: 1 });
    const remaining = sim.state.nextWaveIn / T;
    const before = sim.state.credits;
    sim.enqueue({ type: 'callEarly' });
    sim.step();
    expect(sim.state.wave).toBe(1);
    expect(sim.state.credits - before).toBe(
      callEarlyBonus(remaining, GAME.callEarlyCreditsPerSecond, 1),
    );
    expect(sim.state.nextWaveIn).toBe(GAME.waveIntervalSeconds * T - 1);
    expect(callEarlyBonus(10, 2, 1)).toBeGreaterThan(callEarlyBonus(5, 2, 1));
  });

  it('overlapping called waves both finish spawning', () => {
    const sim = new Sim({ seed: 1 });
    sim.enqueue({ type: 'callEarly' });
    sim.enqueue({ type: 'callEarly' });
    sim.step();
    expect(sim.state.wave).toBe(2);
    runTicks(sim, 60 * T);
    expect(sim.state.spawns.filter((g) => g.wave <= 2).length).toBe(0);
  });
});
