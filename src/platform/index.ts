import { Capacitor } from '@capacitor/core';
import { MockAds, type Ads } from './ads';
import { CapacitorHaptics, NoopHaptics, type Haptics } from './haptics';
import { MockIap, type Iap } from './iap';
import { CapacitorStorage, WebStorage, type Storage } from './storage';

export interface Platform {
  readonly native: boolean;
  readonly storage: Storage;
  readonly ads: Ads;
  readonly iap: Iap;
  readonly haptics: Haptics;
}

/** Picks native implementations on device, web mocks in the browser. Ads/IAP are mocked until Phase 9. */
export function createPlatform(): Platform {
  const native = Capacitor.isNativePlatform();
  return {
    native,
    storage: native ? new CapacitorStorage() : new WebStorage(),
    ads: new MockAds(),
    iap: new MockIap(),
    haptics: native ? new CapacitorHaptics() : new NoopHaptics(),
  };
}

export type { Ads, Haptics, Iap, Storage };
