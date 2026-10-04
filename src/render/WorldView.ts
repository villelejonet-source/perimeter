import Phaser from 'phaser';
import { GAME } from '../data/game';
import type { Point } from '../data/maps';
import { TOWERS } from '../data/towers';
import type { Enemy, Sim, Tower } from '../sim';
import { cornerBrackets } from './draw';
import { FONT_UI, S, T, VIEW_HEIGHT, VIEW_WIDTH, css } from './layout';
import { UNIT_ATLAS, unitSize } from './units';

/**
 * Base art by remaining HP fraction. TODO(design): thresholds not specified in the handoff
 * (docs/design/INVENTORY.md, Phase 2 blocker 3).
 */
const BASE_DAMAGED_AT = 0.5;
const BASE_CRITICAL_AT = 0.25;

/** Pulse Laser bolts render as a short stretch of the beam art (energy's "beam" shape twin). */
const BOLT_LENGTH = 18;

interface TowerSprites {
  base: Phaser.GameObjects.Image;
  turret: Phaser.GameObjects.Image;
  level5: boolean;
}

/**
 * Draws the battlefield from sim state, following docs/design/screens/in-run/Battlefield.dc.html.
 * Reads only; never mutates the sim. Unit sprites mirror the sim pools index-for-index and all
 * live in one additive layer from one atlas, so they batch into a single draw call.
 */
