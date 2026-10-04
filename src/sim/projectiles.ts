import { GAME } from '../data/game';
import { applyHit } from './damage';
import { emitFx } from './fx';
import type { Path } from './path';
import type { Projectile, SimState } from './state';
import { nearestEnemy } from './targeting';

const dt = 1 / GAME.tickRate;
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
    applyHit(state, path, t, p.damage, p.damageType, p.source);
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
      applyHit(state, path, t, p.damage, p.damageType, p.source);
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

/** Lobbed shell to a fixed point; splash damage to ground enemies on landing. */
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
  // Enemies spawned mid-loop (Splitter children) weren't there when the shell landed.
  const bornAfter = state.nextId;
  for (const e of state.enemies.items) {
    if (!e.alive || e.flying || e.id >= bornAfter) continue;
    const r = p.splashRadius + e.radius;
    if ((e.x - p.tx) ** 2 + (e.y - p.ty) ** 2 <= r * r) {
      applyHit(state, path, e, p.damage, p.damageType, p.source);
    }
  }
  emitFx(state, 'blast', p.tx, p.ty, p.tx, p.ty, FX_BLAST_TICKS, p.splashRadius);
}
