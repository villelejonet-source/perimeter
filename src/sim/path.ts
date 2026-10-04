import type { Point } from '../data/maps';

const SAMPLES_PER_SEGMENT = 64;

/**
 * Catmull-Rom spline baked into an arc-length table, so enemies move by distance
 * travelled at constant speed regardless of control point spacing.
 */
export class Path {
  readonly length: number;
  private readonly xs: Float64Array;
  private readonly ys: Float64Array;
  /** Cumulative distance at each sample. */
  private readonly ds: Float64Array;

  constructor(points: readonly Point[]) {
    if (points.length < 2) throw new Error('Path needs at least 2 points');
    const segs = points.length - 1;
    const n = segs * SAMPLES_PER_SEGMENT + 1;
    this.xs = new Float64Array(n);
    this.ys = new Float64Array(n);
    this.ds = new Float64Array(n);

    const at = (i: number): Point => points[Math.max(0, Math.min(points.length - 1, i))] as Point;
    let k = 0;
    for (let s = 0; s < segs; s++) {
      const p0 = at(s - 1);
      const p1 = at(s);
      const p2 = at(s + 1);
      const p3 = at(s + 2);
      const last = s === segs - 1;
      for (let j = 0; j < SAMPLES_PER_SEGMENT + (last ? 1 : 0); j++) {
        const t = j / SAMPLES_PER_SEGMENT;
        this.xs[k] = catmullRom(p0.x, p1.x, p2.x, p3.x, t);
        this.ys[k] = catmullRom(p0.y, p1.y, p2.y, p3.y, t);
        k++;
      }
    }

    let total = 0;
    for (let i = 1; i < n; i++) {
      total += Math.hypot(this.xs[i]! - this.xs[i - 1]!, this.ys[i]! - this.ys[i - 1]!);
      this.ds[i] = total;
    }
    this.length = total;
  }

  get sampleCount(): number {
    return this.xs.length;
  }

  sampleX(i: number): number {
    return this.xs[i] ?? 0;
  }

  sampleY(i: number): number {
    return this.ys[i] ?? 0;
  }

  /** Writes the point at `distance` along the path into `out` (no allocation). */
  positionAt(distance: number, out: Point): Point {
    const d = Math.max(0, Math.min(this.length, distance));
    // Binary search for the sample segment containing d.
    let lo = 0;
    let hi = this.ds.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (this.ds[mid]! <= d) lo = mid;
      else hi = mid;
    }
    const d0 = this.ds[lo]!;
    const span = this.ds[hi]! - d0;
    const t = span > 0 ? (d - d0) / span : 0;
    out.x = this.xs[lo]! + (this.xs[hi]! - this.xs[lo]!) * t;
    out.y = this.ys[lo]! + (this.ys[hi]! - this.ys[lo]!) * t;
    return out;
  }

  /**
   * Shortest distance from the path centreline to an axis-aligned square of half-size `half`
   * centred at (cx, cy). Uses the arc-length samples (~1-2 units apart), which is well within
   * placement tolerance.
   */
  distanceToBox(cx: number, cy: number, half: number): number {
    let bestSq = Infinity;
    for (let i = 0; i < this.xs.length; i++) {
      const dx = Math.max(Math.abs(this.xs[i]! - cx) - half, 0);
      const dy = Math.max(Math.abs(this.ys[i]! - cy) - half, 0);
      const dSq = dx * dx + dy * dy;
      if (dSq < bestSq) bestSq = dSq;
    }
    return Math.sqrt(bestSq);
  }

  /** Shortest distance from (x, y) to the path polyline. */
  distanceTo(x: number, y: number): number {
    let best = Infinity;
    for (let i = 1; i < this.xs.length; i++) {
      const d = distToSegment(x, y, this.xs[i - 1]!, this.ys[i - 1]!, this.xs[i]!, this.ys[i]!);
      if (d < best) best = d;
    }
    return best;
  }
}

function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

function distToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq)) : 0;
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}
