import { describe, expect, it } from 'vitest';
import { DEFAULT_MAP_ID, MAPS, parseMap } from '../data/maps';
import { Path } from './path';

const map = MAPS[DEFAULT_MAP_ID]!;
const pts = map.path;
const path = new Path(pts);

describe('map 1 (map-01-s-curve) path', () => {
  it('loads from its JSON with every field', () => {
    expect(map.id).toBe('map-01-s-curve');
    expect(map.name).toBe('Outpost Run');
    expect(map.pathWidth).toBe(32);
    expect(map.buildBuffer).toBe(16);
    expect(map.playArea).toEqual({ top: 112, bottom: 720 });
    expect(pts.length).toBe(14);
  });

  it('has the expected length', () => {
    // Measured from the engine's arc-length table when the map was added (docs/design/INVENTORY.md).
    expect(path.length).toBeCloseTo(1055.2, 0);
    // A smooth spline through the points stays close to the control polyline's length.
    let polyline = 0;
    for (let i = 1; i < pts.length; i++) {
      polyline += Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y);
    }
    expect(Math.abs(path.length - polyline) / polyline).toBeLessThan(0.03);
  });

  it('starts at spawn and ends at base', () => {
    const out = { x: 0, y: 0 };
    path.positionAt(0, out);
    expect(out).toEqual({ x: map.spawn.x, y: map.spawn.y });
    path.positionAt(path.length, out);
    expect(out.x).toBeCloseTo(map.base.x);
    expect(out.y).toBeCloseTo(map.base.y);
  });

  it('rejects malformed map JSON', () => {
    const good = {
      id: 'x',
      name: 'X',
      spawn: { x: 0, y: 0 },
      base: { x: 10, y: 0 },
      pathWidth: 32,
      buildBuffer: 16,
      pathControlPoints: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
      playArea: { top: 0, bottom: 100 },
    };
    expect(() => parseMap(good)).not.toThrow();
    expect(() => parseMap({ ...good, playArea: undefined })).toThrow(/playArea/);
    expect(() => parseMap({ ...good, spawn: { x: 5, y: 5 } })).toThrow(/spawn/);
    expect(() => parseMap({ ...good, pathControlPoints: [{ x: 0, y: 0 }] })).toThrow(
      /pathControlPoints/,
    );
  });
});

describe('Path', () => {
  it('moves at constant speed by arc length', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 0, y: 0 };
    const step = 5;
    for (let d = 0; d + step <= path.length; d += step) {
      path.positionAt(d, a);
      path.positionAt(d + step, b);
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

  it('measures distance to the path and to a box', () => {
    const p = path.positionAt(path.length / 3, { x: 0, y: 0 });
    expect(path.distanceTo(p.x, p.y)).toBeLessThan(0.5);
    expect(path.distanceTo(-1000, -1000)).toBeGreaterThan(500);
    expect(path.distanceToBox(p.x, p.y, 16)).toBe(0);
    // Box centred 40 units off the path along its normal: its near edge is ~24 away
    // (16 half-size; exact for an axis-aligned normal, slightly less on a diagonal).
    const q = path.positionAt(path.length / 3 + 1, { x: 0, y: 0 });
    const len = Math.hypot(q.x - p.x, q.y - p.y);
    const nx = -(q.y - p.y) / len;
    const ny = (q.x - p.x) / len;
    const d = path.distanceToBox(p.x + nx * 40, p.y + ny * 40, 16);
    expect(d).toBeGreaterThan(40 - 16 * Math.SQRT2 - 1);
    expect(d).toBeLessThanOrEqual(24 + 1);
  });
});
