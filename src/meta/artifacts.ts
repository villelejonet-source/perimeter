import {
  ARTIFACT_ORDER,
  craftCost,
  entryTier,
  type ArtifactId,
  type ArtifactTier,
  type OwnedArtifact,
} from '../data/artifacts';
import type { Profile } from './profile';

/** Crafted tier, or undefined when not crafted yet. */
export function artifactTier(p: Profile, id: ArtifactId): ArtifactTier | undefined {
  return p.artifacts[id];
}

export type CraftBlock = 'maxed' | 'shards';

/** Why an artifact can't be crafted/upgraded right now (null = it can). */
export function craftBlock(p: Profile, id: ArtifactId): CraftBlock | null {
  const cost = craftCost(id, artifactTier(p, id));
  if (cost === null) return 'maxed';
  if (p.shards < cost) return 'shards';
  return null;
}

/**
 * Craft (enter the pool at its entry tier) or raise one tier (GDD §9). Returns a new profile;
 * throws if not allowed (UI checks first).
 */
export function craftArtifact(p: Profile, id: ArtifactId): Profile {
  const block = craftBlock(p, id);
  if (block) throw new Error(`Can't craft ${id}: ${block}`);
  const tier = artifactTier(p, id);
  const next = (tier === undefined ? entryTier(id) : tier + 1) as ArtifactTier;
  return {
    ...p,
    shards: p.shards - craftCost(id, tier)!,
    artifacts: { ...p.artifacts, [id]: next },
  };
}

/** How many artifacts can be crafted or upgraded right now (main-menu badge). */
export function craftableCount(p: Profile): number {
  return ARTIFACT_ORDER.filter((id) => craftBlock(p, id) === null).length;
}

/** The draw pool a run uses: every crafted artifact at its tier. */
export function artifactPool(p: Profile): OwnedArtifact[] {
  return ARTIFACT_ORDER.flatMap((id) => {
    const tier = artifactTier(p, id);
    return tier === undefined ? [] : [{ id, tier }];
  });
}
