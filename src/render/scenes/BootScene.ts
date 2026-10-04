import Phaser from 'phaser';
import { FONT_DISPLAY, FONT_UI, T } from '../layout';
import { MetaStore } from '../../meta/store';
import { getPlatform, setStore } from '../registry';
import { bakeUnitAtlas, preloadUnits } from '../units';
import { preloadAudio } from '../audio';

/** Weights used by the design system's type styles. */
const FONT_FACES = [
  `600 16px ${FONT_DISPLAY}`,
  `700 16px ${FONT_DISPLAY}`,
  `800 16px ${FONT_DISPLAY}`,
  `500 16px ${FONT_UI}`,
  `600 16px ${FONT_UI}`,
  `700 16px ${FONT_UI}`,
];

/** Registry key holding the scene to start after boot (default 'Menu'). */
export const NEXT_SCENE_KEY = 'nextScene';

/** Loads unit SVGs, bundled fonts and the save; bakes the unit atlas; then starts `next`. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    this.cameras.main.setBackgroundColor(T.void);
    preloadUnits(this);
    preloadAudio(this);
  }

  create(): void {
    bakeUnitAtlas(this);
    const store = new MetaStore(getPlatform(this).storage);
    setStore(this.game, store);
    // Phaser Text rasterises immediately, so fonts must be ready before any scene draws text.
    const fonts = Promise.all(FONT_FACES.map((f) => document.fonts.load(f))).catch(() => undefined);
    void Promise.all([fonts, store.load()]).then(() => {
      this.scene.start((this.registry.get(NEXT_SCENE_KEY) as string | undefined) ?? 'Menu');
    });
  }
}
