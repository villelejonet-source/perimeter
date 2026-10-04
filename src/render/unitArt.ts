import type { EnemyKind } from '../data/enemies';
import type { TowerKind } from '../data/towers';

/** Maps sim kinds to unit frame keys (docs/design/units naming). */
const kebab = (s: string): string => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

export function towerFrames(kind: TowerKind, level: number): { base: string; turret: string } {
  const lvl = level >= 5 ? 'l5' : 'l1';
  const k = kebab(kind);
  return { base: `tower-${k}-${lvl}-base`, turret: `tower-${k}-${lvl}-turret` };
}

const BOSSES: ReadonlySet<EnemyKind> = new Set(['juggernaut', 'aegis', 'hiveCarrier']);

export function enemyFrame(kind: EnemyKind, elite: boolean): string {
  if (BOSSES.has(kind)) return `boss-${kebab(kind)}`;
  if (elite && kind === 'drone') return 'enemy-drone-elite';
  return `enemy-${kind}`;
}
