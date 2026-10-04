import Phaser from 'phaser';
import { GAME } from '../data/game';
import type { Point } from '../data/maps';
import { TOWERS } from '../data/towers';
import type { Enemy, Fx, Projectile, Sim, Tower } from '../sim';
import { cornerBrackets, dashedCircle } from './draw';
import { FONT_UI, S, T, VIEW_HEIGHT, VIEW_WIDTH, css } from './layout';
import { enemyFrame, towerFrames } from './unitArt';
import { UNIT_ATLAS, unitSize } from './units';

/**
 * Base art by remaining HP fraction (decided 2026-10-04; not specified in the handoff).
 */
const BASE_DAMAGED_AT = 0.5;
const BASE_CRITICAL_AT = 0.25;
/** HANDOFF.md "Alerts": base-hit feedback lasts ~600 ms. */
const BASE_HIT_MS = 600;

/** Pulse Laser bolts render as a short stretch of the beam art (energy's "beam" shape twin). */
const BOLT_LENGTH = 18;
/** Elites without their own art draw larger (only the Drone has an elite variant). */
const ELITE_SCALE = 1.2;
/** Status overlays are 32-px frames; bosses scale them to their 68-px body. */
const BOSS_OVERLAY_SCALE = 68 / 32;

interface TowerSprites {
  base: Phaser.GameObjects.Image;
  turret: Phaser.GameObjects.Image;
  frameKey: string;
}

interface EnemySprites {
  body: Phaser.GameObjects.Image;
  /** Shield bubble or armor plating. */
  defense: Phaser.GameObjects.Image;
  /** Frozen or slowed. */
  status: Phaser.GameObjects.Image;
}

/**
 * Draws the battlefield from sim state, following docs/design/screens/in-run/Battlefield.dc.html.
 * Reads only; never mutates the sim. Unit sprites mirror the sim pools index-for-index and all
 * live in one additive layer from one atlas, so they batch into a single draw call.
 */
