import { describe, expect, it } from 'vitest';
import { MAPS } from '../data/maps';
import { Path } from './path';

const pts = MAPS.serpent!.path;
const path = new Path(pts);

describe('Path', () => {
  it('starts and ends at the first and last control points', () => {
    const out = { x: 0, y: 0 };
    path.positionAt(0, out);
    expect(out.x).toBeCloseTo(pts[0]!.x);
    expect(out.y).toBeCloseTo(pts[0]!.y);
    path.positionAt(path.length, out);
    expect(out.x).toBeCloseTo(pts[pts.length - 1]!.x);
    expect(out.y).toBeCloseTo(pts[pts.length - 1]!.y);
  });

  it('moves at constant speed by arc length', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 0, y: 0 };
    const step = 5;
    for (let d = 0; d + step <= path.length; d += step) {
      path.positionAt(d, a);
      path.positionAt(d + step, b);
      // Chord is at most the arc length and close to it for short steps.
      const chord = Math.hypot(b.x - a.x, b.y - a.y);
      expect(chord).toBeLessThanOrEqual(step + 1e-6);
      expect(chord).toBeGreaterThan(step * 0.95);
    }
  });

  it('clamps out-of-range distances', () => {
    const out = { x: 0, y: 0 };
    path.positionAt(-50, out);
    expect(out.x).toBeCloseTo(pts[0]!.x);
    path.positionAt(path.length + 50, out);
    expect(out.y).toBeCloseTo(pts[pts.length - 1]!.y);
  });

  it('measures distance to the path', () => {
    const p = path.positionAt(path.length / 3, { x: 0, y: 0 });
    expect(path.distanceTo(p.x, p.y)).toBeLessThan(0.5);
    expect(path.distanceTo(-1000, -1000)).toBeGreaterThan(500);
  });
});
