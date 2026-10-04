import { GAME } from '../data/game';
import { DEFAULT_MAP_ID, MAPS, type MapDef } from '../data/maps';
import { TOWERS } from '../data/towers';
import { moveEnemies, updateProjectiles, updateTowers } from './combat';
import type { Command } from './commands';
import { placeCost, sellValue, upgradeCostFor } from './economy';
import { Path } from './path';
import { placementError, snapToGrid } from './placement';
import { Rng } from './rng';
import { newEnemy, newProjectile, newTower, type SimState, type Tower } from './state';
import { Pool } from './pool';
import { callEarly, updateWaves } from './waves';

export interface SimConfig {
  seed: number;
  mapId?: string;
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
  private readonly queue: Command[] = [];

  constructor(config: SimConfig) {
    const map = MAPS[config.mapId ?? DEFAULT_MAP_ID];
    if (!map) throw new Error(`Unknown map: ${config.mapId}`);
    this.map = map;
    this.path = new Path(map.path);
    this.rng = new Rng(config.seed);
    this.state = {
      tick: 0,
      paused: false,
      gameOver: false,
      baseHp: GAME.baseHp,
      credits: GAME.startCredits,
      wave: 0,
      nextWaveIn: Math.round(GAME.firstWaveDelaySeconds * GAME.tickRate),
      nextId: 1,
      enemies: new Pool(newEnemy, 128),
      towers: new Pool(newTower, 32),
      projectiles: new Pool(newProjectile, 256),
      spawns: [],
      stats: { kills: 0, leaks: 0, creditsEarned: 0, damageDealt: 0 },
      lastRejection: null,
    };
  }

  enqueue(command: Command): void {
    this.queue.push(command);
  }

  step(): void {
    this.applyCommands();
    const s = this.state;
    if (s.paused || s.gameOver) return;

    updateWaves(s, this.path);
    moveEnemies(s, this.path);
    updateTowers(s);
    updateProjectiles(s);

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
        t.level = 1;
        t.cooldown = 0;
        t.targeting = 'first';
        t.invested = cost;
        t.targetId = -1;
        s.credits -= cost;
        break;
      }
      case 'upgradeTower': {
        const t = this.findTower(cmd.towerId);
        if (!t) return this.reject('noTower');
        const cost = upgradeCostFor(t);
        if (s.credits < cost) return this.reject('credits');
        s.credits -= cost;
        t.invested += cost;
        t.level++;
        break;
      }
      case 'sellTower': {
        const t = this.findTower(cmd.towerId);
        if (!t) return this.reject('noTower');
        s.credits += sellValue(t);
        t.alive = false;
        break;
      }
      case 'setTargeting': {
        const t = this.findTower(cmd.towerId);
        if (!t) return this.reject('noTower');
        t.targeting = cmd.mode;
        break;
      }
      case 'callEarly':
        callEarly(s);
        break;
    }
    s.lastRejection = null;
  }
}

/** Tower definition lookup re-exported for UI convenience. */
export { TOWERS };
