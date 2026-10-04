import { describe, expect, it } from 'vitest';
import { DAMAGE } from '../data/damage';
import { GAME } from '../data/game';
import { SPEC_TUNING as T, TOWER_SPECS } from '../data/specs';
import type { TowerKind } from '../data/towers';
import { towerStats } from './specs';
import { besidePath, hold, labSim, runTicks, spawnAt, towerAt } from './testUtils';
import type { Sim } from './sim';

const TICK = GAME.tickRate;

/** Tower placed behind `d` on the path's tangent, so a straight shot runs along the path. */
function towerInLine(sim: Sim, kind: TowerKind, d: number, spec: Parameters<typeof towerAt>[5]) {
  const a = sim.path.positionAt(d, { x: 0, y: 0 });
  const b = sim.path.positionAt(d + 30, { x: 0, y: 0 });
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  return towerAt(
    sim,
    kind,
    a.x - ((b.x - a.x) / len) * 30,
    a.y - ((b.y - a.y) / len) * 30,
    5,
    spec,
  );
}

describe('specialize command', () => {
  it('needs level 5, is one-time and must belong to the tower', () => {
    const sim = labSim();
    const p = besidePath(sim, 300, 50);
    const t = towerAt(sim, 'pulseLaser', p.x, p.y, 4);
    sim.enqueue({ type: 'specialize', towerId: t.id, spec: 'prism' });
    sim.step();
    expect(sim.state.lastRejection).toBe('level');
    t.level = 5;
    sim.enqueue({ type: 'specialize', towerId: t.id, spec: 'storm' });
    sim.step();
    expect(sim.state.lastRejection).toBe('wrongSpec');
    sim.enqueue({ type: 'specialize', towerId: t.id, spec: 'prism' });
    sim.step();
    expect(t.spec).toBe('prism');
    sim.enqueue({ type: 'specialize', towerId: t.id, spec: 'overclock' });
    sim.step();
    expect(sim.state.lastRejection).toBe('specialized');
    expect(t.spec).toBe('prism');
  });

  it('every tower offers exactly 3 specs', () => {
    for (const specs of Object.values(TOWER_SPECS)) expect(new Set(specs).size).toBe(3);
  });

  it('type-changing specs change the damage type', () => {
    expect(towerStats('pulseLaser', 5, 'flechette').damageType).toBe('kinetic');
    expect(towerStats('railgun', 5, 'ionRail').damageType).toBe('energy');
    expect(towerStats('swarmLauncher', 5, 'empWarheads').damageType).toBe('energy');
    expect(towerStats('pulseLaser', 5, 'prism').damageType).toBe('energy');
  });
});

describe('Pulse Laser specs', () => {
  it('Overclock ramps fire rate while firing and resets after idling', () => {
    const sim = labSim();
    const p = besidePath(sim, 300, 40);
    const t = towerAt(sim, 'pulseLaser', p.x, p.y, 5, 'overclock');
    const e = spawnAt(sim, 300, 1e9);
    hold(e);
    runTicks(sim, 12 * TICK);
    expect(t.heat).toBeCloseTo(T.overclock.maxBonus);
    e.alive = false;
    runTicks(sim, T.overclock.idleResetSeconds * TICK + 1);
    expect(t.heat).toBe(0);
  });

  it('Flechette fires kinetic slugs that pierce 2 enemies (3 hits)', () => {
    const sim = labSim();
    const t = towerInLine(sim, 'pulseLaser', 40, 'flechette');
    const es = [0, 10, 20, 34].map((o) => spawnAt(sim, 40 + o, 1000));
    hold(...es);
    t.targeting = 'first'; // aims at the far one, so the slug passes the others first
    runTicks(sim, 20);
    const hit = es.filter((e) => e.hp < 1000).length;
    expect(hit).toBe(T.flechette.pierce + 1);
    expect(sim.state.stats.damageByType.kinetic).toBeGreaterThan(0);
    expect(sim.state.stats.damageByType.energy).toBe(0);
  });

  it('Prism splits each shot across 3 targets at 45% damage', () => {
    const sim = labSim();
    const p = besidePath(sim, 300, 40);
    const t = towerAt(sim, 'pulseLaser', p.x, p.y, 5, 'prism');
    const es = [292, 300, 308, 316].map((d) => spawnAt(sim, d, 1000));
    hold(...es);
    sim.step();
    runTicks(sim, 15);
    const hits = es.map((e) => 1000 - e.hp).filter((d) => d > 0);
    expect(hits.length).toBe(T.prism.beams);
    for (const d of hits)
      expect(d).toBeCloseTo(towerStats('pulseLaser', 5, null).power * T.prism.damageShare);
    expect(t.spec).toBe('prism');
  });
});

