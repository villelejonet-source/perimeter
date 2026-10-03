import Phaser from 'phaser';
import { GAME } from '../data/game';
import { TOWERS } from '../data/towers';
import type { Sim } from '../sim';
import type { Enemy } from '../sim';
import { createNeonLayers, type NeonLayers } from './layers';
import { COLORS, S, VIEW_HEIGHT, VIEW_WIDTH } from './layout';
import { ATLAS, FRAME } from './textures';

interface SpritePair {
  body: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
}

/**
 * Draws the playfield from sim state. Reads only; never mutates the sim.
 * Sprites mirror sim pools index-for-index, so syncing is allocation-free.
 */
export class WorldView {
  private readonly layers: NeonLayers;
  private readonly enemies: SpritePair[] = [];
  private readonly towers: SpritePair[] = [];
  private readonly projectiles: SpritePair[] = [];
  /** Per-frame overlay: HP bars, tower barrels, selection. */
  private readonly overlay: Phaser.GameObjects.Graphics;
  private readonly grid: Phaser.GameObjects.Graphics;
  private readonly baseGlow: Phaser.GameObjects.Image;
  private lastBaseHp: number;
  selectedTowerId = -1;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly sim: Sim,
  ) {
    this.grid = this.drawGrid();
    this.drawPath();
    this.layers = createNeonLayers(scene);
    this.baseGlow = this.drawBase();
    this.overlay = scene.add.graphics();
    this.lastBaseHp = sim.state.baseHp;
  }

  /** Brighten the snap grid while placing. */
  setGridEmphasis(on: boolean): void {
    this.grid.setAlpha(on ? 1 : 0.35);
  }

  sync(): void {
    const s = this.sim.state;
    this.syncPool(s.enemies.items, this.enemies, FRAME.diamond, COLORS.enemy, 1, 1.1);
    this.syncPool(s.towers.items, this.towers, FRAME.hex, COLORS.tower, 1.3, 2);
    this.syncPool(s.projectiles.items, this.projectiles, FRAME.dot, COLORS.projectile, 1, 0.45);
    this.drawOverlay();

    if (s.baseHp < this.lastBaseHp) this.flashBase();
    this.lastBaseHp = s.baseHp;
  }

  private syncPool(
    items: readonly { alive: boolean; x: number; y: number }[],
    sprites: SpritePair[],
    frame: string,
    tint: number,
    bodyScale: number,
    glowScale: number,
  ): void {
    while (sprites.length < items.length) {
      const glow = this.scene.make
        .image({ key: ATLAS, frame: FRAME.glow }, false)
        .setTint(tint)
        .setScale(glowScale);
      const body = this.scene.make
        .image({ key: ATLAS, frame }, false)
        .setTint(tint)
        .setScale(bodyScale);
      this.layers.glow.add(glow);
      this.layers.body.add(body);
      sprites.push({ body, glow });
    }
    for (let i = 0; i < sprites.length; i++) {
      const item = items[i];
      const pair = sprites[i]!;
      const visible = item !== undefined && item.alive;
      pair.body.setVisible(visible);
      pair.glow.setVisible(visible);
      if (!visible) continue;
      pair.body.setPosition(item.x * S, item.y * S);
      pair.glow.setPosition(item.x * S, item.y * S);
    }
  }

  private findEnemy(id: number): Enemy | null {
    for (const e of this.sim.state.enemies.items) if (e.alive && e.id === id) return e;
    return null;
  }

  private drawOverlay(): void {
    const g = this.overlay;
    const s = this.sim.state;
    g.clear();

    // Tower barrels point at their current target.
    g.lineStyle(4, COLORS.tower, 0.9);
    for (const t of s.towers.items) {
      if (!t.alive || t.targetId < 0) continue;
      const e = this.findEnemy(t.targetId);
      if (!e) continue;
      const a = Math.atan2(e.y - t.y, e.x - t.x);
      g.lineBetween(t.x * S, t.y * S, (t.x + Math.cos(a) * 11) * S, (t.y + Math.sin(a) * 11) * S);
    }

    // HP bars for damaged enemies.
    for (const e of s.enemies.items) {
      if (!e.alive || e.hp >= e.maxHp) continue;
      const w = 22;
      const x = e.x * S - w / 2;
      const y = (e.y - e.radius) * S - 10;
      g.fillStyle(COLORS.hpBack, 1);
      g.fillRect(x, y, w, 4);
      g.fillStyle(COLORS.hpFill, 1);
      g.fillRect(x, y, w * (e.hp / e.maxHp), 4);
    }

    // Selected tower: range ring.
    if (this.selectedTowerId >= 0) {
      const t = this.sim.findTower(this.selectedTowerId);
      if (t) {
        const r = TOWERS[t.kind].range * S;
        g.fillStyle(COLORS.tower, 0.06);
        g.fillCircle(t.x * S, t.y * S, r);
        g.lineStyle(2, COLORS.tower, 0.6);
        g.strokeCircle(t.x * S, t.y * S, r);
      }
    }
  }

  private drawGrid(): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics().setAlpha(0.35);
    g.fillStyle(COLORS.grid, 1);
    const step = GAME.gridSize;
    for (let y = GAME.playfieldTop + step / 2; y < GAME.playfieldBottom; y += step) {
      for (let x = step / 2; x < GAME.worldWidth; x += step) {
        if (this.sim.path.distanceTo(x, y) < GAME.pathBuffer) continue;
        g.fillRect(x * S - 1.5, y * S - 1.5, 3, 3);
      }
    }
    return g;
  }

  /**
   * Thick Graphics strokes have no line joins and spike at tight turns, so each glow
   * band is stamped as opaque circles into its own render texture, then faded.
   * Opaque stamps overlap without building up alpha.
   */
  private drawPath(): void {
    const path = this.sim.path;
    const bands: readonly (readonly [number, number])[] = [
      [GAME.pathBuffer * 1.6 * S, 0.05],
      [GAME.pathBuffer * 0.9 * S, 0.08],
      [10, 0.22],
      [3, 0.9],
    ];
    const g = this.scene.make.graphics({}, false);
    const p = { x: 0, y: 0 };
    for (const [width, alpha] of bands) {
      // Stamp spacing well under the radius so edges stay smooth.
      const step = Math.max(0.25, width / S / 8);
      g.clear();
      g.fillStyle(COLORS.path, 1);
      for (let d = 0; d <= path.length; d += step) {
        path.positionAt(d, p);
        g.fillCircle(p.x * S, p.y * S, width / 2);
      }
      this.scene.add
        .renderTexture(0, 0, VIEW_WIDTH, VIEW_HEIGHT)
        .setOrigin(0)
        .draw(g)
        .setAlpha(alpha)
        .setBlendMode('ADD');
    }
    g.destroy();
  }

  private drawBase(): Phaser.GameObjects.Image {
    const end = this.sim.path.positionAt(this.sim.path.length, { x: 0, y: 0 });
    const glow = this.scene.add
      .image(end.x * S, end.y * S, ATLAS, FRAME.glow)
      .setTint(COLORS.base)
      .setScale(3)
      .setBlendMode('ADD');
    this.scene.add
      .image(end.x * S, end.y * S, ATLAS, FRAME.hex)
      .setTint(COLORS.base)
      .setScale(1.8);
    return glow;
  }

  private flashBase(): void {
    this.baseGlow.setTint(COLORS.invalid).setScale(4.5);
    this.scene.tweens.add({
      targets: this.baseGlow,
      scale: 3,
      duration: 350,
      onComplete: () => this.baseGlow.setTint(COLORS.base),
    });
  }
}
