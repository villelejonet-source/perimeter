import { describe, expect, it } from 'vitest';
import { towerDamage } from '../data/curves';
import { TOWERS } from '../data/towers';
import { findTarget } from './targeting';
import { besidePath, hold, labSim, runTicks, spawnAt, towerAt } from './testUtils';

describe('Railgun', () => {
  it('pierces the nearest maxHits ground enemies on its line, ignoring flyers', () => {
    const sim = labSim();
    // Three drones along a nearly straight stretch, tower in line behind them.
    const d = 40;
    const a = sim.path.positionAt(d, { x: 0, y: 0 });
    const b = sim.path.positionAt(d + 30, { x: 0, y: 0 });
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const ux = (b.x - a.x) / len;
    const uy = (b.y - a.y) / len;
    const t = towerAt(sim, 'railgun', a.x - ux * 30, a.y - uy * 30);
    t.targeting = 'last';
    const enemies = [0, 12, 24].map((o) => spawnAt(sim, d + o, 1000));
    const flyer = spawnAt(sim, d + 6, 1000);
    flyer.flying = true;
    hold(...enemies, flyer);
    sim.step();
    const atk = TOWERS.railgun.attack;
    if (atk.type !== 'rail') throw new Error('railgun is a rail tower');
    // Enemies are ordered nearest-first from the tower.
    enemies.forEach((e, i) => {
      if (i < atk.maxHits) expect(e.hp).toBeLessThan(1000);
      else expect(e.hp).toBe(1000);
    });
    expect(flyer.hp).toBe(1000);
    expect(sim.state.fx.items.some((f) => f.alive && f.kind === 'rail')).toBe(true);
  });

  it('cannot target flying enemies', () => {
    const sim = labSim();
    const p = besidePath(sim, 300, 40);
    const t = towerAt(sim, 'railgun', p.x, p.y);
    const flyer = spawnAt(sim, 300, 100, 'wraith');
    expect(findTarget(sim.state, t)).toBeNull();
    expect(flyer.flying).toBe(true);
  });
});

describe('Plasma Mortar', () => {
  it('splashes every ground enemy near the landing point', () => {
    const sim = labSim();
    const p = besidePath(sim, 300, 60);
    towerAt(sim, 'plasmaMortar', p.x, p.y);
    const group = [296, 300, 304].map((d) => spawnAt(sim, d, 1000));
    const far = spawnAt(sim, 240, 1000); // behind the group, so "first" aims at the group
    hold(...group, far);
    runTicks(sim, 60);
    const dmg = towerDamage(TOWERS.plasmaMortar.damage, 1);
    for (const e of group) expect(1000 - e.hp).toBeCloseTo(dmg);
    expect(far.hp).toBe(1000);
  });

  it('cannot target flying enemies', () => {
    const sim = labSim();
    const p = besidePath(sim, 300, 40);
    const t = towerAt(sim, 'plasmaMortar', p.x, p.y);
    spawnAt(sim, 300, 100, 'wraith');
    expect(findTarget(sim.state, t)).toBeNull();
  });
});

describe('Arc Coil', () => {
  it('chains to nearby enemies with falloff', () => {
    const sim = labSim();
    const p = besidePath(sim, 300, 40);
    towerAt(sim, 'arcCoil', p.x, p.y);
    const es = [300, 316, 332, 348].map((d) => spawnAt(sim, d, 1000));
    hold(...es);
    sim.step();
    const atk = TOWERS.arcCoil.attack;
    if (atk.type !== 'chain') throw new Error('arc coil is a chain tower');
    const hits = es
      .map((e) => 1000 - e.hp)
      .filter((d) => d > 0)
      .sort((a, b) => b - a);
    expect(hits.length).toBe(atk.jumps + 1);
    expect(hits[0]).toBeCloseTo(TOWERS.arcCoil.damage);
    expect(hits[1]).toBeCloseTo(TOWERS.arcCoil.damage * atk.falloff);
    expect(sim.state.fx.items.filter((f) => f.alive && f.kind === 'chain').length).toBe(
      atk.jumps + 1,
    );
  });

  it('can hit flying enemies', () => {
    const sim = labSim();
    const p = besidePath(sim, 300, 40);
    towerAt(sim, 'arcCoil', p.x, p.y);
    const w = spawnAt(sim, 300, 0, 'wraith');
    hold(w);
    const hp = w.hp;
    sim.step();
    expect(w.hp).toBeLessThan(hp);
  });
});

