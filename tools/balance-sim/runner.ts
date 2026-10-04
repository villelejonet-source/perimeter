import type { DamageType } from '../../src/data/damage';
import { GAME } from '../../src/data/game';
import { META_PRESETS, type MetaPresetId } from '../../src/data/meta';
import type { EnemyKind } from '../../src/data/enemies';
import type { TowerKind } from '../../src/data/towers';
import type { OwnedArtifact } from '../../src/data/artifacts';
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
  /** Artifacts held at the end, "id:tier". */
  artifacts: string[];
  waves: WaveRow[];
}

export interface RunOptions {
  /** Artifacts active from the start (artifact matrix). */
  startArtifacts?: OwnedArtifact[];
  /** Empty the draw pool, so the run gets no post-boss picks. */
  noPicks?: boolean;
  mapId?: string;
}

export function runOne(
  bot: Bot,
  preset: MetaPresetId,
  seed: number,
  opts: RunOptions = {},
): RunResult {
  const meta = META_PRESETS[preset];
  const sim = new Sim({
    seed,
    mapId: opts.mapId,
    meta: opts.noPicks ? { ...meta, artifactPool: [] } : meta,
    startArtifacts: opts.startArtifacts,
  });
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
      .map((t) => `${t.kind}:${t.spec ?? '-'}${t.spec2 ? `+${t.spec2}` : ''}:L${t.level}`),
    artifacts: s.artifacts.map((a) => `${a.id}:${a.tier}`),
    waves,
  };
}
