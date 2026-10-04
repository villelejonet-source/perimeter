import { ARTIFACT_TUNING } from '../data/artifacts';
import { GAME } from '../data/game';
import { SPEC_TUNING } from '../data/specs';
import type { TowerDef } from '../data/towers';
import { applyHit } from './damage';
import { applyChill, forceFreeze, SHIELD_REGEN_DELAY_TICKS } from './enemies';
import { emitFx } from './fx';
import type { Path } from './path';
import type { Rng } from './rng';
import { hitMods, towerStats } from './specs';
import type { Enemy, Projectile, SimState, Tower } from './state';
import { findTarget, nearestEnemy } from './targeting';

const FX_RAIL_TICKS = 10;
const FX_CHAIN_TICKS = 8;
const FX_CHILL_TICKS = 6;
const FX_FREEZE_TICKS = 20;
/** Spread of a missile salvo around the aim direction, radians. */
const SALVO_SPREAD = 0.9;
const OVERCLOCK_RAMP_PER_TICK = SPEC_TUNING.overclock.ratePerSecond / GAME.tickRate;
const OVERCLOCK_IDLE_TICKS = SPEC_TUNING.overclock.idleResetSeconds * GAME.tickRate;
const BRITTLE_TICKS = (s: number): number => Math.round(s * GAME.tickRate);

/** Scratch buffers (no per-shot allocation). */
const chainHits = new Int32Array(16);
const lineHits: (Enemy | undefined)[] = new Array<Enemy | undefined>(64);
const lineDist = new Float64Array(64);
const prismTargets: (Enemy | undefined)[] = new Array<Enemy | undefined>(8);

/** Per-hit effect for a tower at a level without a spec (panel and tests). */
export function towerPower(def: TowerDef, level: number): number {
  return towerStats(def.kind, level, null).power;
}

export function updateTowers(state: SimState, path: Path, rng: Rng): void {
  // Last Stand: every tower fires faster while the base is low.
  const rateBoost =
    state.art.lastStand > 0 && state.baseHp <= state.maxBaseHp * ARTIFACT_TUNING.lastStandBelow
      ? 1 + state.art.lastStand
      : 1;
  for (const t of state.towers.items) {
    if (!t.alive) continue;
    const st = t.stats;
    if (st.attack.type === 'aura') {
      applyAura(state, t, st.attack.chill);
      continue;
    }
    if (t.cooldown > 0) t.cooldown--;
    const target = findTarget(state, t);
    t.targetId = target ? target.id : -1;

    // Overclock: fire rate ramps while it has targets, resets after a short idle.
    if (t.spec === 'overclock' || t.spec2 === 'overclock') {
      if (target) {
        t.idle = 0;
        t.heat = Math.min(SPEC_TUNING.overclock.maxBonus, t.heat + OVERCLOCK_RAMP_PER_TICK);
      } else if (++t.idle >= OVERCLOCK_IDLE_TICKS) {
        t.heat = 0;
      }
    }

    if (!target || t.cooldown > 0) continue;
    fire(state, path, rng, t, target);
    t.cooldown = Math.max(1, Math.round(GAME.tickRate / (st.fireRate * (1 + t.heat) * rateBoost)));
  }
}

/** Stasis Field: keeps every enemy in range chilled (never to a freeze). */
function applyAura(state: SimState, t: Tower, chill: number): void {
  const rSq = t.stats.range * t.stats.range;
  t.targetId = -1;
  for (const e of state.enemies.items) {
    if (!e.alive) continue;
    if ((e.x - t.x) ** 2 + (e.y - t.y) ** 2 <= rSq && e.chill < chill) e.chill = chill;
  }
}

function newShot(state: SimState, t: Tower, kind: Projectile['kind'], power: number): Projectile {
  const p = state.projectiles.acquire();
  p.kind = kind;
  p.x = t.x;
  p.y = t.y;
  p.target = null;
  p.targetId = -1;
  p.damage = power;
  p.damageType = t.stats.damageType;
  p.source = t.kind;
  p.spec = t.spec;
  p.spec2 = t.spec2;
  p.hitCount = 0;
  p.pierceLeft = 0;
  return p;
}

