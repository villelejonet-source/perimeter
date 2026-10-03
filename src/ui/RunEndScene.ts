import Phaser from 'phaser';
import { COLORS, FONT, VIEW_HEIGHT, VIEW_WIDTH } from '../render/layout';
import { Button } from './Button';

export interface RunEndData {
  wave: number;
  seconds: number;
  kills: number;
}

/** Overlay shown when base HP hits 0. Restart starts a fresh run. */
export class RunEndScene extends Phaser.Scene {
  constructor() {
    super('RunEnd');
  }

  create(data: RunEndData): void {
    const cx = VIEW_WIDTH / 2;
    const cy = VIEW_HEIGHT / 2;
    this.add.rectangle(cx, cy, VIEW_WIDTH, VIEW_HEIGHT, COLORS.bg, 0.82).setInteractive();

    this.add
      .text(cx, cy - 260, 'PERIMETER\nBREACHED', {
        fontFamily: FONT,
        fontSize: '64px',
        color: '#ff6b9a',
        align: 'center',
      })
      .setOrigin(0.5);

    const mins = Math.floor(data.seconds / 60);
    const secs = Math.floor(data.seconds % 60)
      .toString()
      .padStart(2, '0');
    this.add
      .text(
        cx,
        cy - 40,
        `WAVE REACHED  ${data.wave}\nRUN TIME      ${mins}:${secs}\nKILLS         ${data.kills}`,
        {
          fontFamily: FONT,
          fontSize: '34px',
          color: COLORS.text,
          lineSpacing: 18,
        },
      )
      .setOrigin(0.5);

    new Button(
      this,
      cx,
      cy + 200,
      360,
      110,
      'RESTART',
      { color: COLORS.tower, fontSize: 40 },
      () => {
        this.scene.stop();
        this.scene.get('Game').scene.restart();
      },
    );
  }
}
