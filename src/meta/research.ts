import { FRESH_ACCOUNT, type MetaModifiers, type TowerMeta } from '../data/meta';
import {
  RESEARCH,
  RESEARCH_BY_ID,
  researchCost,
  type ResearchDef,
  type ResearchId,
} from '../data/research';
import { STARTING_UNLOCKS, TOWER_ORDER, type TowerKind } from '../data/towers';
import { ARTIFACT_TUNING } from '../data/artifacts';
import { artifactPool } from './artifacts';
import type { Profile } from './profile';

export function researchLevel(p: Profile, id: ResearchId): number {
  return p.research[id] ?? 0;
}

export type BuyBlock = 'maxed' | 'requires' | 'cores';

/** Why a research can't be bought right now (null = it can). */
export function buyBlock(p: Profile, def: ResearchDef): BuyBlock | null {
  const lvl = researchLevel(p, def.id);
  if (lvl >= def.maxLevel) return 'maxed';
  if (def.requires && researchLevel(p, def.requires) < 1) return 'requires';
  // A tower's tracks need the tower unlocked first.
  if (def.tower && def.group === 'towers' && !unlockedTowers(p).includes(def.tower))
    return 'requires';
  if (p.cores < researchCost(def, lvl)) return 'cores';
  return null;
}

/** Buy one level. Returns a new profile; throws if not allowed (UI checks first). */
export function buyResearch(p: Profile, id: ResearchId): Profile {
  const def = RESEARCH_BY_ID.get(id);
  if (!def) throw new Error(`Unknown research ${id}`);
  const block = buyBlock(p, def);
  if (block) throw new Error(`Can't buy ${id}: ${block}`);
  const lvl = researchLevel(p, id);
  return {
    ...p,
    cores: p.cores - researchCost(def, lvl),
    research: { ...p.research, [id]: lvl + 1 },
  };
}

/** How many research levels the player can afford right now (main-menu badge). */
export function affordableCount(p: Profile): number {
  return RESEARCH.filter((d) => buyBlock(p, d) === null).length;
}

export function unlockedTowers(p: Profile): TowerKind[] {
  return TOWER_ORDER.filter(
    (k) => STARTING_UNLOCKS.includes(k) || researchLevel(p, `unlock.${k}` as ResearchId) > 0,
  );
}

/** Research levels → the modifiers a run uses. */
export function metaFromProfile(p: Profile): MetaModifiers {
  const lvl = (id: ResearchId): number => researchLevel(p, id);
  const per = (id: ResearchId): number => RESEARCH_BY_ID.get(id)!.perLevel * lvl(id);
  const towers = Object.fromEntries(
    TOWER_ORDER.map((k): [TowerKind, TowerMeta] => [
      k,
      {
        damageMult: 1 + per(`${k}.damage`),
        fireRateMult: 1 + per(`${k}.fireRate`),
        rangeMult: 1 + per(`${k}.range`),
        startingLevel: 1 + lvl(`${k}.startingLevel`),
      },
    ]),
  ) as Record<TowerKind, TowerMeta>;
  return {
    ...FRESH_ACCOUNT,
    unlockedTowers: unlockedTowers(p),
    towers,
    startCreditsBonus: per('startCredits'),
    baseHpBonus: per('baseHp'),
    waveTimerBonusSeconds: per('waveTimer'),
    bountyMult: 1 + per('bounty'),
    callEarlyMult: 1 + per('callEarly'),
    speed3x: lvl('speed3x') > 0,
    artifactPool: artifactPool(p),
    artifactChoices: ARTIFACT_TUNING.choices + lvl('artifactChoice4'),
    freeRerolls: lvl('freeReroll'),
  };
}
