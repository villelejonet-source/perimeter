import { GAME } from '../data/game';
import { DEFAULT_MAP_ID, MAPS, type MapDef } from '../data/maps';
import { FRESH_ACCOUNT, type MetaModifiers } from '../data/meta';
import { SPEC_LEVEL, TOWER_SPECS } from '../data/specs';
import { STARTING_UNLOCKS, TOWERS, type TowerKind } from '../data/towers';
import type { Command } from './commands';
import { placeCost, sellValue, upgradeCostFor } from './economy';
import { Path } from './path';
import { placementError, snapToGrid } from './placement';
import { Rng } from './rng';
import { updateEnemies } from './enemies';
import { updateFx } from './fx';
import { updateProjectiles, updateZones } from './projectiles';
import {
  newEnemy,
  newFx,
  newProjectile,
  newStats,
  newTower,
  newZone,
  refreshAllStats,
  refreshStats,
  type SimState,
  type Tower,
} from './state';
import {
  drawChoices,
  emptyArtifactValues,
  nextRerollCost,
  takeArtifact,
  updateOffers,
} from './artifacts';
import type { OwnedArtifact } from '../data/artifacts';
import { updateTowers } from './towers';
import { Pool } from './pool';
import { callEarly, updateWaves } from './waves';

export interface SimConfig {
  seed: number;
  mapId?: string;
  /** Research applied to this run (default: a fresh account). */
  meta?: MetaModifiers;
  /** Override the meta's unlocked towers (dev `?unlock=all`, tests). */
  unlockedTowers?: readonly TowerKind[];
  /** Artifacts active from the start (balance-sim artifact matrix, tests). */
  startArtifacts?: readonly OwnedArtifact[];
}

/**
 * The authoritative game simulation. Advance with `step()` (one fixed 1/60 s tick);
 * mutate only through `enqueue(command)`, applied at the start of the next tick.
 */
export class Sim {
  readonly state: SimState;
  readonly path: Path;
  readonly map: MapDef;
  readonly rng: Rng;
  readonly config: Readonly<SimConfig>;
  private readonly queue: Command[] = [];

  constructor(config: SimConfig) {
    this.config = config;
    const map = MAPS[config.mapId ?? DEFAULT_MAP_ID];
    if (!map) throw new Error(`Unknown map: ${config.mapId}`);
    this.map = map;
    this.path = new Path(map.path);
    this.rng = new Rng(config.seed);
    const meta = config.meta ?? FRESH_ACCOUNT;
    const maxBaseHp = GAME.baseHp + meta.baseHpBonus;
    this.state = {
      tick: 0,
      paused: false,
      gameOver: false,
      baseHp: maxBaseHp,
      maxBaseHp,
      meta,
      waveIntervalTicks: Math.round(
        (GAME.waveIntervalSeconds + meta.waveTimerBonusSeconds) * GAME.tickRate,
      ),
      credits: GAME.startCredits + meta.startCreditsBonus,
      wave: 0,
      nextWaveIn: Math.round(GAME.firstWaveDelaySeconds * GAME.tickRate),
      nextId: 1,
      enemies: new Pool(newEnemy, 128),
      towers: new Pool(newTower, 32),
      projectiles: new Pool(newProjectile, 256),
      fx: new Pool(newFx, 64),
      zones: new Pool(newZone, 16),
      spawns: [],
      unlocked: config.unlockedTowers ?? meta.unlockedTowers ?? STARTING_UNLOCKS,
      stats: newStats(),
      artifacts: [],
      art: emptyArtifactValues(),
      offer: null,
      offersQueued: 0,
      rerolls: 0,
      freeRerolls: meta.freeRerolls,
      dualSpecUsed: false,
      lastRejection: null,
    };
    for (const a of config.startArtifacts ?? []) takeArtifact(this.state, a);
  }

  enqueue(command: Command): void {
    this.queue.push(command);
  }

  /** Commands not yet applied (snapshots keep them so a restore applies them too). */
  get pending(): readonly Command[] {
    return this.queue;
  }

