import { REWARDS } from '../data/meta';
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
export function runRewards(p: Profile, wave: number, bossesKilled: number): RunRewards {
  const highestMilestone = Math.floor(wave / REWARDS.milestoneEvery) * REWARDS.milestoneEvery;
  const newMilestones = Math.max(
    0,
    (highestMilestone - p.milestoneClaimed) / REWARDS.milestoneEvery,
  );
  const milestoneShards = newMilestones * REWARDS.milestoneShards;
  return {
    cores: coresForWave(wave),
    shards: bossesKilled * REWARDS.shardsPerBoss + milestoneShards,
    milestoneShards,
    newBest: wave > p.bestWave,
  };
}

export function applyRunRewards(p: Profile, wave: number, r: RunRewards): Profile {
  return {
    ...p,
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
