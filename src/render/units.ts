import type Phaser from 'phaser';
import manifest from '../assets/units/manifest.json';
import { S } from './layout';

/** One atlas for every unit sprite, so the whole battlefield batches under one blend mode. */
export const UNIT_ATLAS = 'units';

/** Every unit SVG from the Claude Design handoff (synced by `npm run sync:design`). */
const SOURCES = import.meta.glob<string>('../assets/units/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
});

interface ManifestEntry {
  key: string;
  frame: number[];
  glowPad: number;
}

interface UnitSpec {
  key: string;
  svg: string;
  /** On-screen size in logical px of the glow-padded SVG. */
  w: number;
  h: number;
}

/**
 * On-screen scale of the glow-padded art (HANDOFF.md "Map geometry"): towers 84 → 42 px,
 * enemies and status overlays 52 → 32 px, bosses 136 → 68 px, base 120 → 72 px.
 * Projectiles and effects use 0.6 and are stretched at runtime.
 */
function displayScale(key: string): number {
  if (key.startsWith('tower-') || key.startsWith('boss-')) return 0.5;
  if (key.startsWith('enemy-') || key.startsWith('state-')) return 32 / 52;
  return 0.6;
}

const SPECS: readonly UnitSpec[] = (manifest satisfies ManifestEntry[]).map((m) => {
  const svg = SOURCES[`../assets/units/${m.key}.svg`];
  if (!svg) throw new Error(`Unit SVG missing for ${m.key}`);
  const scale = displayScale(m.key);
  return {
    key: m.key,
    svg,
    w: ((m.frame[0] ?? 0) + m.glowPad * 2) * scale,
    h: ((m.frame[1] ?? 0) + m.glowPad * 2) * scale,
  };
});

const BY_KEY = new Map(SPECS.map((s) => [s.key, s]));

function spec(key: string): UnitSpec {
  const s = BY_KEY.get(key);
  if (!s) throw new Error(`Unknown unit ${key}`);
  return s;
}

/**
 * SVGs are imported as text (`?raw`) and handed to Phaser as base64 data URIs: Vite would
 * otherwise inline small files as URL-encoded data URIs, which Phaser's loader can't decode.
 * The unit SVGs are plain ASCII, so btoa is safe.
 */
const toDataUri = (svg: string): string => `data:image/svg+xml;base64,${btoa(svg)}`;

/** The unit's SVG as a data URI, for DOM UI (build bar, tower panel, alerts). */
export function unitSvgUri(key: string): string {
  return toDataUri(spec(key).svg);
}

/** Logical on-screen size of a unit frame. */
export function unitSize(key: string): { w: number; h: number } {
  const s = spec(key);
  return { w: s.w, h: s.h };
}

const srcKey = (key: string): string => `svg:${key}`;

/** Queue every unit SVG, rasterised at canvas resolution (logical size × S). */
export function preloadUnits(scene: Phaser.Scene): void {
  for (const s of SPECS) {
    scene.load.svg(srcKey(s.key), toDataUri(s.svg), {
      width: Math.round(s.w * S),
      height: Math.round(s.h * S),
    });
  }
}

/**
 * Packs the rasterised SVGs into one dynamic-texture atlas (shelf packing, tallest first)
 * and registers each as a named frame. Call once after preloadUnits has finished.
 */
export function bakeUnitAtlas(scene: Phaser.Scene): void {
  if (scene.textures.exists(UNIT_ATLAS)) return;
  const pad = 2;
  const maxW = 1024;
  const sorted = [...SPECS].sort((a, b) => b.h - a.h);
  const placed: { key: string; x: number; y: number; w: number; h: number }[] = [];
  let x = 0;
  let y = 0;
  let rowH = 0;
  for (const s of sorted) {
    const w = Math.round(s.w * S);
    const h = Math.round(s.h * S);
    if (x + w > maxW) {
      x = 0;
      y += rowH + pad;
      rowH = 0;
    }
    placed.push({ key: s.key, x, y, w, h });
    x += w + pad;
    rowH = Math.max(rowH, h);
  }
  const atlas = scene.textures.addDynamicTexture(UNIT_ATLAS, maxW, y + rowH);
  if (!atlas) throw new Error('Could not create unit atlas');
  for (const p of placed) {
    atlas.stamp(srcKey(p.key), undefined, p.x, p.y, { originX: 0, originY: 0 });
    atlas.add(p.key, 0, p.x, p.y, p.w, p.h);
  }
  for (const p of placed) scene.textures.remove(srcKey(p.key));
}