describe('Railgun specs', () => {
  it('Accelerator pierces 2 more, and each pierce adds damage', () => {
    const sim = labSim();
    const t = towerInLine(sim, 'railgun', 40, 'accelerator');
    t.targeting = 'last';
    const es = [0, 8, 16, 24, 32].map((o) => spawnAt(sim, 40 + o, 1000));
    hold(...es);
    sim.step();
    const dmg = es.map((e) => 1000 - e.hp);
    const base = t.stats.power;
    for (let i = 0; i < 4; i++)
      expect(dmg[i]).toBeCloseTo(base * (1 + T.accelerator.bonusPerPierce * i));
    expect(dmg[4]).toBe(0);
  });

  it('Executioner kills non-bosses left below 15% and hits bosses harder', () => {
    const sim = labSim();
    const t = towerInLine(sim, 'railgun', 40, 'executioner');
    const power = t.stats.power;
    const e = spawnAt(sim, 50, 1000);
    e.hp = power + e.maxHp * 0.1; // the hit leaves it at 10%
    hold(e);
    sim.step();
    expect(e.alive).toBe(false);

    const sim2 = labSim();
    const t2 = towerInLine(sim2, 'railgun', 40, 'executioner');
    const boss = spawnAt(sim2, 50, 0, 'juggernaut', { wave: 10 });
    boss.armor = 0;
    hold(boss);
    const hp = boss.hp;
    sim2.step();
    expect(hp - boss.hp).toBeCloseTo(t2.stats.power * (1 + T.executioner.bossBonus));
  });

  it('Ion Rail is energy and strips the shield of every enemy on its line', () => {
    const sim = labSim();
    const t = towerInLine(sim, 'railgun', 40, 'ionRail');
    t.targeting = 'last';
    const ws = [0, 8, 16, 24].map((o) => spawnAt(sim, 40 + o, 0, 'warden', { wave: 12 }));
    hold(...ws);
    sim.step();
    // Beyond maxHits too: all shields gone.
    for (const w of ws) expect(w.shield).toBe(0);
    expect(sim.state.stats.damageByType.energy).toBeGreaterThan(0);
    expect(sim.state.fx.items.some((f) => f.alive && f.kind === 'ion')).toBe(true);
  });
});

describe('Plasma Mortar specs', () => {
  it('Plasma Pools leave burning ground that keeps damaging', () => {
    const sim = labSim();
    const p = besidePath(sim, 300, 60);
    towerAt(sim, 'plasmaMortar', p.x, p.y, 5, 'plasmaPools');
    const e = spawnAt(sim, 300, 1e6);
    hold(e);
    runTicks(sim, 40); // shell lands
    expect(sim.state.zones.countAlive()).toBe(1);
    const after = e.hp;
    runTicks(sim, 30);
    expect(e.hp).toBeLessThan(after);
  });

  it('Cluster scatters bomblets that hit around the impact', () => {
    const sim = labSim();
    const p = besidePath(sim, 300, 60);
    const t = towerAt(sim, 'plasmaMortar', p.x, p.y, 5, 'cluster');
    t.targeting = 'last'; // the shell lands on `target`
    const target = spawnAt(sim, 300, 1e6);
    const near = spawnAt(sim, 340, 1e6); // outside the main blast, inside the bomblet ring
    hold(target, near);
    runTicks(sim, 40);
    expect(sim.state.fx.items.filter((f) => f.kind === 'blast').length).toBe(1 + T.cluster.count);
    expect(1e6 - target.hp).toBeCloseTo(t.stats.power);
    expect(1e6 - near.hp).toBeCloseTo(t.stats.power * T.cluster.damageShare);
  });

  it('Siege has huge range, a bigger blast and a slower rate', () => {
    const base = towerStats('plasmaMortar', 5, null);
    const siege = towerStats('plasmaMortar', 5, 'siege');
    expect(siege.range).toBeCloseTo(base.range * T.siege.rangeMult);
    expect(siege.fireRate).toBeCloseTo(base.fireRate * T.siege.rateMult);
    if (siege.attack.type !== 'shell' || base.attack.type !== 'shell') throw new Error('shell');
    expect(siege.attack.splashRadius).toBeCloseTo(base.attack.splashRadius * T.siege.splashMult);
    // Reaches a target the base mortar can't.
    const sim = labSim();
    const p = besidePath(sim, 300, base.range + 20);
    const t = towerAt(sim, 'plasmaMortar', p.x, p.y, 5, 'siege');
    spawnAt(sim, 300, 1000);
    sim.step();
    expect(t.targetId).toBeGreaterThan(0);
  });
});

