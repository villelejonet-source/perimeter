import { describe, expect, it } from 'vitest';
import type { Command } from './commands';
import { stateHash } from './hash';
import { Sim } from './sim';
import { spotNear } from './testUtils';

/** A scripted run: commands keyed by tick, played until game over or a tick limit. */
function scriptedRun(seed: number): { hash: string; wave: number; tick: number } {
  const sim = new Sim({ seed });
  const script = new Map<number, Command[]>();
  const at = (tick: number, ...cmds: Command[]) => script.set(tick, cmds);

  const a = spotNear(sim, 120);
  const b = spotNear(sim, 420);
  at(0, { type: 'placeTower', kind: 'pulseLaser', ...a });
  at(1, { type: 'placeTower', kind: 'pulseLaser', ...b });
  at(300, { type: 'callEarly' });
  at(
    2000,
    { type: 'upgradeTower', towerId: 1 },
    { type: 'setTargeting', towerId: 2, mode: 'strongest' },
  );
  at(4000, { type: 'upgradeTower', towerId: 2 });
  at(6000, { type: 'upgradeTower', towerId: 1 }, { type: 'callEarly' });

  while (!sim.state.gameOver && sim.state.tick < 60 * 60 * 20) {
    for (const cmd of script.get(sim.state.tick) ?? []) sim.enqueue(cmd);
    sim.step();
  }
  return { hash: stateHash(sim), wave: sim.state.wave, tick: sim.state.tick };
}

describe('determinism', () => {
  it('same seed + same commands = identical outcome', () => {
    const r1 = scriptedRun(1234);
    const r2 = scriptedRun(1234);
    expect(r1).toEqual(r2);
    expect(r1.wave).toBeGreaterThan(3); // the run actually played out
  });

  it('a different command script produces a different outcome', () => {
    const sim1 = new Sim({ seed: 1 });
    const sim2 = new Sim({ seed: 1 });
    sim2.enqueue({ type: 'callEarly' });
    for (let i = 0; i < 600; i++) {
      sim1.step();
      sim2.step();
    }
    expect(stateHash(sim1)).not.toBe(stateHash(sim2));
  });
});
