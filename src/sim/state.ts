import type { DamageType } from '../data/damage';
import type { EnemyKind } from '../data/enemies';
import type { TowerKind } from '../data/towers';
import { Pool } from './pool';

export type TargetingMode = 'first' | 'last' | 'strongest' | 'closest';
export const TARGETING_MODES: readonly TargetingMode[] = ['first', 'last', 'strongest', 'closest'];

export interface Enemy {
  alive: boolean;
  id: number;
  kind: EnemyKind;
  /** Wave this enemy belongs to (drives children's scaling). */
  wave: number;
  elite: boolean;
  boss: boolean;
  /** Distance travelled along the path. */
  dist: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  /** Shield regained per tick once regen starts. */
  shieldRegen: number;
  /** Ticks until shield regen starts (reset on every hit). */
  shieldDelay: number;
  armor: number;
  /** Unslowed speed, world px per second. */
  baseSpeed: number;
  /** Current speed after chill/freeze, world px per second. */
  speed: number;
  bounty: number;
  radius: number;
  flying: boolean;
  /** Base HP lost on leak; -1 = boss rule (remaining base HP minus 1). */
  leakDamage: number;
  /** 0–1. Slows proportionally; freezes at 1. */
  chill: number;
  maxChill: number;
  /** Ticks left frozen (speed 0, +kinetic damage taken). */
  frozen: number;
  /** Ticks left before it can be frozen again. */
  freezeImmune: number;
  /** Medic: heal radius (0 = no heal) and fraction of max HP healed per tick. */
  healRadius: number;
  healPerTick: number;
  /** Boss minions: kind to spawn (null = none), interval and countdown in ticks. */
  spawnKind: EnemyKind | null;
  spawnEvery: number;
  spawnCooldown: number;
  /** Splitter: kind and count spawned on death (null = none). */
  splitKind: EnemyKind | null;
  splitCount: number;
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

export type ProjectileKind = 'bolt' | 'missile' | 'shell';

export interface Projectile {
  alive: boolean;
  kind: ProjectileKind;
  x: number;
  y: number;
  /** Direction of travel, for rendering. */
  angle: number;
  /** Homing target (bolt, missile). Validated against targetId since pool slots are reused. */
  target: Enemy | null;
  targetId: number;
  /** Shell landing point. */
  tx: number;
  ty: number;
  damage: number;
  damageType: DamageType;
  speed: number;
  splashRadius: number;
  /** Ticks before a missile without a target expires. */
  life: number;
  source: TowerKind;
}

/** Short-lived visual record emitted by the sim for the renderer (beams, blasts). */
export type FxKind = 'rail' | 'chain' | 'chill' | 'blast';

export interface Fx {
  alive: boolean;
  kind: FxKind;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  radius: number;
  /** Ticks left, and the starting value (renderer fades by ttl / maxTtl). */
  ttl: number;
  maxTtl: number;
}

/** One queued spawn inside a wave. */
export interface SpawnSpec {
  kind: EnemyKind;
  elite: boolean;
  /** Extra ticks to wait before this spawn (boss after escort). */
  delay: number;
  /** For combined bosses (wave 50+): second boss whose traits are merged in. */
  alsoKind: EnemyKind | null;
}

export interface SpawnGroup {
  wave: number;
  queue: SpawnSpec[];
  next: number;
  /** Ticks until the next spawn in this group. */
  cooldown: number;
}

export interface RunStats {
  kills: number;
  leaks: number;
  creditsEarned: number;
  damageDealt: number;
  damageByType: Record<DamageType, number>;
  damageByTower: Partial<Record<TowerKind, number>>;
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
  fx: Pool<Fx>;
  spawns: SpawnGroup[];
  /** Tower kinds the player may build this run. */
  unlocked: readonly TowerKind[];
  stats: RunStats;
  /** Reason the most recent command was rejected, for UI feedback. */
  lastRejection: string | null;
}

export function newEnemy(): Enemy {
  return {
    alive: false,
    id: -1,
    kind: 'drone',
    wave: 0,
    elite: false,
    boss: false,
    dist: 0,
    x: 0,
    y: 0,
    hp: 0,
    maxHp: 0,
    shield: 0,
    maxShield: 0,
    shieldRegen: 0,
    shieldDelay: 0,
    armor: 0,
    baseSpeed: 0,
    speed: 0,
    bounty: 0,
    radius: 0,
    flying: false,
    leakDamage: 0,
    chill: 0,
    maxChill: 1,
    frozen: 0,
    freezeImmune: 0,
    healRadius: 0,
    healPerTick: 0,
    spawnKind: null,
    spawnEvery: 0,
    spawnCooldown: 0,
    splitKind: null,
    splitCount: 0,
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
  return {
    alive: false,
    kind: 'bolt',
    x: 0,
    y: 0,
    angle: 0,
    target: null,
    targetId: -1,
    tx: 0,
    ty: 0,
    damage: 0,
    damageType: 'energy',
    speed: 0,
    splashRadius: 0,
    life: 0,
    source: 'pulseLaser',
  };
}

export function newFx(): Fx {
  return { alive: false, kind: 'rail', x1: 0, y1: 0, x2: 0, y2: 0, radius: 0, ttl: 0, maxTtl: 1 };
}

export function newStats(): RunStats {
  return {
    kills: 0,
    leaks: 0,
    creditsEarned: 0,
    damageDealt: 0,
    damageByType: { energy: 0, kinetic: 0, utility: 0 },
    damageByTower: {},
  };
}
