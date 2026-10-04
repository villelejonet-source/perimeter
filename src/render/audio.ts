import type Phaser from 'phaser';
import { MUSIC, SFX, type MusicId, type SfxId, type SoundDef } from '../data/audio';
import type { HapticEvent } from '../platform/haptics';
import { getPlatform, getStore } from './registry';

/** Files under src/assets/audio/, resolved by Vite at build time. */
const FILES = import.meta.glob<string>('../assets/audio/*', {
  eager: true,
  query: '?url',
  import: 'default',
});

function url(def: SoundDef): string | null {
  return def.file ? (FILES[`../assets/audio/${def.file}`] ?? null) : null;
}

const key = (kind: 'sfx' | 'music', id: string): string => `${kind}.${id}`;

/** Queue every delivered sound for loading (BootScene.preload). Missing files are skipped. */
export function preloadAudio(scene: Phaser.Scene): void {
  for (const [id, def] of Object.entries(SFX)) {
    const u = url(def);
    if (u) scene.load.audio(key('sfx', id), u);
  }
  for (const [id, def] of Object.entries(MUSIC)) {
    const u = url(def);
    if (u) scene.load.audio(key('music', id), u);
  }
}

const lastPlayed = new Map<SfxId, number>();
let currentMusic: Phaser.Sound.BaseSound | null = null;
let currentMusicId: MusicId | null = null;

/**
 * Sound effects, gated by Settings and throttled per sound. Silent until files exist
 * (src/data/audio.ts).
 */
export function playSfx(scene: Phaser.Scene, id: SfxId): void {
  if (!getStore(scene).profile.settings.sound) return;
  const k = key('sfx', id);
  if (!scene.cache.audio.exists(k)) return;
  const def = SFX[id];
  const now = scene.time.now;
  if (now - (lastPlayed.get(id) ?? -Infinity) < def.throttleMs) return;
  lastPlayed.set(id, now);
  scene.sound.play(k, { volume: def.volume });
}

/** Switch the music track (or stop it when music is off). */
export function playMusic(scene: Phaser.Scene, id: MusicId): void {
  const on = getStore(scene).profile.settings.music;
  const k = key('music', id);
  if (!on || !scene.cache.audio.exists(k)) {
    currentMusic?.stop();
    currentMusic = null;
    currentMusicId = null;
    return;
  }
  if (currentMusicId === id && currentMusic?.isPlaying) return;
  currentMusic?.stop();
  currentMusic = scene.sound.add(k, { loop: true, volume: MUSIC[id].volume });
  currentMusic.play();
  currentMusicId = id;
}

/** Haptics, gated by Settings. */
export function buzz(scene: Phaser.Scene, event: HapticEvent): void {
  if (getStore(scene).profile.settings.haptics) getPlatform(scene).haptics.play(event);
}
