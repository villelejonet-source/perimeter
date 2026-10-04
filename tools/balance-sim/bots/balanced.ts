import type { TowerKind } from '../../../src/data/towers';
import {
  maybeCallEarly,
  pickArtifact,
  specializeAll,
  towers,
  tryPlace,
  tryUpgrade,
  type SpecOverride,
} from './common';
import type { Bot, BotContext } from './types';

/** Build order cycled by the balanced bot; locked towers are skipped. */
const PLAN: readonly TowerKind[] = [
  'pulseLaser',
  'railgun',
  'plasmaMortar',
  'pulseLaser',
  'arcCoil',
  'railgun',
  'cryoProjector',
  'swarmLauncher',
];

/**
 * balanced-mix: grows the tower count with the wave, cycling a mixed build order (energy,
 * kinetic, splash, support), and spreads upgrades evenly (lowest level first). Specs vary
 * per tower.
 */
export function balancedMix(override: SpecOverride = {}): Bot {
  return {
    name: 'balanced-mix',
    decide(ctx: BotContext) {
      specializeAll(ctx, 'varied', undefined, override);
      pickArtifact(ctx, 'varied');
      maybeCallEarly(ctx);
      const s = ctx.sim.state;
      const plan = PLAN.filter((k) => s.unlocked.includes(k));
      const owned = towers(ctx);
      const want = Math.min(12, 2 + Math.floor(s.wave / 2));
      if (owned.length < want) {
        tryPlace(ctx, plan[owned.length % plan.length]!);
        return;
      }
      const lowest = [...owned].sort((a, b) => a.level - b.level || a.id - b.id)[0];
      if (lowest) tryUpgrade(ctx, lowest);
    },
  };
}
