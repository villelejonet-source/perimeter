import type { SimSnapshot } from '../sim/snapshot';
import { starterArtifacts, type Profile } from './profile';

/** Bump when the save format changes, and add a migration from the previous version. */
export const CURRENT_SCHEMA_VERSION = 2;

export interface SaveFile {
  schemaVersion: number;
  profile: Profile;
  /** The run in progress (resumed exactly), or null. */
  run: SimSnapshot | null;
  savedAt: number;
}

type Raw = Record<string, unknown>;

/**
 * Migrations keyed by the version they upgrade FROM. Each takes the raw object at that
 * version and returns it at version + 1. Never edit a shipped migration; add a new one.
 */
const MIGRATIONS: Record<number, (raw: Raw) => Raw> = {
  // 0 → 1: dev builds before persistence had no schemaVersion.
  0: (raw) => ({ ...raw, schemaVersion: 1, run: raw.run ?? null }),
  // 1 → 2 (Phase 7, artifacts): profiles get the free starter artifacts; a saved run gets the
  // artifact fields with nothing picked and an empty pool (it started before artifacts existed).
  1: (raw) => {
    const profile = raw.profile as Raw | undefined;
    return {
      ...raw,
      schemaVersion: 2,
      profile: profile ? { artifacts: starterArtifacts(), ...profile } : profile,
      run: raw.run ? runV1toV2(raw.run as Raw) : null,
    };
  },
};

const NO_ARTIFACT_META = { artifactPool: [], artifactChoices: 3, freeRerolls: 0 };

function runV1toV2(run: Raw): Raw {
  const config = run.config as Raw;
  const state = run.state as Raw;
  const withMeta = (o: Raw): Raw => ({ ...o, meta: { ...NO_ARTIFACT_META, ...(o.meta as Raw) } });
  return {
    ...run,
    config: config.meta ? withMeta(config) : config,
    state: {
      ...withMeta(state),
      towers: (state.towers as Raw[]).map((t) => ({ spec2: null, ...t })),
      projectiles: (state.projectiles as Raw[]).map((p) => ({ spec2: null, ...p })),
      artifacts: [],
      offer: null,
      offersQueued: 0,
      rerolls: 0,
      freeRerolls: 0,
      dualSpecUsed: false,
    },
  };
}

export class SaveError extends Error {}

function isProfile(p: unknown): p is Profile {
  if (typeof p !== 'object' || p === null) return false;
  const o = p as Record<string, unknown>;
  return (
    ['cores', 'shards', 'bestWave', 'milestoneClaimed', 'runs', 'lastSeen'].every(
      (k) => typeof o[k] === 'number',
    ) &&
    typeof o.research === 'object' &&
    o.research !== null &&
    typeof o.artifacts === 'object' &&
    o.artifacts !== null
  );
}

/** Upgrade any older save to the current version and validate it. Throws SaveError if unusable. */
export function migrate(raw: unknown): SaveFile {
  if (typeof raw !== 'object' || raw === null) throw new SaveError('Save is not an object');
  let obj = raw as Raw;
  let version = typeof obj.schemaVersion === 'number' ? obj.schemaVersion : 0;
  if (version > CURRENT_SCHEMA_VERSION) {
    throw new SaveError(`Save is from a newer version (${version})`);
  }
  while (version < CURRENT_SCHEMA_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) throw new SaveError(`No migration from version ${version}`);
    obj = step(obj);
    version = obj.schemaVersion as number;
  }
  if (!isProfile(obj.profile)) throw new SaveError('Save has no valid profile');
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    profile: obj.profile,
    run: (obj.run as SimSnapshot | null) ?? null,
    savedAt: typeof obj.savedAt === 'number' ? obj.savedAt : 0,
  };
}
