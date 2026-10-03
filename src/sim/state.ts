import type { EnemyKind } from '../data/enemies';
import type { TowerKind } from '../data/towers';
import { Pool } from './pool';

export type TargetingMode = 'first' | 'last' | 'strongest' | 'closest';
export const TARGETING_MODES: readonly TargetingMode[] = ['first', 'last', 'strongest', 'closest'];

export interface Enemy {
  alive: boolean;
  id: number;
  kind: EnemyKind;
  /** Distance travelled along the path. */
  dist: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  bounty: number;
  radius: number;
  flying: boolean;
  leakDamage: number;
}

export interface Tower {
  alive: boolean;
  id: number;
  kind: TowerKind;
  x: number;
  y: number;
  level: number;
  /** Ticks until the tower may fire again. */
  cooldown: number;
  targeting: TargetingMode;
  /** Total Credits spent (placement + upgrades), basis for the sell refund. */
  invested: number;
  /** Current target id, or -1. Exposed so the renderer can aim the tower. */
  targetId: number;
}

export interface Projectile {
  alive: boolean;
  x: number;
  y: number;
  /** Direct reference into the enemy pool; validated against targetId since slots are reused. */
  target: Enemy | null;
  targetId: number;
  damage: number;
  speed: number;
}

export interface SpawnGroup {
  wave: number;
  remaining: number;
  /** Ticks until the next spawn in this group. */
  cooldown: number;
}

export interface RunStats {
  kills: number;
  leaks: number;
  creditsEarned: number;
  damageDealt: number;
}

export interface SimState {
  tick: number;
  paused: boolean;
  gameOver: boolean;
  baseHp: number;
  credits: number;
  /** Highest wave started so far (0 before the first wave). */
  wave: number;
  /** Ticks until the next wave auto-starts. */
  nextWaveIn: number;
  nextId: number;
  enemies: Pool<Enemy>;
  towers: Pool<Tower>;
  projectiles: Pool<Projectile>;
  spawns: SpawnGroup[];
  stats: RunStats;
  /** Reason the most recent command was rejected, for UI feedback. */
  lastRejection: string | null;
}

export function newEnemy(): Enemy {
  return {
    alive: false,
    id: -1,
    kind: 'drone',
    dist: 0,
    x: 0,
    y: 0,
    hp: 0,
    maxHp: 0,
    speed: 0,
    bounty: 0,
    radius: 0,
    flying: false,
    leakDamage: 0,
  };
}

export function newTower(): Tower {
  return {
    alive: false,
    id: -1,
    kind: 'pulseLaser',
    x: 0,
    y: 0,
    level: 1,
    cooldown: 0,
    targeting: 'first',
    invested: 0,
    targetId: -1,
  };
}

export function newProjectile(): Projectile {
  return { alive: false, x: 0, y: 0, target: null, targetId: -1, damage: 0, speed: 0 };
}
