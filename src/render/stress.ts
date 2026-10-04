import { TOWER_SPECS } from '../data/specs';
import { TOWER_ORDER } from '../data/towers';
import { GAME } from '../data/game';
import { META_PRESETS } from '../data/meta';
import { placementError, Sim } from '../sim';
import { h } from '../ui/dom/overlay';

/**
 * Performance test (ROADMAP Phase 8 acceptance: 60 fps on device in a late wave at 2x with heavy
 * VFX). Started from Settings so it works in device builds. A 50 h account with a full field of
 * specialized towers starts at wave 60 and calls waves early to stack them; nothing is saved or
 * paid out.
 */
export const STRESS = {
  startWave: 59,
  towers: 18,
  level: 8,
  speed: 2,
  /** Call the next wave this often (game seconds) to keep the field full. */
  callEverySeconds: 6,
  /** Report after this long (real seconds). */
  measureSeconds: 30,
} as const;

export function stressSim(): Sim {
  const sim = new Sim({ seed: 60, meta: META_PRESETS['50h'], invulnerable: true });
  const s = sim.state;
  s.credits = 1e9;
  // Fill valid spots nearest the path, cycling tower kinds.
  const spots: { x: number; y: number; d: number }[] = [];
  const g = GAME.towerFootprint;
  const p = { x: 0, y: 0 };
  for (let y = sim.map.playArea.top + g; y < GAME.buildAreaMaxBottom; y += g) {
    for (let x = g; x < GAME.worldWidth - g / 2; x += g) {
      if (placementError(s, sim.path, sim.map, x, y) !== null) continue;
      let d = Infinity;
      for (let t = 0; t < sim.path.length; t += 16) {
        sim.path.positionAt(t, p);
        d = Math.min(d, Math.hypot(p.x - x, p.y - y));
      }
      spots.push({ x, y, d });
    }
  }
  spots.sort((a, b) => a.d - b.d);
  spots.slice(0, STRESS.towers).forEach((spot, i) => {
    sim.enqueue({
      type: 'placeTower',
      kind: TOWER_ORDER[i % TOWER_ORDER.length]!,
      x: spot.x,
      y: spot.y,
    });
  });
  sim.step();
  for (const t of s.towers.items) {
    if (!t.alive) continue;
    while (t.level < STRESS.level) {
      sim.enqueue({ type: 'upgradeTower', towerId: t.id });
      sim.step();
    }
    sim.enqueue({ type: 'specialize', towerId: t.id, spec: TOWER_SPECS[t.kind][t.id % 3]! });
  }
  sim.step();
  s.wave = STRESS.startWave;
  s.nextWaveIn = 1;
  s.credits = 99_999;
  return sim;
}

/** On-screen fps readout with min / avg over the measuring window. */
export class FpsMeter {
  private readonly el: HTMLElement;
  private readonly start = performance.now();
  private min = Infinity;
  private sum = 0;
  private frames = 0;
  private done = false;

  constructor(parent: HTMLElement) {
    this.el = h('div', 'fps-meter d');
    parent.appendChild(this.el);
  }

  update(fps: number, enemies: number, fx: number): void {
    const t = (performance.now() - this.start) / 1000;
    // Skip the first second (warm-up).
    if (t > 1 && !this.done) {
      this.min = Math.min(this.min, fps);
      this.sum += fps;
      this.frames++;
    }
    if (t >= STRESS.measureSeconds) this.done = true;
    const avg = this.frames ? this.sum / this.frames : fps;
    const status = this.done
      ? avg >= 58 && this.min >= 50
        ? 'PASS'
        : 'CHECK'
      : `${Math.ceil(STRESS.measureSeconds - t)} s`;
    this.el.textContent = `fps ${fps.toFixed(0)} · min ${Number.isFinite(this.min) ? this.min.toFixed(0) : '–'} · avg ${avg.toFixed(0)} · ${status}\nenemies ${enemies} · fx ${fx} · 2x`;
  }
}
