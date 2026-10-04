import { describe, expect, it } from 'vitest';
import { CHILL, DAMAGE } from '../data/damage';
import { GAME } from '../data/game';
import { applyHit } from './damage';
import { applyChill } from './enemies';
import { hold, labSim, runTicks, spawnAt } from './testUtils';

describe('damage model (GDD §6)', () => {
  it('energy does ×1.5 and kinetic ×0.5 against shields', () => {
    const sim = labSim();
    const a = spawnAt(sim, 100, 0, 'warden');
    const b = spawnAt(sim, 120, 0, 'warden');
    const s0 = a.shield;
    applyHit(sim.state, sim.path, a, 10, 'energy', 'pulseLaser');
    applyHit(sim.state, sim.path, b, 10, 'kinetic', 'railgun');
    expect(s0 - a.shield).toBeCloseTo(15);
    expect(s0 - b.shield).toBeCloseTo(5);
    expect(a.hp).toBe(a.maxHp);
  });

  it('damage beyond the shield carries into the hull at the unmultiplied rate', () => {
    const sim = labSim();
    const e = spawnAt(sim, 100, 0, 'warden');
    e.shield = 6; // absorbs 4 raw energy (×1.5)
    applyHit(sim.state, sim.path, e, 10, 'energy', 'pulseLaser');
    expect(e.shield).toBe(0);
    expect(e.maxHp - e.hp).toBeCloseTo(6);
  });

  it('armor is a flat reduction per hit with a 10% floor', () => {
    const sim = labSim();
    const e = spawnAt(sim, 100, 0, 'bulwark');
    e.armor = 4;
    applyHit(sim.state, sim.path, e, 10, 'energy', 'pulseLaser');
    expect(e.maxHp - e.hp).toBeCloseTo(6);
    e.armor = 1000;
    const before = e.hp;
    applyHit(sim.state, sim.path, e, 10, 'kinetic', 'railgun');
    expect(before - e.hp).toBeCloseTo(10 * DAMAGE.armorFloor);
  });

  it('armor punishes small hits more than big ones', () => {
    const sim = labSim();
    const e = spawnAt(sim, 100, 0, 'bulwark');
    e.armor = 5;
    e.hp = e.maxHp = 1e6;
    for (let i = 0; i < 10; i++) applyHit(sim.state, sim.path, e, 6, 'energy', 'pulseLaser');
    const fromSmall = 1e6 - e.hp;
    e.hp = 1e6;
    applyHit(sim.state, sim.path, e, 60, 'kinetic', 'railgun');
    const fromBig = 1e6 - e.hp;
    expect(fromBig).toBeGreaterThan(fromSmall * 5);
  });

  it('frozen enemies take +50% kinetic, not energy', () => {
    const sim = labSim();
    const e = spawnAt(sim, 100, 0, 'drone');
    e.hp = e.maxHp = 1000;
    e.frozen = 30;
    applyHit(sim.state, sim.path, e, 10, 'kinetic', 'railgun');
    expect(1000 - e.hp).toBeCloseTo(10 * DAMAGE.frozenKineticBonus);
    applyHit(sim.state, sim.path, e, 10, 'energy', 'pulseLaser');
    expect(1000 - e.hp).toBeCloseTo(15 + 10);
  });

  it('shields regenerate only after 3 s without taking damage', () => {
    const sim = labSim();
    const e = spawnAt(sim, 50, 0, 'warden');
    hold(e);
    applyHit(sim.state, sim.path, e, 10, 'energy', 'pulseLaser');
    const dented = e.shield;
    runTicks(sim, DAMAGE.shieldRegenDelaySeconds * GAME.tickRate - 1);
    expect(e.shield).toBe(dented);
    runTicks(sim, 30);
    expect(e.shield).toBeGreaterThan(dented);
    runTicks(sim, 60 * 20);
    expect(e.shield).toBeCloseTo(e.maxShield);
  });

  it('utility deals no damage', () => {
    const sim = labSim();
    const e = spawnAt(sim, 100, 50, 'drone');
    expect(applyHit(sim.state, sim.path, e, 100, 'utility', 'cryoProjector')).toBe(0);
    expect(e.hp).toBe(50);
  });

  it('chill slows proportionally, freezes at full, then grants immunity', () => {
    const sim = labSim();
    const e = spawnAt(sim, 50, 0, 'drone');
    applyChill(e, 0.5);
    sim.step();
    expect(e.speed).toBeLessThan(e.baseSpeed);
    expect(e.speed).toBeCloseTo(e.baseSpeed * (1 - e.chill * CHILL.maxSlow), 5);
    applyChill(e, 0.6);
    expect(e.frozen).toBeGreaterThan(0);
    sim.step();
    expect(e.speed).toBe(0);
    runTicks(sim, CHILL.freezeSeconds * GAME.tickRate);
    expect(e.frozen).toBe(0);
    expect(e.freezeImmune).toBeGreaterThan(0);
    applyChill(e, 1);
    expect(e.frozen).toBe(0); // immune: can't re-freeze yet
  });

  it('bosses are slowed but never frozen', () => {
    const sim = labSim();
    const boss = spawnAt(sim, 50, 0, 'juggernaut');
    for (let i = 0; i < 20; i++) applyChill(boss, 0.5);
    expect(boss.frozen).toBe(0);
    expect(boss.chill).toBe(CHILL.bossMaxChill);
  });
});
