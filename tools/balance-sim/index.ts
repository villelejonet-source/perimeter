/**
 * Headless balance simulator (ROADMAP Phase 5).
 *
 *   npm run sim -- --strategy=greedy --runs=200
 *   npm run sim -- --strategy=all --preset=all --runs=50
 *
 * Strategies: greedy | balanced | spec | spec:0 | spec:1 | spec:2 | spec:best | all
 * Presets: fresh | 10h | 50h | all. Writes runs + waves CSV to tools/out/ and prints a summary.
 *
 *   npm run sim -- --mode=specs --runs=24                    # spec matrix
 *   npm run sim -- --mode=artifacts --preset=10h --tier=1    # artifact matrix (Phase 7)
 *   npm run sim -- --mode=career --hours=50                  # research pace
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ARTIFACT_ORDER,
  ARTIFACTS,
  TIER_NAMES,
  type ArtifactTier,
  type OwnedArtifact,
} from '../../src/data/artifacts';
import { META_PRESETS, type MetaPresetId } from '../../src/data/meta';
import { DEFAULT_MAP_ID } from '../../src/data/maps';
import { TOWER_SPECS } from '../../src/data/specs';
import { TOWER_ORDER } from '../../src/data/towers';
import type { SpecOverride } from './bots/common';
import { balancedMix } from './bots/balanced';
import { greedyDps } from './bots/greedy';
import { specFocused } from './bots/specFocused';
import type { Bot } from './bots/types';
import { career } from './career';
import { runOne, type RunResult } from './runner';
import { summarize } from './summary';

function arg(name: string, fallback: string): string {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

/** Bot factories: a fresh bot (with fresh memory) per run. */
function bots(which: string): (() => Bot)[] {
  const all: Record<string, () => Bot> = {
    greedy: () => greedyDps(),
    balanced: () => balancedMix(),
    'spec:0': () => specFocused(0),
    'spec:1': () => specFocused(1),
    'spec:2': () => specFocused(2),
    'spec:best': () => specFocused('best'),
  };
  if (which === 'all') return [all.greedy!, all.balanced!, all['spec:best']!];
  if (which === 'spec') return [all['spec:0']!, all['spec:1']!, all['spec:2']!, all['spec:best']!];
  const b = all[which];
  if (!b) throw new Error(`Unknown strategy ${which}`);
  return [b];
}

const mode = arg('mode', 'runs');
const strategy = arg('strategy', 'all');
const runs = Number(arg('runs', '50'));
const presetArg = arg('preset', 'fresh');
const seed0 = Number(arg('seed', '1'));
const presets: MetaPresetId[] =
  presetArg === 'all' ? ['fresh', '10h', '50h'] : [presetArg as MetaPresetId];

