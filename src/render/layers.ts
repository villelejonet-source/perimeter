import type Phaser from 'phaser';

/**
 * Additive glows render together in one layer, solid bodies in another, so the
 * WebGL batch is never flushed by alternating blend modes between objects.
 */
export interface NeonLayers {
  glow: Phaser.GameObjects.Layer;
  body: Phaser.GameObjects.Layer;
}

export function createNeonLayers(scene: Phaser.Scene): NeonLayers {
  const glow = scene.add.layer().setBlendMode('ADD');
  const body = scene.add.layer();
  return { glow, body };
}
