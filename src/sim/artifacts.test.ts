import { describe, expect, it } from 'vitest';
import {
  ARTIFACT_ORDER,
  ARTIFACT_TUNING as AT,
  ARTIFACTS,
  artifactValue,
  craftCost,
  rerollCost,
  type ArtifactId,
  type ArtifactTier,
  type OwnedArtifact,
} from '../data/artifacts';
import { DAMAGE } from '../data/damage';
import { FRESH_ACCOUNT } from '../data/meta';
import { applyHit } from './damage';
import { placementError } from './placement';
import { sellValue, upgradeCostFor } from './economy';
import { Sim } from './sim';
import { snapshotSim, restoreSim } from './snapshot';
import { towerStats } from './specs';
import { startWave, callEarly } from './waves';
import { besidePath, hold, labSim, runTicks, spawnAt, spotNear, towerAt } from './testUtils';
import { takeArtifact } from './artifacts';

function give(sim: Sim, id: ArtifactId, tier: ArtifactTier = 0): number {
  takeArtifact(sim.state, { id, tier });
  return artifactValue(id, tier);
}

/** A boss right on the path, killed by a direct hit, to trigger an offer. */
function killBoss(sim: Sim): void {
  const boss = spawnAt(sim, 200, 0, 'juggernaut');
  boss.boss = true;
  boss.shield = 0;
  applyHit(sim.state, sim.path, boss, 1e9, 'kinetic', 'railgun');
}

function poolSim(pool: OwnedArtifact[], choices = 3, seed = 1): Sim {
  const sim = new Sim({
    seed,
    meta: { ...FRESH_ACCOUNT, artifactPool: pool, artifactChoices: choices },
  });
  sim.state.nextWaveIn = Number.MAX_SAFE_INTEGER;
  return sim;
}

const pool = (ids: ArtifactId[], tier: ArtifactTier = 0): OwnedArtifact[] =>
  ids.map((id) => ({ id, tier }));

describe('artifact data', () => {
  it('has ~30 artifacts, each with a name and card text', () => {
    expect(ARTIFACT_ORDER.length).toBeGreaterThanOrEqual(28);
    for (const id of ARTIFACT_ORDER) {
      const d = ARTIFACTS[id];
      expect(d.name.length).toBeGreaterThan(0);
      expect(d.describe(artifactValue(id, 0)).length).toBeGreaterThan(0);
    }
  });

  it('tiers scale the effect up', () => {
    for (let t = 1; t <= 3; t++) {
      expect(artifactValue('bountyProtocol', t as ArtifactTier)).toBeGreaterThan(
        artifactValue('bountyProtocol', (t - 1) as ArtifactTier),
      );
    }
  });

  it('crafting costs rise per tier; Dual Spec is Legendary-only', () => {
    expect(craftCost('superconductor', undefined)).toBe(AT.craftCost);
    expect(craftCost('superconductor', 0)).toBe(AT.upgradeCost[0]);
    expect(craftCost('superconductor', 2)).toBe(AT.upgradeCost[2]);
    expect(craftCost('superconductor', 3)).toBeNull();
    expect(craftCost('dualSpec', undefined)).toBe(AT.upgradeCost[2]);
    expect(craftCost('dualSpec', 3)).toBeNull();
  });
});

