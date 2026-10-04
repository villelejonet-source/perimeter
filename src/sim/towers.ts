import { towerDamage } from '../data/curves';
import { GAME } from '../data/game';
import { TOWERS, type Attack, type TowerDef } from '../data/towers';
import { applyHit } from './damage';
import { applyChill } from './enemies';
import { emitFx } from './fx';
import type { Path } from './path';
import type { Enemy, SimState, Tower } from './state';
import { findTarget, nearestEnemy } from './targeting';

const FX_RAIL_TICKS = 10;
const FX_CHAIN_TICKS = 8;
const FX_CHILL_TICKS = 6;
/** Spread of a missile salvo around the aim direction, radians. */
const SALVO_SPREAD = 0.9;

/** Scratch buffers (no per-shot allocation). */
const chainHits = new Int32Array(16);
const railHits: (Enemy | undefined)[] = new Array<Enemy | undefined>(64);
const railDist = new Float64Array(64);

/** Per-hit effect for this tower at its level (damage, or chill for the Cryo Projector). */
export function towerPower(def: TowerDef, level: number): number {
  return def.attack.type === 'chill'
    ? towerDamage(def.attack.chillPerHit, level)
    : towerDamage(def.damage, level);
}

export function updateTowers(state: SimState, path: Path): void {
  for (const t of state.towers.items) {
    if (!t.alive) continue;
    if (t.cooldown > 0) t.cooldown--;
    const target = findTarget(state, t);
    t.targetId = target ? target.id : -1;
    if (!target || t.cooldown > 0) continue;
    const def = TOWERS[t.kind];
    fire(state, path, t, def, def.attack, target);
    t.cooldown = Math.max(1, Math.round(GAME.tickRate / def.fireRate));
  }
}

function fire(
  state: SimState,
  path: Path,
  t: Tower,
  def: TowerDef,
  attack: Attack,
  target: Enemy,
): void {
  const power = towerPower(def, t.level);
  switch (attack.type) {
    case 'bolt': {
      const p = state.projectiles.acquire();
      p.kind = 'bolt';
      p.x = t.x;
      p.y = t.y;
      p.angle = Math.atan2(target.y - t.y, target.x - t.x);
      p.target = target;
      p.targetId = target.id;
      p.damage = power;
      p.damageType = def.damageType;
      p.speed = attack.speed;
      p.source = t.kind;
      break;
    }
    case 'rail': {
      // Instant line to full range through the target; pierces up to maxHits ground enemies,
      // nearest to the tower first.
      const a = Math.atan2(target.y - t.y, target.x - t.x);
      const ex = t.x + Math.cos(a) * def.range;
      const ey = t.y + Math.sin(a) * def.range;
      const half = attack.width / 2;
      let hits = 0;
      for (const e of state.enemies.items) {
        if (!e.alive || e.flying) continue;
        if (distToSegment(e.x, e.y, t.x, t.y, ex, ey) <= half + e.radius) {
          railHits[hits] = e;
          railDist[hits] = (e.x - t.x) ** 2 + (e.y - t.y) ** 2;
          hits++;
          if (hits === railHits.length) break;
        }
      }
      // Partial selection sort: only the nearest maxHits matter.
      const n = Math.min(hits, attack.maxHits);
      for (let i = 0; i < n; i++) {
        let m = i;
        for (let j = i + 1; j < hits; j++) if (railDist[j]! < railDist[m]!) m = j;
        if (m !== i) {
          const te = railHits[i]!;
          railHits[i] = railHits[m]!;
          railHits[m] = te;
          const td = railDist[i]!;
          railDist[i] = railDist[m]!;
          railDist[m] = td;
        }
        applyHit(state, path, railHits[i]!, power, def.damageType, t.kind);
      }
      emitFx(state, 'rail', t.x, t.y, ex, ey, FX_RAIL_TICKS);
      break;
    }
    case 'shell': {
      const p = state.projectiles.acquire();
      p.kind = 'shell';
      p.x = t.x;
      p.y = t.y;
      p.tx = target.x;
      p.ty = target.y;
      p.angle = Math.atan2(target.y - t.y, target.x - t.x);
      p.target = null;
      p.targetId = -1;
      p.damage = power;
      p.damageType = def.damageType;
      p.speed = attack.speed;
      p.splashRadius = attack.splashRadius;
      p.source = t.kind;
      break;
    }
    case 'chain': {
      let from: Enemy = target;
      let fx = t.x;
      let fy = t.y;
      let dmg = power;
      let count = 0;
      for (let jump = 0; jump <= attack.jumps; jump++) {
        chainHits[count++] = from.id;
        emitFx(state, 'chain', fx, fy, from.x, from.y, FX_CHAIN_TICKS);
        fx = from.x;
        fy = from.y;
        applyHit(state, path, from, dmg, def.damageType, t.kind);
        dmg *= attack.falloff;
        const next = nearestEnemy(
          state,
          fx,
          fy,
          attack.jumpRadius,
          def.canHitFlying,
          chainHits,
          count,
        );
        if (!next) break;
        from = next;
      }
      break;
    }
    case 'chill': {
      applyChill(target, power);
      emitFx(state, 'chill', t.x, t.y, target.x, target.y, FX_CHILL_TICKS);
      break;
    }
    case 'missiles': {
      const aim = Math.atan2(target.y - t.y, target.x - t.x);
      for (let i = 0; i < attack.count; i++) {
        const spread = attack.count > 1 ? (i / (attack.count - 1) - 0.5) * SALVO_SPREAD : 0;
        const p = state.projectiles.acquire();
        p.kind = 'missile';
        p.x = t.x;
        p.y = t.y;
        p.angle = aim + spread;
        p.target = target;
        p.targetId = target.id;
        p.damage = power;
        p.damageType = def.damageType;
        p.speed = attack.speed;
        p.life = Math.round(attack.lifetimeSeconds * GAME.tickRate);
        p.source = t.kind;
      }
      break;
    }
  }
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
