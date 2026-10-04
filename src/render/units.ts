import type Phaser from 'phaser';
import baseCritical from '../assets/units/base-critical.svg?raw';
import baseDamaged from '../assets/units/base-damaged.svg?raw';
import baseHealthy from '../assets/units/base-healthy.svg?raw';
import enemyDrone from '../assets/units/enemy-drone.svg?raw';
import projLaserBeam from '../assets/units/proj-laser-beam.svg?raw';
import pulseL1Base from '../assets/units/tower-pulse-laser-l1-base.svg?raw';
import pulseL1Turret from '../assets/units/tower-pulse-laser-l1-turret.svg?raw';
import pulseL5Base from '../assets/units/tower-pulse-laser-l5-base.svg?raw';
import pulseL5Turret from '../assets/units/tower-pulse-laser-l5-turret.svg?raw';
import { S } from './layout';

/** One atlas for every unit sprite, so the whole battlefield batches under one blend mode. */
export const UNIT_ATLAS = 'units';

interface UnitSpec {
  key: string;
  /** SVG source text. */
  svg: string;
  /** On-screen size in logical px of the glow-padded SVG frame (docs/design/units/manifest.json). */
  w: number;
  h: number;
}

/**
 * Display sizes from HANDOFF.md "Map geometry": towers 84 → 42 px (0.5), enemies 52 → 32 px,
 * base 120 → 72 px (0.6). The beam is 76 × 20 → 46 × 12 px and is stretched at runtime.
 */
const SPECS: readonly UnitSpec[] = [
  { key: 'enemy-drone', svg: enemyDrone, w: 32, h: 32 },
  { key: 'tower-pulse-laser-l1-base', svg: pulseL1Base, w: 42, h: 42 },
  { key: 'tower-pulse-laser-l1-turret', svg: pulseL1Turret, w: 42, h: 42 },
  { key: 'tower-pulse-laser-l5-base', svg: pulseL5Base, w: 42, h: 42 },
  { key: 'tower-pulse-laser-l5-turret', svg: pulseL5Turret, w: 42, h: 42 },
  { key: 'base-healthy', svg: baseHealthy, w: 72, h: 72 },
  { key: 'base-damaged', svg: baseDamaged, w: 72, h: 72 },
  { key: 'base-critical', svg: baseCritical, w: 72, h: 72 },
  { key: 'proj-laser-beam', svg: projLaserBeam, w: 46, h: 12 },
];

/** The unit's SVG as a data URI, for DOM UI (build bar, tower panel). */
export function unitSvgUri(key: string): string {
  const spec = SPECS.find((s) => s.key === key);
  if (!spec) throw new Error(`Unknown unit ${key}`);
  return toDataUri(spec.svg);
}

/** Logical size of a unit frame. */
export function unitSize(key: string): { w: number; h: number } {
  const spec = SPECS.find((s) => s.key === key);
  if (!spec) throw new Error(`Unknown unit ${key}`);
  return { w: spec.w, h: spec.h };
}

const srcKey = (key: string): string => `svg:${key}`;

/**
 * SVGs are imported as text (`?raw`) and handed to Phaser as base64 data URIs: Vite would
 * otherwise inline small files as URL-encoded data URIs, which Phaser's loader can't decode.
 * The unit SVGs are plain ASCII, so btoa is safe.
 */
const toDataUri = (svg: string): string => `data:image/svg+xml;base64,${btoa(svg)}`;

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
 * Packs the rasterised SVGs into one dynamic-texture atlas (simple shelf packing) and
 * registers each as a named frame. Call once after preloadUnits has finished.
 */
export function bakeUnitAtlas(scene: Phaser.Scene): void {
  if (scene.textures.exists(UNIT_ATLAS)) return;
  const pad = 2;
  const maxW = 512;
  const placed: { key: string; x: number; y: number; w: number; h: number }[] = [];
  let x = 0;
  let y = 0;
  let rowH = 0;
  for (const s of SPECS) {
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
