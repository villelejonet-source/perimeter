import Phaser from 'phaser';
import { FONT_DISPLAY, FONT_UI, T } from '../layout';
import { bakeUnitAtlas, preloadUnits } from '../units';

/** Weights used by the design system's type styles. */
const FONT_FACES = [
  `600 16px ${FONT_DISPLAY}`,
  `700 16px ${FONT_DISPLAY}`,
  `800 16px ${FONT_DISPLAY}`,
  `500 16px ${FONT_UI}`,
  `600 16px ${FONT_UI}`,
  `700 16px ${FONT_UI}`,
];

/** Registry key holding the scene to start after boot (default 'Game'). */
export const NEXT_SCENE_KEY = 'nextScene';

/** Loads unit SVGs and bundled fonts, bakes the unit atlas, then starts `next`. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    this.cameras.main.setBackgroundColor(T.void);
    preloadUnits(this);
  }

  create(): void {
    bakeUnitAtlas(this);
    // Phaser Text rasterises immediately, so fonts must be ready before any scene draws text.
    void Promise.all(FONT_FACES.map((f) => document.fonts.load(f))).finally(() => {
      this.scene.start((this.registry.get(NEXT_SCENE_KEY) as string | undefined) ?? 'Game');
    });
  }
}
