import '@fontsource/oxanium/latin-600.css';
import '@fontsource/oxanium/latin-700.css';
import '@fontsource/oxanium/latin-800.css';
import '@fontsource/barlow-semi-condensed/latin-500.css';
import '@fontsource/barlow-semi-condensed/latin-600.css';
import '@fontsource/barlow-semi-condensed/latin-700.css';
import Phaser from 'phaser';
import { createPlatform } from './platform';
import { VIEW_HEIGHT, VIEW_WIDTH } from './render/layout';
import { setPlatform } from './render/registry';
import { BootScene, NEXT_SCENE_KEY } from './render/scenes/BootScene';
import { GameScene } from './render/scenes/GameScene';
import { PerfSpikeScene } from './render/scenes/PerfSpikeScene';

const params = new URLSearchParams(window.location.search);
const next = params.get('scene') === 'perf' ? 'PerfSpike' : 'Game';

const game = new Phaser.Game({
  type: Phaser.WEBGL,
  parent: 'game',
  width: VIEW_WIDTH,
  height: VIEW_HEIGHT,
  backgroundColor: '#06080d',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  fps: { target: 60 },
  render: { antialias: true, powerPreference: 'high-performance' },
  input: { activePointers: 2 },
  scene: [BootScene, GameScene, PerfSpikeScene],
});
setPlatform(game, createPlatform());
game.registry.set(NEXT_SCENE_KEY, next);

// Dev-only handle for console profiling and automated playtests.
if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game;
