/**
 * Artifacts (GDD §9). Picked 1 of 3 after each boss, from the pool the player has crafted with
 * Shards. Re-crafting raises the tier, which scales the artifact's value; higher tiers show up
 * less often in draws. Decided 2026-10-04: ~30 artifacts drafted from the GDD and mockup names,
 * a free starter set crafted at Common, effect × tier scale, draw weight by tier.
 *
 * Every number here is a starting value. TODO(balance): tune with `npm run sim -- --mode=artifacts`.
 */

export type ArtifactTier = 0 | 1 | 2 | 3;
export const TIER_NAMES = ['Common', 'Rare', 'Epic', 'Legendary'] as const;
export const MAX_TIER: ArtifactTier = 3;

export const ARTIFACT_TUNING = {
  /** Effect multiplier per tier (Common → Legendary). */
  tierScale: [1, 1.5, 2.2, 3.2],
  /** Relative chance to appear in a draw per tier: rarer tiers show up less often (GDD §9). */
  tierWeight: [100, 60, 35, 20],
  /** Shards to craft (enter the pool at Common). */
  craftCost: 10,
  /** Shards to raise to Rare, Epic, Legendary. Epic 40 matches the Codex mockup. */
  upgradeCost: [20, 40, 80],
  /** Choices per pick; research adds a 4th. */
  choices: 3,
  /** Credits for a reroll: base × growth^(rerolls used this run). Mockup: 150 → 300. */
  rerollBaseCost: 150,
  rerollGrowth: 2,
  /** Ricochet and Overflow look this far for the next enemy (world px). */
  bounceRadius: 48,
  /** Cryo Lattice shatter radius (world px). */
  shatterRadius: 32,
  /** Last Stand threshold (fraction of max base HP). */
  lastStandBelow: 0.25,
  /** Targeting Uplink: a tower of the same kind within this distance (world px, centers). */
  uplinkRadius: 64,
  /** Interest Engine: per-wave payout cap = base + perWave × wave. */
  interestCapBase: 20,
  interestCapPerWave: 10,
  /** Supply Drop: Credits = base × value × bounty growth^wave. */
  supplyDropBase: 120,
} as const;

export type ArtifactId =
  | 'superconductor'
  | 'capacitorBank'
  | 'kineticPrimer'
  | 'shieldBreaker'
  | 'penetratorRounds'
  | 'ricochetMatrix'
  | 'cryoLattice'
  | 'bountyProtocol'
  | 'interestEngine'
  | 'overflowReactor'
  | 'lastStand'
  | 'targetingUplink'
  | 'dualSpec'
  | 'echoChamber'
  | 'nullAnchor'
  | 'widePayload'
  | 'coldSnap'
  | 'permafrost'
  | 'shatterPoint'
  | 'specialistDoctrine'
  | 'salvageRights'
  | 'fieldEngineering'
  | 'earlyBird'
  | 'reinforcedHull'
  | 'naniteRepair'
  | 'longBarrels'
  | 'rapidCycling'
  | 'priorityTargeting'
  | 'skyguard'
  | 'supplyDrop';

/** Inner glyph drawn inside the tier frame (src/ui/dom/artifactArt.ts). */
export type ArtifactGlyph =
  | 'bolt'
  | 'battery'
  | 'plus'
  | 'shieldCrack'
  | 'arrow'
  | 'bounce'
  | 'crystal'
  | 'coin'
  | 'percent'
  | 'overflow'
  | 'heart'
  | 'antenna'
  | 'dual'
  | 'rings'
  | 'anchor'
  | 'blast'
  | 'snow'
  | 'clock'
  | 'target'
  | 'star'
  | 'wrench'
  | 'chevrons'
  | 'hull'
  | 'scope'
  | 'cycle'
  | 'skull'
  | 'wing'
  | 'crate'
  | 'fast'
  | 'repair';

export type ArtifactGroup = 'damage' | 'control' | 'economy' | 'defense' | 'special';

export interface ArtifactDef {
  id: ArtifactId;
  name: string;
  group: ArtifactGroup;
  glyph: ArtifactGlyph;
  /** Effect value at Common; tiers multiply it by `tierScale`. Units depend on the artifact. */
  base: number;
  /** Card text for an effect value (from `artifactValue`). */
  describe: (v: number) => string;
  /** In every new profile's pool at Common, free (decided 2026-10-04). */
  starter?: boolean;
  /** Only exists at this tier (Dual Spec is always Legendary). */
  fixedTier?: ArtifactTier;
}

const pct = (v: number): string => `${Math.round(v * 100)}%`;

