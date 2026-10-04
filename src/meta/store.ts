import type { ArtifactId } from '../data/artifacts';
import type { ResearchId } from '../data/research';
import { craftArtifact } from './artifacts';
import type { Storage } from '../platform/storage';
import type { SimSnapshot } from '../sim/snapshot';
import type { SaveFile } from './migrations';
import { collectOffline, offlineEarnings, type OfflineEarnings } from './offline';
import type { Profile, Settings } from './profile';
import { buyResearch } from './research';
import { applyRunRewards, type RunRewards } from './rewards';
import { SaveStore } from './save';

/**
 * The live save for the app session: profile, the run in progress and pending offline income.
 * Every change is written through the platform storage (writes are serialized).
 */
export class MetaStore {
  private save!: SaveFile;
  /** Offline income found at launch, until collected. */
  pendingOffline: OfflineEarnings | null = null;
  private writing: Promise<void> = Promise.resolve();
  private readonly saves: SaveStore;

  constructor(
    storage: Storage,
    private readonly clock: () => number = Date.now,
  ) {
    this.saves = new SaveStore(storage);
  }

  async load(): Promise<void> {
    const now = this.clock();
    const { save } = await this.saves.load(now);
    this.save = save;
    const e = offlineEarnings(save.profile, now);
    this.pendingOffline = e.cores > 0 || e.shards > 0 || e.tampered ? e : null;
    if (!this.pendingOffline) this.save.profile = { ...save.profile, lastSeen: now };
  }

  get profile(): Profile {
    return this.save.profile;
  }

  get run(): SimSnapshot | null {
    return this.save.run;
  }

  /** Collect offline income (mult 2 = rewarded ad, Phase 9). */
  collectOffline(mult = 1): void {
    if (!this.pendingOffline) return;
    this.save.profile = collectOffline(this.save.profile, this.pendingOffline, this.clock(), mult);
    this.pendingOffline = null;
    void this.flush();
  }

  craft(id: ArtifactId): void {
    this.save.profile = craftArtifact(this.save.profile, id);
    void this.flush();
  }

  buy(id: ResearchId): void {
    this.save.profile = buyResearch(this.save.profile, id);
    void this.flush();
  }

  /** Autosave the run in progress (each wave, and when the app goes to the background). */
  saveRun(snapshot: SimSnapshot): Promise<void> {
    this.save.run = snapshot;
    return this.flush();
  }

  /** Pick the sector for the next run (main menu). */
  selectMap(mapId: string): void {
    this.save.profile = { ...this.save.profile, mapId };
    void this.flush();
  }

  updateSettings(patch: Partial<Settings>): void {
    this.save.profile = {
      ...this.save.profile,
      settings: { ...this.save.profile.settings, ...patch },
    };
    void this.flush();
  }

  setTutorialDone(done: boolean): void {
    this.save.profile = { ...this.save.profile, tutorialDone: done };
    void this.flush();
  }

  /** Run over (base fell or retreat): pay out and clear the run. */
  finishRun(wave: number, rewards: RunRewards, mapId: string): void {
    this.save.profile = applyRunRewards(this.save.profile, wave, rewards, mapId);
    this.save.run = null;
    void this.flush();
  }

  /** Writes the save (stamping lastSeen for offline income). Writes never overlap. */
  flush(): Promise<void> {
    const now = this.clock();
    this.save.profile = { ...this.save.profile, lastSeen: now };
    this.save.savedAt = now;
    const snapshot = structuredClone(this.save);
    this.writing = this.writing.then(() => this.saves.write(snapshot));
    return this.writing;
  }
}
