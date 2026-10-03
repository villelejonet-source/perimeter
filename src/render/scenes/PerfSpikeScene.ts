import Phaser from 'phaser';
import { COLORS, VIEW_HEIGHT, VIEW_WIDTH } from '../layout';
import { createNeonLayers, type NeonLayers } from '../layers';
import { ATLAS, FRAME, bakeTextures } from '../textures';

const ENEMY_COUNT = 300;
const PROJECTILE_COUNT = 500;
const TOWER_COUNT = 24;
const PATH_SAMPLES = 2048;
const MEASURE_SECONDS = 30;

interface Enemy {
  dist: number;
  speed: number;
  body: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
}

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  sprite: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
}

/**
 * Phase 0 perf spike: 300 moving enemies + 500 pooled projectiles + additive glow.
 * Everything is allocated in create(); update() allocates nothing.
 */
export class PerfSpikeScene extends Phaser.Scene {
  private lutX = new Float32Array(PATH_SAMPLES);
  private lutY = new Float32Array(PATH_SAMPLES);
  private pathLength = 0;
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private towers: { x: number; y: number }[] = [];
  private nextTower = 0;
  private fpsText!: Phaser.GameObjects.Text;
  private layers!: NeonLayers;

  // Measurement: frames per 1-second bucket, min/avg over MEASURE_SECONDS.
  private elapsed = 0;
  private bucketTime = 0;
  private bucketFrames = 0;
  private buckets: number[] = [];
  private textTimer = 0;

  constructor() {
    super('PerfSpike');
  }

  create(): void {
    bakeTextures(this);
    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.buildPath();
    this.drawPath();
    this.layers = createNeonLayers(this);
    const { glow: glowLayer, body: bodyLayer } = this.layers;

    for (let i = 0; i < TOWER_COUNT; i++) {
      const d = ((i + 0.5) / TOWER_COUNT) * this.pathLength;
      const idx = Math.floor((d / this.pathLength) * (PATH_SAMPLES - 1));
      const side = i % 2 === 0 ? 1 : -1;
      const x = Phaser.Math.Clamp((this.lutX[idx] ?? 0) + side * 70, 40, VIEW_WIDTH - 40);
      const y = (this.lutY[idx] ?? 0) + side * 30;
      this.towers.push({ x, y });
      glowLayer.add(
        this.make
          .image({ x, y, key: ATLAS, frame: FRAME.glow }, false)
          .setTint(COLORS.tower)
          .setScale(2),
      );
      bodyLayer.add(
        this.make.image({ x, y, key: ATLAS, frame: FRAME.hex }, false).setTint(COLORS.tower),
      );
    }

    for (let i = 0; i < ENEMY_COUNT; i++) {
      const glow = this.make
        .image({ key: ATLAS, frame: FRAME.glow }, false)
        .setTint(COLORS.enemy)
        .setScale(1.2);
      const body = this.make
        .image({ key: ATLAS, frame: FRAME.diamond }, false)
        .setTint(COLORS.enemy);
      glowLayer.add(glow);
      bodyLayer.add(body);
      this.enemies.push({
        dist: (i / ENEMY_COUNT) * this.pathLength,
        speed: 60 + (i % 7) * 12,
        body,
        glow,
      });
    }

    for (let i = 0; i < PROJECTILE_COUNT; i++) {
      const glow = this.make
        .image({ key: ATLAS, frame: FRAME.glow }, false)
        .setTint(COLORS.projectile)
        .setScale(0.5);
      const sprite = this.make
        .image({ key: ATLAS, frame: FRAME.dot }, false)
        .setTint(COLORS.projectile);
      glowLayer.add(glow);
      bodyLayer.add(sprite);
      const p: Projectile = { x: 0, y: 0, vx: 0, vy: 0, life: 0, sprite, glow };
      this.fire(p);
      p.life = Math.random() * 0.6; // stagger
      this.projectiles.push(p);
    }

    this.fpsText = this.add
      .text(20, 20, '', { fontFamily: 'monospace', fontSize: '28px', color: COLORS.text })
      .setDepth(10);
  }

