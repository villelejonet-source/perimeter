import { STARTER_ARTIFACTS, type ArtifactId, type ArtifactTier } from '../data/artifacts';
import type { ResearchId } from '../data/research';

/** Everything that persists between runs. */
export interface Profile {
  cores: number;
  shards: number;
  bestWave: number;
  /** Research levels (missing = 0). */
  research: Partial<Record<ResearchId, number>>;
  /** Crafted artifacts and their tiers (missing = not crafted). */
  artifacts: Partial<Record<ArtifactId, ArtifactTier>>;
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
    artifacts: starterArtifacts(),
    milestoneClaimed: 0,
    runs: 0,
    lastSeen: now,
  };
}

/** The free starter set, crafted at Common (decided 2026-10-04). */
export function starterArtifacts(): Partial<Record<ArtifactId, ArtifactTier>> {
  return Object.fromEntries(STARTER_ARTIFACTS.map((id) => [id, 0]));
}
