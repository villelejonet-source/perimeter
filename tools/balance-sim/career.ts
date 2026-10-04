import { RESEARCH, researchCost } from '../../src/data/research';
import { collectOffline, offlineEarnings } from '../../src/meta/offline';
import { newProfile, type Profile } from '../../src/meta/profile';
import { buyBlock, buyResearch, metaFromProfile, researchLevel } from '../../src/meta/research';
import { applyRunRewards, runRewards } from '../../src/meta/rewards';
import { Sim } from '../../src/sim/sim';
import { balancedMix } from './bots/balanced';
import { SpotIndex } from './spots';

const HOUR = 3_600_000;

export interface CareerPoint {
  hours: number;
  runs: number;
  wall: number;
  cores: number;
  spent: number;
  pulseDmg: number;
  railDmg: number;
  rate: number;
  unlocked: number;
  startCredits: number;
  baseHp: number;
  startLevel: number;
}

/**
 * A simulated player career: play a run with current research, collect rewards, spend Cores on
 * the cheapest available research, and every second run step away for `awayHours` (offline
 * income). Play time counts only time spent in runs.
 */
export function career(untilHours: number, seed: number, awayHours = 4): CareerPoint[] {
  let p: Profile = newProfile(0);
  let clock = 0;
  let played = 0;
  let spent = 0;
  let avgIncome = 0;
  const points: CareerPoint[] = [];
  for (let run = 0; played < untilHours * HOUR; run++) {
    const sim = new Sim({ seed: seed + run, meta: metaFromProfile(p) });
    const bot = balancedMix();
    const ctx = {
      sim,
      spots: new SpotIndex(sim),
      send: (c: Parameters<Sim['enqueue']>[0]) => sim.enqueue(c),
    };
    while (!sim.state.gameOver && sim.state.tick < 60 * 60 * 60) {
      if (sim.state.tick % 15 === 0) bot.decide(ctx);
      sim.step();
    }
    const ms = (sim.state.tick / 60) * 1000;
    const before = p.cores;
    played += ms;
    clock += ms;
    p = applyRunRewards(
      p,
      sim.state.wave,
      runRewards(p, sim.state.wave, sim.state.stats.bossesKilled),
    );
    if (run % 2 === 1) {
      clock += awayHours * HOUR;
      p = collectOffline(p, offlineEarnings(p, clock), clock);
    } else {
      p = { ...p, lastSeen: clock };
    }
    // Spend like a player: buy the next tower/speed unlock as soon as it's affordable and keep
    // its price saved meanwhile; spend only the surplus on the cheapest research.
    const nextUnlock = RESEARCH.find(
      (d) => d.group === 'unlocks' && buyBlock(p, d) !== 'maxed' && buyBlock(p, d) !== 'requires',
    );
    if (nextUnlock && buyBlock(p, nextUnlock) === null) {
      spent += researchCost(nextUnlock, 0);
      p = buyResearch(p, nextUnlock.id);
    }
    // Only save for an unlock that's within ~8 runs' income (run + offline); otherwise keep
    // researching.
    avgIncome = avgIncome * 0.7 + (p.cores - before) * 0.3;
    const pending = RESEARCH.find((d) => d.group === 'unlocks' && buyBlock(p, d) === 'cores');
    const keep =
      pending && researchCost(pending, 0) <= 8 * avgIncome ? researchCost(pending, 0) : 0;
    for (;;) {
      const options = RESEARCH.filter(
        (d) =>
          d.group !== 'unlocks' &&
          buyBlock(p, d) === null &&
          p.cores - researchCost(d, researchLevel(p, d.id)) >= keep,
      );
      if (!options.length) break;
      const d = options.reduce((a, b) =>
        researchCost(a, researchLevel(p, a.id)) <= researchCost(b, researchLevel(p, b.id)) ? a : b,
      );
      spent += researchCost(d, researchLevel(p, d.id));
      p = buyResearch(p, d.id);
    }
    const m = metaFromProfile(p);
    points.push({
      hours: played / HOUR,
      runs: run + 1,
      wall: sim.state.wave,
      cores: p.cores,
      spent,
      pulseDmg: m.towers.pulseLaser.damageMult,
      railDmg: m.towers.railgun.damageMult,
      rate: m.towers.pulseLaser.fireRateMult,
      unlocked: m.unlockedTowers.length,
      startCredits: m.startCreditsBonus,
      baseHp: m.baseHpBonus,
      startLevel: m.towers.pulseLaser.startingLevel,
    });
  }
  return points;
}
