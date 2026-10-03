import { GAME } from '../data/game';

/** Design resolution: portrait, ~19.5:9 like modern iPhones, 2x for crisp lines on retina. */
export const VIEW_WIDTH = 720;
export const VIEW_HEIGHT = 1560;

/** World units → screen pixels. */
export const S = VIEW_WIDTH / GAME.worldWidth;

export const COLORS = {
  bg: 0x05060d,
  grid: 0x1a2a5a,
  path: 0x1d6cff,
  base: 0x7cff6b,
  enemy: 0xff3d7f,
  tower: 0x2cf6ff,
  projectile: 0xfff36b,
  invalid: 0xff3b3b,
  hpBack: 0x2a0a18,
  hpFill: 0x7cff6b,
  panel: 0x0b1024,
  text: '#cfe8ff',
  credits: '#fff36b',
  hp: '#ff6b9a',
  wave: '#2cf6ff',
  dim: '#6d7fa8',
} as const;

export const FONT = 'ui-monospace, Menlo, monospace';
