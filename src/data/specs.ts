import type { DamageType } from './damage';
import type { TowerKind } from './towers';

/** GDD §7: at level 5, pick 1 of 3 specializations (locked for that tower). */
export const SPEC_LEVEL = 5;

export type SpecId =
  | 'overclock'
  | 'flechette'
  | 'prism'
  | 'accelerator'
  | 'executioner'
  | 'ionRail'
  | 'plasmaPools'
  | 'cluster'
  | 'siege'
  | 'storm'
  | 'overload'
  | 'capacitor'
  | 'deepFreeze'
  | 'brittle'
  | 'stasisField'
  | 'hunterKiller'
  | 'saturation'
  | 'empWarheads';

export interface SpecDef {
  id: SpecId;
  tower: TowerKind;
  name: string;
  /** One-line description for the pick card. */
  description: string;
  /** Stat line under the description (uppercase, Oxanium). */
  statLine: string;
  /** Set when the spec changes the tower's damage type (Flechette, Ion Rail, EMP Warheads). */
  damageType?: DamageType;
  /** Shape-change note for type-changing specs (Specialization.dc.html). */
  shapeNote?: string;
  strongVs?: string;
  loses?: string;
}

export const TOWER_SPECS: Record<TowerKind, readonly [SpecId, SpecId, SpecId]> = {
  pulseLaser: ['overclock', 'flechette', 'prism'],
  railgun: ['accelerator', 'executioner', 'ionRail'],
  plasmaMortar: ['plasmaPools', 'cluster', 'siege'],
  arcCoil: ['storm', 'overload', 'capacitor'],
  cryoProjector: ['deepFreeze', 'brittle', 'stasisField'],
  swarmLauncher: ['hunterKiller', 'saturation', 'empWarheads'],
};

/**
 * Tuning per spec. Pulse Laser numbers come from the Specialization mockup; the rest are
 * starting values. TODO(balance): tune in Phase 5.
 */
export const SPEC_TUNING = {
  overclock: { ratePerSecond: 0.1, maxBonus: 1, idleResetSeconds: 2 },
  flechette: { pierce: 2, speed: 520 },
  prism: { beams: 3, damageShare: 0.45 },
  accelerator: { extraHits: 2, bonusPerPierce: 0.25 },
  executioner: { threshold: 0.15, bossBonus: 0.5 },
  ionRail: {},
  plasmaPools: { seconds: 3, radius: 24, dpsShare: 0.5 },
  cluster: { count: 5, ringRadius: 22, damageShare: 0.35, radius: 14 },
  siege: { rangeMult: 1.6, splashMult: 1.5, rateMult: 0.6, damageMult: 1.5 },
  storm: { extraJumps: 3 },
  overload: { stunSeconds: 0.4 },
  capacitor: { chargeSeconds: 4, damageMult: 6 },
  deepFreeze: { freezeChance: 0.15, freezeMult: 1.6 },
  brittle: { armorLoss: 0.3, seconds: 2 },
  stasisField: { auraChill: 0.5 },
  hunterKiller: { critChance: 0.25, critMult: 2 },
  saturation: { countMult: 3, damageMult: 0.4 },
  empWarheads: { shieldBonus: 2, stunSeconds: 0.2 },
} as const;

const T = SPEC_TUNING;
const pct = (f: number): string => `${Math.round(f * 100)}%`;

