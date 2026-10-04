import type { RunResult } from './runner';

const pct = (xs: number[], p: number): number => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))] ?? 0;
};
const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
const mins = (s: number): string =>
  `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

/** Markdown summary: wall wave and duration per strategy/preset, damage mix, Credits curve. */
export function summarize(results: RunResult[]): string {
  const groups = new Map<string, RunResult[]>();
  for (const r of results) {
    const k = `${r.preset}|${r.strategy}`;
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  const lines: string[] = ['# Balance sim', '', '## Wall wave and run time', ''];
  lines.push(
    '| preset | strategy | runs | wall p10 / p50 / p90 | mean wall | run time p50 | survived |',
  );
  lines.push('|---|---|---|---|---|---|---|');
  for (const [k, rs] of groups) {
    const [preset, strategy] = k.split('|');
    const walls = rs.map((r) => r.wall);
    lines.push(
      `| ${preset} | ${strategy} | ${rs.length} | ${pct(walls, 10)} / ${pct(walls, 50)} / ${pct(walls, 90)} | ${mean(walls).toFixed(1)} | ${mins(
        pct(
          rs.map((r) => r.seconds),
          50,
        ),
      )} | ${rs.filter((r) => r.survived).length} |`,
    );
  }

  lines.push('', '## Damage share by tower', '');
  const kinds = [...new Set(results.flatMap((r) => Object.keys(r.damageByTower)))].sort();
  lines.push(`| preset | strategy | ${kinds.join(' | ')} | energy / kinetic |`);
  lines.push(`|---|---|${kinds.map(() => '---|').join('')}---|`);
  for (const [k, rs] of groups) {
    const [preset, strategy] = k.split('|');
    const tot = rs.reduce((a, r) => a + r.damageByType.energy + r.damageByType.kinetic, 0) || 1;
    const shares = kinds.map(
      (kind) =>
        `${((100 * rs.reduce((a, r) => a + (r.damageByTower[kind as keyof typeof r.damageByTower] ?? 0), 0)) / tot).toFixed(0)}%`,
    );
    const e = rs.reduce((a, r) => a + r.damageByType.energy, 0) / tot;
    lines.push(
      `| ${preset} | ${strategy} | ${shares.join(' | ')} | ${(100 * e).toFixed(0)}% / ${(100 * (1 - e)).toFixed(0)}% |`,
    );
  }

  lines.push('', '## Credits earned by wave (mean)', '');
  const marks = [5, 10, 15, 20, 25, 30, 35, 40];
  lines.push(`| preset | strategy | ${marks.map((m) => `w${m}`).join(' | ')} |`);
  lines.push(`|---|---|${marks.map(() => '---|').join('')}`);
  for (const [k, rs] of groups) {
    const [preset, strategy] = k.split('|');
    const cells = marks.map((m) => {
      const vals = rs
        .map((r) => r.waves.find((w) => w.wave === m)?.creditsEarned)
        .filter((v): v is number => v !== undefined);
      return vals.length ? mean(vals).toFixed(0) : '—';
    });
    lines.push(`| ${preset} | ${strategy} | ${cells.join(' | ')} |`);
  }
  return lines.join('\n');
}
