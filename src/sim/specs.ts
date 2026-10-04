import { towerDamage } from '../data/curves';
import type { DamageType } from '../data/damage';
import { GAME } from '../data/game';
import { SPEC_TUNING as T, SPECS, type SpecId } from '../data/specs';
import { FRESH_ACCOUNT, type MetaModifiers } from '../data/meta';
import { TOWERS, type Attack, type TowerKind } from '../data/towers';

/** A tower's effective numbers at a level, with its specialization applied. */
export interface TowerStats {
  damageType: DamageType;
  /** Per-hit damage (chill per hit for the Cryo Projector). */
  power: number;
  fireRate: number;
  range: number;
  canHitFlying: boolean;
  attack: Attack;
}

/**
 * Base stats scaled by level, then modified by research (`meta`) and the specialization.
 * Pure: shared by the sim (cached on each tower when it's placed, upgraded or specialized)
 * and the tower panel.
 */
export function towerStats(
  kind: TowerKind,
  level: number,
  spec: SpecId | null,
  meta: MetaModifiers = FRESH_ACCOUNT,
): TowerStats {
  const def = TOWERS[kind];
  const base = def.attack.type === 'chill' ? def.attack.chillPerHit : def.damage;
  const s: TowerStats = {
    damageType: spec ? (SPECS[spec].damageType ?? def.damageType) : def.damageType,
    power: towerDamage(base, level) * meta.towerDamageMult,
    fireRate: def.fireRate * meta.towerFireRateMult,
    range: def.range * meta.towerRangeMult,
    canHitFlying: def.canHitFlying,
    attack: { ...def.attack },
  };
  const a = s.attack;
  switch (spec) {
    case null:
    case 'overclock': // runtime ramp, see updateTowers
    case 'executioner': // hit modifier
    case 'overload': // hit modifier
      break;
    case 'flechette':
      if (a.type === 'bolt')
        s.attack = { type: 'slug', speed: T.flechette.speed, pierce: T.flechette.pierce };
      break;
    case 'prism':
      if (a.type === 'bolt') a.beams = T.prism.beams;
      s.power *= T.prism.damageShare;
      break;
    case 'accelerator':
      if (a.type === 'rail') {
        a.maxHits += T.accelerator.extraHits;
        a.bonusPerPierce = T.accelerator.bonusPerPierce;
      }
      break;
    case 'ionRail':
      if (a.type === 'rail') a.strip = T.ionRail.shieldStripMult;
      s.power *= T.ionRail.damageMult;
      break;
    case 'plasmaPools':
      if (a.type === 'shell') a.pool = { ...T.plasmaPools };
      break;
    case 'cluster':
      if (a.type === 'shell') a.cluster = { ...T.cluster };
      break;
    case 'siege':
      s.range *= T.siege.rangeMult;
      s.fireRate *= T.siege.rateMult;
      s.power *= T.siege.damageMult;
      if (a.type === 'shell') a.splashRadius *= T.siege.splashMult;
      break;
    case 'storm':
      if (a.type === 'chain') a.jumps += T.storm.extraJumps;
      break;
    case 'capacitor':
      s.attack = { type: 'burst' };
      s.fireRate = 1 / T.capacitor.chargeSeconds;
      s.power *= T.capacitor.damageMult;
      break;
    case 'deepFreeze':
      if (a.type === 'chill') {
        a.freezeChance = T.deepFreeze.freezeChance;
        a.freezeMult = T.deepFreeze.freezeMult;
      }
      break;
    case 'brittle':
      if (a.type === 'chill') a.brittleSeconds = T.brittle.seconds;
      break;
    case 'stasisField':
      s.attack = { type: 'aura', chill: T.stasisField.auraChill };
      break;
    case 'hunterKiller':
      if (a.type === 'missiles') {
        a.hunt = true;
        a.critChance = T.hunterKiller.critChance;
        a.critMult = T.hunterKiller.critMult;
      }
      break;
    case 'saturation':
      if (a.type === 'missiles') a.count *= T.saturation.countMult;
      s.power *= T.saturation.damageMult;
      break;
    case 'empWarheads':
      break;
  }
  return s;
}

/** Per-hit effects that ride on a shot from a specialized tower. */
export interface HitMods {
  /** Extra damage against bosses (fraction). */
  bossBonus: number;
  /** Non-boss enemies left below this HP fraction die (0 = off). */
  execute: number;
  /** Multiplier on the damage type's shield multiplier (EMP). */
  shieldMult: number;
  /** Stun applied on hit, in ticks (bosses are immune). */
  stunTicks: number;
}

export const NO_MODS: Readonly<HitMods> = { bossBonus: 0, execute: 0, shieldMult: 1, stunTicks: 0 };

const ticks = (s: number): number => Math.round(s * GAME.tickRate);

const MODS: Partial<Record<SpecId, Readonly<HitMods>>> = {
  executioner: { ...NO_MODS, bossBonus: T.executioner.bossBonus, execute: T.executioner.threshold },
  overload: { ...NO_MODS, stunTicks: ticks(T.overload.stunSeconds) },
  empWarheads: {
    ...NO_MODS,
    shieldMult: T.empWarheads.shieldBonus,
    stunTicks: ticks(T.empWarheads.stunSeconds),
  },
};

export function hitMods(spec: SpecId | null): Readonly<HitMods> {
  return (spec && MODS[spec]) || NO_MODS;
}
