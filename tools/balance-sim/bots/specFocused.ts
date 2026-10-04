import type { TowerKind } from '../../../src/data/towers';
import {
  maybeCallEarly,
  pickArtifact,
  observe,
  specializeAll,
  towers,
  tryPlace,
  tryUpgrade,
  type SpecOverride,
  type ThreatModel,
} from './common';
import type { Bot, BotContext, SpecChoice } from './types';

const PLAN: readonly TowerKind[] = [
  'pulseLaser',
  'railgun',
  'plasmaMortar',
  'arcCoil',
  'swarmLauncher',
  'cryoProjector',
];

/**
 * spec-focused: few towers, each rushed to level 5 for its specialization before the next is
 * built. `choice` picks which spec option every tower takes, so runs can compare specs.
 */
export function specFocused(choice: SpecChoice, override: SpecOverride = {}): Bot {
  const threat: ThreatModel = { armor: 0, shieldShare: 0, flyingShare: 0 };
  return {
    name: `spec-focused:${choice}`,
    decide(ctx: BotContext) {
      observe(ctx, threat);
      specializeAll(ctx, choice, threat, override);
      pickArtifact(ctx, 'best', threat);
      maybeCallEarly(ctx);
      const s = ctx.sim.state;
      const plan = PLAN.filter((k) => s.unlocked.includes(k));
      const owned = towers(ctx);
      // Keep a sensible tower count, then rush one tower at a time to level 5.
      const want = Math.min(10, 2 + Math.floor(s.wave / 3));
      if (owned.length < want) {
        tryPlace(ctx, plan[owned.length % plan.length]!);
        return;
      }
      const rushing = owned.filter((t) => t.level < 5).sort((a, b) => b.level - a.level)[0];
      if (rushing) {
        tryUpgrade(ctx, rushing);
        return;
      }
      const lowest = [...owned].sort((a, b) => a.level - b.level || a.id - b.id)[0];
      if (lowest) tryUpgrade(ctx, lowest);
    },
  };
}