describe('Arc Coil specs', () => {
  it('Storm chains 3 more jumps', () => {
    const sim = labSim();
    const p = besidePath(sim, 300, 40);
    towerAt(sim, 'arcCoil', p.x, p.y, 5, 'storm');
    const es = [300, 316, 332, 348, 364, 380, 396].map((d) => spawnAt(sim, d, 1000));
    hold(...es);
    sim.step();
    expect(es.filter((e) => e.hp < 1000).length).toBe(3 + T.storm.extraJumps);
  });

  it('Overload stuns every enemy the chain hits, but not bosses', () => {
    const sim = labSim();
    const p = besidePath(sim, 300, 40);
    towerAt(sim, 'arcCoil', p.x, p.y, 5, 'overload');
    const a = spawnAt(sim, 300, 1000);
    const b = spawnAt(sim, 316, 1000);
    const boss = spawnAt(sim, 332, 0, 'juggernaut', { wave: 10 });
    sim.step();
    expect(a.stunned).toBeGreaterThan(0);
    expect(b.stunned).toBeGreaterThan(0);
    expect(boss.stunned).toBe(0);
    sim.step();
    expect(a.speed).toBe(0);
  });

  it('Capacitor charges, then bursts every enemy in range', () => {
    const sim = labSim();
    const p = besidePath(sim, 300, 40);
    const t = towerAt(sim, 'arcCoil', p.x, p.y, 5, 'capacitor');
    const es = [270, 300, 330].map((d) => spawnAt(sim, d, 1e6));
    hold(...es);
    sim.step(); // fires immediately (starts charged)
    const first = es.map((e) => 1e6 - e.hp);
    for (const d of first) expect(d).toBeCloseTo(t.stats.power);
    runTicks(sim, T.capacitor.chargeSeconds * TICK - 2);
    expect(es.map((e) => 1e6 - e.hp)).toEqual(first); // still charging
    runTicks(sim, 2);
    expect(1e6 - es[0]!.hp).toBeCloseTo(t.stats.power * 2);
  });
});

