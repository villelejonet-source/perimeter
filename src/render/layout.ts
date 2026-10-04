import { GAME } from '../data/game';

/**
 * Canvas resolution: the 390 × 844 logical design at 2x, for crisp strokes on retina.
 * World units are logical px; multiply by S to get canvas px.
 */
export const S = 2;
export const VIEW_WIDTH = GAME.worldWidth * S;
export const VIEW_HEIGHT = GAME.worldHeight * S;

/** In-run screen zones, logical px (docs/design/screens/in-run/HANDOFF.md "Screen layout"). */
export const ZONES = {
  hudTop: 48,
  hudBottom: 104,
  controlRowTop: 654,
} as const;

/** Design tokens, dark theme (docs/design/design-system/tokens.json). */
export const T = {
  void: 0x06080d,
  surface100: 0x0a0e17,
  surface200: 0x111726,
  surface300: 0x1a2236,
  grid: 0x141b2b,
  line: 0x2a3550,
  lineStrong: 0x5d6e94,
  ink: 0xeaf0fa,
  inkMuted: 0xa3afc6,
  inkFaint: 0x6f7c96,
  accent: 0xc6ff3d,
  onAccent: 0x06080d,
  dmgEnergy: 0xff4fd8,
  dmgKinetic: 0xff7a33,
  dmgCryo: 0x8ff3ff,
  hp: 0xeaf0fa,
  credits: 0xffd84d,
  danger: 0xff3355,
  warning: 0xffd23f,
} as const;

/** CSS colour string for a token. */
export function css(c: number): string {
  return `#${c.toString(16).padStart(6, '0')}`;
}

export const FONT_DISPLAY = 'Oxanium, "Chakra Petch", system-ui, sans-serif';
export const FONT_UI = '"Barlow Semi Condensed", Barlow, system-ui, sans-serif';
/** @deprecated Pre-design UI font; HUD/panel/run-end move to FONT_DISPLAY / FONT_UI. */
export const FONT = FONT_DISPLAY;

/** Legacy palette for the pre-design HUD, panel and run-end (replaced in the HUD step). */
export const COLORS = {
  bg: T.void,
  grid: T.grid,
  path: T.line,
  base: T.accent,
  enemy: T.ink,
  tower: T.dmgEnergy,
  projectile: T.dmgEnergy,
  invalid: T.danger,
  hpBack: T.line,
  hpFill: T.hp,
  panel: T.surface200,
  text: css(T.ink),
  credits: css(T.credits),
  hp: css(T.ink),
  wave: css(T.ink),
  dim: css(T.inkMuted),
} as const;
