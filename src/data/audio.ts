import type { TowerKind } from './towers';

/**
 * Sound and music manifest (Phase 8). Decided 2026-10-04: no audio assets yet, so every entry's
 * `file` is null and the game is silent; drop files into src/assets/audio/ and set `file` to
 * wire them up. Nothing else needs to change.
 */
export type SfxId =
  | `shot.${TowerKind}`
  | 'blast'
  | 'death'
  | 'bossDeath'
  | 'freeze'
  | 'shieldBreak'
  | 'leak'
  | 'waveStart'
  | 'bossWave'
  | 'place'
  | 'upgrade'
  | 'sell'
  | 'specialize'
  | 'artifact'
  | 'uiTap'
  | 'runEnd'
  | 'newBest';

export type MusicId = 'menu' | 'battle';

export interface SoundDef {
  /** File name in src/assets/audio/ (null = not delivered yet, plays nothing). */
  file: string | null;
  volume: number;
  /** Minimum ms between plays of this sound (weapons fire constantly). */
  throttleMs: number;
}

const sfx = (volume: number, throttleMs = 0): SoundDef => ({ file: null, volume, throttleMs });

export const SFX: Record<SfxId, SoundDef> = {
  'shot.pulseLaser': sfx(0.25, 60),
  'shot.railgun': sfx(0.45, 90),
  'shot.plasmaMortar': sfx(0.4, 90),
  'shot.arcCoil': sfx(0.35, 80),
  'shot.cryoProjector': sfx(0.25, 80),
  'shot.swarmLauncher': sfx(0.35, 90),
  blast: sfx(0.45, 70),
  death: sfx(0.35, 50),
  bossDeath: sfx(0.9),
  freeze: sfx(0.4, 120),
  shieldBreak: sfx(0.45, 100),
  leak: sfx(0.8),
  waveStart: sfx(0.5),
  bossWave: sfx(0.9),
  place: sfx(0.6),
  upgrade: sfx(0.6),
  sell: sfx(0.5),
  specialize: sfx(0.8),
  artifact: sfx(0.8),
  uiTap: sfx(0.4, 40),
  runEnd: sfx(0.8),
  newBest: sfx(0.9),
};

export const MUSIC: Record<MusicId, SoundDef> = {
  menu: { file: null, volume: 0.5, throttleMs: 0 },
  battle: { file: null, volume: 0.4, throttleMs: 0 },
};