function fire(state: SimState, path: Path, rng: Rng, t: Tower, target: Enemy): void {
  const st = t.stats;
  const atk = st.attack;
  const mods = hitMods(t.spec, t.spec2);
  const aim = Math.atan2(target.y - t.y, target.x - t.x);
  switch (atk.type) {
    case 'bolt': {
      // Prism splits the beam across the target and its nearest neighbours in range.
      const beams = atk.beams ?? 1;
      let n = 0;
      prismTargets[n++] = target;
      while (n < beams) {
        const next = nearestOther(state, t, target, n);
        if (!next) break;
        prismTargets[n++] = next;
      }
      for (let i = 0; i < n; i++) {
        const e = prismTargets[i]!;
        const p = newShot(state, t, 'bolt', st.power);
        p.angle = Math.atan2(e.y - t.y, e.x - t.x);
        p.target = e;
        p.targetId = e.id;
        p.speed = atk.speed;
      }
      break;
    }
    case 'slug': {
      // Flechette: a straight slug that passes through enemies.
      const p = newShot(state, t, 'slug', st.power);
      p.angle = aim;
      p.speed = atk.speed;
      p.pierceLeft = atk.pierce + 1;
      p.life = st.range + 24;
      break;
    }
    case 'rail': {
      const ex = t.x + Math.cos(aim) * st.range;
      const ey = t.y + Math.sin(aim) * st.range;
      const half = atk.width / 2;
      // Enemies spawned mid-loop (Splitter children) weren't there when the shot fired.
      const bornAfter = state.nextId;
      let hits = 0;
      for (const e of state.enemies.items) {
        if (!e.alive || e.flying || e.id >= bornAfter) continue;
        if (distToSegment(e.x, e.y, t.x, t.y, ex, ey) > half + e.radius) continue;
        // Ion Rail strips shields along the whole line, not just on the enemies it damages.
        if (atk.strip && e.shield > 0) {
          e.shield = Math.max(0, e.shield - st.power * atk.strip);
          e.shieldDelay = SHIELD_REGEN_DELAY_TICKS;
        }
        lineHits[hits] = e;
        lineDist[hits] = (e.x - t.x) ** 2 + (e.y - t.y) ** 2;
        if (++hits === lineHits.length) break;
      }
      // Partial selection sort: only the nearest maxHits matter.
      const n = Math.min(hits, atk.maxHits);
      for (let i = 0; i < n; i++) {
        let m = i;
        for (let j = i + 1; j < hits; j++) if (lineDist[j]! < lineDist[m]!) m = j;
        if (m !== i) {
          const te = lineHits[i]!;
          lineHits[i] = lineHits[m]!;
          lineHits[m] = te;
          const td = lineDist[i]!;
          lineDist[i] = lineDist[m]!;
          lineDist[m] = td;
        }
        // Accelerator: each enemy already pierced adds damage.
        const dmg = st.power * (1 + (atk.bonusPerPierce ?? 0) * i);
        applyHit(state, path, lineHits[i]!, dmg, st.damageType, t.kind, mods);
      }
      emitFx(state, atk.strip ? 'ion' : 'rail', t.x, t.y, ex, ey, FX_RAIL_TICKS);
      break;
    }
    case 'shell': {
      const p = newShot(state, t, 'shell', st.power);
      p.tx = target.x;
      p.ty = target.y;
      p.angle = aim;
      p.speed = atk.speed;
      p.splashRadius = atk.splashRadius;
      break;
    }
    case 'chain': {
      let from: Enemy = target;
      let fx = t.x;
      let fy = t.y;
      let dmg = st.power;
      let count = 0;
      for (let jump = 0; jump <= atk.jumps && count < chainHits.length; jump++) {
        chainHits[count++] = from.id;
        emitFx(state, 'chain', fx, fy, from.x, from.y, FX_CHAIN_TICKS);
        fx = from.x;
        fy = from.y;
        applyHit(state, path, from, dmg, st.damageType, t.kind, mods);
        dmg *= atk.falloff;
        const next = nearestEnemy(state, fx, fy, atk.jumpRadius, st.canHitFlying, chainHits, count);
        if (!next) break;
        from = next;
      }
      break;
    }
    case 'burst': {
      // Capacitor: one discharge at every enemy in range.
      const rSq = st.range * st.range;
      const bornAfter = state.nextId;
      for (const e of state.enemies.items) {
        if (!e.alive || e.id >= bornAfter) continue;
        if ((e.x - t.x) ** 2 + (e.y - t.y) ** 2 > rSq) continue;
        emitFx(state, 'chain', t.x, t.y, e.x, e.y, FX_CHAIN_TICKS * 2);
        applyHit(state, path, e, st.power, st.damageType, t.kind, mods);
      }
      break;
    }
    case 'chill': {
      const wasFrozen = target.frozen > 0;
      applyChill(target, st.power, atk.freezeMult ?? 1);
      if (atk.freezeChance && rng.next() < atk.freezeChance)
        forceFreeze(target, atk.freezeMult ?? 1);
      if (!wasFrozen && target.frozen > 0)
        emitFx(
          state,
          'freeze',
          target.x,
          target.y,
          target.x,
          target.y,
          FX_FREEZE_TICKS,
          target.radius,
        );
      if (atk.brittleSeconds) target.brittle = BRITTLE_TICKS(atk.brittleSeconds);
      emitFx(state, 'chill', t.x, t.y, target.x, target.y, FX_CHILL_TICKS);
      break;
    }
    case 'aura':
      break;
    case 'missiles': {
      for (let i = 0; i < atk.count; i++) {
        const spread = atk.count > 1 ? (i / (atk.count - 1) - 0.5) * SALVO_SPREAD : 0;
        // Hunter-Killer crits are rolled at launch from the seeded sim RNG.
        const crit = atk.critChance !== undefined && rng.next() < atk.critChance;
        const p = newShot(state, t, 'missile', st.power * (crit ? (atk.critMult ?? 1) : 1));
        p.angle = aim + spread;
        p.target = target;
        p.targetId = target.id;
        p.speed = atk.speed;
        p.life = Math.round(atk.lifetimeSeconds * GAME.tickRate);
      }
      break;
    }
  }
}

/** Nearest enemy to the tower other than the primary target and earlier Prism picks. */
function nearestOther(state: SimState, t: Tower, primary: Enemy, picked: number): Enemy | null {
  const rSq = t.stats.range * t.stats.range;
  let best: Enemy | null = null;
  let bestSq = rSq;
  outer: for (const e of state.enemies.items) {
    if (!e.alive || e === primary || (e.flying && !t.stats.canHitFlying)) continue;
    for (let i = 0; i < picked; i++) if (prismTargets[i] === e) continue outer;
    const dSq = (e.x - t.x) ** 2 + (e.y - t.y) ** 2;
    if (dSq <= bestSq) {
      best = e;
      bestSq = dSq;
    }
  }
  return best;
}

export function distToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  const u = lenSq > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq)) : 0;
  return Math.hypot(px - (ax + dx * u), py - (ay + dy * u));
}