describe('post-boss pick', () => {
  it('a boss kill offers 3 distinct artifacts from the pool', () => {
    const sim = poolSim(pool(['superconductor', 'capacitorBank', 'kineticPrimer', 'skyguard']));
    killBoss(sim);
    sim.step();
    const offer = sim.state.offer!;
    expect(offer.choices).toHaveLength(3);
    expect(new Set(offer.choices.map((c) => c.id)).size).toBe(3);
  });

  it('offers a 4th choice with the research', () => {
    const sim = poolSim(pool(['superconductor', 'capacitorBank', 'kineticPrimer', 'skyguard']), 4);
    killBoss(sim);
    sim.step();
    expect(sim.state.offer!.choices).toHaveLength(4);
  });

  it('never offers an artifact already active, and skips when the pool is used up', () => {
    const sim = poolSim(pool(['superconductor', 'capacitorBank']));
    give(sim, 'superconductor');
    killBoss(sim);
    sim.step();
    expect(sim.state.offer!.choices.map((c) => c.id)).toEqual(['capacitorBank']);
    sim.enqueue({ type: 'pickArtifact', index: 0 });
    sim.step();
    killBoss(sim);
    sim.step();
    expect(sim.state.offer).toBeNull();
    expect(sim.state.offersQueued).toBe(0);
  });

  it('picking activates the artifact and refreshes tower stats', () => {
    const sim = poolSim(pool(['capacitorBank']));
    const p = besidePath(sim, 300, 50);
    const t = towerAt(sim, 'pulseLaser', p.x, p.y, 1);
    const before = t.stats.power;
    killBoss(sim);
    sim.step();
    sim.enqueue({ type: 'pickArtifact', index: 0 });
    sim.step();
    expect(sim.state.artifacts.map((a) => a.id)).toEqual(['capacitorBank']);
    expect(sim.state.offer).toBeNull();
    expect(t.stats.power).toBeCloseTo(before * (1 + artifactValue('capacitorBank', 0)));
  });

  it('higher tiers are drawn less often', () => {
    const counts = { common: 0, legendary: 0 };
    for (let seed = 1; seed <= 400; seed++) {
      const sim = poolSim(
        [
          { id: 'superconductor', tier: 0 },
          { id: 'capacitorBank', tier: 3 },
          ...pool(['kineticPrimer', 'skyguard', 'longBarrels', 'rapidCycling']),
        ],
        3,
        seed,
      );
      killBoss(sim);
      sim.step();
      const ids = sim.state.offer!.choices.map((c) => c.id);
      if (ids.includes('superconductor')) counts.common++;
      if (ids.includes('capacitorBank')) counts.legendary++;
    }
    expect(counts.legendary).toBeLessThan(counts.common * 0.8);
  });

  it('rerolls cost Credits, rising per use; free rerolls go first', () => {
    const ids: ArtifactId[] = ['superconductor', 'capacitorBank', 'kineticPrimer', 'skyguard'];
    const sim = new Sim({
      seed: 3,
      meta: { ...FRESH_ACCOUNT, artifactPool: pool(ids), freeRerolls: 1 },
    });
    sim.state.nextWaveIn = Number.MAX_SAFE_INTEGER;
    sim.state.credits = 1000;
    killBoss(sim);
    sim.step();
    const credits = sim.state.credits;
    sim.enqueue({ type: 'rerollArtifacts' });
    sim.step();
    expect(sim.state.credits).toBe(credits); // free
    sim.enqueue({ type: 'rerollArtifacts' });
    sim.step();
    expect(sim.state.credits).toBe(credits - rerollCost(0));
    sim.enqueue({ type: 'rerollArtifacts' });
    sim.step();
    expect(sim.state.credits).toBe(credits - rerollCost(0) - rerollCost(1));
    expect(rerollCost(1)).toBe(rerollCost(0) * AT.rerollGrowth);
    sim.state.credits = 0;
    sim.enqueue({ type: 'rerollArtifacts' });
    sim.step();
    expect(sim.state.lastRejection).toBe('credits');
  });

  it('a pending offer survives a snapshot round-trip', () => {
    const sim = poolSim(pool(['superconductor', 'capacitorBank', 'kineticPrimer', 'skyguard']));
    give(sim, 'bountyProtocol', 2);
    killBoss(sim);
    sim.step();
    const copy = restoreSim(JSON.parse(JSON.stringify(snapshotSim(sim))));
    expect(copy.state.offer).toEqual(sim.state.offer);
    expect(copy.state.art).toEqual(sim.state.art);
    sim.enqueue({ type: 'pickArtifact', index: 1 });
    copy.enqueue({ type: 'pickArtifact', index: 1 });
    sim.step();
    copy.step();
    expect(copy.state.artifacts).toEqual(sim.state.artifacts);
  });
});