describe('Cryo Projector specs', () => {
  it('Deep Freeze can freeze outright, for longer', () => {
    const sim = labSim(5);
    const p = besidePath(sim, 300, 40);
    towerAt(sim, 'cryoProjector', p.x, p.y, 5, 'deepFreeze');
    const e = spawnAt(sim, 300, 1e6);
    hold(e);
    let frozeAtChill = -1;
    for (let i = 0; i < 60 * 20 && frozeAtChill < 0; i++) {
      const before = e.chill;
      sim.step();
      if (e.frozen > 0) frozeAtChill = before;
    }
    expect(e.frozen).toBe(Math.round(TICK * 1 * T.deepFreeze.freezeMult));
    expect(frozeAtChill).toBeGreaterThanOrEqual(0);
  });

  it('Brittle strips armor from chilled enemies', () => {
    const run = (spec: 'brittle' | null): number => {
      const sim = labSim();
      const p = besidePath(sim, 300, 40);
      if (spec) towerAt(sim, 'cryoProjector', p.x, p.y, 5, spec);
      towerAt(sim, 'pulseLaser', p.x + 2, p.y, 5);
      const b = spawnAt(sim, 300, 0, 'bulwark', { wave: 20 });
      b.hp = b.maxHp = 1e6;
      hold(b);
      runTicks(sim, 2 * TICK);
      return 1e6 - b.hp;
    };
    expect(run('brittle')).toBeGreaterThan(run(null) * 1.3);
  });

  it('Stasis Field fires nothing but slows everything in range, flyers too', () => {
    const sim = labSim();
    const p = besidePath(sim, 300, 40);
    towerAt(sim, 'cryoProjector', p.x, p.y, 5, 'stasisField');
    const g = spawnAt(sim, 300, 1000);
    const f = spawnAt(sim, 310, 0, 'wraith');
    runTicks(sim, 30);
    expect(sim.state.projectiles.countAlive()).toBe(0);
    expect(sim.state.fx.countAlive()).toBe(0);
    for (const e of [g, f]) {
      expect(e.chill).toBeGreaterThanOrEqual(T.stasisField.auraChill - 0.01);
      expect(e.frozen).toBe(0);
      expect(e.speed).toBeLessThan(e.baseSpeed);
    }
  });
});

describe('Swarm Launcher specs', () => {
  it('Hunter-Killer targets elites first and crits', () => {
    const sim = labSim(3);
    const p = besidePath(sim, 300, 40);
    const t = towerAt(sim, 'swarmLauncher', p.x, p.y, 5, 'hunterKiller');
    const normal = spawnAt(sim, 300, 1e6);
    const elite = spawnAt(sim, 280, 0, 'drone', { elite: true });
    elite.hp = elite.maxHp = 1e6;
    hold(normal, elite);
    sim.step();
    expect(t.targetId).toBe(elite.id);
    // Over many salvos some missiles crit for ×2.
    const dmgs = new Set<number>();
    for (let i = 0; i < 20; i++) {
      runTicks(sim, Math.round(TICK / t.stats.fireRate));
      for (const m of sim.state.projectiles.items)
        if (m.alive) dmgs.add(Math.round(m.damage * 100));
    }
    expect([...dmgs].sort((a, b) => a - b)).toEqual([
      Math.round(t.stats.power * 100),
      Math.round(t.stats.power * T.hunterKiller.critMult * 100),
    ]);
  });

  it('Saturation fires many more, smaller missiles', () => {
    const sim = labSim();
    const p = besidePath(sim, 300, 40);
    const t = towerAt(sim, 'swarmLauncher', p.x, p.y, 5, 'saturation');
    spawnAt(sim, 300, 1e6);
    sim.step();
    const base = towerStats('swarmLauncher', 5, null);
    if (base.attack.type !== 'missiles') throw new Error('missiles');
    const missiles = sim.state.projectiles.items.filter((m) => m.alive);
    expect(missiles.length).toBe(base.attack.count * T.saturation.countMult);
    expect(missiles[0]!.damage).toBeCloseTo(base.power * T.saturation.damageMult);
    expect(t.spec).toBe('saturation');
  });

  it('EMP Warheads are energy, break shields twice as hard and stun', () => {
    const sim = labSim();
    const p = besidePath(sim, 300, 40);
    const t = towerAt(sim, 'swarmLauncher', p.x, p.y, 5, 'empWarheads');
    const w = spawnAt(sim, 300, 0, 'warden', { wave: 20 });
    hold(w);
    const s0 = w.shield;
    let stunned = false;
    for (let i = 0; i < 60 && w.shield === s0; i++) {
      sim.step();
      stunned ||= w.stunned > 0;
    }
    expect(s0 - w.shield).toBeCloseTo(
      t.stats.power * DAMAGE.vsShield.energy * T.empWarheads.shieldBonus,
    );
    expect(stunned || w.stunned > 0).toBe(true);
    expect(sim.state.stats.damageByType.energy).toBeGreaterThan(0);
  });
});
