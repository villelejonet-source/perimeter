import type Phaser from 'phaser';
import type { Platform } from '../platform';

const PLATFORM_KEY = 'platform';

export function setPlatform(game: Phaser.Game, platform: Platform): void {
  game.registry.set(PLATFORM_KEY, platform);
}

export function getPlatform(scene: Phaser.Scene): Platform {
  return scene.registry.get(PLATFORM_KEY) as Platform;
}
