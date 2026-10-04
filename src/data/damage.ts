/** Damage model, GDD §6. */
export type DamageType = 'energy' | 'kinetic' | 'utility';

export const DAMAGE = {
  /** Multiplier against shield HP. Utility deals no damage. */
  vsShield: { energy: 1.5, kinetic: 0.5, utility: 0 } as Record<DamageType, number>,
  /** Armor is a flat reduction per hit on hull; at least this fraction of the hit gets through. */
  armorFloor: 0.1,
  /** Frozen enemies take this much kinetic damage (the Cryo combo). */
  frozenKineticBonus: 1.5,
  /** Shields start regenerating after this long without taking damage. */
  shieldRegenDelaySeconds: 3,
} as const;

/**
 * Cryo chill (decided 2026-10-04): each hit adds chill and slows more; at full chill the
 * enemy freezes, then can't be re-frozen for a while. Bosses only ever slow.
 */
export const CHILL = {
  /** Slow at full chill (fraction of speed removed). TODO(balance) */
  maxSlow: 0.6,
  /** Chill lost per second when not being hit. TODO(balance) */
  decayPerSecond: 0.2,
  freezeSeconds: 1, // TODO(balance)
  immuneSeconds: 1.5, // TODO(balance)
  /** Bosses cap below 1, so they never freeze. */
  bossMaxChill: 0.9,
} as const;
