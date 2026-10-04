import { describe, expect, it } from 'vitest';
import { enemyHp } from '../data/curves';
import { ELITE, ENEMIES } from '../data/enemies';
import { GAME } from '../data/game';
import { applyHit } from './damage';
import { findTarget } from './targeting';
import { besidePath, hold, labSim, runTicks, spawnAt, towerAt } from './testUtils';

const T = GAME.tickRate;

describe('enemy roster (GDD §8)', () => {
  it('Skitter is fast and fragile', () => {
    expect(ENEMIES.skitter.speed).toBeGreaterThan(ENEMIES.drone.speed * 1.5);
    expect(ENEMIES.skitter.baseHp).toBeLessThan(ENEMIES.drone.baseHp);
  });

  it('Bulwark carries armor that grows with the wave', () => {
    const sim = labSim();
    const early = spawnAt(sim, 50, 0, 'bulwark', { wave: 6 });
    const late = spawnAt(sim, 60, 0, 'bulwark', { wave: 30 });
    expect(early.armor).toBeGreaterThan(0);
    expect(late.armor).toBeGreaterThan(early.armor);
    // Roughly linear: much slower than the exponential HP curve.
    expect(late.armor / early.armor).toBeLessThan(late.maxHp / early.maxHp);
  });

  it('Warden has a shield that absorbs damage first', () => {
    const sim = labSim();
    const w = spawnAt(sim, 50, 0, 'warden');
    expect(w.maxShield).toBeGreaterThan(0);
    applyHit(sim.state, sim.path, w, 5, 'kinetic', 'railgun');
    expect(w.hp).toBe(w.maxHp);
    expect(w.shield).toBeLessThan(w.maxShield);
  });

  it('Wraith flies: Railgun and Mortar ignore it, Pulse Laser does not', () => {
    const sim = labSim();
    const p = besidePath(sim, 300, 40);
    const rail = towerAt(sim, 'railgun', p.x, p.y);
    const mortar = towerAt(sim, 'plasmaMortar', p.x + 1, p.y);
    const pulse = towerAt(sim, 'pulseLaser', p.x + 2, p.y);
    const w = spawnAt(sim, 300, 0, 'wraith');
    expect(findTarget(sim.state, rail)).toBeNull();
    expect(findTarget(sim.state, mortar)).toBeNull();
    expect(findTarget(sim.state, pulse)).toBe(w);
  });

  it('Splitter splits into 3 Skitters of its wave on death', () => {
    const sim = labSim();
    const s = spawnAt(sim, 200, 0, 'splitter', { wave: 18 });
    applyHit(sim.state, sim.path, s, 1e9, 'kinetic', 'railgun');
    const kids = sim.state.enemies.items.filter((e) => e.alive && e.kind === 'skitter');
    expect(kids.length).toBe(3);
    for (const k of kids) {
      expect(k.wave).toBe(18);
      expect(Math.abs(k.dist - 200)).toBeLessThan(10);
    }
  });

  it('Medic heals nearby enemies, not itself, and not far ones', () => {
    const sim = labSim();
    const medic = spawnAt(sim, 200, 0, 'medic');
    const near = spawnAt(sim, 210, 100);
    const far = spawnAt(sim, 400, 100);
    hold(medic, near, far);
    near.hp = far.hp = 50;
    medic.hp = medic.maxHp / 2;
    runTicks(sim, T);
    expect(near.hp).toBeGreaterThan(50);
    expect(far.hp).toBe(50);
    expect(medic.hp).toBe(medic.maxHp / 2);
  });
});

describe('elites (every 5th wave)', () => {
  it('are tougher, pay more and cost 3 base HP on a leak', () => {
    const sim = labSim();
    const n = spawnAt(sim, 50, 0, 'drone', { wave: 5 });
    const e = spawnAt(sim, 60, 0, 'drone', { wave: 5, elite: true });
    expect(e.maxHp).toBeCloseTo(enemyHp(ENEMIES.drone.baseHp, 5) * ELITE.hpMult);
    expect(e.bounty).toBeGreaterThan(n.bounty);
    e.dist = sim.path.length - 0.1;
    sim.step();
    expect(sim.state.baseHp).toBe(GAME.baseHp - ELITE.leakDamage);
  });
});

describe('bosses', () => {
  it('a boss leak costs the remaining base HP minus 1', () => {
    const sim = labSim();
    const b = spawnAt(sim, sim.path.length - 0.1, 0, 'juggernaut', { wave: 10 });
    expect(b.boss).toBe(true);
    sim.step();
    expect(sim.state.baseHp).toBe(1);
    expect(sim.state.gameOver).toBe(false);
  });

  it('Juggernaut has massive armor on a huge hull', () => {
    const sim = labSim();
    const j = spawnAt(sim, 50, 0, 'juggernaut', { wave: 10 });
    const b = spawnAt(sim, 60, 0, 'bulwark', { wave: 10 });
    expect(j.armor).toBeGreaterThan(b.armor * 1.5);
    expect(j.maxHp).toBeGreaterThan(b.maxHp * 5);
  });

  it('Aegis regenerates its shield and spawns Drones', () => {
    const sim = labSim();
    const a = spawnAt(sim, 300, 0, 'aegis', { wave: 20 });
    hold(a);
    expect(a.maxShield).toBeGreaterThan(0);
    runTicks(sim, (ENEMIES.aegis.spawns!.everySeconds + 0.1) * T);
    expect(
      sim.state.enemies.items.some((e) => e.alive && e.kind === 'drone' && e.wave === 20),
    ).toBe(true);
  });

  it('Hive Carrier flies and releases Wraiths', () => {
    const sim = labSim();
    const h = spawnAt(sim, 300, 0, 'hiveCarrier', { wave: 30 });
    hold(h);
    expect(h.flying).toBe(true);
    runTicks(sim, (ENEMIES.hiveCarrier.spawns!.everySeconds + 0.1) * T);
    expect(sim.state.enemies.items.some((e) => e.alive && e.kind === 'wraith')).toBe(true);
  });
});