describe('artifact effects', () => {
  it('Superconductor: energy hits more shield; Shield Breaker: kinetic does', () => {
    const sim = labSim();
    const v = give(sim, 'superconductor');
    const e = spawnAt(sim, 300, 1000);
    e.shield = e.maxShield = 1000;
    applyHit(sim.state, sim.path, e, 10, 'energy', 'pulseLaser');
    expect(1000 - e.shield).toBeCloseTo(10 * DAMAGE.vsShield.energy * (1 + v));
    const w = give(sim, 'shieldBreaker');
    const e2 = spawnAt(sim, 300, 1000);
    e2.shield = e2.maxShield = 1000;
    applyHit(sim.state, sim.path, e2, 10, 'kinetic', 'railgun');
    expect(1000 - e2.shield).toBeCloseTo(10 * DAMAGE.vsShield.kinetic * (1 + w));
  });

  it('Capacitor Bank / Kinetic Primer / Specialist Doctrine scale power by type', () => {
    const sim = labSim();
    const e = give(sim, 'capacitorBank');
    const k = give(sim, 'kineticPrimer');
    const sd = give(sim, 'specialistDoctrine');
    const p = besidePath(sim, 300, 50);
    const laser = towerAt(sim, 'pulseLaser', p.x, p.y, 5, 'overclock');
    const rail = towerAt(sim, 'railgun', p.x + 40, p.y, 1);
    expect(laser.stats.power).toBeCloseTo(
      towerStats('pulseLaser', 5, 'overclock').power * (1 + e) * (1 + sd),
    );
    expect(rail.stats.power).toBeCloseTo(towerStats('railgun', 1, null).power * (1 + k));
  });

  it('Penetrator Rounds: kinetic hits ignore part of the armor', () => {
    const sim = labSim();
    const v = give(sim, 'penetratorRounds');
    const e = spawnAt(sim, 300, 1000);
    e.armor = 10;
    applyHit(sim.state, sim.path, e, 30, 'kinetic', 'railgun');
    expect(1000 - e.hp).toBeCloseTo(30 - 10 * (1 - v));
  });

  it('Ricochet Matrix: a kinetic hit bounces once to a nearby enemy', () => {
    const sim = labSim();
    const v = give(sim, 'ricochetMatrix');
    const a = spawnAt(sim, 300, 1000);
    const b = spawnAt(sim, 310, 1000);
    const far = spawnAt(sim, 500, 1000);
    hold(a, b, far);
    applyHit(sim.state, sim.path, a, 100, 'kinetic', 'railgun');
    expect(1000 - b.hp).toBeCloseTo(100 * v);
    expect(far.hp).toBe(1000);
    // Energy hits don't bounce.
    applyHit(sim.state, sim.path, a, 100, 'energy', 'pulseLaser');
    expect(1000 - b.hp).toBeCloseTo(100 * v);
  });

  it('Overflow Reactor: overkill carries to the next enemy', () => {
    const sim = labSim();
    const v = give(sim, 'overflowReactor');
    const a = spawnAt(sim, 300, 50);
    const b = spawnAt(sim, 310, 1000);
    applyHit(sim.state, sim.path, a, 150, 'energy', 'pulseLaser');
    expect(a.alive).toBe(false);
    expect(1000 - b.hp).toBeCloseTo(100 * v);
  });

  it('Cryo Lattice: frozen enemies shatter on death', () => {
    const sim = labSim();
    const v = give(sim, 'cryoLattice');
    const a = spawnAt(sim, 300, 200);
    const b = spawnAt(sim, 305, 1000);
    a.frozen = 30;
    applyHit(sim.state, sim.path, a, 500, 'energy', 'pulseLaser');
    expect(1000 - b.hp).toBeCloseTo(200 * v);
    const c = spawnAt(sim, 600, 200);
    const d = spawnAt(sim, 605, 1000);
    applyHit(sim.state, sim.path, c, 500, 'energy', 'pulseLaser');
    expect(d.hp).toBe(1000); // not frozen: no shatter
  });

  it('Shatter Point, Priority Targeting and Skyguard raise damage taken', () => {
    const sim = labSim();
    const sp = give(sim, 'shatterPoint');
    const pt = give(sim, 'priorityTargeting');
    const sg = give(sim, 'skyguard');
    const stunned = spawnAt(sim, 300, 1000);
    stunned.stunned = 10;
    applyHit(sim.state, sim.path, stunned, 10, 'energy', 'pulseLaser');
    expect(1000 - stunned.hp).toBeCloseTo(10 * (1 + sp));
    const elite = spawnAt(sim, 300, 1000);
    elite.elite = true;
    applyHit(sim.state, sim.path, elite, 10, 'energy', 'pulseLaser');
    expect(1000 - elite.hp).toBeCloseTo(10 * (1 + pt));
    const flyer = spawnAt(sim, 300, 1000);
    flyer.flying = true;
    applyHit(sim.state, sim.path, flyer, 10, 'energy', 'pulseLaser');
    expect(1000 - flyer.hp).toBeCloseTo(10 * (1 + sg));
  });

  it('Bounty Protocol: more Credits per kill', () => {
    const sim = labSim();
    const v = give(sim, 'bountyProtocol', 3);
    sim.state.credits = 0;
    const e = spawnAt(sim, 300, 10);
    applyHit(sim.state, sim.path, e, 100, 'energy', 'pulseLaser');
    expect(sim.state.credits).toBe(Math.round(5 * (1 + v)));
  });

  it('Interest Engine: interest on banked Credits, capped by wave', () => {
    const sim = labSim();
    const v = give(sim, 'interestEngine');
    sim.state.credits = 500;
    startWave(sim.state, sim.rng);
    expect(sim.state.credits).toBe(500 + Math.floor(500 * v));
    sim.state.credits = 1e6;
    startWave(sim.state, sim.rng);
    expect(sim.state.credits).toBe(1e6 + AT.interestCapBase + AT.interestCapPerWave * 2);
  });

  it('Early Bird: bigger call-early bonus', () => {
    const a = labSim();
    const b = labSim();
    const v = give(b, 'earlyBird');
    for (const s of [a, b]) {
      s.state.credits = 0;
      s.state.nextWaveIn = 600;
    }
    callEarly(a.state, a.rng);
    callEarly(b.state, b.rng);
    expect(b.state.credits).toBe(Math.floor((a.state.credits / 1) * (1 + v)));
  });

  it('Salvage Rights and Field Engineering change sell and upgrade prices', () => {
    const sim = labSim();
    const p = besidePath(sim, 300, 50);
    const t = towerAt(sim, 'railgun', p.x, p.y, 3);
    t.invested = 1000;
    const up = upgradeCostFor(t);
    const s = give(sim, 'salvageRights');
    const f = give(sim, 'fieldEngineering');
    expect(sellValue(t, sim.state.art)).toBe(Math.floor(1000 * (0.7 + s)));
    expect(upgradeCostFor(t, sim.state.art)).toBe(Math.round(up * (1 - f)));
  });

  it('Last Stand: towers fire faster only while the base is low', () => {
    const run = (low: boolean, last: boolean): number => {
      const sim = labSim();
      if (last) give(sim, 'lastStand');
      if (low) sim.state.baseHp = 2;
      const p = besidePath(sim, 300, 30);
      towerAt(sim, 'pulseLaser', p.x, p.y, 1);
      const e = spawnAt(sim, 300, 1e7);
      hold(e);
      runTicks(sim, 600);
      return 1e7 - e.hp;
    };
    expect(run(false, true)).toBeCloseTo(run(false, false), 5);
    expect(run(true, true)).toBeGreaterThan(run(true, false) * 1.15);
  });

  it('Targeting Uplink: range bonus only next to a same-kind tower', () => {
    const sim = labSim();
    const v = give(sim, 'targetingUplink');
    sim.state.credits = 1e6;
    const p = spotNear(sim, 300);
    sim.enqueue({ type: 'placeTower', kind: 'pulseLaser', x: p.x, y: p.y });
    sim.step();
    const [a] = sim.state.towers.items.filter((t) => t.alive);
    const alone = a!.stats.range;
    expect(alone).toBeCloseTo(towerStats('pulseLaser', 1, null).range);
    const q = [
      [32, 0],
      [-32, 0],
      [0, 32],
      [0, -32],
      [32, 32],
      [-32, -32],
      [32, -32],
      [-32, 32],
    ]
      .map(([dx, dy]) => ({ x: a!.x + dx!, y: a!.y + dy! }))
      .find((c) => placementError(sim.state, sim.path, sim.map, c.x, c.y) === null)!;
    sim.enqueue({ type: 'placeTower', kind: 'pulseLaser', x: q.x, y: q.y });
    sim.step();
    expect(sim.state.lastRejection).toBeNull();
    expect(a!.stats.range).toBeCloseTo(alone * (1 + v));
    // Selling the neighbour removes the bonus.
    const b = sim.state.towers.items.find((t) => t.alive && t !== a)!;
    sim.enqueue({ type: 'sellTower', towerId: b.id });
    sim.step();
    expect(a!.stats.range).toBeCloseTo(alone);
  });

  it('Reinforced Hull adds base HP; Nanite Repair mends it over waves', () => {
    const sim = labSim();
    const max = sim.state.maxBaseHp;
    const v = give(sim, 'reinforcedHull');
    expect(sim.state.maxBaseHp).toBe(max + Math.round(v));
    give(sim, 'naniteRepair', 3);
    sim.state.baseHp = 5;
    for (let i = 0; i < 6; i++) startWave(sim.state, sim.rng);
    expect(sim.state.baseHp).toBeGreaterThan(5);
  });

  it('Null Anchor slows bosses only', () => {
    const sim = labSim();
    const v = give(sim, 'nullAnchor');
    const boss = spawnAt(sim, 0, 0, 'juggernaut');
    const drone = spawnAt(sim, 0, 100);
    const plain = labSim();
    expect(boss.baseSpeed).toBeCloseTo(spawnAt(plain, 0, 0, 'juggernaut').baseSpeed * (1 - v));
    expect(drone.baseSpeed).toBe(spawnAt(plain, 0, 100).baseSpeed);
  });

  it('Cold Snap, Permafrost, Wide Payload, Echo Chamber, Long Barrels, Rapid Cycling', () => {
    const art = {
      coldSnap: 0.2,
      permafrost: 0.25,
      widePayload: 0.15,
      echoChamber: 0.25,
      longBarrels: 0.06,
      rapidCycling: 0.06,
    };
    const cryo = towerStats('cryoProjector', 1, null, undefined, { art });
    const cryo0 = towerStats('cryoProjector', 1, null);
    expect(cryo.power).toBeCloseTo(cryo0.power * 1.2);
    expect(cryo.attack.type === 'chill' && cryo.attack.freezeMult).toBeCloseTo(1.25);
    const mortar = towerStats('plasmaMortar', 1, null, undefined, { art });
    const mortar0 = towerStats('plasmaMortar', 1, null);
    if (mortar.attack.type !== 'shell' || mortar0.attack.type !== 'shell') throw new Error();
    expect(mortar.attack.splashRadius).toBeCloseTo(mortar0.attack.splashRadius * 1.15);
    expect(mortar.range).toBeCloseTo(mortar0.range * 1.06);
    expect(mortar.fireRate).toBeCloseTo(mortar0.fireRate * 1.06);
    const arc = towerStats('arcCoil', 1, null, undefined, { art });
    const arc0 = towerStats('arcCoil', 1, null);
    if (arc.attack.type !== 'chain' || arc0.attack.type !== 'chain') throw new Error();
    expect(1 - arc.attack.falloff).toBeCloseTo((1 - arc0.attack.falloff) * 0.75);
  });

  it('Supply Drop pays Credits on pick', () => {
    const sim = labSim();
    sim.state.credits = 0;
    give(sim, 'supplyDrop');
    expect(sim.state.credits).toBeGreaterThanOrEqual(AT.supplyDropBase);
  });
});

