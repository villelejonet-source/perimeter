import type { Storage } from '../platform/storage';
import { CURRENT_SCHEMA_VERSION, migrate, SaveError, type SaveFile } from './migrations';
import { newProfile } from './profile';

const KEY = 'perimeter.save';
const CORRUPT_KEY = 'perimeter.save.corrupt';

/**
 * Loads and writes the single save file through the platform storage (never raw
 * localStorage, CLAUDE.md rule 7). An unreadable save is kept aside, not overwritten blindly.
 */
export class SaveStore {
  constructor(private readonly storage: Storage) {}

  async load(now: number): Promise<{ save: SaveFile; fresh: boolean }> {
    const raw = await this.storage.get<unknown>(KEY);
    if (raw === null) return { save: this.blank(now), fresh: true };
    try {
      return { save: migrate(raw), fresh: false };
    } catch (e) {
      if (!(e instanceof SaveError)) throw e;
      console.warn(`[save] ${e.message}; starting fresh, old save kept under ${CORRUPT_KEY}`);
      await this.storage.set(CORRUPT_KEY, raw);
      return { save: this.blank(now), fresh: true };
    }
  }

  async write(save: SaveFile): Promise<void> {
    await this.storage.set(KEY, { ...save, schemaVersion: CURRENT_SCHEMA_VERSION });
  }

  private blank(now: number): SaveFile {
    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      profile: newProfile(now),
      run: null,
      savedAt: now,
    };
  }
}