export const SPECS: Record<SpecId, SpecDef> = {
  overclock: {
    id: 'overclock',
    tower: 'pulseLaser',
    name: 'Overclock',
    description: `Fire rate ramps up while firing continuously. Resets after ${T.overclock.idleResetSeconds} s idle.`,
    statLine: `FIRE RATE +${pct(T.overclock.ratePerSecond)}/S · MAX +${pct(T.overclock.maxBonus)}`,
  },
  flechette: {
    id: 'flechette',
    tower: 'pulseLaser',
    name: 'Flechette',
    description: `Swaps the beam for flechette bursts that pierce ${T.flechette.pierce} enemies.`,
    statLine: `PIERCE ${T.flechette.pierce}`,
    damageType: 'kinetic',
    shapeNote: 'Beam → short slugs',
    strongVs: 'Armor',
    loses: 'Shield bonus',
  },
  prism: {
    id: 'prism',
    tower: 'pulseLaser',
    name: 'Prism',
    description: `Splits the beam across ${T.prism.beams} targets.`,
    statLine: `${T.prism.beams} BEAMS · ${pct(T.prism.damageShare)} DMG EACH`,
  },
  accelerator: {
    id: 'accelerator',
    tower: 'railgun',
    name: 'Accelerator',
    description: 'Pierces more enemies, and each one pierced makes the slug hit harder.',
    statLine: `+${T.accelerator.extraHits} PIERCE · +${pct(T.accelerator.bonusPerPierce)} DMG PER PIERCE`,
  },
  executioner: {
    id: 'executioner',
    tower: 'railgun',
    name: 'Executioner',
    description: `Kills non-boss enemies left below ${pct(T.executioner.threshold)} HP. Hits bosses harder.`,
    statLine: `EXECUTE < ${pct(T.executioner.threshold)} · +${pct(T.executioner.bossBonus)} VS BOSSES`,
  },
  ionRail: {
    id: 'ionRail',
    tower: 'railgun',
    name: 'Ion Rail',
    description: 'Fires an ion beam that strips the shield off every enemy on its line.',
    statLine: 'STRIPS SHIELDS ON THE LINE',
    damageType: 'energy',
    shapeNote: 'Slug → ion beam',
    strongVs: 'Shield',
    loses: 'Armor punch',
  },
  plasmaPools: {
    id: 'plasmaPools',
    tower: 'plasmaMortar',
    name: 'Plasma Pools',
    description: `Shells leave burning ground for ${T.plasmaPools.seconds} s.`,
    statLine: `POOL ${pct(T.plasmaPools.dpsShare)} DMG/S · ${T.plasmaPools.seconds} S`,
  },
  cluster: {
    id: 'cluster',
    tower: 'plasmaMortar',
    name: 'Cluster',
    description: `Each shell bursts into ${T.cluster.count} submunitions around the impact.`,
    statLine: `${T.cluster.count} BOMBLETS · ${pct(T.cluster.damageShare)} DMG EACH`,
  },
  siege: {
    id: 'siege',
    tower: 'plasmaMortar',
    name: 'Siege',
    description: 'Huge range and a bigger blast, at a slower rate of fire.',
    statLine: `RANGE ×${T.siege.rangeMult} · BLAST ×${T.siege.splashMult} · RATE ×${T.siege.rateMult}`,
  },
  storm: {
    id: 'storm',
    tower: 'arcCoil',
    name: 'Storm',
    description: `Lightning jumps to ${T.storm.extraJumps} more enemies.`,
    statLine: `+${T.storm.extraJumps} CHAIN JUMPS`,
  },
  overload: {
    id: 'overload',
    tower: 'arcCoil',
    name: 'Overload',
    description: 'Every enemy the chain hits is stunned for a moment.',
    statLine: `STUN ${T.overload.stunSeconds} S PER HIT`,
  },
  capacitor: {
    id: 'capacitor',
    tower: 'arcCoil',
    name: 'Capacitor',
    description: 'Charges up, then releases one huge burst at every enemy in range.',
    statLine: `BURST ×${T.capacitor.damageMult} · EVERY ${T.capacitor.chargeSeconds} S`,
  },
  deepFreeze: {
    id: 'deepFreeze',
    tower: 'cryoProjector',
    name: 'Deep Freeze',
    description: 'Hits can freeze outright, and freezes last longer.',
    statLine: `${pct(T.deepFreeze.freezeChance)} FREEZE CHANCE · ×${T.deepFreeze.freezeMult} DURATION`,
  },
  brittle: {
    id: 'brittle',
    tower: 'cryoProjector',
    name: 'Brittle',
    description: `Chilled enemies lose ${pct(T.brittle.armorLoss)} of their armor.`,
    statLine: `−${pct(T.brittle.armorLoss)} ARMOR WHILE CHILLED`,
  },
  stasisField: {
    id: 'stasisField',
    tower: 'cryoProjector',
    name: 'Stasis Field',
    description: 'Stops firing and instead slows every enemy in range.',
    statLine: `AURA SLOW ${pct(T.stasisField.auraChill * 0.6)}`,
  },
  hunterKiller: {
    id: 'hunterKiller',
    tower: 'swarmLauncher',
    name: 'Hunter-Killer',
    description: 'Goes for bosses and elites first. Missiles can crit.',
    statLine: `${pct(T.hunterKiller.critChance)} CRIT · ×${T.hunterKiller.critMult} DMG`,
  },
  saturation: {
    id: 'saturation',
    tower: 'swarmLauncher',
    name: 'Saturation',
    description: 'Fires many more, smaller missiles.',
    statLine: `MISSILES ×${T.saturation.countMult} · ${pct(T.saturation.damageMult)} DMG EACH`,
  },
  empWarheads: {
    id: 'empWarheads',
    tower: 'swarmLauncher',
    name: 'EMP Warheads',
    description: 'Energy warheads that break shields and stun briefly.',
    statLine: `SHIELD DMG ×${T.empWarheads.shieldBonus} · STUN ${T.empWarheads.stunSeconds} S`,
    damageType: 'energy',
    shapeNote: 'Missile → EMP burst',
    strongVs: 'Shield',
    loses: 'Armor punch',
  },
};
