import { describe, expect, it } from 'vitest';
import { META_PRESETS } from '../data/meta';
import type { Command } from './commands';
import { stateHash } from './hash';
import { Sim } from './sim';
import { restoreSim, snapshotSim } from './snapshot';
import { spotNear } from './testUtils';

/** A busy run: every tower kind, specs, many waves in flight. */
function script(sim: Sim): Map<number, Command[]> {
  const m = new Map<number, Command[]>();
  const kinds = [
    'pulseLaser',
    'railgun',
    'plasmaMortar',
    'arcCoil',
    'cryoProjector',
    'swarmLauncher',
  ] as const;
  kinds.forEach((kind, i) => {
    const p = spotNear(sim, 120 + i * 150);
    m.set(i, [{ type: 'placeTower', kind, ...p }]);
  });
  for (let i = 0; i < 30; i++) m.set(20 + i, [{ type: 'upgradeTower', towerId: 1 + (i % 6) }]);
  m.set(60, [
    { type: 'specialize', towerId: 1, spec: 'prism' },
    { type: 'specialize', towerId: 3, spec: 'plasmaPools' },
    { type: 'specialize', towerId: 5, spec: 'brittle' },
    { type: 'specialize', towerId: 6, spec: 'hunterKiller' },
  ]);
  for (let t = 100; t < 9000; t += 150) m.set(t, [{ type: 'callEarly' }]);
  return m;
}

function play(sim: Sim, cmds: Map<number, Command[]>, until: number): void {
  while (sim.state.tick < until && !sim.state.gameOver) {
    for (const c of cmds.get(sim.state.tick) ?? []) sim.enqueue(c);
    sim.step();
  }
}

describe('sim snapshot', () => {
  it('restores mid-wave to an identical state that plays on identically', () => {
    const a = new Sim({ seed: 42, meta: META_PRESETS['50h'] });
    a.state.credits = 1e6;
    a.state.baseHp = a.state.maxBaseHp = 1e6;
    const cmds = script(a);
    play(a, cmds, 2000);
    // Advance to a genuinely busy moment mid-wave.
    while (a.state.enemies.countAlive() < 4 && a.state.tick < 5000) play(a, cmds, a.state.tick + 1);
    expect(a.state.enemies.countAlive()).toBeGreaterThanOrEqual(4);
    expect(a.state.projectiles.countAlive() + a.state.zones.countAlive()).toBeGreaterThan(0);

    // Through JSON, like the save file.
    const b = restoreSim(JSON.parse(JSON.stringify(snapshotSim(a))));
    expect(stateHash(b)).toBe(stateHash(a));
    expect(snapshotSim(b)).toEqual(snapshotSim(a));

    const end = a.state.tick + 3000;
    play(a, cmds, end);
    play(b, cmds, end);
    expect(stateHash(b)).toBe(stateHash(a));
    expect(snapshotSim(b)).toEqual(snapshotSim(a));
  });

  it('keeps commands that were queued but not applied', () => {
    const a = new Sim({ seed: 1 });
    a.enqueue({ type: 'setPaused', paused: true });
    const b = restoreSim(snapshotSim(a));
    b.step();
    expect(b.state.paused).toBe(true);
  });
});
