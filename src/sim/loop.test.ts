import { describe, expect, it } from 'vitest';
import { GAME } from '../data/game';
import { FixedStepDriver, TICK_MS } from './loop';

describe('FixedStepDriver', () => {
  it('runs one tick per 60 Hz frame at 1x and two at 2x', () => {
    const d = new FixedStepDriver();
    expect(d.advance(TICK_MS, 1)).toBe(1);
    expect(d.advance(TICK_MS, 2)).toBe(2);
    expect(d.advance(TICK_MS, 3)).toBe(3);
  });

  it('carries leftover time between frames', () => {
    const d = new FixedStepDriver();
    expect(d.advance(TICK_MS * 0.6, 1)).toBe(0);
    expect(d.advance(TICK_MS * 0.6, 1)).toBe(1);
  });

  it('runs the same total ticks at 120 Hz', () => {
    const d = new FixedStepDriver();
    let total = 0;
    for (let i = 0; i < 120; i++) total += d.advance(1000 / 120, 1);
    expect(total).toBe(60);
  });

  it('caps ticks after a stall', () => {
    const d = new FixedStepDriver();
    expect(d.advance(5000, 2)).toBe(GAME.maxTicksPerFrame * 2);
    expect(d.advance(TICK_MS, 1)).toBe(1);
  });
});
