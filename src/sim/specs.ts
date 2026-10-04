import { towerDamage } from '../data/curves';
import type { DamageType } from '../data/damage';
import { GAME } from '../data/game';
import { SPEC_TUNING as T, SPECS, type SpecId } from '../data/specs';
import { FRESH_ACCOUNT, type MetaModifiers } from '../data/meta';
import { TOWERS, type Attack, type TowerKind } from '../data/towers';
import type { ArtifactId } from '../data/artifacts';

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

/** Run state that shapes a tower's stats beyond level, spec and research. */
export interface StatExtras {
  /** Active artifact values (missing = none). */
  art?: Readonly<Partial<Record<ArtifactId, number>>>;
  /** Second specialization (Dual Spec). */
  spec2?: SpecId | null;
  /** Targeting Uplink applies (a same-kind tower is close by). */
  uplinked?: boolean;
}

/**
 * Base stats scaled by level, then modified by research (`meta`), the specialization(s) and
 * the run's artifacts. Pure: shared by the sim (cached on each tower, see refreshAllStats) and
 * the tower panel.
 */
export function towerStats(
  kind: TowerKind,
  level: number,
  spec: SpecId | null,
  meta: MetaModifiers = FRESH_ACCOUNT,
  extras: StatExtras = {},
): TowerStats {
  const def = TOWERS[kind];
  const tm = meta.towers[kind];
  const base = def.attack.type === 'chill' ? def.attack.chillPerHit : def.damage;
  const s: TowerStats = {
    damageType: def.damageType,
    power: towerDamage(base, level) * tm.damageMult,
    fireRate: def.fireRate * tm.fireRateMult,
    range: def.range * tm.rangeMult,
    canHitFlying: def.canHitFlying,
    attack: { ...def.attack },
  };
  applySpec(s, spec);
  if (extras.spec2) applySpec(s, extras.spec2);
  if (extras.art) applyArtifacts(s, extras.art, spec !== null, extras.uplinked ?? false);
  return s;
}

function applySpec(s: TowerStats, spec: SpecId | null): void {
  if (spec && SPECS[spec].damageType) s.damageType = SPECS[spec].damageType!;
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
      // With Dual Spec the beam may already be a slug; then Prism changes nothing.
      if (a.type === 'bolt') {
        a.beams = T.prism.beams;
        s.power *= T.prism.damageShare;
      }
      break;
    case 'accelerator':
      if (a.type === 'rail') {
        a.maxHits += T.accelerator.extraHits;
        a.bonusPerPierce = T.accelerator.bonusPerPierce;
      }
      break;
    case 'ionRail':
      if (a.type === 'rail') {
        a.strip = T.ionRail.shieldStripMult;
        s.power *= T.ionRail.damageMult;
      }
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
      if (a.type === 'missiles') {
        a.count *= T.saturation.countMult;
        s.power *= T.saturation.damageMult;
      }
      break;
    case 'empWarheads':
      break;
  }
}

/** Stat artifacts (GDD §9). Hit and economy artifacts act in damage.ts, waves.ts, economy.ts. */
function applyArtifacts(
  s: TowerStats,
  art: Readonly<Partial<Record<ArtifactId, number>>>,
  specialized: boolean,
  uplinked: boolean,
): void {
  const v = (id: ArtifactId): number => art[id] ?? 0;
  if (s.damageType === 'energy') s.power *= 1 + v('capacitorBank');
  if (s.damageType === 'kinetic') s.power *= 1 + v('kineticPrimer');
  if (specialized && s.damageType !== 'utility') s.power *= 1 + v('specialistDoctrine');
  s.fireRate *= 1 + v('rapidCycling');
  s.range *= (1 + v('longBarrels')) * (uplinked ? 1 + v('targetingUplink') : 1);
  const a = s.attack;
  if (a.type === 'shell') {
    a.splashRadius *= 1 + v('widePayload');
    if (a.cluster) a.cluster = { ...a.cluster, radius: a.cluster.radius * (1 + v('widePayload')) };
  }
  if (a.type === 'chain') a.falloff = 1 - (1 - a.falloff) * (1 - v('echoChamber'));
  if (a.type === 'chill') {
    s.power *= 1 + v('coldSnap');
    a.freezeMult = (a.freezeMult ?? 1) * (1 + v('permafrost'));
  }
  if (a.type === 'aura') a.chill = Math.min(1, a.chill * (1 + v('coldSnap')));
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

const merged = new Map<string, Readonly<HitMods>>();

/** Hit modifiers for a shot's spec(s); Dual Spec combos are merged once and cached. */
export function hitMods(spec: SpecId | null, spec2: SpecId | null = null): Readonly<HitMods> {
  const a = (spec && MODS[spec]) || NO_MODS;
  if (!spec2) return a;
  const b = MODS[spec2] ?? NO_MODS;
  const key = `${spec}|${spec2}`;
  let m = merged.get(key);
  if (!m) {
    m = {
      bossBonus: Math.max(a.bossBonus, b.bossBonus),
      execute: Math.max(a.execute, b.execute),
      shieldMult: a.shieldMult * b.shieldMult,
      stunTicks: Math.max(a.stunTicks, b.stunTicks),
    };
    merged.set(key, m);
  }
  return m;
}
