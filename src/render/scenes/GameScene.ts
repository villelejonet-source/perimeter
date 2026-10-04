import Phaser from 'phaser';
import { GAME } from '../../data/game';
import { TOWER_ORDER, TOWERS } from '../../data/towers';
import { FixedStepDriver, Sim, type Command } from '../../sim';
import { bossFor, waveType } from '../../sim/waves';
import { Alerts } from '../../ui/dom/Alerts';
import { SpecPicker } from '../../ui/dom/SpecPicker';
import { SPEC_LEVEL } from '../../data/specs';
import { Controls } from '../../ui/dom/Controls';
import { HudBar } from '../../ui/dom/HudBar';
import { Overlay } from '../../ui/dom/overlay';
import { PlacementChip } from '../../ui/dom/PlacementChip';
import { RunEnd } from '../../ui/dom/RunEnd';
import { TowerPanel } from '../../ui/dom/TowerPanel';
import { Placement } from '../input/Placement';
import { S, T, ZONES } from '../layout';
import { DEV_UNLOCK_ALL_KEY, getPlatform } from '../registry';
import { WorldView } from '../WorldView';

/** Gap kept between the selected tower's range circle and the top of the tower panel. */
const PANEL_CLEARANCE = 8;
const CAMERA_PAN_MS = 220;

/**
 * One run. Owns the Sim. Phaser draws the battlefield; the in-run UI is a DOM overlay
 * (HUD, controls, tower panel, run end). Both only read sim state and send commands.
 */
export class GameScene extends Phaser.Scene {
  private sim!: Sim;
  private driver!: FixedStepDriver;
  private world!: WorldView;
  private placement!: Placement;
  private overlay!: Overlay;
  private hud!: HudBar;
  private controls!: Controls;
  private chip!: PlacementChip;
  private panel!: TowerPanel;
  private alerts!: Alerts;
  private runEnd: RunEnd | null = null;
  private picker: SpecPicker | null = null;
  /** Towers already offered the spec pick (LATER doesn't re-open it automatically). */
  private offered = new Set<number>();
  private pausedByPicker = false;
  private lastWave = 0;
  private speed = 1;
  private ended = false;
  private lastBaseHp = 0;

