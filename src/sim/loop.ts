import { GAME } from '../data/game';

export const TICK_MS = 1000 / GAME.tickRate;

/**
 * Converts real frame time into a whole number of fixed sim ticks.
 * Game speed multiplies the ticks per frame; dt per tick never changes.
 */
export class FixedStepDriver {
  private accumulator = 0;

  /** Returns how many ticks to run for a frame of `frameMs` at `speed`x. */
  advance(frameMs: number, speed: number): number {
    this.accumulator += frameMs * speed;
    const maxTicks = GAME.maxTicksPerFrame * speed;
    let ticks = Math.floor(this.accumulator / TICK_MS);
    if (ticks > maxTicks) {
      ticks = maxTicks;
      this.accumulator = 0; // Drop the backlog after a stall instead of fast-forwarding.
    } else {
      this.accumulator -= ticks * TICK_MS;
    }
    return ticks;
  }

  reset(): void {
    this.accumulator = 0;
  }
}
