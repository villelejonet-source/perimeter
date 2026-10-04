import { GAME } from '../data/game';
import { SPEC_TUNING, type SpecId } from '../data/specs';
import { TOWERS } from '../data/towers';
import { applyHit } from './damage';
import { emitFx } from './fx';
import type { Path } from './path';
import type { Projectile, SimState } from './state';
import { hitMods } from './specs';
import { nearestEnemy } from './targeting';

const dt = 1 / GAME.tickRate;
const SPEC_POOL = SPEC_TUNING.plasmaPools;
const SPEC_CLUSTER = SPEC_TUNING.cluster;
const FX_BLAST_TICKS = 18;
/** Missile turn rate, radians per second. */
const MISSILE_TURN = 7;
/** How far a missile looks for a new target when its own dies. */
const MISSILE_RETARGET_RADIUS = 160;

function validTarget(p: Projectile): boolean {
  return p.target !== null && p.target.alive && p.target.id === p.targetId;
}

export function updateProjectiles(state: SimState, path: Path): void {
  for (const p of state.projectiles.items) {
    if (!p.alive) continue;
    switch (p.kind) {
      case 'bolt':
        updateBolt(state, path, p);
        break;
      case 'missile':
        updateMissile(state, path, p);
        break;
      case 'shell':
        updateShell(state, path, p);
        break;
      case 'slug':
        updateSlug(state, path, p);
        break;
    }
  }
}

/** Homing bolt; fizzles if the target dies first. */
function updateBolt(state: SimState, path: Path, p: Projectile): void {
  if (!validTarget(p)) {
    p.alive = false;
    p.target = null;
    return;
  }
  const t = p.target!;
  const dx = t.x - p.x;
  const dy = t.y - p.y;
  const dist = Math.hypot(dx, dy);
  const step = p.speed * dt;
  if (dist <= step + t.radius) {
    p.alive = false;
    p.target = null;
    applyHit(state, path, t, p.damage, p.damageType, p.source, hitMods(p.spec, p.spec2));
    return;
  }
  p.angle = Math.atan2(dy, dx);
  p.x += (dx / dist) * step;
  p.y += (dy / dist) * step;
}

/** Steering missile; retargets the nearest enemy if its own dies, expires after its lifetime. */
function updateMissile(state: SimState, path: Path, p: Projectile): void {
  if (--p.life <= 0) {
    p.alive = false;
    p.target = null;
    return;
  }
  if (!validTarget(p)) {
    const next = nearestEnemy(state, p.x, p.y, MISSILE_RETARGET_RADIUS, true);
    p.target = next;
    p.targetId = next ? next.id : -1;
  }
  const step = p.speed * dt;
  const t = p.target;
  if (t) {
    const dx = t.x - p.x;
    const dy = t.y - p.y;
    if (Math.hypot(dx, dy) <= step + t.radius) {
      p.alive = false;
      p.target = null;
      applyHit(state, path, t, p.damage, p.damageType, p.source, hitMods(p.spec, p.spec2));
      return;
    }
    let turn = Math.atan2(dy, dx) - p.angle;
    turn = Math.atan2(Math.sin(turn), Math.cos(turn));
    const max = MISSILE_TURN * dt;
    p.angle += Math.max(-max, Math.min(max, turn));
  }
  p.x += Math.cos(p.angle) * step;
  p.y += Math.sin(p.angle) * step;
}

/** Splash damage to every ground enemy within `radius` of (x, y). */
function splash(
  state: SimState,
  path: Path,
  p: Projectile,
  x: number,
  y: number,
  radius: number,
  damage: number,
): void {
  // Enemies spawned mid-loop (Splitter children) weren't there when the shell landed.
  const bornAfter = state.nextId;
  for (const e of state.enemies.items) {
    if (!e.alive || e.flying || e.id >= bornAfter) continue;
    const r = radius + e.radius;
    if ((e.x - x) ** 2 + (e.y - y) ** 2 <= r * r) {
      applyHit(state, path, e, damage, p.damageType, p.source, hitMods(p.spec, p.spec2));
    }
  }
  emitFx(state, 'blast', x, y, x, y, FX_BLAST_TICKS, radius);
}

/**
 * Lobbed shell to a fixed point; splash damage to ground enemies on landing. Plasma Pools
 * leave burning ground; Cluster scatters bomblets around the impact.
 */
function updateShell(state: SimState, path: Path, p: Projectile): void {
  const dx = p.tx - p.x;
  const dy = p.ty - p.y;
  const dist = Math.hypot(dx, dy);
  const step = p.speed * dt;
  if (dist > step) {
    p.x += (dx / dist) * step;
    p.y += (dy / dist) * step;
    return;
  }
  p.alive = false;
  splash(state, path, p, p.tx, p.ty, p.splashRadius, p.damage);

  const atk = TOWERS[p.source].attack;
  if (hasSpec(p, 'plasmaPools') && atk.type === 'shell') {
    const pool = SPEC_POOL;
    const z = state.zones.acquire();
    z.x = p.tx;
    z.y = p.ty;
    z.radius = pool.radius;
    z.damagePerTick = (p.damage * pool.dpsShare) / GAME.tickRate;
    z.ttl = Math.round(pool.seconds * GAME.tickRate);
    z.maxTtl = z.ttl;
    z.source = p.source;
  }
  if (hasSpec(p, 'cluster')) {
    const c = SPEC_CLUSTER;
    const radius = c.radius * (1 + state.art.widePayload);
    for (let i = 0; i < c.count; i++) {
      const a = (i / c.count) * Math.PI * 2;
      splash(
        state,
        path,
        p,
        p.tx + Math.cos(a) * c.ringRadius,
        p.ty + Math.sin(a) * c.ringRadius,
        radius,
        p.damage * c.damageShare,
      );
    }
  }
}

function hasSpec(p: Projectile, id: SpecId): boolean {
  return p.spec === id || p.spec2 === id;
}

/** Flechette slug: flies straight, damaging each enemy it passes through once. */
function updateSlug(state: SimState, path: Path, p: Projectile): void {
  const step = p.speed * dt;
  p.x += Math.cos(p.angle) * step;
  p.y += Math.sin(p.angle) * step;
  p.life -= step;
  const bornAfter = state.nextId;
  outer: for (const e of state.enemies.items) {
    if (!e.alive || e.id >= bornAfter) continue;
    const r = e.radius + 3;
    if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 > r * r) continue;
    for (let i = 0; i < p.hitCount; i++) if (p.hits[i] === e.id) continue outer;
    if (p.hitCount < p.hits.length) p.hits[p.hitCount++] = e.id;
    applyHit(state, path, e, p.damage, p.damageType, p.source, hitMods(p.spec, p.spec2));
    if (--p.pierceLeft <= 0) {
      p.alive = false;
      return;
    }
  }
  if (p.life <= 0) p.alive = false;
}

/** Plasma Pools: burning ground damages ground enemies standing in it. */
export function updateZones(state: SimState, path: Path): void {
  for (const z of state.zones.items) {
    if (!z.alive) continue;
    const bornAfter = state.nextId;
    for (const e of state.enemies.items) {
      if (!e.alive || e.flying || e.id >= bornAfter) continue;
      const r = z.radius + e.radius;
      if ((e.x - z.x) ** 2 + (e.y - z.y) ** 2 <= r * r) {
        applyHit(state, path, e, z.damagePerTick, TOWERS[z.source].damageType, z.source);
      }
    }
    if (--z.ttl <= 0) z.alive = false;
  }
}
