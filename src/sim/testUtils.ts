import { ENEMIES } from '../data/enemies';
import { GAME } from '../data/game';
import { placementError, snapToGrid } from './placement';
import type { Sim } from './sim';
import type { Enemy } from './state';

/** Spawn a drone directly at `dist` along the path (test setup only). */
export function spawnAt(sim: Sim, dist: number, hp = 100): Enemy {
  const def = ENEMIES.drone;
  const e = sim.state.enemies.acquire();
  e.id = sim.state.nextId++;
  e.kind = def.kind;
  e.dist = dist;
  e.hp = hp;
  e.maxHp = hp;
  e.speed = def.speed;
  e.bounty = 5;
  e.radius = def.radius;
  e.flying = false;
  e.leakDamage = 1;
  sim.path.positionAt(dist, e);
  return e;
}

/** First valid snapped tower spot near the path point at `dist`. */
export function spotNear(sim: Sim, dist: number): { x: number; y: number } {
  const p = sim.path.positionAt(dist, { x: 0, y: 0 });
  for (let r = GAME.pathBuffer; r < 120; r += GAME.gridSize / 2) {
    for (let a = 0; a < 16; a++) {
      const ang = (a / 16) * Math.PI * 2;
      const x = snapToGrid(p.x + Math.cos(ang) * r);
      const y = snapToGrid(p.y + Math.sin(ang) * r);
      if (placementError(sim.state, sim.path, x, y) === null) return { x, y };
    }
  }
  throw new Error(`No valid spot near dist ${dist}`);
}

export function runTicks(sim: Sim, n: number): void {
  for (let i = 0; i < n; i++) sim.step();
}

/** Prevent auto waves from interfering with a focused test. */
export function freezeWaves(sim: Sim): void {
  sim.state.nextWaveIn = Number.MAX_SAFE_INTEGER;
}
