import { artifactValue, type ArtifactId, type OwnedArtifact } from '../../../src/data/artifacts';
import { DAMAGE } from '../../../src/data/damage';
import { SPEC_TUNING, TOWER_SPECS, type SpecId } from '../../../src/data/specs';
import { TOWERS, type TowerKind } from '../../../src/data/towers';
import { placeCost, upgradeCostFor } from '../../../src/sim/economy';
import { towerStats, type TowerStats } from '../../../src/sim/specs';
import type { Tower } from '../../../src/sim/state';
import { canDualSpec } from '../../../src/sim/sim';
import type { BotContext, SpecChoice } from './types';

/** Damage-dealing towers (Cryo is support and valued separately). */
export const isDamageTower = (k: TowerKind): boolean => TOWERS[k].damageType !== 'utility';

/**
 * Rough damage per second against a single unarmored, unshielded target, counting extra
 * targets per shot (rail hits, chain jumps, splash) at a discount. A bot's value heuristic,
 * not a promise: armor, shields and overkill are ignored on purpose.
 */
export function estDps(s: TowerStats, spec: SpecId | null = null): number {
  const a = s.attack;
  let perShot = s.power;
  switch (a.type) {
    case 'bolt':
      perShot *= a.beams ?? 1;
      break;
    case 'slug':
      perShot *= 1 + a.pierce * 0.5;
      break;
    case 'rail':
      perShot *= 1 + (a.maxHits - 1) * 0.5;
      break;
    case 'shell':
      perShot *=
        1.8 +
        (a.cluster ? a.cluster.count * a.cluster.damageShare * 0.5 : 0) +
        (a.pool ? a.pool.dpsShare * a.pool.seconds * 0.5 : 0);
      break;
    case 'chain':
      perShot *= 1 + a.jumps * 0.6;
      break;
    case 'burst':
      perShot *= 2.5;
      break;
    case 'missiles':
      perShot *= a.count;
      break;
    case 'chill':
    case 'aura':
      return 0;
  }
  // Runtime spec effects the static stats don't show.
  let mult = 1;
  if (spec === 'overclock') mult *= 1 + SPEC_TUNING.overclock.maxBonus * 0.7; // average ramp
  if (spec === 'executioner') mult *= 1 / (1 - SPEC_TUNING.executioner.threshold);
  if (spec === 'hunterKiller')
    mult *= 1 + SPEC_TUNING.hunterKiller.critChance * (SPEC_TUNING.hunterKiller.critMult - 1);
  return perShot * s.fireRate * mult;
}

/** Running picture of the defenses the bot has been facing. */
export interface ThreatModel {
  /** Mean flat armor of enemies seen recently. */
  armor: number;
  /** Mean share of effective HP that is shield. */
  shieldShare: number;
  /** Share of enemies that fly. */
  flyingShare: number;
}

/** Update the threat model from the enemies currently on the field (exponential average). */
export function observe(ctx: BotContext, threat: ThreatModel): void {
  let n = 0;
  let armor = 0;
  let shield = 0;
  let flying = 0;
  for (const e of ctx.sim.state.enemies.items) {
    if (!e.alive) continue;
    n++;
    if (e.flying) flying++;
    armor += e.armor;
    shield += e.maxShield / (e.maxShield + e.maxHp);
  }
  if (n === 0) return;
  threat.armor = threat.armor * 0.9 + (armor / n) * 0.1;
  threat.shieldShare = threat.shieldShare * 0.9 + (shield / n) * 0.1;
  threat.flyingShare = threat.flyingShare * 0.9 + (flying / n) * 0.1;
}

/**
 * estDps adjusted for the threat model with the GDD §6 rules: shields take the damage type's
 * multiplier, armor is flat per hit with a 10% floor.
 */
export function effectiveDps(
  s: TowerStats,
  threat: ThreatModel,
  spec: SpecId | null = null,
): number {
  if (s.power <= 0) return 0;
  const vsHull = Math.max(s.power - threat.armor, s.power * DAMAGE.armorFloor) / s.power;
  // Ion Rail removes shields outright; EMP multiplies its shield damage.
  const vsShield =
    spec === 'ionRail'
      ? Math.max(vsHull, DAMAGE.vsShield[s.damageType])
      : DAMAGE.vsShield[s.damageType] *
        (spec === 'empWarheads' ? SPEC_TUNING.empWarheads.shieldBonus : 1);
  // Towers that can't hit flyers lose that share of targets; anti-air gets a premium for it.
  const reach = s.canHitFlying ? 1 + threat.flyingShare : 1 - threat.flyingShare;
  return (
    estDps(s, spec) * ((1 - threat.shieldShare) * vsHull + threat.shieldShare * vsShield) * reach
  );
}

