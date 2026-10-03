import Phaser from 'phaser';
import { towerDamage } from '../data/curves';
import { TOWERS } from '../data/towers';
import {
  sellValue,
  TARGETING_MODES,
  upgradeCostFor,
  type Command,
  type Sim,
  type TargetingMode,
} from '../sim';
import { COLORS, FONT, S, VIEW_WIDTH } from '../render/layout';
import { Button } from './Button';

const BUTTON_H = 100;

/** Upgrade / sell / targeting for the selected tower. Sends commands only. */
export class TowerPanel {
  private towerId = -1;
  private readonly root: Phaser.GameObjects.Container;
  private readonly info: Phaser.GameObjects.Text;
  private readonly upgradeBtn: Button;
  private readonly sellBtn: Button;
  private readonly targetBtn: Button;
  private infoCache = '';

  constructor(
    scene: Phaser.Scene,
    private readonly sim: Sim,
    barY: number,
    private readonly send: (cmd: Command) => void,
    private readonly onClose: () => void,
  ) {
    const gap = 16;
    const widths = [192, 160, 192, 96]; // + 5 gaps of 16 = 720
    const xs: number[] = [];
    let x = gap;
    for (const w of widths) {
      xs.push(x + w / 2);
      x += w + gap;
    }
    this.upgradeBtn = new Button(
      scene,
      xs[0]!,
      barY,
      widths[0]!,
      BUTTON_H,
      '',
      { color: COLORS.base },
      () => this.send({ type: 'upgradeTower', towerId: this.towerId }),
    );
    this.sellBtn = new Button(
      scene,
      xs[1]!,
      barY,
      widths[1]!,
      BUTTON_H,
      '',
      { color: 0xff6b9a },
      () => {
        this.send({ type: 'sellTower', towerId: this.towerId });
        this.onClose();
      },
    );
    this.targetBtn = new Button(
      scene,
      xs[2]!,
      barY,
      widths[2]!,
      BUTTON_H,
      '',
      { color: COLORS.tower },
      () => this.cycleTargeting(),
    );
    const closeBtn = new Button(
      scene,
      xs[3]!,
      barY,
      widths[3]!,
      BUTTON_H,
      '✕',
      { color: 0xcfe8ff, fontSize: 34 },
      () => this.onClose(),
    );
    this.info = scene.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: '24px',
        color: COLORS.text,
        align: 'center',
        backgroundColor: '#05060dcc',
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5, 1)
      .setDepth(10);
    this.root = scene.add.container(0, 0, [
      this.upgradeBtn,
      this.sellBtn,
      this.targetBtn,
      closeBtn,
    ]);
    this.hide();
  }

  get selectedId(): number {
    return this.towerId;
  }

  show(towerId: number): void {
    this.towerId = towerId;
    this.root.setVisible(true);
    this.info.setVisible(true);
    this.infoCache = '';
    this.update();
  }

  hide(): void {
    this.towerId = -1;
    this.root.setVisible(false);
    this.info.setVisible(false);
  }

  update(): void {
    if (this.towerId < 0) return;
    const t = this.sim.findTower(this.towerId);
    if (!t) {
      this.onClose();
      return;
    }
    const def = TOWERS[t.kind];
    const cost = upgradeCostFor(t);
    this.upgradeBtn.setLabel(`UPGRADE\n${cost}◆`).setEnabled(this.sim.state.credits >= cost);
    this.sellBtn.setLabel(`SELL\n+${sellValue(t)}◆`);
    this.targetBtn.setLabel(`TARGET\n${t.targeting.toUpperCase()}`);

    const info = `${def.name.toUpperCase()}  LV ${t.level}\nDMG ${towerDamage(def.damage, t.level).toFixed(1)} · ${def.fireRate}/s`;
    if (info !== this.infoCache) {
      this.infoCache = info;
      this.info.setText(info);
    }
    const halfW = this.info.width / 2 + 8;
    this.info.setPosition(Phaser.Math.Clamp(t.x * S, halfW, VIEW_WIDTH - halfW), (t.y - 18) * S);
  }

  private cycleTargeting(): void {
    const t = this.sim.findTower(this.towerId);
    if (!t) return;
    const i = TARGETING_MODES.indexOf(t.targeting);
    const mode: TargetingMode = TARGETING_MODES[(i + 1) % TARGETING_MODES.length]!;
    this.send({ type: 'setTargeting', towerId: t.id, mode });
  }
}