describe('Cryo Projector', () => {
  it('chills without damage, slows, and eventually freezes', () => {
    const sim = labSim();
    const p = besidePath(sim, 300, 40);
    towerAt(sim, 'cryoProjector', p.x, p.y);
    const e = spawnAt(sim, 300, 1000);
    hold(e);
    sim.step();
    expect(e.chill).toBeGreaterThan(0);
    expect(e.hp).toBe(1000);
    let froze = false;
    for (let i = 0; i < 60 * 5 && !froze; i++) {
      sim.step();
      froze = e.frozen > 0;
    }
    expect(froze).toBe(true);
  });

  it('upgrades add chill per hit', () => {
    const sim = labSim();
    const p = besidePath(sim, 300, 40);
    const t = towerAt(sim, 'cryoProjector', p.x, p.y, 3);
    const e = spawnAt(sim, 300, 1000);
    hold(e);
    sim.step();
    const atk = TOWERS.cryoProjector.attack;
    if (atk.type !== 'chill') throw new Error('cryo is a chill tower');
    expect(e.chill).toBeCloseTo(towerDamage(atk.chillPerHit, t.level), 2);
  });
});

describe('Swarm Launcher', () => {
  it('fires a homing salvo that prefers flying targets', () => {
    const sim = labSim();
    const p = besidePath(sim, 300, 40);
    const t = towerAt(sim, 'swarmLauncher', p.x, p.y);
    const ground = spawnAt(sim, 310, 1000);
    const flyer = spawnAt(sim, 290, 0, 'wraith');
    flyer.hp = flyer.maxHp = 1000;
    hold(ground, flyer);
    expect(findTarget(sim.state, t)).toBe(flyer);
    sim.step();
    const atk = TOWERS.swarmLauncher.attack;
    if (atk.type !== 'missiles') throw new Error('swarm fires missiles');
    expect(sim.state.projectiles.items.filter((m) => m.alive && m.kind === 'missile').length).toBe(
      atk.count,
    );
    runTicks(sim, 60);
    expect(1000 - flyer.hp).toBeCloseTo(TOWERS.swarmLauncher.damage * atk.count);
  });

  it('missiles retarget when their target dies', () => {
    const sim = labSim();
    const p = besidePath(sim, 300, 40);
    towerAt(sim, 'swarmLauncher', p.x, p.y);
    const first = spawnAt(sim, 300, 1000);
    const second = spawnAt(sim, 330, 1000);
    hold(first, second);
    sim.step();
    first.alive = false;
    runTicks(sim, 90);
    expect(second.hp).toBeLessThan(1000);
  });
});

describe('Pulse Laser', () => {
  it('is an energy tower that can hit flying enemies', () => {
    const sim = labSim();
    const p = besidePath(sim, 300, 40);
    towerAt(sim, 'pulseLaser', p.x, p.y);
    const w = spawnAt(sim, 300, 0, 'wraith');
    hold(w);
    const hp = w.hp;
    runTicks(sim, 30);
    expect(w.hp).toBeLessThan(hp);
    expect(sim.state.stats.damageByType.energy).toBeGreaterThan(0);
  });
});

describe('unlocks', () => {
  it('only the starting three towers can be built by default', () => {
    const sim = new (labSim().constructor as typeof import('./sim').Sim)({ seed: 1 });
    sim.state.credits = 1e6;
    sim.state.nextWaveIn = 1e9;
    const p = besidePath(sim, 300, 60);
    sim.enqueue({ type: 'placeTower', kind: 'arcCoil', x: p.x, y: p.y });
    sim.step();
    expect(sim.state.lastRejection).toBe('locked');
    expect(sim.state.unlocked).toEqual(['pulseLaser', 'railgun', 'plasmaMortar']);
  });
});
