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
  energy: (size = 16) =>
    svg(size, C.energy, 2.5, '<path d="M12 2l10 10-10 10L2 12z"/><path d="M13 7l-3 5h4l-3 5"/>'),
} as const;
