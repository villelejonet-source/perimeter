import type Phaser from 'phaser';

/** Graphics helpers for the design system's dashed outlines and hatch fills (no allocation). */

export function dashedLine(
  g: Phaser.GameObjects.Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  dash: number,
  gap: number,
): void {
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len === 0) return;
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  for (let d = 0; d < len; d += dash + gap) {
    const e = Math.min(d + dash, len);
    g.lineBetween(x1 + ux * d, y1 + uy * d, x1 + ux * e, y1 + uy * e);
  }
}

export function dashedRect(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  dash: number,
  gap: number,
): void {
  dashedLine(g, x, y, x + w, y, dash, gap);
  dashedLine(g, x + w, y, x + w, y + h, dash, gap);
  dashedLine(g, x + w, y + h, x, y + h, dash, gap);
  dashedLine(g, x, y + h, x, y, dash, gap);
}

export function dashedCircle(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  r: number,
  dash: number,
  gap: number,
): void {
  const step = (dash + gap) / r;
  const arc = dash / r;
  for (let a = 0; a < Math.PI * 2; a += step) {
    g.beginPath();
    g.arc(cx, cy, r, a, Math.min(a + arc, Math.PI * 2));
    g.strokePath();
  }
}

/** 45° hatch lines clipped to a rectangle (lines run bottom-left → top-right). */
export function hatchRect(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  spacing: number,
): void {
  // Lines x' + y' = c for c in (0, w + h), in rect-local coordinates.
  for (let c = spacing / 2; c < w + h; c += spacing) {
    const x1 = Math.max(0, c - h);
    const y1 = c - x1;
    const x2 = Math.min(w, c);
    const y2 = c - x2;
    g.lineBetween(x + x1, y + y1, x + x2, y + y2);
  }
}

/** Corner brackets around a rectangle (selected-tower marker). */
export function cornerBrackets(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  len: number,
): void {
  const r = x + w;
  const b = y + h;
  g.lineBetween(x, y, x + len, y);
  g.lineBetween(x, y, x, y + len);
  g.lineBetween(r, y, r - len, y);
  g.lineBetween(r, y, r, y + len);
  g.lineBetween(x, b, x + len, b);
  g.lineBetween(x, b, x, b - len);
  g.lineBetween(r, b, r - len, b);
  g.lineBetween(r, b, r, b - len);
}
