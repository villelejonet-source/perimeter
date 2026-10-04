import type { EnemyKind } from '../data/enemies';
import { spawnEnemy } from './enemies';
import { GAME } from '../data/game';
import { placementError, snapToGrid } from './placement';
import { TOWER_ORDER, type TowerKind } from '../data/towers';
import { Sim } from './sim';
import type { Enemy, Tower } from './state';

/**
 * Spawn an enemy directly at `dist` along the path (test setup only). `hp` overrides hull HP;
 * by default a drone with a fixed 5-Credit bounty, like the original Phase 1 fixture.
 */
export function spawnAt(
  sim: Sim,
  dist: number,
  hp = 100,
  kind: EnemyKind = 'drone',
  opts: { wave?: number; elite?: boolean } = {},
): Enemy {
  const e = spawnEnemy(sim.state, sim.path, kind, opts.wave ?? 1, opts.elite ?? false, dist);
  if (hp > 0 && kind === 'drone') {
    e.bounty = 5;
    e.hp = hp;
    e.maxHp = hp;
  }
  return e;
}

/** First valid snapped tower spot near the path point at `dist`. */
export function spotNear(sim: Sim, dist: number): { x: number; y: number } {
  const p = sim.path.positionAt(dist, { x: 0, y: 0 });
  const minR = sim.map.pathWidth / 2 + sim.map.buildBuffer;
  for (let r = minR; r < minR + 120; r += GAME.gridSize / 2) {
    for (let a = 0; a < 16; a++) {
      const ang = (a / 16) * Math.PI * 2;
      const x = snapToGrid(p.x + Math.cos(ang) * r);
      const y = snapToGrid(p.y + Math.sin(ang) * r);
      if (placementError(sim.state, sim.path, sim.map, x, y) === null) return { x, y };
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

/** A sim with every tower unlocked and auto-waves frozen. */
export function labSim(seed = 1): Sim {
  const sim = new Sim({ seed, unlockedTowers: TOWER_ORDER });
  freezeWaves(sim);
  sim.state.credits = 1e6;
  return sim;
}

/**
 * Puts a tower straight into state at (x, y), bypassing placement rules, so tests can put it
 * exactly where a mechanic needs it.
 */
export function towerAt(sim: Sim, kind: TowerKind, x: number, y: number, level = 1): Tower {
  const t = sim.state.towers.acquire();
  t.id = sim.state.nextId++;
  t.kind = kind;
  t.x = x;
  t.y = y;
  t.level = level;
  t.cooldown = 0;
  t.targeting = 'first';
  t.invested = 0;
  t.targetId = -1;
  return t;
}

/** Path position at `dist` plus an offset perpendicular to the path. */
export function besidePath(sim: Sim, dist: number, offset: number): { x: number; y: number } {
  const a = sim.path.positionAt(dist, { x: 0, y: 0 });
  const b = sim.path.positionAt(dist + 1, { x: 0, y: 0 });
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return { x: a.x - ((b.y - a.y) / len) * offset, y: a.y + ((b.x - a.x) / len) * offset };
}

/** Freeze an enemy in place (tests that need a stationary target). */
export function hold(...enemies: Enemy[]): void {
  for (const e of enemies) e.baseSpeed = 0;
}
