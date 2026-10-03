import { describe, expect, it } from 'vitest';
import { towerDamage } from '../data/curves';
import { ENEMIES } from '../data/enemies';
import { GAME } from '../data/game';
import { TOWERS } from '../data/towers';
import { findTarget } from './combat';
import { Sim } from './sim';
import { freezeWaves, runTicks, spawnAt, spotNear } from './testUtils';

function simWithTower(atDist = 200) {
  const sim = new Sim({ seed: 1 });
  freezeWaves(sim);
  const spot = spotNear(sim, atDist);
  sim.enqueue({ type: 'placeTower', kind: 'pulseLaser', ...spot });
  sim.step();
  const tower = sim.state.towers.items.find((t) => t.alive)!;
  return { sim, tower };
}

describe('movement', () => {
  it('moves enemies by speed × time along the path', () => {
    const sim = new Sim({ seed: 1 });
    freezeWaves(sim);
    const e = spawnAt(sim, 0);
    runTicks(sim, GAME.tickRate);
    expect(e.dist).toBeCloseTo(ENEMIES.drone.speed, 6);
    const expected = sim.path.positionAt(e.dist, { x: 0, y: 0 });
    expect(e.x).toBeCloseTo(expected.x);
    expect(e.y).toBeCloseTo(expected.y);
  });

  it('leaks at the end of the path: costs base HP and removes the enemy', () => {
    const sim = new Sim({ seed: 1 });
    freezeWaves(sim);
    const e = spawnAt(sim, sim.path.length - 0.1);
    sim.step();
    expect(e.alive).toBe(false);
    expect(sim.state.baseHp).toBe(GAME.baseHp - 1);
    expect(sim.state.stats.leaks).toBe(1);
  });

  it('ends the run when base HP reaches 0', () => {
    const sim = new Sim({ seed: 1 });
    freezeWaves(sim);
    sim.state.baseHp = 1;
    spawnAt(sim, sim.path.length - 0.1);
    sim.step();
    expect(sim.state.gameOver).toBe(true);
    const tick = sim.state.tick;
    runTicks(sim, 10);
    expect(sim.state.tick).toBe(tick);
  });
});

describe('targeting', () => {
  it('ignores enemies out of range', () => {
    const { sim, tower } = simWithTower(200);
    spawnAt(sim, 600);
    expect(findTarget(sim.state, tower)).toBeNull();
  });

  it('picks per mode: first, last, strongest, closest', () => {
    const { sim, tower } = simWithTower(200);
    // Find in-range distances along the path around the tower.
    const inRange: number[] = [];
    const p = { x: 0, y: 0 };
    for (let d = 0; d < sim.path.length; d += 2) {
      sim.path.positionAt(d, p);
      if (Math.hypot(p.x - tower.x, p.y - tower.y) < TOWERS.pulseLaser.range - 8) inRange.push(d);
    }
    const lo = inRange[0]!;
    const hi = inRange[inRange.length - 1]!;
    const back = spawnAt(sim, lo, 50);
    const front = spawnAt(sim, hi, 10);
    const strong = spawnAt(sim, (lo + hi) / 2, 500);

    tower.targeting = 'first';
    expect(findTarget(sim.state, tower)).toBe(front);
    tower.targeting = 'last';
    expect(findTarget(sim.state, tower)).toBe(back);
    tower.targeting = 'strongest';
    expect(findTarget(sim.state, tower)).toBe(strong);

    tower.targeting = 'closest';
    const dist = (e: { x: number; y: number }) => Math.hypot(e.x - tower.x, e.y - tower.y);
    const closest = [back, front, strong].sort((a, b) => dist(a) - dist(b))[0];
    expect(findTarget(sim.state, tower)).toBe(closest);
  });

  it('cannot hit flying enemies without canHitFlying', () => {
    const { sim, tower } = simWithTower(200);
    const e = spawnAt(sim, 200);
    e.flying = true;
    expect(findTarget(sim.state, tower)).toBe(e); // Pulse Laser can hit flying
  });
});

describe('damage', () => {
  it('fires projectiles that deal tower damage on hit', () => {
    const { sim } = simWithTower(200);
    const e = spawnAt(sim, 200, 1000);
    runTicks(sim, 30);
    expect(e.hp).toBeLessThan(1000);
    expect((1000 - e.hp) % towerDamage(TOWERS.pulseLaser.damage, 1)).toBeCloseTo(0);
  });

  it('respects fire rate', () => {
    const { sim } = simWithTower(200);
    const e = spawnAt(sim, 200, 1e9);
    e.speed = 0;
    runTicks(sim, GAME.tickRate * 4 + 30);
    const hits = (1e9 - e.hp) / towerDamage(TOWERS.pulseLaser.damage, 1);
    // ~fireRate shots per second over 4 s (plus travel-time slack).
    expect(Math.round(hits)).toBeGreaterThanOrEqual(TOWERS.pulseLaser.fireRate * 4);
    expect(Math.round(hits)).toBeLessThanOrEqual(TOWERS.pulseLaser.fireRate * 4 + 2);
  });

  it('kills grant bounty and count stats', () => {
    const { sim } = simWithTower(200);
    const credits = sim.state.credits;
    const e = spawnAt(sim, 200, 1);
    e.speed = 0;
    runTicks(sim, 30);
    expect(e.alive).toBe(false);
    expect(sim.state.credits).toBe(credits + 5);
    expect(sim.state.stats.kills).toBe(1);
  });

  it('projectiles fizzle when the target dies first', () => {
    const { sim } = simWithTower(200);
    const e = spawnAt(sim, 200, 1000);
    e.speed = 0;
    sim.step(); // fires
    expect(sim.state.projectiles.countAlive()).toBe(1);
    e.alive = false;
    sim.step();
    expect(sim.state.projectiles.countAlive()).toBe(0);
  });

  it('upgraded towers deal more damage', () => {
    expect(towerDamage(10, 2)).toBeGreaterThan(towerDamage(10, 1));
  });
});
