import type { Storage } from './storage';

/** GDD §12: the few events tracked from day one. */
export type AnalyticsEvent =
  | { name: 'run_start'; map: string; resumed: boolean }
  | {
      name: 'run_end';
      map: string;
      wave: number;
      seconds: number;
      retreated: boolean;
      cores: number;
    }
  | { name: 'spec_pick'; tower: string; spec: string; wave: number; second: boolean }
  | { name: 'artifact_pick'; artifact: string; tier: number; wave: number }
  | { name: 'ad_view'; placement: string; rewarded: boolean; viaPass: boolean }
  | { name: 'purchase'; product: string; result: string }
  | { name: 'tutorial'; step: string };

/**
 * Analytics behind an interface (decided 2026-10-04: no provider yet). Swap the implementation
 * in src/platform/index.ts for Firebase, TelemetryDeck etc.; game code doesn't change.
 */
export interface Analytics {
  track(event: AnalyticsEvent): void;
}

const KEY = 'perimeter.analytics';
const MAX = 200;
const FLUSH_MS = 5000;

/** Keeps the last events in a local ring buffer (and logs them in dev builds). */
export class LocalAnalytics implements Analytics {
  private buffer: (AnalyticsEvent & { at: number })[] | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly storage: Storage,
    private readonly log = false,
  ) {}

  track(event: AnalyticsEvent): void {
    if (this.log) console.info('[analytics]', event.name, event);
    void this.append({ ...event, at: Date.now() });
  }

  private async append(e: AnalyticsEvent & { at: number }): Promise<void> {
    this.buffer ??= (await this.storage.get<(AnalyticsEvent & { at: number })[]>(KEY)) ?? [];
    this.buffer.push(e);
    if (this.buffer.length > MAX) this.buffer.splice(0, this.buffer.length - MAX);
    this.timer ??= setTimeout(() => {
      this.timer = null;
      void this.storage.set(KEY, this.buffer);
    }, FLUSH_MS);
  }
}
