import Phaser from 'phaser';
import { callEarlyBonus } from '../data/curves';
import { GAME } from '../data/game';
import type { TowerKind } from '../data/towers';
import { placeCost, type Sim } from '../sim';
import { Button } from '../ui/Button';
import { COLORS, FONT, VIEW_HEIGHT, VIEW_WIDTH } from './layout';
import type { Insets } from './safeArea';

export interface HudActions {
  callEarly(): void;
  toggleSpeed(): void;
  togglePause(): void;
  startTowerDrag(kind: TowerKind, pointer: Phaser.Input.Pointer): void;
}

const BUTTON_H = 100;

/** Top status strip + bottom control bar. Text updates only when values change. */
export class Hud {
  readonly barY: number;
  private readonly waveText: Phaser.GameObjects.Text;
  private readonly creditsText: Phaser.GameObjects.Text;
  private readonly hpText: Phaser.GameObjects.Text;
  private readonly toast: Phaser.GameObjects.Text;
  private readonly bar: Phaser.GameObjects.Container;
  private readonly towerBtn: Button;
  private readonly callBtn: Button;
  private readonly speedBtn: Button;
  private readonly pauseBtn: Button;
  private cache = { wave: '', credits: '', hp: '' };

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly sim: Sim,
    insets: Insets,
    actions: HudActions,
  ) {
    const topY = insets.top + 36;
    const style = (color: string): Phaser.Types.GameObjects.Text.TextStyle => ({
      fontFamily: FONT,
      fontSize: '32px',
      color,
    });
    this.waveText = scene.add.text(24, topY, '', style(COLORS.wave)).setOrigin(0, 0.5);
    this.creditsText = scene.add
      .text(VIEW_WIDTH / 2 + 60, topY, '', style(COLORS.credits))
      .setOrigin(0.5);
    this.hpText = scene.add.text(VIEW_WIDTH - 24, topY, '', style(COLORS.hp)).setOrigin(1, 0.5);

    this.barY = VIEW_HEIGHT - insets.bottom - BUTTON_H / 2 - 16;
    this.bar = scene.add.container(0, 0);

    const k = VIEW_WIDTH / 720; // pre-design layout was authored for a 720-px canvas
    const gap = 16 * k;
    const widths = [200, 200, 120, 120].map((w) => w * k); // + 5 gaps of 16 = 720 at k = 1
    const xs: number[] = [];
    let x = gap;
    for (const w of widths) {
      xs.push(x + w / 2);
      x += w + gap;
    }

    this.towerBtn = new Button(scene, xs[0]!, this.barY, widths[0]!, BUTTON_H, '', {
      color: COLORS.tower,
    });
    this.towerBtn.hit.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.towerBtn.isEnabled) actions.startTowerDrag('pulseLaser', p);
    });
    this.callBtn = new Button(
      scene,
      xs[1]!,
      this.barY,
      widths[1]!,
      BUTTON_H,
      '',
      { color: 0x2cf6ff },
      () => actions.callEarly(),
    );
    this.speedBtn = new Button(
      scene,
      xs[2]!,
      this.barY,
      widths[2]!,
      BUTTON_H,
      '1x',
      { color: 0xcfe8ff, fontSize: 34 },
      () => actions.toggleSpeed(),
    );
    this.pauseBtn = new Button(
      scene,
      xs[3]!,
      this.barY,
      widths[3]!,
      BUTTON_H,
      'II',
      { color: 0xcfe8ff, fontSize: 34 },
      () => actions.togglePause(),
    );
    this.bar.add([this.towerBtn, this.callBtn, this.speedBtn, this.pauseBtn]);

    this.toast = scene.add
      .text(VIEW_WIDTH / 2, this.barY - BUTTON_H / 2 - 40, '', {
        fontFamily: FONT,
        fontSize: '28px',
        color: '#ff8a8a',
        backgroundColor: '#05060dcc',
        padding: { x: 14, y: 8 },
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(20);
  }

  setBarVisible(visible: boolean): void {
    this.bar.setVisible(visible);
  }

  showToast(message: string): void {
    this.toast.setText(message).setAlpha(1);
    this.scene.tweens.killTweensOf(this.toast);
    this.scene.tweens.add({ targets: this.toast, alpha: 0, delay: 1200, duration: 400 });
  }

  update(speed: number): void {
    const s = this.sim.state;
    const secs = Math.ceil(s.nextWaveIn / GAME.tickRate);
    this.setText(this.waveText, 'wave', `WAVE ${s.wave}  ${secs}s`);
    this.setText(this.creditsText, 'credits', `◆ ${s.credits}`);
    this.setText(this.hpText, 'hp', `♥ ${s.baseHp}`);

    const cost = placeCost('pulseLaser');
    this.towerBtn.setLabel(`PULSE\n${cost}◆`).setEnabled(s.credits >= cost);
    const bonus = callEarlyBonus(
      s.nextWaveIn / GAME.tickRate,
      GAME.callEarlyCreditsPerSecond,
      s.wave + 1,
    );
    this.callBtn.setLabel(`CALL WAVE\n+${bonus}◆`);
    this.speedBtn.setLabel(`${speed}x`).setToggled(speed > 1);
    this.pauseBtn.setLabel(s.paused ? '▶' : 'II').setToggled(s.paused);
  }

  private setText(t: Phaser.GameObjects.Text, key: keyof Hud['cache'], value: string): void {
    if (this.cache[key] !== value) {
      this.cache[key] = value;
      t.setText(value);
    }
  }
}
