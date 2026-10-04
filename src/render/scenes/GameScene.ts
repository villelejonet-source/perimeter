import Phaser from 'phaser';
import { GAME } from '../../data/game';
import { FixedStepDriver, Sim, type Command } from '../../sim';
import { TowerPanel } from '../../ui/TowerPanel';
import type { RunEndData } from '../../ui/RunEndScene';
import { Hud } from '../Hud';
import { Placement, type PlacementRejection } from '../input/Placement';
import { S, T, ZONES } from '../layout';
import { getPlatform } from '../registry';
import { readSafeArea } from '../safeArea';
import { WorldView } from '../WorldView';

const SPEEDS = [1, 2] as const; // 3x unlocks via research (Phase 6).

/** Copy from docs/design/screens/in-run/Place-*.dc.html. */
const REJECTION_TEXT: Record<PlacementRejection, string> = {
  credits: 'NOT ENOUGH CREDITS',
  onPath: "CAN'T BUILD ON THE PATH",
  nearPath: 'TOO CLOSE TO THE PATH',
  overlap: 'SPACE TAKEN BY PULSE LASER',
  outOfBounds: "CAN'T BUILD THERE",
};

/** One run. Owns the Sim; input becomes commands, rendering only reads sim state. */
export class GameScene extends Phaser.Scene {
  private sim!: Sim;
  private driver!: FixedStepDriver;
  private world!: WorldView;
  private hud!: Hud;
  private panel!: TowerPanel;
  private placement!: Placement;
  private speedIndex = 0;
  private ended = false;
  private lastBaseHp = 0;

  constructor() {
    super('Game');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(T.void);
    this.sim = new Sim({ seed: (Date.now() ^ (performance.now() * 1000)) >>> 0 });
    this.driver = new FixedStepDriver();
    this.speedIndex = 0;
    this.ended = false;
    this.lastBaseHp = this.sim.state.baseHp;

    this.world = new WorldView(this, this.sim);
    const insets = readSafeArea(this.game);
    this.hud = new Hud(this, this.sim, insets, {
      callEarly: () => this.send({ type: 'callEarly' }),
      toggleSpeed: () => (this.speedIndex = (this.speedIndex + 1) % SPEEDS.length),
      togglePause: () => this.send({ type: 'setPaused', paused: !this.sim.state.paused }),
      startTowerDrag: (kind, pointer) => {
        this.selectTower(-1);
        this.placement.begin(kind, pointer);
      },
    });
    this.panel = new TowerPanel(
      this,
      this.sim,
      this.hud.barY,
      (cmd) => this.send(cmd),
      () => this.selectTower(-1),
    );
    this.placement = new Placement(this, this.sim, {
      place: (kind, x, y) => {
        this.send({ type: 'placeTower', kind, x, y });
        getPlatform(this).haptics.play('place');
      },
      reject: (reason) => this.hud.showToast(REJECTION_TEXT[reason]),
      dragChanged: (dragging) => this.world.setDragging(dragging),
    });

    this.input.on('pointerdown', this.onFieldDown, this);
    // GDD §11: leaving the app pauses the run.
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.onHidden, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.HIDDEN, this.onHidden, this);
      this.input.off('pointerdown', this.onFieldDown, this);
      this.placement.destroy();
    });
  }

  override update(_time: number, deltaMs: number): void {
    if (!this.ended) {
      const ticks = this.driver.advance(deltaMs, SPEEDS[this.speedIndex]!);
      for (let i = 0; i < ticks; i++) this.sim.step();
    }

    this.world.selectedTowerId = this.panel.selectedId;
    this.world.sync();
    this.hud.update(SPEEDS[this.speedIndex]!);
    this.panel.update();

    const s = this.sim.state;
    if (s.baseHp < this.lastBaseHp) getPlatform(this).haptics.play('leak');
    this.lastBaseHp = s.baseHp;

    if (s.gameOver && !this.ended) this.endRun();
  }

  private send(cmd: Command): void {
    this.sim.enqueue(cmd);
  }

  private selectTower(id: number): void {
    if (id >= 0) this.panel.show(id);
    else this.panel.hide();
    this.hud.setBarVisible(id < 0);
  }

  /** Tap on the playfield: select the tower under the finger, or deselect. */
  private onFieldDown(pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]): void {
    if (over.length > 0 || this.placement.active || this.ended) return;
    const wx = pointer.worldX / S;
    const wy = pointer.worldY / S;
    if (wy >= ZONES.controlRowTop) return;
    // Hit the 32 × 32 footprint with a little slack for fingers.
    const reach = GAME.towerFootprint / 2 + 6;
    let best = -1;
    let bestSq = Infinity;
    for (const t of this.sim.state.towers.items) {
      if (!t.alive || Math.abs(t.x - wx) > reach || Math.abs(t.y - wy) > reach) continue;
      const dSq = (t.x - wx) ** 2 + (t.y - wy) ** 2;
      if (dSq < bestSq) {
        best = t.id;
        bestSq = dSq;
      }
    }
    if (best >= 0) getPlatform(this).haptics.play('tap');
    this.selectTower(best);
  }

  private onHidden(): void {
    if (!this.sim.state.paused) this.send({ type: 'setPaused', paused: true });
  }

  private endRun(): void {
    this.ended = true;
    this.selectTower(-1);
    getPlatform(this).haptics.play('runEnd');
    const s = this.sim.state;
    const data: RunEndData = {
      wave: s.wave,
      seconds: s.tick / GAME.tickRate,
      kills: s.stats.kills,
    };
    this.scene.launch('RunEnd', data);
  }
}
