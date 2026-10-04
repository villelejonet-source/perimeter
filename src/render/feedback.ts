import type Phaser from 'phaser';
import type { SfxId } from '../data/audio';
import type { Sim } from '../sim';
import { buzz, playSfx } from './audio';

/** Camera shake on big moments (ms, intensity as a fraction of the view). */
const SHAKE_BOSS = { ms: 260, intensity: 0.006 };
const SHAKE_LEAK = { ms: 160, intensity: 0.004 };
const BOSS_RADIUS = 14;

/**
 * Turns sim changes into sound, haptics and screen shake. Reads only: it compares the pools with
 * last frame's (tower cooldowns reset = a shot; a fresh fx record = a blast, death, freeze or
 * shield break). Per-slot arrays, no per-frame allocation.
 */
export class Feedback {
  private readonly cooldowns: number[] = [];
  private readonly fxTtl: number[] = [];
  private lastBaseHp: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly sim: Sim,
  ) {
    this.lastBaseHp = sim.state.baseHp;
    // Treat what's already on screen (a resumed run) as seen.
    sim.state.towers.items.forEach((t, i) => (this.cooldowns[i] = t.cooldown));
    sim.state.fx.items.forEach((f, i) => (this.fxTtl[i] = f.alive ? f.ttl : 0));
  }

  update(): void {
    const s = this.sim.state;
    const towers = s.towers.items;
    for (let i = 0; i < towers.length; i++) {
      const t = towers[i]!;
      const last = this.cooldowns[i] ?? 0;
      if (t.alive && t.cooldown > last) playSfx(this.scene, `shot.${t.kind}` as SfxId);
      this.cooldowns[i] = t.alive ? t.cooldown : 0;
    }
    const fx = s.fx.items;
    let bossDown = false;
    for (let i = 0; i < fx.length; i++) {
      const f = fx[i]!;
      const fresh = f.alive && f.ttl > (this.fxTtl[i] ?? 0);
      this.fxTtl[i] = f.alive ? f.ttl : 0;
      if (!fresh) continue;
      if (f.kind === 'death') {
        if (f.radius >= BOSS_RADIUS) bossDown = true;
        else playSfx(this.scene, 'death');
      } else if (f.kind === 'blast') playSfx(this.scene, 'blast');
      else if (f.kind === 'freeze') playSfx(this.scene, 'freeze');
      else if (f.kind === 'shieldBreak') playSfx(this.scene, 'shieldBreak');
    }
    const cam = this.scene.cameras.main;
    if (bossDown) {
      playSfx(this.scene, 'bossDeath');
      buzz(this.scene, 'boss');
      cam.shake(SHAKE_BOSS.ms, SHAKE_BOSS.intensity);
    }
    if (s.baseHp < this.lastBaseHp) {
      playSfx(this.scene, 'leak');
      buzz(this.scene, 'leak');
      cam.shake(SHAKE_LEAK.ms, SHAKE_LEAK.intensity);
    }
    this.lastBaseHp = s.baseHp;
  }
}
