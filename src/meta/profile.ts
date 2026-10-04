import { STARTER_ARTIFACTS, type ArtifactId, type ArtifactTier } from '../data/artifacts';
import { DEFAULT_MAP_ID } from '../data/maps';
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
  /** Best wave per map (`bestWave` is the best on any map; offline income uses it). */
  bestByMap: Record<string, number>;
  /** Sector picked on the main menu. */
  mapId: string;
  settings: Settings;
  /** First-run tutorial finished or skipped. */
  tutorialDone: boolean;
  /** One-time purchases owned (GDD §12). Consumable packs are granted, not recorded. */
  purchases: Purchases;
}

export interface Purchases {
  commanderPass: boolean;
  starterPack: boolean;
}

/** Player settings (Settings screen, decided 2026-10-04). */
export interface Settings {
  sound: boolean;
  music: boolean;
  haptics: boolean;
}

export const DEFAULT_SETTINGS: Settings = { sound: true, music: true, haptics: true };

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
    bestByMap: {},
    mapId: DEFAULT_MAP_ID,
    settings: { ...DEFAULT_SETTINGS },
    tutorialDone: false,
    purchases: { commanderPass: false, starterPack: false },
  };
}

/** The free starter set, crafted at Common (decided 2026-10-04). */
export function starterArtifacts(): Partial<Record<ArtifactId, ArtifactTier>> {
  return Object.fromEntries(STARTER_ARTIFACTS.map((id) => [id, 0]));
}