/** Value of a tower: estimated DPS × path covered (≈ damage dealt per enemy pass). */
export function towerValue(ctx: BotContext, s: TowerStats, x: number, y: number): number {
  return estDps(s) * ctx.spots.coverageAt(x, y, s.range);
}

export function towers(ctx: BotContext): Tower[] {
  return ctx.sim.state.towers.items.filter((t) => t.alive);
}

export function tryPlace(ctx: BotContext, kind: TowerKind): boolean {
  const s = ctx.sim.state;
  if (!s.unlocked.includes(kind) || s.credits < placeCost(kind)) return false;
  const st = towerStats(kind, s.meta.towers[kind].startingLevel, null, s.meta, { art: s.art });
  const spot = ctx.spots.best(st.range);
  if (!spot) return false;
  ctx.send({ type: 'placeTower', kind, x: spot.x, y: spot.y });
  return true;
}

export function tryUpgrade(ctx: BotContext, t: Tower): boolean {
  if (ctx.sim.state.credits < upgradeCostFor(t, ctx.sim.state.art)) return false;
  ctx.send({ type: 'upgradeTower', towerId: t.id });
  return true;
}

/**
 * Forced spec per tower kind (balance-sim spec matrix): overrides the bot's own choice for
 * that kind only.
 */
export type SpecOverride = Partial<Record<TowerKind, SpecId>>;

/**
 * Specialize every unspecialized level-5+ tower according to `choice`. With a threat model,
 * 'best' values specs against the defenses being faced (so type changes are weighed).
 */
export function specializeAll(
  ctx: BotContext,
  choice: SpecChoice,
  threat?: ThreatModel,
  override: SpecOverride = {},
): void {
  const meta = ctx.sim.state.meta;
  const value = (st: TowerStats, x: number, y: number): number =>
    threat
      ? effectiveDps(st, threat) * ctx.spots.coverageAt(x, y, st.range)
      : towerValue(ctx, st, x, y);
  for (const t of towers(ctx)) {
    if (t.spec || t.level < 5) continue;
    const options = TOWER_SPECS[t.kind];
    let spec: SpecId;
    const forced = override[t.kind];
    if (forced) {
      spec = forced;
    } else if (choice === 'best') {
      const ok = options.filter((o) => keepsTypeMix(ctx, t, towerStats(t.kind, t.level, o, meta)));
      spec = (ok.length ? ok : options).reduce((a, b) =>
        value(towerStats(t.kind, t.level, b, meta), t.x, t.y) >
        value(towerStats(t.kind, t.level, a, meta), t.x, t.y)
          ? b
          : a,
      );
    } else if (choice === 'varied') {
      spec = options[t.id % 3]!;
    } else {
      spec = options[choice]!;
    }
    ctx.send({ type: 'specialize', towerId: t.id, spec });
  }
  // Dual Spec: the highest-level specialized tower takes its best remaining spec.
  const s = ctx.sim.state;
  const host = towers(ctx)
    .filter((t) => canDualSpec(s, t) && isDamageTower(t.kind))
    .sort((a, b) => b.level - a.level || a.id - b.id)[0];
  if (host) {
    const stats2 = (o: SpecId): TowerStats =>
      towerStats(host.kind, host.level, host.spec, meta, { art: s.art, spec2: o });
    const options = TOWER_SPECS[host.kind].filter(
      (o) => o !== host.spec && keepsTypeMix(ctx, host, stats2(o)),
    );
    if (options.length) {
      const spec2 = options.reduce((a, b) =>
        value(stats2(b), host.x, host.y) > value(stats2(a), host.x, host.y) ? b : a,
      );
      ctx.send({ type: 'specialize', towerId: host.id, spec: spec2 });
    }
  }
}

/** Minimum share of team DPS each damage type should keep (shields need energy, armor kinetic). */
const MIN_TYPE_SHARE = 0.25;

/** Would giving tower `t` these stats keep both energy and kinetic above MIN_TYPE_SHARE? */
function keepsTypeMix(ctx: BotContext, t: Tower, next: TowerStats): boolean {
  let energy = 0;
  let kinetic = 0;
  for (const o of towers(ctx)) {
    const st = o === t ? next : o.stats;
    const d = estDps(st, o.spec);
    if (st.damageType === 'energy') energy += d;
    else if (st.damageType === 'kinetic') kinetic += d;
  }
  const total = energy + kinetic;
  if (total === 0) return true;
  return energy / total >= MIN_TYPE_SHARE && kinetic / total >= MIN_TYPE_SHARE;
}

