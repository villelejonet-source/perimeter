/** 24 × 24 stroke icons from the design system (docs/design/screens/in-run/*.dc.html). */

const svg = (size: number, stroke: string, width: number, body: string): string =>
  `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const C = {
  accent: '#c6ff3d',
  onAccent: '#06080d',
  ink: '#eaf0fa',
  inkMuted: '#a3afc6',
  inkFaint: '#6f7c96',
  credits: '#ffd84d',
  danger: '#ff3355',
  energy: '#ff4fd8',
  kinetic: '#ff7a33',
  cryo: '#8ff3ff',
  warning: '#ffd23f',
  cores: '#b48cff',
  shards: '#5cf2c8',
} as const;

export const icon = {
  coin: (size = 16, color: string = C.credits) =>
    svg(size, color, 2.5, '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v9"/>'),
  base: (size = 16) =>
    svg(size, C.accent, 2.5, '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/>'),
  clock: (size = 16) =>
    svg(size, C.inkMuted, 2.5, '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  xOctagon: (size = 16) =>
    svg(
      size,
      C.danger,
      2.5,
      '<path d="M8.3 3h7.4L21 8.3v7.4L15.7 21H8.3L3 15.7V8.3z"/><path d="M9 9l6 6M15 9l-6 6"/>',
    ),
  checkCircle: (size = 16) =>
    svg(size, C.accent, 2.5, '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.8 2.8L16 9.5"/>'),
  lock: (size = 14, color: string = C.inkFaint, width = 2.5) =>
    svg(
      size,
      color,
      width,
      '<rect x="5" y="11" width="14" height="10" rx="1"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    ),
  pause: () => svg(24, C.ink, 3, '<path d="M9 6v12M15 6v12"/>'),
  play: () => svg(24, C.ink, 2.5, '<path d="M8 5.5l11 6.5-11 6.5z"/>'),
  close: (size = 24, color: string = C.inkMuted) =>
    svg(size, color, 2.5, '<path d="M6 6l12 12M18 6L6 18"/>'),
  /** Damage-type twins (design-system README): diamond+bolt, square+slug, hexagon+snowflake. */
  energy: (size = 16) =>
    svg(size, C.energy, 2.5, '<path d="M12 2l10 10-10 10L2 12z"/><path d="M13 7l-3 5h4l-3 5"/>'),
  kinetic: (size = 16) =>
    svg(size, C.kinetic, 2.5, '<rect x="4" y="4" width="16" height="16"/><path d="M9 12h6"/>'),
  cryo: (size = 16) =>
    svg(
      size,
      C.cryo,
      2,
      '<path d="M12 2.5l8.2 4.75v9.5L12 21.5l-8.2-4.75v-9.5z"/><path d="M12 7.5v9M8.1 9.75l7.8 4.5M15.9 9.75l-7.8 4.5"/>',
    ),
  /** Currency twins (design-system README): Cores = cube, Shards = crystal. */
  cores: (size = 20) =>
    svg(
      size,
      C.cores,
      2,
      '<path d="M12 2.5l8.5 4.75v9.5L12 21.5l-8.5-4.75v-9.5z"/><path d="M12 12l8.5-4.75M12 12L3.5 7.25M12 12v9.5"/>',
    ),
  shards: (size = 20) =>
    svg(size, C.shards, 2, '<path d="M12 2l6 8-6 12-6-12z"/><path d="M6 10h12"/>'),
  gear: (size = 24) =>
    svg(
      size,
      C.ink,
      2,
      '<circle cx="12" cy="12" r="3.5"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
    ),
  back: (size = 24) => svg(size, C.ink, 2.5, '<path d="M15 5l-7 7 7 7"/>'),
  next: (size = 24) => svg(size, C.ink, 2.5, '<path d="M9 5l7 7-7 7"/>'),
  playSolid: (size = 20, color: string = C.onAccent) =>
    svg(size, color, 2.5, `<path d="M7 4.5l13 7.5-13 7.5z" fill="${color}"/>`),
  exit: (size = 20) => svg(size, C.ink, 2.5, '<path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9"/>'),
  /** Fast-forward chevrons (elite banner). */
  chevrons: () => svg(28, C.ink, 2.5, '<path d="M6 6l6 6-6 6M12 6l6 6-6 6"/>'),
  warning: (size = 28) =>
    svg(size, C.warning, 2.5, '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>'),
} as const;