describe('Dual Spec', () => {
  it('lets one specialized tower take a second, different spec', () => {
    const sim = labSim();
    const p = besidePath(sim, 300, 50);
    const a = towerAt(sim, 'pulseLaser', p.x, p.y, 5, 'overclock');
    const b = towerAt(sim, 'railgun', p.x + 40, p.y, 5, 'executioner');
    sim.enqueue({ type: 'specialize', towerId: a.id, spec: 'prism' });
    sim.step();
    expect(sim.state.lastRejection).toBe('specialized'); // no artifact yet
    give(sim, 'dualSpec', 3);
    sim.enqueue({ type: 'specialize', towerId: a.id, spec: 'overclock' });
    sim.step();
    expect(sim.state.lastRejection).toBe('specialized'); // same spec
    sim.enqueue({ type: 'specialize', towerId: a.id, spec: 'prism' });
    sim.step();
    expect(a.spec2).toBe('prism');
    expect(a.stats.attack.type === 'bolt' && a.stats.attack.beams).toBe(3);
    sim.enqueue({ type: 'specialize', towerId: b.id, spec: 'accelerator' });
    sim.step();
    expect(sim.state.lastRejection).toBe('specialized'); // one tower per run
    expect(b.spec2).toBeNull();
  });

  it('both specs act on hits (Executioner + Ion Rail)', () => {
    const sim = labSim();
    give(sim, 'dualSpec', 3);
    const p = besidePath(sim, 300, 0);
    const t = towerAt(sim, 'railgun', p.x - 60, p.y, 5, 'executioner');
    sim.enqueue({ type: 'specialize', towerId: t.id, spec: 'ionRail' });
    sim.step();
    expect(t.stats.damageType).toBe('energy');
    expect(t.stats.attack.type === 'rail' && t.stats.attack.strip).toBeGreaterThan(0);
  });
});
