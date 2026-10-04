import type { ArtifactId } from './artifacts';

/**
 * In-app purchases (GDD §12; catalog decided 2026-10-04). App Store product ids must match
 * these exactly (docs/MONETIZATION.md). Prices shown come from the store; `fallbackPrice` is
 * only used when the store can't be reached.
 */
export type ProductId =
  'commander_pass' | 'starter_pack' | 'cores_s' | 'cores_m' | 'cores_l' | 'shards_s' | 'shards_m';

export interface ProductDef {
  id: ProductId;
  name: string;
  /** One-time products can be bought once and restored; packs can be bought again. */
  oneTime: boolean;
  fallbackPrice: string;
  cores?: number;
  shards?: number;
  /** Artifacts granted crafted (at their entry tier, or kept if already higher). */
  artifacts?: ArtifactId[];
  blurb: string;
}

export const PRODUCTS: Record<ProductId, ProductDef> = {
  commander_pass: {
    id: 'commander_pass',
    name: 'Commander Pass',
    oneTime: true,
    fallbackPrice: '$4.99',
    blurb: 'Ad rewards without ads, forever. Plus +20% Cores from every run and offline.',
  },
  starter_pack: {
    id: 'starter_pack',
    name: 'Starter Pack',
    oneTime: true,
    fallbackPrice: '$1.99',
    cores: 5000,
    shards: 40,
    artifacts: ['dualSpec'],
    blurb: '5,000 Cores, 40 Shards and Dual Spec crafted. One time only.',
  },
  cores_s: {
    id: 'cores_s',
    name: 'Core Cache',
    oneTime: false,
    fallbackPrice: '$0.99',
    cores: 3000,
    blurb: '',
  },
  cores_m: {
    id: 'cores_m',
    name: 'Core Crate',
    oneTime: false,
    fallbackPrice: '$4.99',
    cores: 18000,
    blurb: '',
  },
  cores_l: {
    id: 'cores_l',
    name: 'Core Vault',
    oneTime: false,
    fallbackPrice: '$9.99',
    cores: 40000,
    blurb: '',
  },
  shards_s: {
    id: 'shards_s',
    name: 'Shard Cache',
    oneTime: false,
    fallbackPrice: '$0.99',
    shards: 30,
    blurb: '',
  },
  shards_m: {
    id: 'shards_m',
    name: 'Shard Crate',
    oneTime: false,
    fallbackPrice: '$4.99',
    shards: 180,
    blurb: '',
  },
};

export const PRODUCT_ORDER: readonly ProductId[] = Object.keys(PRODUCTS) as ProductId[];

export const MONETIZATION = {
  /** Commander Pass: permanent Core bonus on run rewards and offline income. */
  passCoresMult: 1.2,
  /** Revive (GDD §12): restores this share of max base HP, once per run. */
  reviveHpShare: 0.5,
} as const;
