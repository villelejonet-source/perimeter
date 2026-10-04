import type { ResearchId } from '../data/research';

/** Everything that persists between runs. */
export interface Profile {
  cores: number;
  shards: number;
  bestWave: number;
  /** Research levels (missing = 0). */
  research: Partial<Record<ResearchId, number>>;
  /** Highest milestone wave already paid out (Shards). */
  milestoneClaimed: number;
  runs: number;
  /** Epoch ms of the last save, for offline income. */
  lastSeen: number;
}

export function newProfile(now: number): Profile {
  return {
    cores: 0,
    shards: 0,
    bestWave: 0,
    research: {},
    milestoneClaimed: 0,
    runs: 0,
    lastSeen: now,
  };
}
