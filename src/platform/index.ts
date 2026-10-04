import { Capacitor } from '@capacitor/core';
import { AdMobAds, MockAds, type Ads } from './ads';
import { LocalAnalytics, type Analytics } from './analytics';
import { CapacitorHaptics, NoopHaptics, type Haptics } from './haptics';
import { MockIap, RevenueCatIap, type Iap } from './iap';
import { CapacitorStorage, WebStorage, type Storage } from './storage';

export interface Platform {
  readonly native: boolean;
  readonly storage: Storage;
  readonly ads: Ads;
  readonly iap: Iap;
  readonly haptics: Haptics;
  readonly analytics: Analytics;
}

/** Picks native implementations on device, web mocks in the browser. */
export function createPlatform(): Platform {
  const native = Capacitor.isNativePlatform();
  const storage = native ? new CapacitorStorage() : new WebStorage();
  return {
    native,
    storage,
    ads: native ? new AdMobAds() : new MockAds(),
    iap: native ? new RevenueCatIap() : new MockIap(),
    haptics: native ? new CapacitorHaptics() : new NoopHaptics(),
    analytics: new LocalAnalytics(storage, import.meta.env.DEV),
  };
}

export type { Ads, Analytics, Haptics, Iap, Storage };
