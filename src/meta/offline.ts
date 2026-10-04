import { REWARDS } from '../data/meta';
import { RESEARCH_BY_ID } from '../data/research';
import type { Profile } from './profile';
import { researchLevel } from './research';
import { coresForWave } from './rewards';

const HOUR = 3_600_000;

export interface OfflineEarnings {
  /** Real time away (0 if the clock went backwards). */
  awayMs: number;
  /** Time that counted, after the cap. */
  countedMs: number;
  capMs: number;
  capped: boolean;
  /** Device clock is earlier than the last save: nothing is granted (GDD §11). */
  tampered: boolean;
  coresPerHour: number;
  shardsPerHour: number;
  cores: number;
  shards: number;
}

export function offlineCapHours(p: Profile): number {
  return (
    REWARDS.offlineCapHours +
    researchLevel(p, 'offlineCap') * RESEARCH_BY_ID.get('offlineCap')!.perLevel
  );
}

/** Cores/hour = f(best wave, research) (GDD §11): one run's worth at best wave, × research. */
export function offlineCoresPerHour(p: Profile): number {
  const research =
    1 + researchLevel(p, 'offlineRate') * RESEARCH_BY_ID.get('offlineRate')!.perLevel;
  return coresForWave(p.bestWave) * REWARDS.offlineRunsPerHour * research;
}

/** Offline income since `p.lastSeen`, capped (8 h, 12 h with research). Pure. */
export function offlineEarnings(p: Profile, now: number): OfflineEarnings {
  const capMs = offlineCapHours(p) * HOUR;
  const raw = now - p.lastSeen;
  const tampered = raw < 0;
  const awayMs = Math.max(0, raw);
  const countedMs = tampered ? 0 : Math.min(awayMs, capMs);
  const hours = countedMs / HOUR;
  const coresPerHour = offlineCoresPerHour(p);
  const shardsPerHour = p.bestWave > 0 ? REWARDS.offlineShardsPerHour : 0;
  return {
    awayMs,
    countedMs,
    capMs,
    capped: awayMs > capMs,
    tampered,
    coresPerHour,
    shardsPerHour,
    cores: Math.floor(coresPerHour * hours),
    shards: Math.floor(shardsPerHour * hours),
  };
}

/** Credit offline income (doubled when `mult` = 2, the rewarded-ad option in Phase 9). */
export function collectOffline(p: Profile, e: OfflineEarnings, now: number, mult = 1): Profile {
  return {
    ...p,
    cores: p.cores + e.cores * mult,
    shards: p.shards + e.shards * mult,
    lastSeen: now,
  };
}
