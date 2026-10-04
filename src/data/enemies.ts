export type EnemyKind =
  | 'drone'
  | 'skitter'
  | 'bulwark'
  | 'warden'
  | 'wraith'
  | 'splitter'
  | 'medic'
  | 'juggernaut'
  | 'aegis'
  | 'hiveCarrier';

export type BossKind = 'juggernaut' | 'aegis' | 'hiveCarrier';

export interface EnemyDef {
  kind: EnemyKind;
  name: string;
  /** Hull HP at wave 0; scales by the HP curve. */
  baseHp: number;
  /** Shield HP at wave 0 (0 = none); scales by the shield curve. */
  baseShield: number;
  /** Shield regained per second once regen starts, as a fraction of max shield. */
  shieldRegen: number;
  /** Flat armor at wave 0; scales roughly linearly (GDD §5). */
  baseArmor: number;
  /** World px per second along the path. */
  speed: number;
  baseBounty: number;
  radius: number;
  /** Flying: ignored by Railgun and Plasma Mortar (GDD §7). */
  flying: boolean;
  /** Base HP lost on leak (GDD §5: normal 1, elite 3; bosses use the boss rule). */
  leakDamage: number;
  boss: boolean;
  /** Splitter: spawns these on death. */
  split?: { kind: EnemyKind; count: number };
  /** Medic: heals nearby enemies' hull, fraction of their max HP per second. */
  heal?: { radius: number; perSecond: number };
  /** Bosses that release minions while alive. */
  spawns?: { kind: EnemyKind; everySeconds: number };
}

const base = {
  baseShield: 0,
  shieldRegen: 0,
  baseArmor: 0,
  flying: false,
  leakDamage: 1,
  boss: false,
};

// All numbers are starting values. TODO(balance): tune in Phase 5.
export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  drone: { ...base, kind: 'drone', name: 'Drone', baseHp: 18, speed: 36, baseBounty: 4, radius: 7 },
  skitter: {
    ...base,
    kind: 'skitter',
    name: 'Skitter',
    baseHp: 8,
    speed: 64,
    baseBounty: 3,
    radius: 6,
  },
  bulwark: {
    ...base,
    kind: 'bulwark',
    name: 'Bulwark',
    baseHp: 30,
    baseArmor: 4,
    speed: 26,
    baseBounty: 7,
    radius: 9,
  },
  warden: {
    ...base,
    kind: 'warden',
    name: 'Warden',
    baseHp: 16,
    baseShield: 26,
    shieldRegen: 0.25,
    speed: 32,
    baseBounty: 7,
    radius: 8,
  },
  wraith: {
    ...base,
    kind: 'wraith',
    name: 'Wraith',
    baseHp: 16,
    flying: true,
    speed: 42,
    baseBounty: 6,
    radius: 7,
  },
  splitter: {
    ...base,
    kind: 'splitter',
    name: 'Splitter',
    baseHp: 26,
    speed: 30,
    baseBounty: 5,
    radius: 8,
    split: { kind: 'skitter', count: 3 },
  },
  medic: {
    ...base,
    kind: 'medic',
    name: 'Medic',
    baseHp: 20,
    speed: 32,
    baseBounty: 7,
    radius: 8,
    heal: { radius: 40, perSecond: 0.04 },
  },
  juggernaut: {
    ...base,
    kind: 'juggernaut',
    name: 'Juggernaut',
    // 180 / 7 (was 400 / 14): the first boss was near-immune to anything but Railguns,
    // and a boss leak drops the base to 1 HP, so it decided most runs.
    baseHp: 180,
    baseArmor: 7,
    speed: 20,
    baseBounty: 80,
    radius: 16,
    boss: true,
  },
  aegis: {
    ...base,
    kind: 'aegis',
    name: 'Aegis',
    baseHp: 220,
    // Phase 5: 180 / 0.10 (was 260 / 0.15): at wave 20 it regenerated ~165 shield/s, so any
    // kinetic-leaning build lost to it and Ion Rail became the must-pick Railgun spec.
    baseShield: 180,
    shieldRegen: 0.1,
    speed: 22,
    baseBounty: 80,
    radius: 16,
    boss: true,
    spawns: { kind: 'drone', everySeconds: 4 },
  },
  hiveCarrier: {
    ...base,
    kind: 'hiveCarrier',
    name: 'Hive Carrier',
    baseHp: 300,
    flying: true,
    speed: 24,
    baseBounty: 80,
    radius: 16,
    boss: true,
    spawns: { kind: 'wraith', everySeconds: 3 },
  },
};

/** Elite waves (every 5th): tougher enemies, bigger Credit drops, leak costs 3 (GDD §5). */
export const ELITE = {
  hpMult: 2.5, // TODO(balance)
  shieldMult: 2.5, // TODO(balance)
  armorMult: 1.5, // TODO(balance)
  bountyMult: 2.5, // TODO(balance)
  leakDamage: 3,
} as const;
