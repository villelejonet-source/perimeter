import type Phaser from 'phaser';

/** Single atlas so every neon sprite shares one texture and batches into few draw calls. */
export const ATLAS = 'neon';

export const FRAME = {
  glow: 'glow',
  diamond: 'diamond',
  hex: 'hex',
  dot: 'dot',
} as const;

const CELL = 64;

/**
 * Draw neon vector shapes once with Graphics and bake them into one atlas texture.
 * Draw order matters for batching: keep additive glows and normal bodies in separate
 * layers (see `NeonLayers`) so blend mode does not flip per object.
 */
export function bakeTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists(ATLAS)) return;
  const g = scene.make.graphics({}, false);
  const frames: string[] = [];

  // Cell 0: soft radial glow (white, tinted at use site).
  const r = CELL / 2;
  for (let i = r; i > 0; i -= 2) {
    g.fillStyle(0xffffff, 0.06 * (1 - i / r) + 0.01);
    g.fillCircle(r, r, i);
  }
  frames.push(FRAME.glow);

  // Cell 1: enemy diamond (24x24 centred in cell).
  let ox = CELL + 20;
  const oy = 20;
  g.lineStyle(3, 0xffffff, 1);
  g.fillStyle(0xffffff, 0.25);
  g.beginPath();
  g.moveTo(ox + 12, oy + 1);
  g.lineTo(ox + 23, oy + 12);
  g.lineTo(ox + 12, oy + 23);
  g.lineTo(ox + 1, oy + 12);
  g.closePath();
  g.fillPath();
  g.strokePath();
  frames.push(FRAME.diamond);

  // Cell 2: tower hexagon.
  ox = CELL * 2 + r;
  g.fillStyle(0xffffff, 0.2);
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    pts.push({ x: ox + Math.cos(a) * 17, y: r + Math.sin(a) * 17 });
  }
  g.fillPoints(pts, true);
  g.strokePoints(pts, true);
  frames.push(FRAME.hex);

  // Cell 3: projectile dot.
  g.fillStyle(0xffffff, 1);
  g.fillCircle(CELL * 3 + r, r, 4);
  frames.push(FRAME.dot);

  g.generateTexture(ATLAS, CELL * frames.length, CELL);
  g.destroy();

  const tex = scene.textures.get(ATLAS);
  frames.forEach((name, i) => tex.add(name, 0, i * CELL, 0, CELL, CELL));
}