  constructor() {
    super('Game');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(T.void).setScroll(0, 0);
    // Dev builds: `?unlock=all` makes every tower buildable for playtesting (research is Phase 6).
    const unlockAll = this.registry.get(DEV_UNLOCK_ALL_KEY) === true;
    this.sim = new Sim({
      seed: (Date.now() ^ (performance.now() * 1000)) >>> 0,
      ...(unlockAll ? { unlockedTowers: TOWER_ORDER } : {}),
    });
    this.driver = new FixedStepDriver();
    this.speed = 1;
    this.ended = false;
    this.runEnd = null;
    this.lastBaseHp = this.sim.state.baseHp;
    this.lastWave = 0;
    this.picker = null;
    this.offered = new Set();
    this.pausedByPicker = false;

    this.world = new WorldView(this, this.sim);
    this.placement = new Placement(this, this.sim, {
      place: (kind, x, y) => {
        this.send({ type: 'placeTower', kind, x, y });
        getPlatform(this).haptics.play('place');
      },
      reject: () => getPlatform(this).haptics.play('tap'),
      dragChanged: (dragging) => {
        this.world.setDragging(dragging);
        this.controls.setDragMode(dragging);
      },
      preview: (p) => {
        if (!p) {
          this.chip.hide();
          return;
        }
        const cam = this.cameras.main;
        this.chip.show({
          kind: p.kind,
          x: p.x - cam.scrollX / S,
          y: p.y - cam.scrollY / S,
          range: TOWERS[p.kind].range,
          error: p.error,
          blocker: p.blocker ? TOWERS[p.blocker.kind].name : '',
        });
      },
    });

    this.overlay = new Overlay(this.game);
    this.hud = new HudBar(this.overlay.root);
    this.alerts = new Alerts(this.overlay.root);
    this.controls = new Controls(this.overlay.root, this.sim.state.unlocked, {
      togglePause: () => this.send({ type: 'setPaused', paused: !this.sim.state.paused }),
      setSpeed: (n) => (this.speed = n),
      callEarly: () => this.send({ type: 'callEarly' }),
      dragStart: (kind, e) => {
        this.selectTower(-1);
        this.placement.begin(kind);
        this.dragMove(e);
      },
      dragMove: (e) => this.dragMove(e),
      dragEnd: (e) => {
        this.dragMove(e);
        this.placement.end();
      },
      denied: (on) => this.hud.setCreditsAlert(on),
    });
    this.chip = new PlacementChip(this.overlay.root);
    this.panel = new TowerPanel(
      this.overlay.root,
      this.sim,
      (cmd) => this.send(cmd),
      () => this.selectTower(-1),
      (id) => this.openPicker(id),
    );

    this.input.on('pointerdown', this.onFieldDown, this);
    // GDD §11: leaving the app pauses the run.
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.onHidden, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.HIDDEN, this.onHidden, this);
      this.input.off('pointerdown', this.onFieldDown, this);
      this.runEnd?.destroy();
      this.picker?.destroy();
      this.alerts.destroy();
      this.overlay.destroy();
    });
  }

  override update(_time: number, deltaMs: number): void {
    if (!this.ended) {
      const ticks = this.driver.advance(deltaMs, this.speed);
      for (let i = 0; i < ticks; i++) this.sim.step();
    }

    const now = performance.now();
    const s = this.sim.state;
    this.world.selectedTowerId = this.panel.selectedId;
    this.world.sync();
    this.hud.update(s, now);
    this.controls.update(s, this.speed, now);
    this.panel.update();

    if (s.wave > this.lastWave) {
      this.lastWave = s.wave;
      this.announceWave(s.wave);
    }
    if (s.baseHp < this.lastBaseHp) {
      getPlatform(this).haptics.play('leak');
      const b = this.sim.map.base;
      const cam = this.cameras.main;
      this.alerts.baseHit(this.lastBaseHp - s.baseHp, b.x - cam.scrollX / S, b.y - cam.scrollY / S);
    }
    this.lastBaseHp = s.baseHp;

    if (!this.picker && !this.ended) this.offerSpecs();
    if (s.gameOver && !this.ended) this.endRun();
  }

  /** GDD §7: a tower reaching level 5 offers its specialization pick once. */
  private offerSpecs(): void {
    for (const t of this.sim.state.towers.items) {
      if (t.alive && t.level >= SPEC_LEVEL && !t.spec && !this.offered.has(t.id)) {
        this.openPicker(t.id);
        return;
      }
    }
  }

  /** Spec pick screen; the run pauses while it's open (meta/README.md). */
  private openPicker(towerId: number): void {
    const t = this.sim.findTower(towerId);
    if (!t || t.spec || this.picker) return;
    this.offered.add(towerId);
    if (!this.sim.state.paused) {
      this.send({ type: 'setPaused', paused: true });
      this.pausedByPicker = true;
    }
    const close = (): void => {
      this.picker?.destroy();
      this.picker = null;
      if (this.pausedByPicker) {
        this.send({ type: 'setPaused', paused: false });
        this.pausedByPicker = false;
      }
    };
    this.picker = new SpecPicker(this.overlay.root, t.kind, this.sim.state, {
      pick: (spec) => {
        this.send({ type: 'specialize', towerId, spec });
        getPlatform(this).haptics.play('place');
        close();
      },
      later: close,
    });
  }

  private announceWave(wave: number): void {
    const type = waveType(wave);
    if (type === 'elite') this.alerts.elite(wave);
    else if (type === 'boss') {
      const boss = bossFor(wave);
      this.alerts.boss(wave, boss.kind, boss.also);
      getPlatform(this).haptics.play('boss');
    }
  }

  private send(cmd: Command): void {
    this.sim.enqueue(cmd);
  }

  /** DOM drag position → placement (logical screen px for the cancel zone, world px for the ghost). */
  private dragMove(e: PointerEvent): void {
    const p = this.overlay.toLogical(e.clientX, e.clientY);
    const cam = this.cameras.main;
    this.placement.move(
      p.y,
      p.x + cam.scrollX / S,
      p.y + cam.scrollY / S,
      e.pointerType === 'touch',
    );
  }

  /**
   * Opens the tower panel. If the sheet would cover the tower's range circle, the map scrolls
   * up just enough to keep it visible, and scrolls back on close (decided 2026-10-04).
   */
  private selectTower(id: number): void {
    let scrollTo = 0;
    if (id >= 0) {
      this.panel.show(id);
      const t = this.sim.findTower(id);
      if (t) {
        const sheetTop = GAME.worldHeight - this.panel.height;
        const circleBottom = t.y + t.stats.range + PANEL_CLEARANCE;
        scrollTo = Math.max(0, circleBottom - sheetTop);
      }
    } else {
      this.panel.hide();
    }
    const cam = this.cameras.main;
    this.tweens.killTweensOf(cam);
    this.tweens.add({
      targets: cam,
      scrollY: scrollTo * S,
      duration: CAMERA_PAN_MS,
      ease: 'Quad.Out',
    });
  }

  /** Tap on the battlefield: select the tower under the finger, or deselect. */
  private onFieldDown(pointer: Phaser.Input.Pointer): void {
    if (this.placement.active || this.ended) return;
    const screenY = pointer.y / S;
    if (screenY >= ZONES.controlRowTop && this.panel.selectedId < 0) return;
    const wx = pointer.worldX / S;
    const wy = pointer.worldY / S;
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
    if (best !== this.panel.selectedId) this.selectTower(best);
  }

  private onHidden(): void {
    if (!this.sim.state.paused) this.send({ type: 'setPaused', paused: true });
  }

  private endRun(): void {
    this.ended = true;
    this.selectTower(-1);
    getPlatform(this).haptics.play('runEnd');
    const s = this.sim.state;
    this.runEnd = new RunEnd(
      this.overlay.root,
      { wave: s.wave, seconds: s.tick / GAME.tickRate, kills: s.stats.kills },
      () => this.scene.restart(),
    );
  }
}