  step(): void {
    this.applyCommands();
    const s = this.state;
    if (s.paused || s.gameOver) return;

    updateWaves(s, this.path, this.rng);
    updateEnemies(s, this.path);
    updateTowers(s, this.path, this.rng);
    updateProjectiles(s, this.path);
    updateZones(s, this.path);
    updateFx(s);
    updateOffers(s, this.rng);

    if (s.baseHp <= 0) s.gameOver = true;
    s.tick++;
  }

  findTower(id: number): Tower | null {
    for (const t of this.state.towers.items) if (t.alive && t.id === id) return t;
    return null;
  }

  private applyCommands(): void {
    for (const cmd of this.queue) this.apply(cmd);
    this.queue.length = 0;
  }

  private reject(reason: string): void {
    this.state.lastRejection = reason;
  }

  private apply(cmd: Command): void {
    const s = this.state;
    if (cmd.type === 'setPaused') {
      s.paused = cmd.paused;
      return;
    }
    if (s.gameOver) return this.reject('gameOver');

    switch (cmd.type) {
      case 'placeTower': {
        if (!s.unlocked.includes(cmd.kind)) return this.reject('locked');
        const cost = placeCost(cmd.kind);
        if (s.credits < cost) return this.reject('credits');
        const x = snapToGrid(cmd.x);
        const y = snapToGrid(cmd.y);
        const err = placementError(s, this.path, this.map, x, y);
        if (err) return this.reject(err);
        const t = s.towers.acquire();
        t.id = s.nextId++;
        t.kind = cmd.kind;
        t.x = x;
        t.y = y;
        t.level = s.meta.towers[cmd.kind].startingLevel;
        t.cooldown = 0;
        t.targeting = 'first';
        t.invested = cost;
        t.targetId = -1;
        t.spec = null;
        t.spec2 = null;
        t.heat = 0;
        t.idle = 0;
        s.credits -= cost;
        refreshAllStats(s);
        break;
      }
      case 'upgradeTower': {
        const t = this.findTower(cmd.towerId);
        if (!t) return this.reject('noTower');
        const cost = upgradeCostFor(t, s.art);
        if (s.credits < cost) return this.reject('credits');
        s.credits -= cost;
        t.invested += cost;
        t.level++;
        refreshStats(t, s);
        break;
      }
      case 'sellTower': {
        const t = this.findTower(cmd.towerId);
        if (!t) return this.reject('noTower');
        s.credits += sellValue(t, s.art);
        t.alive = false;
        refreshAllStats(s);
        break;
      }
      case 'setTargeting': {
        const t = this.findTower(cmd.towerId);
        if (!t) return this.reject('noTower');
        t.targeting = cmd.mode;
        break;
      }
      case 'specialize': {
        const t = this.findTower(cmd.towerId);
        if (!t) return this.reject('noTower');
        if (t.level < SPEC_LEVEL) return this.reject('level');
        if (!TOWER_SPECS[t.kind].includes(cmd.spec)) return this.reject('wrongSpec');
        if (t.spec) {
          // Dual Spec: one specialized tower per run may add a second, different spec.
          if (!canDualSpec(s, t) || cmd.spec === t.spec) return this.reject('specialized');
          t.spec2 = cmd.spec;
          s.dualSpecUsed = true;
        } else {
          t.spec = cmd.spec;
        }
        refreshStats(t, s);
        break;
      }
      case 'pickArtifact': {
        const choice = s.offer?.choices[cmd.index];
        if (!choice) return this.reject('noOffer');
        s.offer = null;
        takeArtifact(s, choice);
        break;
      }
      case 'rerollArtifacts': {
        if (!s.offer) return this.reject('noOffer');
        const cost = nextRerollCost(s);
        if (s.credits < cost) return this.reject('credits');
        if (s.freeRerolls > 0) s.freeRerolls--;
        else s.rerolls++;
        s.credits -= cost;
        s.offer = { wave: s.offer.wave, choices: drawChoices(s, this.rng) };
        break;
      }
      case 'callEarly':
        callEarly(s, this.rng);
        break;
    }
    s.lastRejection = null;
  }
}

/** Dual Spec: active, not yet used this run, and the tower already has its first spec. */
export function canDualSpec(s: SimState, t: Tower): boolean {
  return s.art.dualSpec > 0 && !s.dualSpecUsed && t.spec !== null && t.spec2 === null;
}

/** Tower definition lookup re-exported for UI convenience. */
export { TOWERS };