const results: RunResult[] = [];
const t0 = Date.now();
if (mode === 'career') {
  // Research pace: does ~10 h / ~50 h of play reach the matching presets?
  const hours = Number(arg('hours', '50'));
  const pts = career(hours, seed0);
  const marks = [1, 2, 5, 10, 20, 30, 40, 50].filter((h) => h <= hours);
  console.log(
    '| play h | runs | wall | Pulse dmg | Rail dmg | Pulse rate | towers | +Credits | +Base HP | start Lv | Cores spent | artifacts (tier sum) |',
  );
  console.log('|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const h of marks) {
    const pt = pts.find((q) => q.hours >= h) ?? pts[pts.length - 1]!;
    console.log(
      `| ${pt.hours.toFixed(1)} | ${pt.runs} | ${pt.wall} | ×${pt.pulseDmg.toFixed(2)} | ×${pt.railDmg.toFixed(2)} | ×${pt.rate.toFixed(2)} | ${pt.unlocked} | +${pt.startCredits} | +${pt.baseHp} | ${pt.startLevel} | ${pt.spent} | ${pt.crafted} (${pt.tiers}) |`,
    );
  }
  console.log(
    '\nPresets: 10h = dmg ×1.3, rate ×1.1, 5 towers, +100 Credits, +5 HP; 50h = dmg ×2.0, rate ×1.3, 6 towers, +300, +15 HP, start Lv 3',
  );
  console.log(`${((Date.now() - t0) / 1000).toFixed(1)} s`);
  process.exit(0);
}
if (mode === 'artifacts') {
  // Artifact matrix: each artifact held from the start (no other picks) vs none, per strategy.
  const tier = Number(arg('tier', '1')) as ArtifactTier;
  const preset = presets[0]!;
  const strategies: [string, () => Bot][] = [
    ['greedy', () => greedyDps()],
    ['balanced', () => balancedMix()],
    ['spec-focused', () => specFocused('best')],
  ];
  const meanWall = (start: OwnedArtifact[]): number[] =>
    strategies.map(([, make]) => {
      let sum = 0;
      for (let i = 0; i < runs; i++)
        sum += runOne(make(), preset, seed0 + i, { startArtifacts: start, noPicks: true }).wall;
      return sum / runs;
    });
  const base = meanWall([]);
  const only = arg('only', '');
  const ids = only ? ARTIFACT_ORDER.filter((id) => only.split(',').includes(id)) : ARTIFACT_ORDER;
  const rows = ids.map((id) => ({ id, walls: meanWall([{ id, tier }]) }));
  const lines = [
    `# Artifact matrix (${preset}, ${TIER_NAMES[tier]}, ${runs} runs): mean wall, Δ vs none`,
    '',
    `| artifact | ${strategies.map(([n]) => n).join(' | ')} |`,
    `|---|${strategies.map(() => '---|').join('')}`,
    `| (none) | ${base.map((w) => w.toFixed(1)).join(' | ')} |`,
  ];
  const top = strategies.map(
    (_, j) => rows.reduce((a, b) => (b.walls[j]! > a.walls[j]! ? b : a)).id,
  );
  for (const r of rows) {
    const cells = r.walls.map((w, j) => {
      const d = w - base[j]!;
      const cell = `${w.toFixed(1)} (${d >= 0 ? '+' : ''}${d.toFixed(1)})`;
      return top[j] === r.id ? `**${cell}**` : cell;
    });
    lines.push(`| ${ARTIFACTS[r.id].name} | ${cells.join(' | ')} |`);
  }
  const dominant = top.every((id) => id === top[0]);
  lines.push(
    '',
    dominant
      ? `DOMINANT: ${ARTIFACTS[top[0]!].name} is best in every strategy.`
      : `No artifact is best in every strategy (best: ${top.map((id) => ARTIFACTS[id].name).join(' / ')}).`,
  );
  console.log(lines.join('\n'));
  console.log(`\n${((Date.now() - t0) / 1000).toFixed(1)} s`);
  process.exit(0);
}
if (mode === 'specs') {
  // Spec matrix: for each tower + spec, force that spec under every strategy.
  const lines = [
    '# Spec matrix (mean wall; that tower forced to the spec, everything else as the bot plays)',
    '',
  ];
  const strategies: [string, (o: SpecOverride) => Bot][] = [
    ['greedy', (o) => greedyDps(o)],
    ['balanced', (o) => balancedMix(o)],
    ['spec-focused', (o) => specFocused('best', o)],
  ];
  lines.push(
    `| tower | spec | ${strategies.map(([n]) => n).join(' | ')} |`,
    `|---|---|${strategies.map(() => '---|').join('')}`,
  );
  for (const kind of TOWER_ORDER) {
    if (!META_PRESETS[presets[0]!].unlockedTowers.includes(kind)) continue;
    for (const spec of TOWER_SPECS[kind]) {
      const cells = strategies.map(([, make]) => {
        let sum = 0;
        for (let i = 0; i < runs; i++)
          sum += runOne(make({ [kind]: spec }), presets[0]!, seed0 + i).wall;
        return (sum / runs).toFixed(1);
      });
      lines.push(`| ${kind} | ${spec} | ${cells.join(' | ')} |`);
    }
  }
  console.log(lines.join('\n'));
  console.log(`\n${((Date.now() - t0) / 1000).toFixed(1)} s`);
  process.exit(0);
}
for (const preset of presets) {
  for (const make of bots(strategy)) {
    for (let i = 0; i < runs; i++)
      results.push(runOne(make(), preset, seed0 + i, { mapId: arg('map', DEFAULT_MAP_ID) }));
  }
}

const outDir = join(import.meta.dirname, '..', 'out');
mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const runsCsv = [
  'strategy,preset,seed,wall,survived,seconds,kills,leaks,creditsEarned,dmgEnergy,dmgKinetic,dmgByTower,leaksByKind,build,artifacts',
  ...results.map((r) =>
    [
      r.strategy,
      r.preset,
      r.seed,
      r.wall,
      r.survived,
      r.seconds.toFixed(1),
      r.kills,
      r.leaks,
      r.creditsEarned,
      r.damageByType.energy.toFixed(0),
      r.damageByType.kinetic.toFixed(0),
      `"${Object.entries(r.damageByTower)
        .map(([k, v]) => `${k}=${(v ?? 0).toFixed(0)}`)
        .join(';')}"`,
      `"${Object.entries(r.leaksByKind)
        .map(([k, v]) => `${k}=${v}`)
        .join(';')}"`,
      `"${r.build.join(';')}"`,
      `"${r.artifacts.join(';')}"`,
    ].join(','),
  ),
].join('\n');
const wavesCsv = [
  'strategy,preset,seed,wave,seconds,credits,creditsEarned,baseHp,towers,avgLevel',
  ...results.flatMap((r) =>
    r.waves.map((w) =>
      [
        r.strategy,
        r.preset,
        r.seed,
        w.wave,
        w.seconds.toFixed(1),
        w.credits,
        w.creditsEarned,
        w.baseHp,
        w.towers,
        w.avgLevel.toFixed(2),
      ].join(','),
    ),
  ),
].join('\n');
const runsPath = join(outDir, `balance-${stamp}-runs.csv`);
const wavesPath = join(outDir, `balance-${stamp}-waves.csv`);
writeFileSync(runsPath, runsCsv);
writeFileSync(wavesPath, wavesCsv);

const summary = summarize(results);
writeFileSync(join(outDir, `balance-${stamp}-summary.md`), summary);
console.log(summary);
console.log(`\n${results.length} runs in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
console.log(`CSV: ${runsPath}\n     ${wavesPath}`);
