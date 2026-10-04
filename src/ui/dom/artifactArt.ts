import {
  ARTIFACTS,
  TIER_NAMES,
  type ArtifactGlyph,
  type ArtifactId,
  type ArtifactTier,
} from '../../data/artifacts';
import { C } from './icons';

/**
 * Artifact art (meta/ArtifactPick.dc.html, Codex.dc.html). Rarity has a shape twin for every
 * colour: 1–4 pips, 0 / 1 / 2 / 4 cut corners (Legendary also double-framed), glow none → lg.
 */
export const TIER_COLOR = ['#a3afc6', '#4fa8ff', '#c06bff', '#ffb33d'] as const;
const TIER_RGB = ['163,175,198', '79,168,255', '192,107,255', '255,179,61'] as const;

/** Inner glyphs on a 24 × 24 grid, stroked in ink. */
const GLYPHS: Record<ArtifactGlyph, string> = {
  bolt: '<path d="M13 3l-6 10h6l-2 8 7-11h-6z"/>',
  battery: '<path d="M7 6h10v15H7zM10 3h4"/><path d="M12.5 9l-2 4h3l-2 4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  shieldCrack: '<path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z"/><path d="M12 7l-2 5 3 2-1 4"/>',
  arrow: '<path d="M4 20L19 5M11 5h8v8"/>',
  bounce: '<path d="M3 18l6-10 5 8 6-10"/><path d="M16 6h4v4"/>',
  crystal: '<path d="M12 3l7 4v10l-7 4-7-4V7z"/><path d="M12 7v10M7.5 10l9 4M7.5 14l9-4"/>',
  coin: '<circle cx="12" cy="12" r="8"/><path d="M12 8v8"/>',
  percent:
    '<path d="M6 18L18 6"/><circle cx="7.5" cy="7.5" r="2"/><circle cx="16.5" cy="16.5" r="2"/>',
  overflow: '<path d="M4 8h12M13 5l3 3-3 3M8 16h12M17 13l3 3-3 3"/>',
  heart: '<path d="M12 20s-8-5-8-11a4 4 0 0 1 8-2 4 4 0 0 1 8 2c0 6-8 11-8 11z"/>',
  antenna:
    '<path d="M12 12v9M8 21h8"/><circle cx="12" cy="10" r="2"/><path d="M7 5a7 7 0 0 0 0 10M17 5a7 7 0 0 1 0 10"/>',
  dual: '<path d="M8 4v16M16 4v16M4 8h8M12 16h8"/>',
  rings: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/>',
  anchor: '<circle cx="12" cy="5" r="2"/><path d="M12 7v14M5 13a7 7 0 0 0 14 0M8 11h8"/>',
  blast: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l3 3M15 15l3 3M6 18l3-3M15 9l3-3"/>',
  snow: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
  target:
    '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
  star: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4l-5.3 3 1.2-6-4.5-4.1 6-.7z"/>',
  wrench: '<path d="M4 20l8-8M14 4l6 6-4 4-6-6z"/>',
  chevrons: '<path d="M6 13l6-6 6 6M6 19l6-6 6 6"/>',
  hull: '<path d="M4 19V9l8-5 8 5v10z"/><path d="M9 19v-5h6v5"/>',
  scope: '<circle cx="12" cy="12" r="6"/><path d="M12 2v6M12 16v6M2 12h6M16 12h6"/>',
  cycle: '<path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v5h-5"/>',
  skull:
    '<path d="M12 3a7 7 0 0 0-5 12v4h10v-4a7 7 0 0 0-5-12z"/><circle cx="9.5" cy="11" r="1.2"/><circle cx="14.5" cy="11" r="1.2"/>',
  wing: '<path d="M3 15c6 0 9-4 18-9-2 7-6 12-12 12H3z"/>',
  crate: '<path d="M4 8l8-4 8 4v9l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v9"/>',
  fast: '<path d="M5 6l6 6-6 6M12 6l6 6-6 6"/>',
  repair: '<circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12h8"/>',
};

/** Frame outline for a tier in an s × s box (cut size scales with the box). */
function framePath(tier: ArtifactTier, s: number): string {
  const a = 3;
  const b = s - 3;
  const c = Math.round((s * 10) / 56);
  switch (tier) {
    case 0:
      return `M${a} ${a}H${b}V${b}H${a}z`;
    case 1:
      return `M${a} ${a}H${b - c}L${b} ${a + c}V${b}H${a}z`;
    case 2:
      return `M${a + c} ${a}H${b}V${b - c}L${b - c} ${b}H${a}V${a + c}z`;
    case 3:
      return `M${a + c} ${a}H${b - c}L${b} ${a + c}V${b - c}L${b - c} ${b}H${a + c}L${a} ${b - c}V${a + c}z`;
  }
}

/** Framed artifact icon. `crafted: false` draws the dashed "not crafted" placeholder. */
export function artifactIcon(
  id: ArtifactId,
  tier: ArtifactTier,
  size = 56,
  crafted = true,
): string {
  if (!crafted) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true" style="flex:none;fill:none;stroke:${C.inkFaint};stroke-width:2;stroke-dasharray:4 3"><path d="${framePath(0, size)}"/></svg>`;
  }
  const g = size * 0.46;
  const o = (size - g) / 2;
  const glow =
    size <= 48 && tier > 0 ? `;filter:drop-shadow(0 0 4px rgba(${TIER_RGB[tier]},.45))` : '';
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true" style="flex:none${glow}">
    <path d="${framePath(tier, size)}" style="fill:${C.onAccent};stroke:${TIER_COLOR[tier]};stroke-width:${tier ? 2.5 : 2};stroke-linejoin:round"/>
    <svg x="${o}" y="${o}" width="${g}" height="${g}" viewBox="0 0 24 24" style="fill:none;stroke:${C.ink};stroke-width:2;stroke-linecap:round;stroke-linejoin:round">${GLYPHS[ARTIFACTS[id].glyph]}</svg>
  </svg>`;
}

/** 1–4 rarity pips plus, optionally, the tier name. */
export function tierPips(tier: ArtifactTier, label = true): string {
  const pips = Array.from(
    { length: tier + 1 },
    () => `<span class="pip" style="background:${TIER_COLOR[tier]}"></span>`,
  ).join('');
  return `<span class="pips">${pips}${label ? `<span class="label" style="color:${TIER_COLOR[tier]};margin-left:4px">${TIER_NAMES[tier]}</span>` : ''}</span>`;
}

/**
 * Wraps content in the tier's frame: a 2 px coloured border cut to the tier's corners,
 * doubled for Legendary. The glow sits on the outer element (`.tier-glow`).
 */
export function tierFrame(tier: ArtifactTier, inner: string, innerClass = ''): string {
  if (tier === 3) {
    return `<span class="tf tf3"><span class="tf-gap"><span class="tf-line"><span class="tf-in ${innerClass}">${inner}</span></span></span></span>`;
  }
  return `<span class="tf tf${tier}"><span class="tf-in ${innerClass}">${inner}</span></span>`;
}
