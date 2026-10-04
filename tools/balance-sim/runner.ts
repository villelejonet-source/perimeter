import type { DamageType } from '../../src/data/damage';
import { GAME } from '../../src/data/game';
import { META_PRESETS, type MetaPresetId } from '../../src/data/meta';
import type { EnemyKind } from '../../src/data/enemies';
import type { TowerKind } from '../../src/data/towers';
import { Sim } from '../../src/sim/sim';
import type { Bot } from './bots/types';
import { SpotIndex } from './spots';

/** Bots decide 4× per second of game time, like a reasonably attentive player. */
const DECIDE_EVERY = 15;
/** Runs that survive this long are stopped and reported as such. */
const MAX_MINUTES = 45;

export interface WaveRow {
  wave: number;
  seconds: number;
  credits: number;
  creditsEarned: number;
  baseHp: number;
  towers: number;
  avgLevel: number;
}

export interface RunResult {
  strategy: string;
  preset: MetaPresetId;
  seed: number;
  /** Wave reached when the base fell (the wall). */
  wall: number;
  survived: boolean;
  seconds: number;
  kills: number;
  leaks: number;
  creditsEarned: number;
  damageByType: Record<DamageType, number>;
  damageByTower: Partial<Record<TowerKind, number>>;
  leaksByKind: Partial<Record<EnemyKind, number>>;
  /** "kind:spec" for every tower alive at the end. */
  build: string[];
  waves: WaveRow[];
}

export function runOne(bot: Bot, preset: MetaPresetId, seed: number): RunResult {
  const sim = new Sim({ seed, meta: META_PRESETS[preset] });
  const s = sim.state;
  const ctx = {
    sim,
    spots: new SpotIndex(sim),
    send: (c: Parameters<Sim['enqueue']>[0]) => sim.enqueue(c),
  };
  const maxTicks = MAX_MINUTES * 60 * GAME.tickRate;
  const waves: WaveRow[] = [];
  let lastWave = 0;

  while (!s.gameOver && s.tick < maxTicks) {
    if (s.tick % DECIDE_EVERY === 0) bot.decide(ctx);
    sim.step();
    if (s.wave !== lastWave) {
      lastWave = s.wave;
      const towers = s.towers.items.filter((t) => t.alive);
      waves.push({
        wave: s.wave,
        seconds: s.tick / GAME.tickRate,
        credits: s.credits,
        creditsEarned: s.stats.creditsEarned,
        baseHp: s.baseHp,
        towers: towers.length,
        avgLevel: towers.length ? towers.reduce((a, t) => a + t.level, 0) / towers.length : 0,
      });
    }
  }
  return {
    strategy: bot.name,
    preset,
    seed,
    wall: s.wave,
    survived: !s.gameOver,
    seconds: s.tick / GAME.tickRate,
    kills: s.stats.kills,
    leaks: s.stats.leaks,
    creditsEarned: s.stats.creditsEarned,
    damageByType: { ...s.stats.damageByType },
    damageByTower: { ...s.stats.damageByTower },
    leaksByKind: { ...s.stats.leaksByKind },
    build: s.towers.items
      .filter((t) => t.alive)
      .map((t) => `${t.kind}:${t.spec ?? '-'}:L${t.level}`),
    waves,
  };
}
