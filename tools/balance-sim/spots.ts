import { GAME } from '../../src/data/game';
import { placementError, snapToGrid } from '../../src/sim/placement';
import type { Sim } from '../../src/sim/sim';

export interface Spot {
  x: number;
  y: number;
}

/**
 * Candidate tower spots on map 1 and how much path each covers at a given range.
 * Coverage = path length (px) inside the range circle: a tower sees an enemy for
 * coverage / speed seconds, so it's the bot's measure of a spot's worth.
 */
export class SpotIndex {
  private readonly spots: Spot[] = [];
  private readonly samples: Spot[] = [];
  private readonly coverageCache = new Map<number, Float64Array>();
  private static readonly SAMPLE_STEP = 4;

  constructor(private readonly sim: Sim) {
    const g = GAME.gridSize;
    // Spots valid on an empty map (towers placed later are checked at use time).
    const empty = new (sim.constructor as typeof Sim)({ seed: 0, mapId: sim.map.id });
    for (let y = snapToGrid(sim.map.playArea.top); y <= GAME.worldHeight; y += g) {
      for (let x = g; x <= GAME.worldWidth - g; x += g) {
        if (placementError(empty.state, empty.path, empty.map, x, y) === null)
          this.spots.push({ x, y });
      }
    }
    const p = { x: 0, y: 0 };
    for (let d = 0; d <= sim.path.length; d += SpotIndex.SAMPLE_STEP) {
      sim.path.positionAt(d, p);
      this.samples.push({ x: p.x, y: p.y });
    }
  }

  private coverage(range: number): Float64Array {
    const key = Math.round(range);
    let cov = this.coverageCache.get(key);
    if (!cov) {
      cov = new Float64Array(this.spots.length);
      const rSq = range * range;
      this.spots.forEach((s, i) => {
        let n = 0;
        for (const q of this.samples) if ((q.x - s.x) ** 2 + (q.y - s.y) ** 2 <= rSq) n++;
        cov![i] = n * SpotIndex.SAMPLE_STEP;
      });
      this.coverageCache.set(key, cov);
    }
    return cov;
  }

  /** Path px covered at (x, y) for this range. */
  coverageAt(x: number, y: number, range: number): number {
    const i = this.spots.findIndex((s) => s.x === x && s.y === y);
    if (i >= 0) return this.coverage(range)[i]!;
    let n = 0;
    for (const q of this.samples) if ((q.x - x) ** 2 + (q.y - y) ** 2 <= range * range) n++;
    return n * SpotIndex.SAMPLE_STEP;
  }

  /** Best currently free spot for this range, or null if the map is full. */
  best(range: number): (Spot & { coverage: number }) | null {
    const cov = this.coverage(range);
    let best = -1;
    for (let i = 0; i < this.spots.length; i++) {
      if (best >= 0 && cov[i]! <= cov[best]!) continue;
      const s = this.spots[i]!;
      if (placementError(this.sim.state, this.sim.path, this.sim.map, s.x, s.y) !== null) continue;
      best = i;
    }
    return best < 0 ? null : { ...this.spots[best]!, coverage: cov[best]! };
  }
}
