import { entryTier, type ArtifactTier } from '../data/artifacts';
import { PRODUCTS, type ProductId } from '../data/shop';
import type { Profile } from './profile';

/** One-time product already owned (hide or mark it in the shop). */
export function owns(p: Profile, id: ProductId): boolean {
  if (id === 'commander_pass') return p.purchases.commanderPass;
  if (id === 'starter_pack') return p.purchases.starterPack;
  return false;
}

/**
 * Grants a purchased product's contents. Granting a one-time product twice (restore, a retried
 * callback) changes nothing the second time.
 */
export function grantProduct(p: Profile, id: ProductId): Profile {
  const def = PRODUCTS[id];
  if (def.oneTime && owns(p, id)) return p;
  const artifacts = { ...p.artifacts };
  for (const a of def.artifacts ?? []) {
    artifacts[a] = Math.max(artifacts[a] ?? -1, entryTier(a)) as ArtifactTier;
  }
  return {
    ...p,
    cores: p.cores + (def.cores ?? 0),
    shards: p.shards + (def.shards ?? 0),
    artifacts,
    purchases: {
      commanderPass: p.purchases.commanderPass || id === 'commander_pass',
      starterPack: p.purchases.starterPack || id === 'starter_pack',
    },
  };
}
