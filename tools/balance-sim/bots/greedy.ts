import { TOWER_ORDER } from '../../../src/data/towers';
import { placeCost, upgradeCostFor } from '../../../src/sim/economy';
import { towerStats } from '../../../src/sim/specs';
import {
  effectiveDps,
  isDamageTower,
  maybeCallEarly,
  observe,
  specializeAll,
  towers,
  type SpecOverride,
  type ThreatModel,
} from './common';
import type { Bot, BotContext } from './types';

/**
 * greedy-dps: always buys the action with the best damage gain per Credit (a new tower at
 * its best spot, or an upgrade), saving up for it if needed. Damage is valued against the
 * armor and shields it has been seeing, but it never plans a mix on purpose.
 */
export function greedyDps(override: SpecOverride = {}): Bot {
  const threat: ThreatModel = { armor: 0, shieldShare: 0, flyingShare: 0 };
  return {
    name: 'greedy-dps',
    decide(ctx: BotContext) {
      observe(ctx, threat);
      specializeAll(ctx, 'best', threat, override);
      maybeCallEarly(ctx);
      const s = ctx.sim.state;
      const meta = s.meta;
      let bestRatio = 0;
      let act: (() => void) | null = null;
      let cost = 0;

      for (const kind of TOWER_ORDER) {
        if (!s.unlocked.includes(kind) || !isDamageTower(kind)) continue;
        const st = towerStats(kind, meta.startingLevel, null, meta);
        const spot = ctx.spots.best(st.range);
        if (!spot) continue;
        const c = placeCost(kind);
        const ratio = (effectiveDps(st, threat) * spot.coverage) / c;
        if (ratio > bestRatio) {
          bestRatio = ratio;
          cost = c;
          act = () => ctx.send({ type: 'placeTower', kind, x: spot.x, y: spot.y });
        }
      }
      for (const t of towers(ctx)) {
        if (!isDamageTower(t.kind)) continue;
        const next = towerStats(t.kind, t.level + 1, t.spec, meta);
        const c = upgradeCostFor(t);
        const cover = ctx.spots.coverageAt(t.x, t.y, next.range);
        const gain =
          (effectiveDps(next, threat, t.spec) - effectiveDps(t.stats, threat, t.spec)) * cover;
        const ratio = gain / c;
        if (ratio > bestRatio) {
          bestRatio = ratio;
          cost = c;
          act = () => ctx.send({ type: 'upgradeTower', towerId: t.id });
        }
      }
      if (act && s.credits >= cost) act();
    },
  };
}
