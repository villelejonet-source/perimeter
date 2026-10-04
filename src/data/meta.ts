import { STARTING_UNLOCKS, TOWER_ORDER, type TowerKind } from './towers';

/**
 * Permanent progression applied to a run (GDD §10 Research Lab). Phase 6 derives these from
 * research levels; Phase 5's balance sim uses the presets below directly.
 */
export interface MetaModifiers {
  unlockedTowers: readonly TowerKind[];
  /** Tower tracks (GDD §10: damage, fire rate, range, starting level). */
  towerDamageMult: number;
  towerFireRateMult: number;
  towerRangeMult: number;
  /** New towers are placed at this level. */
  startingLevel: number;
  /** Global tracks. */
  startCreditsBonus: number;
  baseHpBonus: number;
  waveTimerBonusSeconds: number;
  bountyMult: number;
  callEarlyMult: number;
}

export const FRESH_ACCOUNT: MetaModifiers = {
  unlockedTowers: STARTING_UNLOCKS,
  towerDamageMult: 1,
  towerFireRateMult: 1,
  towerRangeMult: 1,
  startingLevel: 1,
  startCreditsBonus: 0,
  baseHpBonus: 0,
  waveTimerBonusSeconds: 0,
  bountyMult: 1,
  callEarlyMult: 1,
};

export type MetaPresetId = 'fresh' | '10h' | '50h';

/**
 * Rough stand-ins for what an account has researched after this much play.
 * TODO(balance): replace with real research levels once Phase 6 sets research costs.
 */
export const META_PRESETS: Record<MetaPresetId, MetaModifiers> = {
  fresh: FRESH_ACCOUNT,
  '10h': {
    unlockedTowers: [...STARTING_UNLOCKS, 'arcCoil', 'cryoProjector'],
    towerDamageMult: 1.3,
    towerFireRateMult: 1.1,
    towerRangeMult: 1.05,
    startingLevel: 1,
    startCreditsBonus: 100,
    baseHpBonus: 5,
    waveTimerBonusSeconds: 2,
    bountyMult: 1.15,
    callEarlyMult: 1.2,
  },
  '50h': {
    unlockedTowers: TOWER_ORDER,
    towerDamageMult: 2,
    towerFireRateMult: 1.3,
    towerRangeMult: 1.15,
    startingLevel: 3,
    startCreditsBonus: 300,
    baseHpBonus: 15,
    waveTimerBonusSeconds: 5,
    bountyMult: 1.4,
    callEarlyMult: 1.5,
  },
};