const DEFS: ArtifactDef[] = [
  // Damage
  {
    id: 'superconductor',
    name: 'Superconductor',
    group: 'damage',
    glyph: 'bolt',
    base: 0.3,
    describe: (v) => `Energy damage +${pct(v)} against shields.`,
    starter: true,
  },
  {
    id: 'capacitorBank',
    name: 'Capacitor Bank',
    group: 'damage',
    glyph: 'battery',
    base: 0.1,
    describe: (v) => `+${pct(v)} Energy damage for all towers.`,
    starter: true,
  },
  {
    id: 'kineticPrimer',
    name: 'Kinetic Primer',
    group: 'damage',
    glyph: 'plus',
    base: 0.1,
    describe: (v) => `+${pct(v)} Kinetic damage for all towers.`,
    starter: true,
  },
  {
    id: 'shieldBreaker',
    name: 'Shield Breaker',
    group: 'damage',
    glyph: 'shieldCrack',
    base: 0.4,
    describe: (v) => `Kinetic damage +${pct(v)} against shields.`,
  },
  {
    id: 'penetratorRounds',
    name: 'Penetrator Rounds',
    group: 'damage',
    glyph: 'arrow',
    base: 0.2,
    describe: (v) => `Kinetic hits ignore ${pct(v)} of armor.`,
  },
  {
    id: 'ricochetMatrix',
    name: 'Ricochet Matrix',
    group: 'damage',
    glyph: 'bounce',
    base: 0.35,
    describe: (v) => `Kinetic hits bounce once to a nearby enemy for ${pct(v)} damage.`,
  },
  {
    id: 'overflowReactor',
    name: 'Overflow Reactor',
    group: 'damage',
    glyph: 'overflow',
    base: 0.3,
    describe: (v) => `${pct(v)} of overkill damage carries to the next enemy.`,
  },
  {
    id: 'specialistDoctrine',
    name: 'Specialist Doctrine',
    group: 'damage',
    glyph: 'star',
    base: 0.08,
    describe: (v) => `Specialized towers deal +${pct(v)} damage.`,
  },
  {
    id: 'priorityTargeting',
    name: 'Priority Targeting',
    group: 'damage',
    glyph: 'skull',
    base: 0.15,
    describe: (v) => `Elites and bosses take +${pct(v)} damage.`,
  },
  {
    id: 'skyguard',
    name: 'Skyguard',
    group: 'damage',
    glyph: 'wing',
    base: 0.2,
    describe: (v) => `Flying enemies take +${pct(v)} damage.`,
  },
  {
    id: 'rapidCycling',
    name: 'Rapid Cycling',
    group: 'damage',
    glyph: 'cycle',
    base: 0.06,
    describe: (v) => `+${pct(v)} fire rate for all towers.`,
    starter: true,
  },
  {
    id: 'longBarrels',
    name: 'Long Barrels',
    group: 'damage',
    glyph: 'scope',
    // Phase 7: 0.05 (was 0.06): best in 2 of 3 strategies in the artifact matrix.
    base: 0.05,
    describe: (v) => `+${pct(v)} range for all towers.`,
    starter: true,
  },
  {
    id: 'targetingUplink',
    name: 'Targeting Uplink',
    group: 'damage',
    glyph: 'antenna',
    base: 0.1,
    describe: (v) => `+${pct(v)} range for towers next to a tower of the same type.`,
  },
  {
    id: 'echoChamber',
    name: 'Echo Chamber',
    group: 'damage',
    glyph: 'rings',
    base: 0.25,
    describe: (v) => `Arc chains lose ${pct(v)} less damage per jump.`,
  },
  {
    id: 'widePayload',
    name: 'Wide Payload',
    group: 'damage',
    glyph: 'blast',
    base: 0.15,
    describe: (v) => `Mortar blasts are ${pct(v)} wider.`,
  },
  // Control (Cryo and slows)
  {
    id: 'cryoLattice',
    name: 'Cryo Lattice',
    group: 'control',
    glyph: 'crystal',
    base: 0.15,
    describe: (v) =>
      `Frozen enemies shatter on death, dealing ${pct(v)} of their max HP to enemies nearby.`,
  },
  {
    id: 'coldSnap',
    name: 'Cold Snap',
    group: 'control',
    glyph: 'snow',
    base: 0.2,
    describe: (v) => `Cryo towers chill ${pct(v)} harder.`,
  },
  {
    id: 'permafrost',
    name: 'Permafrost',
    group: 'control',
    glyph: 'clock',
    base: 0.25,
    describe: (v) => `Freezes last ${pct(v)} longer.`,
  },
  {
    id: 'shatterPoint',
    name: 'Shatter Point',
    group: 'control',
    glyph: 'target',
    base: 0.15,
    describe: (v) => `Frozen and stunned enemies take +${pct(v)} damage.`,
  },
  {
    id: 'nullAnchor',
    name: 'Null Anchor',
    group: 'control',
    glyph: 'anchor',
    base: 0.1,
    describe: (v) => `Bosses move ${pct(v)} slower.`,
  },
  // Economy
  {
    id: 'bountyProtocol',
    name: 'Bounty Protocol',
    group: 'economy',
    glyph: 'coin',
    base: 0.12,
    describe: (v) => `+${pct(v)} Credits from every kill.`,
    starter: true,
  },
  {
    id: 'interestEngine',
    name: 'Interest Engine',
    group: 'economy',
    glyph: 'percent',
    base: 0.03,
    describe: (v) => `Each wave, earn ${pct(v)} interest on banked Credits (capped by wave).`,
  },
  {
    id: 'salvageRights',
    name: 'Salvage Rights',
    group: 'economy',
    glyph: 'wrench',
    base: 0.06,
    describe: (v) => `Selling refunds ${pct(v)} more.`,
  },
  {
    id: 'fieldEngineering',
    name: 'Field Engineering',
    group: 'economy',
    glyph: 'chevrons',
    base: 0.06,
    describe: (v) => `Upgrades cost ${pct(v)} less.`,
  },
  {
    id: 'earlyBird',
    name: 'Early Bird',
    group: 'economy',
    glyph: 'fast',
    base: 0.4,
    describe: (v) => `+${pct(v)} call-early bonus.`,
  },
  {
    id: 'supplyDrop',
    name: 'Supply Drop',
    group: 'economy',
    glyph: 'crate',
    base: 1,
    describe: (v) =>
      `Gain Credits now: ${Math.round(ARTIFACT_TUNING.supplyDropBase * v)}, growing with the wave.`,
  },
  // Defense
  {
    id: 'lastStand',
    name: 'Last Stand',
    group: 'defense',
    glyph: 'heart',
    // Phase 7: 0.2 (was 0.3): best in every strategy in the artifact matrix.
    base: 0.2,
    describe: (v) =>
      `Below ${pct(ARTIFACT_TUNING.lastStandBelow)} base HP, every tower fires ${pct(v)} faster.`,
    starter: true,
  },
  {
    id: 'reinforcedHull',
    name: 'Reinforced Hull',
    group: 'defense',
    glyph: 'hull',
    base: 2,
    describe: (v) => `+${Math.round(v)} base HP (max and current).`,
    starter: true,
  },
  {
    id: 'naniteRepair',
    name: 'Nanite Repair',
    group: 'defense',
    glyph: 'repair',
    base: 1 / 8,
    describe: (v) => `Repair 1 base HP every ${naniteEvery(v)} waves.`,
  },
  // Special
  {
    id: 'dualSpec',
    name: 'Dual Spec',
    group: 'special',
    glyph: 'dual',
    base: 1,
    describe: () => 'One specialized tower may take a second specialization.',
    fixedTier: 3,
  },
];