export class WorldView {
  private readonly units: Phaser.GameObjects.Layer;
  private readonly enemies: EnemySprites[] = [];
  private readonly towers: TowerSprites[] = [];
  private readonly shots: Phaser.GameObjects.Image[] = [];
  private readonly fx: Phaser.GameObjects.Image[] = [];
  private readonly base: Phaser.GameObjects.Image;
  private readonly bufferHatch: Phaser.GameObjects.RenderTexture;
  /** Per-frame overlay: HP bars, base-hit ring, the selected tower marker. */
  private readonly overlay: Phaser.GameObjects.Graphics;
  private readonly tmp: Point = { x: 0, y: 0 };
  private lastBaseHp: number;
  private baseHitUntil = 0;
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
    this.lastBaseHp = sim.state.baseHp;
  }

  /** Show the hatched no-build buffer while dragging a tower (Place-*.dc.html). */
  setDragging(on: boolean): void {
    this.bufferHatch.setVisible(on);
  }

  sync(): void {
    this.syncEnemies();
    this.syncTowers();
    this.syncShots();
    this.syncFx();
    this.syncBase();
    this.drawOverlay();
  }

  private unitImage(frame: string): Phaser.GameObjects.Image {
    return this.scene.make.image({ key: UNIT_ATLAS, frame }, false);
  }

  private grow<T>(list: T[], size: number, make: () => T): void {
    while (list.length < size) list.push(make());
  }

  private syncEnemies(): void {
    const items = this.sim.state.enemies.items;
    this.grow(this.enemies, items.length, () => {
      const body = this.unitImage('enemy-drone');
      const defense = this.unitImage('state-shield');
      const status = this.unitImage('state-frozen');
      this.units.add([body, defense, status]);
      return { body, defense, status };
    });
    for (let i = 0; i < this.enemies.length; i++) {
      const e = items[i];
      const spr = this.enemies[i]!;
      if (!e || !e.alive) {
        spr.body.setVisible(false);
        spr.defense.setVisible(false);
        spr.status.setVisible(false);
        continue;
      }
      const frame = enemyFrame(e.kind, e.elite);
      if (spr.body.frame.name !== frame) spr.body.setFrame(frame);
      // Units face east; rotate to the path heading just ahead.
      const ahead = this.sim.path.positionAt(e.dist + 2, this.tmp);
      const heading = Math.atan2(ahead.y - e.y, ahead.x - e.x);
      const x = e.x * S;
      const y = e.y * S;
      const scale = e.elite && frame !== 'enemy-drone-elite' ? ELITE_SCALE : 1;
      spr.body.setVisible(true).setPosition(x, y).setRotation(heading).setScale(scale);

      const overlayScale = (e.boss ? BOSS_OVERLAY_SCALE : 1) * scale;
      const defense =
        e.maxShield > 0
          ? e.shield > 0
            ? 'state-shield'
            : 'state-shield-recharging'
          : e.armor > 0
            ? 'state-armor'
            : null;
      this.setOverlay(spr.defense, defense, x, y, overlayScale);
      const status = e.frozen > 0 ? 'state-frozen' : e.chill > 0.05 ? 'state-slowed' : null;
      this.setOverlay(spr.status, status, x, y, overlayScale);
    }
  }

  private setOverlay(
    img: Phaser.GameObjects.Image,
    frame: string | null,
    x: number,
    y: number,
    scale: number,
  ): void {
    if (!frame) {
      img.setVisible(false);
      return;
    }
    if (img.frame.name !== frame) img.setFrame(frame);
    img.setVisible(true).setPosition(x, y).setScale(scale);
  }

  private syncTowers(): void {
    const items = this.sim.state.towers.items;
    this.grow(this.towers, items.length, () => {
      const base = this.unitImage('tower-pulse-laser-l1-base');
      const turret = this.unitImage('tower-pulse-laser-l1-turret');
      this.units.add([base, turret]);
      return { base, turret, frameKey: '' };
    });
    for (let i = 0; i < this.towers.length; i++) {
      const t = items[i];
      const spr = this.towers[i]!;
      if (!t || !t.alive) {
        spr.base.setVisible(false);
        spr.turret.setVisible(false);
        continue;
      }
      const frames = towerFrames(t.kind, t.level);
      if (spr.frameKey !== frames.base) {
        spr.frameKey = frames.base;
        spr.base.setFrame(frames.base);
        spr.turret.setFrame(frames.turret);
      }
      spr.base.setVisible(true).setPosition(t.x * S, t.y * S);
      spr.turret.setVisible(true).setPosition(t.x * S, t.y * S);
      const target = t.targetId >= 0 ? this.findEnemy(t.targetId) : null;
      if (target) spr.turret.setRotation(Math.atan2(target.y - t.y, target.x - t.x));
    }
  }

  private syncShots(): void {
    const items = this.sim.state.projectiles.items;
    this.grow(this.shots, items.length, () => {
      const img = this.unitImage('proj-laser-beam');
      this.units.add(img);
      return img;
    });
    for (let i = 0; i < this.shots.length; i++) {
      const p = items[i];
      const img = this.shots[i]!;
      if (!p || !p.alive) {
        img.setVisible(false);
        continue;
      }
      this.drawShot(img, p);
    }
  }

  private drawShot(img: Phaser.GameObjects.Image, p: Projectile): void {
    const frame =
      p.kind === 'bolt'
        ? 'proj-laser-beam'
        : p.kind === 'missile'
          ? 'proj-missile'
          : 'proj-mortar-shell';
    if (img.frame.name !== frame) img.setFrame(frame);
    img
      .setVisible(true)
      .setPosition(p.x * S, p.y * S)
      .setRotation(p.angle)
      .setAlpha(1);
    if (p.kind === 'bolt') {
      // Head at the bolt's position, tail trailing behind.
      img.setOrigin(1, 0.5).setScale(BOLT_LENGTH / unitSize('proj-laser-beam').w, 1);
    } else {
      img.setOrigin(0.5).setScale(1);
    }
  }

  private syncFx(): void {
    const items = this.sim.state.fx.items;
    this.grow(this.fx, items.length, () => {
      const img = this.unitImage('proj-rail-trail');
      this.units.add(img);
      return img;
    });
    for (let i = 0; i < this.fx.length; i++) {
      const f = items[i];
      const img = this.fx[i]!;
      if (!f || !f.alive) {
        img.setVisible(false);
        continue;
      }
      this.drawFx(img, f);
    }
  }

  /** Beams stretch from (x1, y1) to (x2, y2); blasts scale to their radius. All fade with ttl. */
  private drawFx(img: Phaser.GameObjects.Image, f: Fx): void {
    const alpha = f.ttl / f.maxTtl;
    if (f.kind === 'blast') {
      if (img.frame.name !== 'fx-mortar-blast') img.setFrame('fx-mortar-blast');
      // Expands slightly as it fades.
      const size = (f.radius * 2 * (1.15 - 0.15 * alpha)) / unitSize('fx-mortar-blast').w;
      img
        .setVisible(true)
        .setOrigin(0.5)
        .setPosition(f.x1 * S, f.y1 * S)
        .setRotation(0)
        .setScale(size)
        .setAlpha(alpha);
      return;
    }
    const frame =
      f.kind === 'rail'
        ? 'proj-rail-trail'
        : f.kind === 'chain'
          ? 'proj-chain-lightning'
          : 'proj-cryo-beam';
    if (img.frame.name !== frame) img.setFrame(frame);
    const len = Math.hypot(f.x2 - f.x1, f.y2 - f.y1);
    img
      .setVisible(true)
      .setOrigin(0, 0.5)
      .setPosition(f.x1 * S, f.y1 * S)
      .setRotation(Math.atan2(f.y2 - f.y1, f.x2 - f.x1))
      .setScale(len / unitSize(frame).w, 1)
      .setAlpha(alpha);
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
      this.baseHitUntil = this.scene.time.now + BASE_HIT_MS;
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
    for (const e of this.sim.state.enemies.items) {
      if (e.alive) this.drawBars(g, e);
    }
    // Base hit (Alert-BaseHit.dc.html): dashed danger ring around the base.
    if (this.scene.time.now < this.baseHitUntil) {
      const b = this.sim.map.base;
      g.lineStyle(4 * S, T.danger, 1);
      dashedCircle(g, b.x * S, b.y * S, 52 * S, 8 * S, 6 * S);
    }
    if (this.selectedTowerId >= 0) {
      const t = this.sim.findTower(this.selectedTowerId);
      if (t) this.drawSelection(g, t);
    }
  }

  /**
   * Hull bar (`hp`, 3 px) and, for shielded enemies, a 3-segment shield bar (`def-shield`)
   * above it (Battlefield.dc.html). Shown once damaged; bosses always, at double width.
   */
  private drawBars(g: Phaser.GameObjects.Graphics, e: Enemy): void {
    const damaged = e.hp < e.maxHp || e.shield < e.maxShield;
    if (!damaged && !e.boss) return;
    const w = (e.boss ? 48 : 20) * S;
    const h = 3 * S;
    const x = e.x * S - w / 2;
    const top = e.boss ? 40 : 14;
    let y = (e.y - top) * S;
    if (e.maxShield > 0) {
      const gap = 2 * S;
      const segW = (w - gap * 2) / 3;
      const filled = (e.shield / e.maxShield) * 3;
      for (let i = 0; i < 3; i++) {
        const sx = x + i * (segW + gap);
        g.fillStyle(T.line, 1);
        g.fillRect(sx, y, segW, h);
        const f = Math.max(0, Math.min(1, filled - i));
        if (f > 0) {
          g.fillStyle(T.defShield, 1);
          g.fillRect(sx, y, segW * f, h);
        }
      }
      y += h + 2 * S;
    }
    g.fillStyle(T.line, 1);
    g.fillRect(x, y, w, h);
    g.fillStyle(T.hp, 1);
    g.fillRect(x, y, w * Math.max(0, e.hp / e.maxHp), h);
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
    const gaps = this.scene.make.graphics({}, false);
    gaps.lineStyle(5 * S, 0xffffff, 1);
    const spacing = 8 * Math.SQRT2 * S;
    for (let c = 0; c < VIEW_WIDTH + VIEW_HEIGHT; c += spacing) {
      gaps.lineBetween(c, 0, c - VIEW_HEIGHT, VIEW_HEIGHT);
    }
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
