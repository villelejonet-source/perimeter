/**
 * Headless balance simulator (ROADMAP Phase 5).
 *
 *   npm run sim -- --strategy=greedy --runs=200
 *   npm run sim -- --strategy=all --preset=all --runs=50
 *
 * Strategies: greedy | balanced | spec | spec:0 | spec:1 | spec:2 | spec:best | all
 * Presets: fresh | 10h | 50h | all. Writes runs + waves CSV to tools/out/ and prints a summary.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { META_PRESETS, type MetaPresetId } from '../../src/data/meta';
import { TOWER_SPECS } from '../../src/data/specs';
import { TOWER_ORDER } from '../../src/data/towers';
import type { SpecOverride } from './bots/common';
import { balancedMix } from './bots/balanced';
import { greedyDps } from './bots/greedy';
import { specFocused } from './bots/specFocused';
import type { Bot } from './bots/types';
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
    for (let i = 0; i < runs; i++) results.push(runOne(make(), preset, seed0 + i));
  }
}

const outDir = join(import.meta.dirname, '..', 'out');
mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const runsCsv = [
  'strategy,preset,seed,wall,survived,seconds,kills,leaks,creditsEarned,dmgEnergy,dmgKinetic,dmgByTower,leaksByKind,build',
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
