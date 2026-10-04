import { describe, expect, it } from 'vitest';
import { ARTIFACT_TUNING, STARTER_ARTIFACTS } from '../data/artifacts';
import { META_PRESETS, REWARDS } from '../data/meta';
import { RESEARCH_BY_ID, researchCost } from '../data/research';
import { WebStorage } from '../platform/storage';
import { Sim } from '../sim/sim';
import { restoreSim, snapshotSim } from '../sim/snapshot';
import { artifactPool, craftableCount, craftArtifact, craftBlock } from './artifacts';
import { CURRENT_SCHEMA_VERSION, migrate, SaveError } from './migrations';
import { collectOffline, offlineEarnings } from './offline';
import { newProfile, type Profile } from './profile';
import {
  affordableCount,
  buyBlock,
  buyResearch,
  metaFromProfile,
  unlockedTowers,
} from './research';
import { applyRunRewards, coresForWave, runRewards } from './rewards';
import { SaveStore } from './save';

const H = 3_600_000;
const T0 = 1_800_000_000_000;

function profile(over: Partial<Profile> = {}): Profile {
  return { ...newProfile(T0), ...over };
}

describe('offline income (GDD §11)', () => {
  const p = profile({ bestWave: 30 });

  it('pays Cores per hour from the best wave, for the time away', () => {
    const e = offlineEarnings(p, T0 + 2 * H);
    expect(e.coresPerHour).toBe(coresForWave(30) * REWARDS.offlineRunsPerHour);
    expect(e.cores).toBe(Math.floor(e.coresPerHour * 2));
    expect(e.shards).toBe(Math.floor(REWARDS.offlineShardsPerHour * 2));
    expect(e.capped).toBe(false);
  });

  it('caps at 8 hours', () => {
    const e = offlineEarnings(p, T0 + 30 * H);
    expect(e.countedMs).toBe(8 * H);
    expect(e.awayMs).toBe(30 * H);
    expect(e.capped).toBe(true);
    expect(e.cores).toBe(Math.floor(e.coresPerHour * 8));
  });

  it('research raises the cap to 12 hours and the rate', () => {
    const r = profile({ bestWave: 30, research: { offlineCap: 4, offlineRate: 5 } });
    const e = offlineEarnings(r, T0 + 30 * H);
    expect(e.countedMs).toBe(12 * H);
    expect(e.coresPerHour).toBeCloseTo(coresForWave(30) * 1.5);
  });

  it('grants nothing if the clock went backwards', () => {
    const e = offlineEarnings(p, T0 - 5 * H);
    expect(e.tampered).toBe(true);
    expect(e.cores).toBe(0);
    expect(e.shards).toBe(0);
  });

  it('collecting credits the income and resets the clock', () => {
    const e = offlineEarnings(p, T0 + 3 * H);
    const after = collectOffline(p, e, T0 + 3 * H);
    expect(after.cores).toBe(e.cores);
    expect(after.lastSeen).toBe(T0 + 3 * H);
    expect(offlineEarnings(after, T0 + 3 * H).cores).toBe(0);
    expect(collectOffline(p, e, T0 + 3 * H, 2).cores).toBe(e.cores * 2);
  });

  it('a new player with no best wave earns nothing offline', () => {
    expect(offlineEarnings(profile(), T0 + 8 * H).cores).toBe(0);
  });
});

describe('run rewards', () => {
  it('Cores grow with wave²; Shards from bosses and first-time milestones', () => {
    expect(coresForWave(30)).toBe(225);
    const r = runRewards(profile(), 32, 3);
    expect(r.cores).toBe(coresForWave(32));
    expect(r.milestoneShards).toBe(3 * REWARDS.milestoneShards); // waves 10, 20, 30
    expect(r.shards).toBe(3 * REWARDS.shardsPerBoss + r.milestoneShards);
    expect(r.newBest).toBe(true);
  });

  it('milestones pay only once', () => {
    let p = applyRunRewards(profile(), 32, runRewards(profile(), 32, 3));
    expect(p.bestWave).toBe(32);
    expect(p.milestoneClaimed).toBe(30);
    const again = runRewards(p, 35, 0);
    expect(again.milestoneShards).toBe(0);
    p = applyRunRewards(p, 41, runRewards(p, 41, 0));
    expect(p.milestoneClaimed).toBe(40);
    expect(p.runs).toBe(2);
  });
});