/**
 * Players call the next wave early when the field is clear and the base is healthy:
 * it pays a bonus and keeps runs moving.
 */
export function maybeCallEarly(ctx: BotContext): void {
  const s = ctx.sim.state;
  if (s.wave === 0) return;
  if (s.spawns.length > 0 || s.enemies.countAlive() > 0) return;
  if (s.baseHp < s.maxBaseHp * 0.7) return;
  ctx.send({ type: 'callEarly' });
}

/** Rough value of an artifact the bot can't measure through tower stats (fraction of power). */
const FLAT_VALUE: Partial<
  Record<ArtifactId, (v: number, ctx: BotContext, th: ThreatModel) => number>
> = {
  superconductor: (v, ctx, th) => v * th.shieldShare * typeShare(ctx, 'energy'),
  shieldBreaker: (v, ctx, th) => v * 0.33 * th.shieldShare * typeShare(ctx, 'kinetic'),
  penetratorRounds: (v, ctx, th) => v * Math.min(1, th.armor / 20) * typeShare(ctx, 'kinetic'),
  ricochetMatrix: (v, ctx) => v * 0.5 * typeShare(ctx, 'kinetic'),
  overflowReactor: (v) => v * 0.15,
  cryoLattice: (v, ctx) => (has(ctx, 'cryoProjector') ? v * 0.6 : 0),
  shatterPoint: (v, ctx) => (has(ctx, 'cryoProjector') ? v * 0.4 : v * 0.05),
  priorityTargeting: (v) => v * 0.35,
  skyguard: (v, _ctx, th) => v * th.flyingShare,
  nullAnchor: (v) => v * 0.4,
  lastStand: (v) => v * 0.15,
  bountyProtocol: (v) => v * 0.8,
  interestEngine: (v) => v * 4,
  fieldEngineering: (v) => v,
  salvageRights: () => 0,
  earlyBird: (v) => v * 0.1,
  supplyDrop: () => 0.08,
  reinforcedHull: (v) => v * 0.03,
  naniteRepair: (v) => v * 0.6,
  dualSpec: () => 0.2,
};

function has(ctx: BotContext, kind: TowerKind): boolean {
  return towers(ctx).some((t) => t.kind === kind);
}

function typeShare(ctx: BotContext, type: 'energy' | 'kinetic'): number {
  let mine = 0;
  let all = 0;
  for (const t of towers(ctx)) {
    const d = estDps(t.stats, t.spec);
    all += d;
    if (t.stats.damageType === type) mine += d;
  }
  return all > 0 ? mine / all : 0.5;
}

/** Team value (effective DPS × coverage) with this run's artifacts plus an extra one. */
function teamValue(ctx: BotContext, extra: OwnedArtifact | null, th: ThreatModel): number {
  const s = ctx.sim.state;
  const art = { ...s.art };
  if (extra) art[extra.id] += artifactValue(extra.id, extra.tier);
  let sum = 0;
  for (const t of towers(ctx)) {
    const st = towerStats(t.kind, t.level, t.spec, s.meta, { art, spec2: t.spec2 });
    sum += effectiveDps(st, th, t.spec) * ctx.spots.coverageAt(t.x, t.y, st.range);
  }
  return sum;
}

/** How bots take an artifact: by estimated value, or rotating through the offer ('varied'). */
export type ArtifactChoice = 'best' | 'varied';

/** Answer a pending artifact offer (bots never reroll). */
export function pickArtifact(
  ctx: BotContext,
  how: ArtifactChoice,
  threat: ThreatModel = { armor: 0, shieldShare: 0.2, flyingShare: 0.1 },
): void {
  const offer = ctx.sim.state.offer;
  if (!offer) return;
  let index = 0;
  if (how === 'varied') {
    index = (offer.wave / 10) % offer.choices.length;
  } else {
    const base = teamValue(ctx, null, threat) || 1;
    let best = -Infinity;
    offer.choices.forEach((c, i) => {
      const flat = FLAT_VALUE[c.id];
      const v = flat
        ? flat(artifactValue(c.id, c.tier), ctx, threat)
        : teamValue(ctx, c, threat) / base - 1;
      if (v > best) {
        best = v;
        index = i;
      }
    });
  }
  ctx.send({ type: 'pickArtifact', index: Math.floor(index) });
}