  private buildPath(): void {
    const w = VIEW_WIDTH;
    const pts = [
      new Phaser.Math.Vector2(w * 0.5, -20),
      new Phaser.Math.Vector2(w * 0.15, 220),
      new Phaser.Math.Vector2(w * 0.85, 450),
      new Phaser.Math.Vector2(w * 0.2, 700),
      new Phaser.Math.Vector2(w * 0.8, 950),
      new Phaser.Math.Vector2(w * 0.25, 1200),
      new Phaser.Math.Vector2(w * 0.5, VIEW_HEIGHT - 120),
    ];
    const spline = new Phaser.Curves.Spline(pts);
    const out = new Phaser.Math.Vector2();
    for (let i = 0; i < PATH_SAMPLES; i++) {
      spline.getPointAt(i / (PATH_SAMPLES - 1), out);
      this.lutX[i] = out.x;
      this.lutY[i] = out.y;
    }
    this.pathLength = spline.getLength();
  }

  private drawPath(): void {
    const g = this.add.graphics();
    g.setBlendMode('ADD');
    for (const [width, alpha] of [
      [28, 0.08],
      [14, 0.2],
      [4, 0.9],
    ] as const) {
      g.lineStyle(width, COLORS.path, alpha);
      g.beginPath();
      g.moveTo(this.lutX[0] ?? 0, this.lutY[0] ?? 0);
      for (let i = 1; i < PATH_SAMPLES; i += 8) g.lineTo(this.lutX[i] ?? 0, this.lutY[i] ?? 0);
      g.strokePath();
    }
  }

  private fire(p: Projectile): void {
    const t = this.towers[this.nextTower] ?? { x: 0, y: 0 };
    this.nextTower = (this.nextTower + 1) % this.towers.length;
    const target = this.enemies[Math.floor(Math.random() * this.enemies.length)];
    const tx = target ? target.body.x : VIEW_WIDTH / 2;
    const ty = target ? target.body.y : VIEW_HEIGHT / 2;
    const dx = tx - t.x;
    const dy = ty - t.y;
    const len = Math.hypot(dx, dy) || 1;
    const speed = 900;
    p.x = t.x;
    p.y = t.y;
    p.vx = (dx / len) * speed;
    p.vy = (dy / len) * speed;
    p.life = Math.min(len / speed, 0.8);
  }

  override update(_time: number, deltaMs: number): void {
    const dt = deltaMs / 1000;

    for (const e of this.enemies) {
      e.dist += e.speed * dt;
      if (e.dist >= this.pathLength) e.dist -= this.pathLength;
      const idx = Math.floor((e.dist / this.pathLength) * (PATH_SAMPLES - 1));
      const x = this.lutX[idx] ?? 0;
      const y = this.lutY[idx] ?? 0;
      e.body.setPosition(x, y);
      e.glow.setPosition(x, y);
    }

    for (const p of this.projectiles) {
      p.life -= dt;
      if (p.life <= 0) this.fire(p);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.sprite.setPosition(p.x, p.y);
      p.glow.setPosition(p.x, p.y);
    }

    this.measure(deltaMs);
  }

  private measure(deltaMs: number): void {
    this.elapsed += deltaMs;
    this.bucketTime += deltaMs;
    this.bucketFrames++;
    if (this.bucketTime >= 1000) {
      if (this.elapsed > 2000) this.buckets.push((this.bucketFrames * 1000) / this.bucketTime); // skip warm-up
      this.bucketTime = 0;
      this.bucketFrames = 0;
    }

    this.textTimer += deltaMs;
    if (this.textTimer < 250) return;
    this.textTimer = 0;

    const fps = this.game.loop.actualFps.toFixed(0);
    const n = this.buckets.length;
    const done = n >= MEASURE_SECONDS;
    const sample = done ? this.buckets.slice(0, MEASURE_SECONDS) : this.buckets;
    const min = n ? Math.min(...sample).toFixed(1) : '-';
    const avg = n ? (sample.reduce((a, b) => a + b, 0) / sample.length).toFixed(1) : '-';
    const status = done ? 'DONE' : `measuring ${n}/${MEASURE_SECONDS}s`;
    this.fpsText.setText(
      `PERF SPIKE  ${ENEMY_COUNT} enemies / ${PROJECTILE_COUNT} projectiles\n` +
        `fps ${fps}   min ${min}   avg ${avg}\n${status}`,
    );
    if (done && n === MEASURE_SECONDS) console.info(`[perf] min=${min} avg=${avg}`);
  }
}
