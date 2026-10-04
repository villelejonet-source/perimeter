import { STARTING_UNLOCKS, TOWER_ORDER, type TowerKind } from './towers';

/** Research effects on one tower kind (GDD §10 per-tower tracks). */
export interface TowerMeta {
  damageMult: number;
  fireRateMult: number;
  rangeMult: number;
  /** New towers of this kind are placed at this level. */
  startingLevel: number;
}

/**
 * Permanent progression applied to a run (GDD §10 Research Lab). Derived from research levels
 * by `metaFromProfile` (src/meta/research.ts); the balance sim also uses the presets below.
 */
export interface MetaModifiers {
  unlockedTowers: readonly TowerKind[];
  towers: Readonly<Record<TowerKind, TowerMeta>>;
  startCreditsBonus: number;
  baseHpBonus: number;
  waveTimerBonusSeconds: number;
  bountyMult: number;
  callEarlyMult: number;
  /** 3x game speed unlocked. */
  speed3x: boolean;
}

export const NO_TOWER_META: TowerMeta = {
  damageMult: 1,
  fireRateMult: 1,
  rangeMult: 1,
  startingLevel: 1,
};

/** Same tower research on every kind (presets). */
export function uniformTowers(t: TowerMeta): Record<TowerKind, TowerMeta> {
  return Object.fromEntries(TOWER_ORDER.map((k) => [k, t])) as Record<TowerKind, TowerMeta>;
}

export const FRESH_ACCOUNT: MetaModifiers = {
  unlockedTowers: STARTING_UNLOCKS,
  towers: uniformTowers(NO_TOWER_META),
  startCreditsBonus: 0,
  baseHpBonus: 0,
  waveTimerBonusSeconds: 0,
  bountyMult: 1,
  callEarlyMult: 1,
  speed3x: false,
};

export type MetaPresetId = 'fresh' | '10h' | '50h';

/**
 * What an account has researched after roughly this much play (runs + offline). Research costs
 * in src/data/research.ts are calibrated against these with `npm run sim -- --mode=career`.
 */
export const META_PRESETS: Record<MetaPresetId, MetaModifiers> = {
  fresh: FRESH_ACCOUNT,
  '10h': {
    unlockedTowers: [...STARTING_UNLOCKS, 'arcCoil', 'cryoProjector'],
    towers: uniformTowers({
      damageMult: 1.3,
      fireRateMult: 1.1,
      rangeMult: 1.05,
      startingLevel: 1,
    }),
    startCreditsBonus: 100,
    baseHpBonus: 5,
    waveTimerBonusSeconds: 2,
    bountyMult: 1.15,
    callEarlyMult: 1.2,
    speed3x: true,
  },
  '50h': {
    unlockedTowers: TOWER_ORDER,
    towers: uniformTowers({ damageMult: 2, fireRateMult: 1.3, rangeMult: 1.15, startingLevel: 3 }),
    startCreditsBonus: 300,
    baseHpBonus: 15,
    waveTimerBonusSeconds: 5,
    bountyMult: 1.4,
    callEarlyMult: 1.5,
    speed3x: true,
  },
};

/**
 * Run rewards and offline income (decided 2026-10-04). TODO(balance): tune with the career sim.
 */
export const REWARDS = {
  /** Cores for a run that reached wave w: floor(w² × coresPerWaveSq). */
  coresPerWaveSq: 0.25,
  /** Shards per boss killed. */
  shardsPerBoss: 1,
  /** First time reaching each multiple of this wave pays milestone Shards. */
  milestoneEvery: 10,
  milestoneShards: 3,
  /** Offline: Cores per hour = run reward at best wave × this × offline research. */
  offlineRunsPerHour: 1,
  offlineShardsPerHour: 0.25,
  offlineCapHours: 8,
  /** Below this, no welcome-back screen (income still credited). */
  welcomeBackMinMinutes: 5,
} as const;
