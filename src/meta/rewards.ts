import { DEFAULT_MAP_ID } from '../data/maps';
import { REWARDS } from '../data/meta';
import { MONETIZATION } from '../data/shop';
import type { Profile } from './profile';

export interface RunRewards {
  cores: number;
  shards: number;
  /** Shards from first-time wave milestones (part of `shards`). */
  milestoneShards: number;
  newBest: boolean;
}

/** Cores for reaching `wave` (decided 2026-10-04: grows with wave²). */
export function coresForWave(wave: number): number {
  return Math.floor(wave * wave * REWARDS.coresPerWaveSq);
}

/**
 * What a run pays out (GDD §4): Cores scale with the wave reached; Shards from bosses and
 * first-time milestones. Retreat pays the same (GDD §5: keep 100%).
 */
export function runRewards(
  p: Profile,
  wave: number,
  bossesKilled: number,
  mapId: string = DEFAULT_MAP_ID,
): RunRewards {
  const highestMilestone = Math.floor(wave / REWARDS.milestoneEvery) * REWARDS.milestoneEvery;
  const newMilestones = Math.max(
    0,
    (highestMilestone - p.milestoneClaimed) / REWARDS.milestoneEvery,
  );
  const milestoneShards = newMilestones * REWARDS.milestoneShards;
  return {
    cores: Math.floor(coresForWave(wave) * passMult(p)),
    shards: bossesKilled * REWARDS.shardsPerBoss + milestoneShards,
    milestoneShards,
    newBest: wave > (p.bestByMap[mapId] ?? 0),
  };
}

export function applyRunRewards(
  p: Profile,
  wave: number,
  r: RunRewards,
  mapId: string = DEFAULT_MAP_ID,
): Profile {
  return {
    ...p,
    bestByMap: { ...p.bestByMap, [mapId]: Math.max(p.bestByMap[mapId] ?? 0, wave) },
    cores: p.cores + r.cores,
    shards: p.shards + r.shards,
    bestWave: Math.max(p.bestWave, wave),
    milestoneClaimed: Math.max(
      p.milestoneClaimed,
      Math.floor(wave / REWARDS.milestoneEvery) * REWARDS.milestoneEvery,
    ),
    runs: p.runs + 1,
  };
}

/** Commander Pass: permanent Core bonus (GDD §12). */
export function passMult(p: Profile): number {
  return p.purchases.commanderPass ? MONETIZATION.passCoresMult : 1;
}