describe('research', () => {
  it('buying costs Cores, raises the level and maps to run modifiers', () => {
    const def = RESEARCH_BY_ID.get('pulseLaser.damage')!;
    let p = profile({ cores: 10_000 });
    p = buyResearch(p, 'pulseLaser.damage');
    p = buyResearch(p, 'pulseLaser.damage');
    expect(p.cores).toBe(10_000 - researchCost(def, 0) - researchCost(def, 1));
    expect(metaFromProfile(p).towers.pulseLaser.damageMult).toBeCloseTo(1 + 2 * def.perLevel);
    expect(metaFromProfile(p).towers.railgun.damageMult).toBe(1);
  });

  it('blocks when unaffordable, maxed, or prerequisites missing', () => {
    const p = profile({ cores: 1_000_000 });
    expect(buyBlock(profile(), RESEARCH_BY_ID.get('baseHp')!)).toBe('cores');
    expect(buyBlock(p, RESEARCH_BY_ID.get('unlock.cryoProjector')!)).toBe('requires');
    expect(buyBlock(p, RESEARCH_BY_ID.get('arcCoil.damage')!)).toBe('requires'); // tower locked
    const maxed = profile({ cores: 1e9, research: { offlineCap: 4 } });
    expect(buyBlock(maxed, RESEARCH_BY_ID.get('offlineCap')!)).toBe('maxed');
    expect(() => buyResearch(profile(), 'baseHp')).toThrow();
  });

  it('unlocks towers 4–6 in order, and 3x speed', () => {
    let p = profile({ cores: 1_000_000 });
    expect(unlockedTowers(p)).toEqual(['pulseLaser', 'railgun', 'plasmaMortar']);
    p = buyResearch(p, 'unlock.arcCoil');
    p = buyResearch(p, 'unlock.cryoProjector');
    p = buyResearch(p, 'speed3x');
    const meta = metaFromProfile(p);
    expect(meta.unlockedTowers).toEqual([
      'pulseLaser',
      'railgun',
      'plasmaMortar',
      'arcCoil',
      'cryoProjector',
    ]);
    expect(meta.speed3x).toBe(true);
    expect(buyBlock(p, RESEARCH_BY_ID.get('arcCoil.damage')!)).toBeNull();
  });

  it('global tracks feed the run', () => {
    const p = profile({
      research: {
        startCredits: 4,
        baseHp: 5,
        waveTimer: 4,
        bounty: 5,
        callEarly: 2,
        'railgun.startingLevel': 2,
      },
    });
    const meta = metaFromProfile(p);
    const sim = new Sim({ seed: 1, meta });
    expect(sim.state.credits).toBe(150 + 100);
    expect(sim.state.maxBaseHp).toBe(25);
    expect(sim.state.waveIntervalTicks).toBe(22 * 60);
    expect(meta.bountyMult).toBeCloseTo(1.15);
    expect(meta.towers.railgun.startingLevel).toBe(3);
  });

  it('counts affordable upgrades for the menu badge', () => {
    const cheapest = Math.min(...[...RESEARCH_BY_ID.values()].map((d) => researchCost(d, 0)));
    expect(affordableCount(profile())).toBe(0);
    expect(affordableCount(profile({ cores: cheapest - 1 }))).toBe(0);
    expect(affordableCount(profile({ cores: cheapest }))).toBeGreaterThan(0);
  });

  it('presets stay reachable by research (no preset value above a track max)', () => {
    for (const preset of Object.values(META_PRESETS)) {
      const t = preset.towers.pulseLaser;
      expect(t.damageMult).toBeLessThanOrEqual(1 + 30 * 0.05);
      expect(t.startingLevel).toBeLessThanOrEqual(5);
    }
  });
});

