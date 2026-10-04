import type { DamageType } from './damage';

export type TowerKind =
  'pulseLaser' | 'railgun' | 'plasmaMortar' | 'arcCoil' | 'cryoProjector' | 'swarmLauncher';

/** How a tower delivers its effect. */
export type Attack =
  /** Homing bolt, single target. */
  | { type: 'bolt'; speed: number }
  /**
   * Instant line to max range; hits up to `maxHits` ground enemies within `width / 2` of it,
   * nearest first (the Accelerator spec raises this, GDD §7).
   */
  | { type: 'rail'; width: number; maxHits: number }
  /** Lobbed shell to the target's position; splash on landing. */
  | { type: 'shell'; speed: number; splashRadius: number }
  /** Instant hit that jumps to nearby enemies, losing damage each jump. */
  | { type: 'chain'; jumps: number; jumpRadius: number; falloff: number }
  /** No damage; adds chill (slow → freeze). */
  | { type: 'chill'; chillPerHit: number }
  /** Salvo of homing missiles; prefers flying targets. */
  | { type: 'missiles'; count: number; speed: number; lifetimeSeconds: number };

export interface TowerDef {
  kind: TowerKind;
  name: string;
  damageType: DamageType;
  cost: number;
  /** Base of the upgrade cost curve, GDD §5. */
  upgradeBaseCost: number;
  /** Damage per hit (per missile / per chain hit before falloff). 0 for utility. */
  damage: number;
  /** Shots (or salvos) per second. */
  fireRate: number;
  /** World px (16 px = 1 grid tile). */
  range: number;
  canHitFlying: boolean;
  attack: Attack;
}

/** Build-bar and research order. */
export const TOWER_ORDER: readonly TowerKind[] = [
  'pulseLaser',
  'railgun',
  'plasmaMortar',
  'arcCoil',
  'cryoProjector',
  'swarmLauncher',
];

/**
 * Towers available before any research (decided 2026-10-04). The other three unlock in the
 * Research Lab (Phase 6).
 */
export const STARTING_UNLOCKS: readonly TowerKind[] = ['pulseLaser', 'railgun', 'plasmaMortar'];

// All numbers below are starting values. TODO(balance): tune in Phase 5.
export const TOWERS: Record<TowerKind, TowerDef> = {
  pulseLaser: {
    kind: 'pulseLaser',
    name: 'Pulse Laser',
    damageType: 'energy',
    cost: 60,
    upgradeBaseCost: 40,
    // 8 (was 6): energy must clearly beat kinetic against shields (mixedDamage.test.ts).
    damage: 8,
    fireRate: 2.5,
    range: 80, // matches the Place-Valid mock (160 px circle)
    canHitFlying: true,
    attack: { type: 'bolt', speed: 420 },
  },
  railgun: {
    kind: 'railgun',
    name: 'Railgun',
    damageType: 'kinetic',
    // Cost 110, 0.4/s, 2 hits: at 90 / 0.5 / unlimited pierce it out-performed every mix
    // per Credit, so mixed waves didn't need mixed damage (mixedDamage.test.ts).
    cost: 110,
    upgradeBaseCost: 70,
    damage: 40,
    fireRate: 0.4,
    range: 112,
    canHitFlying: false,
    attack: { type: 'rail', width: 10, maxHits: 2 },
  },
  plasmaMortar: {
    kind: 'plasmaMortar',
    name: 'Plasma Mortar',
    damageType: 'energy',
    cost: 80,
    upgradeBaseCost: 55,
    damage: 14,
    fireRate: 0.6,
    range: 112,
    canHitFlying: false,
    attack: { type: 'shell', speed: 200, splashRadius: 28 },
  },
  arcCoil: {
    kind: 'arcCoil',
    name: 'Arc Coil',
    damageType: 'energy',
    cost: 110,
    upgradeBaseCost: 70,
    damage: 9,
    fireRate: 1.2,
    range: 72,
    canHitFlying: true,
    attack: { type: 'chain', jumps: 2, jumpRadius: 48, falloff: 0.8 },
  },
  cryoProjector: {
    kind: 'cryoProjector',
    name: 'Cryo Projector',
    damageType: 'utility',
    cost: 70,
    upgradeBaseCost: 50,
    damage: 0,
    fireRate: 2,
    range: 72,
    canHitFlying: true,
    attack: { type: 'chill', chillPerHit: 0.25 },
  },
  swarmLauncher: {
    kind: 'swarmLauncher',
    name: 'Swarm Launcher',
    damageType: 'kinetic',
    cost: 100,
    upgradeBaseCost: 65,
    damage: 5,
    fireRate: 0.8,
    range: 112,
    canHitFlying: true,
    attack: { type: 'missiles', count: 3, speed: 240, lifetimeSeconds: 2 },
  },
};
