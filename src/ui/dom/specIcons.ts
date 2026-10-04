import type { DamageType } from '../../data/damage';
import type { SpecId } from '../../data/specs';
import { C } from './icons';

/**
 * 48 × 48 spec card icons (Specialization.dc.html): the damage type's frame shape twin
 * (energy diamond, kinetic square, cryo hexagon) with a glyph per spec. The handoff only drew
 * the three Pulse Laser glyphs; the rest follow the same style.
 */
const FRAME: Record<DamageType, string> = {
  energy: '<path d="M24 4l20 20-20 20L4 24z"/>',
  kinetic: '<rect x="5" y="5" width="38" height="38"/>',
  utility: '<path d="M24 4l17.3 10v20L24 44 6.7 34V14z"/>',
};

const COLOR: Record<DamageType, string> = { energy: C.energy, kinetic: C.kinetic, utility: C.cryo };

const GLYPH: Record<SpecId, string> = {
  overclock: 'M16 18l6 6-6 6M24 18l6 6-6 6',
  flechette: 'M13 17h10M17 24h16M13 31h10',
  prism: 'M12 24h9M21 24l11-7M21 24h14M21 24l11 7',
  accelerator: 'M12 24h22M27 17l7 7-7 7M13 18v12',
  executioner: 'M24 12v7M24 29v7M12 24h7M29 24h7M24 21a3 3 0 1 0 .01 0',
  ionRail: 'M10 24h8l3-5 6 10 3-5h8',
  plasmaPools: 'M24 13c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11zM13 33c4-2 18-2 22 0',
  cluster: 'M24 20v8M20 24h8M14 14l4 4M34 14l-4 4M14 34l4-4M34 34l-4-4',
  siege: 'M14 32c3-12 17-12 20 0M24 14v10M19 19l5 5 5-5',
  storm: 'M20 12l-5 12h7l-5 12M32 12l-5 12h7l-5 12',
  overload: 'M25 12l-6 12h8l-6 12M12 16l4 3M36 16l-4 3M12 32l4-3M36 32l-4-3',
  capacitor: 'M15 18h16v12H15zM31 22h3v4M19 22v4M23 22v4M27 22v4',
  deepFreeze: 'M24 12v24M14 18l20 12M34 18L14 30',
  brittle: 'M24 11l-4 9 6 4-5 9 3 5',
  stasisField: 'M24 19a5 5 0 1 0 .01 0M24 13a11 11 0 1 0 .01 0',
  hunterKiller: 'M24 14a10 10 0 1 0 .01 0M24 10v8M24 30v8M10 24h8M30 24h8',
  saturation: 'M14 18h4M22 18h4M30 18h4M14 25h4M22 25h4M30 25h4M18 32h4M26 32h4',
  empWarheads: 'M25 15l-5 9h6l-5 9M12 25a12 12 0 0 1 24 0',
};

export function specIcon(spec: SpecId, type: DamageType, size = 48): string {
  const c = COLOR[type];
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true" style="fill:#06080d;stroke:${c};stroke-width:2.5;stroke-linejoin:round;stroke-linecap:round">${FRAME[type]}<path d="${GLYPH[spec]}" style="fill:none"/></svg>`;
}

/** Small damage-type frame (16–18 px) for chips. */
export function typeFrame(type: DamageType, size = 16, color?: string): string {
  const c = color ?? COLOR[type];
  const shape =
    type === 'energy'
      ? '<path d="M12 3l9 9-9 9-9-9z"/>'
      : type === 'kinetic'
        ? '<rect x="4" y="4" width="16" height="16"/>'
        : '<path d="M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9z"/>';
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" style="fill:none;stroke:${c};stroke-width:2.5;stroke-linejoin:round">${shape}</svg>`;
}

export const TYPE_LABEL: Record<DamageType, string> = {
  energy: 'Energy',
  kinetic: 'Kinetic',
  utility: 'Cryo',
};
export const TYPE_COLOR = COLOR;
