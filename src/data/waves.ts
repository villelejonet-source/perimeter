import type { BossKind, EnemyKind } from './enemies';

/** Wave composition (GDD §5, §8). All numbers are starting values. TODO(balance). */
export const WAVES = {
  eliteEvery: 5,
  bossEvery: 10,
  /** Bosses rotate every 10 waves (GDD §8). */
  bossRotation: ['juggernaut', 'aegis', 'hiveCarrier'] as readonly BossKind[],
  /** From this wave, each boss also carries the next boss's traits (GDD §8). */
  bossesCombineFrom: 50,
  /** Boss waves: the boss follows an escort this fraction of a normal wave (decided 2026-10-04). */
  bossEscortFraction: 0.35,
  /** Extra pause between the escort and the boss. */
  bossDelaySeconds: 2,
  /** Wave a type first appears: roughly one new type every few waves early on (GDD §8). */
  introWave: {
    drone: 1,
    skitter: 3,
    bulwark: 6,
    warden: 11,
    wraith: 14,
    splitter: 18,
    medic: 22,
  } as Readonly<Partial<Record<EnemyKind, number>>>,
  /** On its intro wave, this share of the wave is the new type, so players meet it. */
  introShare: 0.5,
  /** Relative pick weight once a type is in the pool. */
  weight: {
    drone: 3,
    skitter: 2,
    bulwark: 2,
    warden: 2,
    wraith: 1.5,
    splitter: 1.5,
    medic: 1,
  } as Readonly<Partial<Record<EnemyKind, number>>>,
} as const;
