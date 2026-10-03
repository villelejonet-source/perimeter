import Phaser from 'phaser';
import { FONT } from '../render/layout';

export interface ButtonStyle {
  color: number;
  fontSize?: number;
}

/** Neon outlined button. Redraws only when label/enabled/active state changes. */
export class Button extends Phaser.GameObjects.Container {
  readonly hit: Phaser.GameObjects.Zone;
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly text: Phaser.GameObjects.Text;
  private label = '';
  private enabled = true;
  private toggled = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    readonly bw: number,
    readonly bh: number,
    label: string,
    private readonly style: ButtonStyle,
    onTap?: () => void,
  ) {
    super(scene, x, y);
    this.bg = scene.add.graphics();
    this.text = scene.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: `${style.fontSize ?? 28}px`,
        color: '#ffffff',
        align: 'center',
        lineSpacing: 2,
      })
      .setOrigin(0.5);
    this.hit = scene.add.zone(0, 0, bw, bh).setInteractive({ useHandCursor: true });
    this.add([this.bg, this.text, this.hit]);
    if (onTap) {
      this.hit.on('pointerup', () => {
        if (this.enabled) onTap();
      });
    }
    this.setLabel(label);
    this.redraw();
    scene.add.existing(this);
  }

  setLabel(label: string): this {
    if (label !== this.label) {
      this.label = label;
      this.text.setText(label);
    }
    return this;
  }

  setEnabled(enabled: boolean): this {
    if (enabled !== this.enabled) {
      this.enabled = enabled;
      this.redraw();
    }
    return this;
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  /** Highlighted (toggled-on) look. */
  setToggled(toggled: boolean): this {
    if (toggled !== this.toggled) {
      this.toggled = toggled;
      this.redraw();
    }
    return this;
  }

  private redraw(): void {
    const w = this.bw;
    const h = this.bh;
    const c = this.style.color;
    const alpha = this.enabled ? 1 : 0.35;
    this.bg.clear();
    this.bg.fillStyle(c, this.toggled ? 0.3 : 0.1 * alpha);
    this.bg.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    this.bg.lineStyle(3, c, alpha);
    this.bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
    this.text.setAlpha(this.enabled ? 1 : 0.4);
    this.text.setColor(Phaser.Display.Color.IntegerToColor(c).rgba);
  }
}