/** Nanite Repair interval in waves for an effect value (HP per wave). */
export function naniteEvery(v: number): number {
  return Math.max(1, Math.round(1 / v));
}

export const ARTIFACTS: Readonly<Record<ArtifactId, ArtifactDef>> = Object.fromEntries(
  DEFS.map((d) => [d.id, d]),
) as Record<ArtifactId, ArtifactDef>;

/** Codex order. */
export const ARTIFACT_ORDER: readonly ArtifactId[] = DEFS.map((d) => d.id);

export const STARTER_ARTIFACTS: readonly ArtifactId[] = DEFS.filter((d) => d.starter).map(
  (d) => d.id,
);

/** An artifact at a tier: in the draw pool (crafted) or active in a run. */
export interface OwnedArtifact {
  id: ArtifactId;
  tier: ArtifactTier;
}

/** Effect value of an artifact at a tier. */
export function artifactValue(id: ArtifactId, tier: ArtifactTier): number {
  return ARTIFACTS[id].base * ARTIFACT_TUNING.tierScale[tier]!;
}

/** Lowest tier an artifact exists at (crafting enters here). */
export function entryTier(id: ArtifactId): ArtifactTier {
  return ARTIFACTS[id].fixedTier ?? 0;
}

/** Shards to go from `tier` (undefined = not crafted) to the next tier; null when maxed. */
export function craftCost(id: ArtifactId, tier: ArtifactTier | undefined): number | null {
  const def = ARTIFACTS[id];
  if (tier === undefined) {
    // Fixed-tier artifacts cost what reaching that tier would.
    return def.fixedTier
      ? (ARTIFACT_TUNING.upgradeCost as readonly number[])[def.fixedTier - 1]!
      : ARTIFACT_TUNING.craftCost;
  }
  if (def.fixedTier !== undefined || tier >= MAX_TIER) return null;
  return (ARTIFACT_TUNING.upgradeCost as readonly number[])[tier]!;
}

/** Credits for the next reroll after `used` rerolls this run. */
export function rerollCost(used: number): number {
  return Math.round(ARTIFACT_TUNING.rerollBaseCost * ARTIFACT_TUNING.rerollGrowth ** used);
}