export class WorldView {
  private readonly units: Phaser.GameObjects.Layer;
  private readonly enemies: Phaser.GameObjects.Image[] = [];
  private readonly towers: TowerSprites[] = [];
  private readonly bolts: Phaser.GameObjects.Image[] = [];
  private readonly base: Phaser.GameObjects.Image;
  private readonly bufferHatch: Phaser.GameObjects.RenderTexture;
  /** Per-frame overlay: HP bars and the selected tower marker. */
  private readonly overlay: Phaser.GameObjects.Graphics;
  private readonly tmp: Point = { x: 0, y: 0 };
  private readonly boltScaleX: number;
  private lastBaseHp: number;
  selectedTowerId = -1;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly sim: Sim,
  ) {
    this.drawGrid();
    this.bufferHatch = this.drawBufferHatch().setVisible(false);
    this.drawPath();
    this.drawSpawnLabel();

    this.units = scene.add.layer().setBlendMode(Phaser.BlendModes.ADD);
    const b = sim.map.base;
    this.base = this.unitImage('base-healthy').setPosition(b.x * S, b.y * S);
    this.units.add(this.base);
    this.overlay = scene.add.graphics();
    this.boltScaleX = BOLT_LENGTH / unitSize('proj-laser-beam').w;
    this.lastBaseHp = sim.state.baseHp;
  }

  /** Show the hatched no-build buffer while dragging a tower (Place-*.dc.html). */
  setDragging(on: boolean): void {
    this.bufferHatch.setVisible(on);
  }

  sync(): void {
    this.syncEnemies();
    this.syncTowers();
    this.syncBolts();
    this.syncBase();
    this.drawOverlay();
  }

  private unitImage(frame: string): Phaser.GameObjects.Image {
    return this.scene.make.image({ key: UNIT_ATLAS, frame }, false);
  }

  private syncEnemies(): void {
    const items = this.sim.state.enemies.items;
    while (this.enemies.length < items.length) {
      const img = this.unitImage('enemy-drone');
      this.units.add(img);
      this.enemies.push(img);
    }
    for (let i = 0; i < this.enemies.length; i++) {
      const e = items[i];
      const img = this.enemies[i]!;
      if (!e || !e.alive) {
        img.setVisible(false);
        continue;
      }
      // Units face east; rotate to the path heading just ahead of the enemy.
      const ahead = this.sim.path.positionAt(e.dist + 2, this.tmp);
      const heading = Math.atan2(ahead.y - e.y, ahead.x - e.x);
      img
        .setVisible(true)
        .setPosition(e.x * S, e.y * S)
        .setRotation(heading);
    }
  }

  private syncTowers(): void {
    const items = this.sim.state.towers.items;
    while (this.towers.length < items.length) {
      const base = this.unitImage('tower-pulse-laser-l1-base');
      const turret = this.unitImage('tower-pulse-laser-l1-turret');
      this.units.add([base, turret]);
      this.towers.push({ base, turret, level5: false });
    }
    for (let i = 0; i < this.towers.length; i++) {
      const t = items[i];
      const spr = this.towers[i]!;
      if (!t || !t.alive) {
        spr.base.setVisible(false);
        spr.turret.setVisible(false);
        continue;
      }
      const l5 = t.level >= 5;
      if (l5 !== spr.level5) {
        spr.level5 = l5;
        const lvl = l5 ? 'l5' : 'l1';
        spr.base.setFrame(`tower-pulse-laser-${lvl}-base`);
        spr.turret.setFrame(`tower-pulse-laser-${lvl}-turret`);
      }
      spr.base.setVisible(true).setPosition(t.x * S, t.y * S);
      spr.turret.setVisible(true).setPosition(t.x * S, t.y * S);
      const target = t.targetId >= 0 ? this.findEnemy(t.targetId) : null;
      if (target) spr.turret.setRotation(Math.atan2(target.y - t.y, target.x - t.x));
    }
  }

  private syncBolts(): void {
    const items = this.sim.state.projectiles.items;
    while (this.bolts.length < items.length) {
      const img = this.unitImage('proj-laser-beam').setOrigin(1, 0.5).setScale(this.boltScaleX, 1);
      this.units.add(img);
      this.bolts.push(img);
    }
    for (let i = 0; i < this.bolts.length; i++) {
      const p = items[i];
      const img = this.bolts[i]!;
      const target = p?.target;
      if (!p || !p.alive || !target || !target.alive) {
        img.setVisible(false);
        continue;
      }
      img
        .setVisible(true)
        .setPosition(p.x * S, p.y * S)
        .setRotation(Math.atan2(target.y - p.y, target.x - p.x));
    }
  }

  private syncBase(): void {
    const s = this.sim.state;
    const frac = s.baseHp / GAME.baseHp;
    const frame =
      frac <= BASE_CRITICAL_AT
        ? 'base-critical'
        : frac <= BASE_DAMAGED_AT
          ? 'base-damaged'
          : 'base-healthy';
    if (this.base.frame.name !== frame) this.base.setFrame(frame);
    if (s.baseHp < this.lastBaseHp) {
      this.scene.tweens.killTweensOf(this.base);
      this.base.setScale(1.18);
      this.scene.tweens.add({ targets: this.base, scale: 1, duration: 300, ease: 'Quad.Out' });
    }
    this.lastBaseHp = s.baseHp;
  }

  private findEnemy(id: number): Enemy | null {
    for (const e of this.sim.state.enemies.items) if (e.alive && e.id === id) return e;
    return null;
  }

  private drawOverlay(): void {
    const g = this.overlay;
    g.clear();

    // Hull bar (design: 20 × 3 px, `hp`) above damaged enemies.
    for (const e of this.sim.state.enemies.items) {
      if (!e.alive || e.hp >= e.maxHp) continue;
      const x = (e.x - 10) * S;
      const y = (e.y - 14) * S;
      g.fillStyle(T.line, 1);
      g.fillRect(x, y, 20 * S, 3 * S);
      g.fillStyle(T.hp, 1);
      g.fillRect(x, y, 20 * S * (e.hp / e.maxHp), 3 * S);
    }

    if (this.selectedTowerId >= 0) {
      const t = this.sim.findTower(this.selectedTowerId);
      if (t) this.drawSelection(g, t);
    }
  }

  /** Selected tower: accent corner brackets + range circle (HANDOFF.md "Tower panel"). */
  private drawSelection(g: Phaser.GameObjects.Graphics, t: Tower): void {
    const r = TOWERS[t.kind].range * S;
    g.fillStyle(T.accent, 0.07);
    g.fillCircle(t.x * S, t.y * S, r);
    g.lineStyle(2 * S, T.accent, 1);
    g.strokeCircle(t.x * S, t.y * S, r);
    const half = (GAME.towerFootprint / 2 + 3) * S;
    cornerBrackets(g, t.x * S - half, t.y * S - half, half * 2, half * 2, 7 * S);
  }

  /** 16-px hairline grid over the whole screen (Battlefield `bf-grid`). Decoration only. */
  private drawGrid(): void {
    const g = this.scene.make.graphics({}, false);
    g.lineStyle(1 * S, T.grid, 1);
    const step = GAME.gridSize * S;
    for (let x = 0; x <= VIEW_WIDTH; x += step) g.lineBetween(x, 0, x, VIEW_HEIGHT);
    for (let y = 0; y <= VIEW_HEIGHT; y += step) g.lineBetween(0, y, VIEW_WIDTH, y);
    this.scene.add.renderTexture(0, 0, VIEW_WIDTH, VIEW_HEIGHT).setOrigin(0).draw(g);
    g.destroy();
  }

  /**
   * Stamps opaque circles along the path into `g` (smooth joins on a spline, unlike thick
   * Graphics strokes, which have no line joins).
   */
  private stampBand(g: Phaser.GameObjects.Graphics, radius: number, color: number): void {
    const path = this.sim.path;
    const step = Math.max(0.5, radius / 4);
    g.fillStyle(color, 1);
    for (let d = 0; d <= path.length; d += step) {
      path.positionAt(d, this.tmp);
      g.fillCircle(this.tmp.x * S, this.tmp.y * S, radius * S);
    }
  }

  /** Path: `line` outline (width + 4), `surface-200` fill, dashed `surface-300` centre line. */
  private drawPath(): void {
    const map = this.sim.map;
    const g = this.scene.make.graphics({}, false);
    this.stampBand(g, map.pathWidth / 2 + 2, T.line);
    this.stampBand(g, map.pathWidth / 2, T.surface200);
    // Dashed centre line: 4 on, 10 off, 2 px wide.
    const path = this.sim.path;
    g.fillStyle(T.surface300, 1);
    for (let d = 0; d <= path.length; d += 0.5) {
      if (d % 14 >= 4) continue;
      path.positionAt(d, this.tmp);
      g.fillCircle(this.tmp.x * S, this.tmp.y * S, 1 * S);
    }
    this.scene.add.renderTexture(0, 0, VIEW_WIDTH, VIEW_HEIGHT).setOrigin(0).draw(g);
    g.destroy();
  }

  /** No-build buffer band, hatched in `line` (3 px stripes every 8 px at 45°). */
  private drawBufferHatch(): Phaser.GameObjects.RenderTexture {
    const map = this.sim.map;
    const rt = this.scene.add.renderTexture(0, 0, VIEW_WIDTH, VIEW_HEIGHT).setOrigin(0);
    const band = this.scene.make.graphics({}, false);
    this.stampBand(band, map.pathWidth / 2 + map.buildBuffer, T.line);
    rt.draw(band);
    band.destroy();
    // Erase the gaps between stripes.
    const gaps = this.scene.make.graphics({}, false);
    gaps.lineStyle(5 * S, 0xffffff, 1);
    const spacing = 8 * Math.SQRT2 * S;
    for (let c = 0; c < VIEW_WIDTH + VIEW_HEIGHT; c += spacing)
      gaps.lineBetween(c, 0, c - VIEW_HEIGHT, VIEW_HEIGHT);
    rt.erase(gaps);
    gaps.destroy();
    return rt;
  }

  private drawSpawnLabel(): void {
    const sp = this.sim.map.spawn;
    this.scene.add
      .text(8 * S, (sp.y + 22) * S, 'SPAWN', {
        fontFamily: FONT_UI,
        fontSize: `${13 * S}px`,
        fontStyle: '700',
        color: css(T.inkMuted),
      })
      .setLetterSpacing(13 * 0.08 * S);
  }
}
