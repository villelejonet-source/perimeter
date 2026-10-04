import type Phaser from 'phaser';
import type { MetaStore } from '../meta/store';
import type { Platform } from '../platform';

const PLATFORM_KEY = 'platform';
const STORE_KEY = 'metaStore';
/** Dev builds only: every tower unlocked (`?unlock=all`). */
export const DEV_UNLOCK_ALL_KEY = 'devUnlockAll';

export function setPlatform(game: Phaser.Game, platform: Platform): void {
  game.registry.set(PLATFORM_KEY, platform);
}

export function getPlatform(scene: Phaser.Scene): Platform {
  return scene.registry.get(PLATFORM_KEY) as Platform;
}

export function setStore(game: Phaser.Game, store: MetaStore): void {
  game.registry.set(STORE_KEY, store);
}

/** The live save (profile, run in progress, pending offline income). */
export function getStore(scene: Phaser.Scene): MetaStore {
  return scene.registry.get(STORE_KEY) as MetaStore;
}

/** Set by Settings → Performance test; GameScene reads and clears it. */
export const STRESS_KEY = 'stressTest';
