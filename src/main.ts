import Phaser from 'phaser';
import { createPlatform } from './platform';
import { VIEW_HEIGHT, VIEW_WIDTH } from './render/layout';
import { setPlatform } from './render/registry';
import { GameScene } from './render/scenes/GameScene';
import { PerfSpikeScene } from './render/scenes/PerfSpikeScene';
import { RunEndScene } from './ui/RunEndScene';

const params = new URLSearchParams(window.location.search);
const scenes =
  params.get('scene') === 'perf'
    ? [PerfSpikeScene, GameScene, RunEndScene]
    : [GameScene, RunEndScene, PerfSpikeScene];

const game = new Phaser.Game({
  type: Phaser.WEBGL,
  parent: 'game',
  width: VIEW_WIDTH,
  height: VIEW_HEIGHT,
  backgroundColor: '#05060d',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  fps: { target: 60 },
  render: { antialias: true, powerPreference: 'high-performance' },
  input: { activePointers: 2 },
  scene: scenes,
});
setPlatform(game, createPlatform());

// Dev-only handle for console profiling and automated playtests.
if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game;
