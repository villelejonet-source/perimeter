import { describe, expect, it } from 'vitest';
import { Rng } from './rng';

describe('Rng', () => {
  it('is reproducible for the same seed', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    for (let i = 0; i < 1000; i++) expect(a.next()).toBe(b.next());
  });

  it('differs across seeds', () => {
    expect(new Rng(1).next()).not.toBe(new Rng(2).next());
  });

  it('stays in range', () => {
    const r = new Rng(7);
    for (let i = 0; i < 5000; i++) {
      const f = r.next();
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
      const n = r.int(3, 5);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(5);
    }
  });

  it('can be saved and restored', () => {
    const r = new Rng(99);
    r.next();
    const saved = r.state;
    const expected = [r.next(), r.next()];
    r.state = saved;
    expect([r.next(), r.next()]).toEqual(expected);
  });
});
