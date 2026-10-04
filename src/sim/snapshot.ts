import type { Command } from './commands';
import { recomputeArtifactValues } from './artifacts';
import { Sim, type SimConfig } from './sim';
import {
  refreshAllStats,
  type Enemy,
  type Fx,
  type Projectile,
  type SimState,
  type Tower,
  type Zone,
} from './state';

/**
 * A complete, JSON-safe copy of a running sim (GDD §11: closing the app pauses the run and it
 * resumes exactly). Pools keep their dead slots so iteration order, and with it determinism,
 * survives a restore. Live object references are stored by id and re-linked on load.
 */
export interface SimSnapshot {
  v: 1;
  config: SimConfig;
  rng: number;
  pending: Command[];
  state: Omit<SimState, 'enemies' | 'towers' | 'projectiles' | 'fx' | 'zones' | 'art'> & {
    enemies: Enemy[];
    towers: Omit<Tower, 'stats'>[];
    projectiles: (Omit<Projectile, 'target' | 'hits'> & { hits: number[] })[];
    fx: Fx[];
    zones: Zone[];
  };
}

const clone = <T>(v: T): T => structuredClone(v);

export function snapshotSim(sim: Sim): SimSnapshot {
  const s = sim.state;
  const { enemies, towers, projectiles, fx, zones, art: _art, ...rest } = s;
  return {
    v: 1,
    config: clone(sim.config),
    rng: sim.rng.state,
    pending: clone([...sim.pending]),
    state: {
      ...clone(rest),
      enemies: enemies.items.map((e) => ({ ...e })),
      towers: towers.items.map(({ stats: _stats, ...t }) => ({ ...t })),
      projectiles: projectiles.items.map(({ target: _target, hits, ...p }) => ({
        ...p,
        hits: [...hits],
      })),
      fx: fx.items.map((f) => ({ ...f })),
      zones: zones.items.map((z) => ({ ...z })),
    },
  };
}

export function restoreSim(snap: SimSnapshot): Sim {
  if (snap.v !== 1) throw new Error(`Unsupported sim snapshot v${String(snap.v)}`);
  const sim = new Sim(snap.config);
  sim.rng.state = snap.rng;
  const s = sim.state;
  const { enemies, towers, projectiles, fx, zones, ...rest } = clone(snap.state);
  Object.assign(s, rest);

  s.enemies.items.length = 0;
  s.enemies.items.push(...enemies);
  recomputeArtifactValues(s);
  s.towers.items.length = 0;
  for (const t of towers) s.towers.items.push(t as Tower);
  refreshAllStats(s);
  s.projectiles.items.length = 0;
  for (const p of projectiles) {
    const target =
      p.targetId >= 0
        ? (s.enemies.items.find((e) => e.alive && e.id === p.targetId) ?? null)
        : null;
    s.projectiles.items.push({ ...p, target, hits: Int32Array.from(p.hits) });
  }
  s.fx.items.length = 0;
  s.fx.items.push(...fx);
  s.zones.items.length = 0;
  s.zones.items.push(...zones);
  for (const c of snap.pending) sim.enqueue(c);
  return sim;
}