describe('save file', () => {
  it('migrates a version-0 save and keeps the profile', () => {
    const v0 = { profile: profile({ cores: 42 }) };
    const s = migrate(v0);
    expect(s.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(s.profile.cores).toBe(42);
    expect(s.run).toBeNull();
  });

  it('rejects saves from a newer version, or without a profile', () => {
    expect(() =>
      migrate({ schemaVersion: CURRENT_SCHEMA_VERSION + 1, profile: profile() }),
    ).toThrow(SaveError);
    expect(() => migrate({ schemaVersion: 1 })).toThrow(SaveError);
    expect(() => migrate('garbage')).toThrow(SaveError);
  });

  it('round-trips through storage, including a run in progress', async () => {
    const store = new SaveStore(new WebStorage(`test-${Math.random()}`));
    const first = await store.load(T0);
    expect(first.fresh).toBe(true);
    const sim = new Sim({ seed: 3 });
    for (let i = 0; i < 700; i++) sim.step();
    await store.write({ ...first.save, profile: profile({ cores: 7 }), run: snapshotSim(sim) });
    const again = await store.load(T0);
    expect(again.fresh).toBe(false);
    expect(again.save.profile.cores).toBe(7);
    expect(again.save.run?.state.tick).toBe(700);
  });

  it('keeps an unreadable save aside and starts fresh', async () => {
    const storage = new WebStorage(`test-${Math.random()}`);
    await storage.set('perimeter.save', { schemaVersion: 99, profile: {} });
    const { save, fresh } = await new SaveStore(storage).load(T0);
    expect(fresh).toBe(true);
    expect(save.profile.cores).toBe(0);
    expect(await storage.get('perimeter.save.corrupt')).not.toBeNull();
  });
});

describe('artifact crafting (GDD §9)', () => {
  it('new profiles start with the starter set crafted at Common', () => {
    const p = profile();
    for (const id of STARTER_ARTIFACTS) expect(p.artifacts[id]).toBe(0);
    expect(artifactPool(p)).toHaveLength(STARTER_ARTIFACTS.length);
  });

  it('crafting costs Shards and enters the pool; re-crafting raises the tier', () => {
    let p = profile({ shards: 1000 });
    expect(p.artifacts.shieldBreaker).toBeUndefined();
    p = craftArtifact(p, 'shieldBreaker');
    expect(p.artifacts.shieldBreaker).toBe(0);
    expect(p.shards).toBe(1000 - ARTIFACT_TUNING.craftCost);
    for (let t = 1; t <= 3; t++) p = craftArtifact(p, 'shieldBreaker');
    expect(p.artifacts.shieldBreaker).toBe(3);
    expect(craftBlock(p, 'shieldBreaker')).toBe('maxed');
    const spent =
      ARTIFACT_TUNING.craftCost + ARTIFACT_TUNING.upgradeCost.reduce((a: number, b) => a + b, 0);
    expect(p.shards).toBe(1000 - spent);
    expect(metaFromProfile(p).artifactPool).toContainEqual({ id: 'shieldBreaker', tier: 3 });
  });

  it('Dual Spec crafts straight to Legendary', () => {
    const p = craftArtifact(profile({ shards: 100 }), 'dualSpec');
    expect(p.artifacts.dualSpec).toBe(3);
    expect(craftBlock(p, 'dualSpec')).toBe('maxed');
  });

  it("can't craft without the Shards", () => {
    const p = profile({ shards: ARTIFACT_TUNING.craftCost - 1 });
    expect(craftBlock(p, 'shieldBreaker')).toBe('shards');
    expect(() => craftArtifact(p, 'shieldBreaker')).toThrow();
    expect(craftableCount(profile({ shards: 0 }))).toBe(0);
  });

  it('4th choice and free reroll research feed the run', () => {
    const p = profile({ research: { artifactChoice4: 1, freeReroll: 1 } });
    const m = metaFromProfile(p);
    expect(m.artifactChoices).toBe(ARTIFACT_TUNING.choices + 1);
    expect(m.freeRerolls).toBe(1);
  });
});

describe('save migration 1 → 2 (artifacts)', () => {
  it('adds the starter artifacts and upgrades a saved run so it still resumes', () => {
    const sim = new Sim({ seed: 9, meta: META_PRESETS['10h'] });
    for (let i = 0; i < 900; i++) sim.step();
    // Strip everything Phase 7 added, as a v1 save had it.
    type Loose = Record<string, unknown>;
    const snap = JSON.parse(JSON.stringify(snapshotSim(sim))) as {
      config: { meta: Loose };
      state: Loose & { meta: Loose; towers: Loose[]; projectiles: Loose[] };
    };
    const strip = (o: Loose, keys: string[]): void => {
      for (const k of keys) Reflect.deleteProperty(o, k);
    };
    for (const o of [snap.config.meta, snap.state.meta])
      strip(o, ['artifactPool', 'artifactChoices', 'freeRerolls']);
    strip(snap.state, [
      'artifacts',
      'offer',
      'offersQueued',
      'rerolls',
      'freeRerolls',
      'dualSpecUsed',
    ]);
    for (const o of [...snap.state.towers, ...snap.state.projectiles]) strip(o, ['spec2']);
    const { artifacts: _a, ...oldProfile } = profile({ cores: 5 });

    const s = migrate({ schemaVersion: 1, profile: oldProfile, run: snap, savedAt: 1 });
    expect(s.profile.cores).toBe(5);
    expect(s.profile.artifacts).toEqual(profile().artifacts);
    const resumed = restoreSim(s.run!);
    expect(resumed.state.tick).toBe(900);
    expect(resumed.state.meta.artifactPool).toEqual([]);
    for (let i = 0; i < 600; i++) resumed.step();
    expect(resumed.state.tick).toBe(1500);
  });
});
