import { AdMob, RewardAdPluginEvents } from '@capacitor-community/admob';
import { MONETIZATION_CONFIG } from './config';

export type RewardPlacement = 'double_offline' | 'revive' | 'extra_reroll' | 'double_cores';

/**
 * Rewarded ads only (GDD §12: opt-in, never forced). `available()` is synchronous so buttons can
 * show "Ad not available" offline instead of failing after a tap.
 */
export interface Ads {
  init(): Promise<void>;
  available(): boolean;
  /** Resolves true only when the player earned the reward. */
  showRewarded(placement: RewardPlacement): Promise<boolean>;
}

/** Web mock: always available, grants the reward after a short fake "ad". */
export class MockAds implements Ads {
  constructor(private readonly delayMs = 500) {}
  async init(): Promise<void> {}
  available(): boolean {
    return true;
  }
  async showRewarded(placement: RewardPlacement): Promise<boolean> {
    console.info(`[MockAds] rewarded ad: ${placement}`);
    await new Promise((r) => setTimeout(r, this.delayMs));
    return true;
  }
}

/**
 * AdMob rewarded ads on iOS. Asks for App Tracking Transparency once (before the first ad
 * request), keeps one ad preloaded, and reloads after every show. Any failure just means no ad
 * is available; the game never blocks on it.
 */
export class AdMobAds implements Ads {
  private loaded = false;
  private loading = false;
  private ready = false;

  async init(): Promise<void> {
    try {
      const { status } = await AdMob.trackingAuthorizationStatus();
      if (status === 'notDetermined') await AdMob.requestTrackingAuthorization();
      await AdMob.initialize({ initializeForTesting: MONETIZATION_CONFIG.admob.testing });
      this.ready = true;
      void AdMob.addListener(RewardAdPluginEvents.FailedToLoad, () => {
        this.loaded = false;
        this.loading = false;
      });
      void this.load();
    } catch (e) {
      console.warn('[AdMob] init failed', e);
    }
  }

  available(): boolean {
    if (!this.loaded) void this.load();
    return this.loaded;
  }

  private async load(): Promise<void> {
    if (!this.ready || this.loading || this.loaded) return;
    this.loading = true;
    try {
      await AdMob.prepareRewardVideoAd({
        adId: MONETIZATION_CONFIG.admob.rewardedAdUnitIos,
        isTesting: MONETIZATION_CONFIG.admob.testing,
      });
      this.loaded = true;
    } catch {
      this.loaded = false;
    } finally {
      this.loading = false;
    }
  }

  async showRewarded(): Promise<boolean> {
    if (!this.loaded) return false;
    this.loaded = false;
    let earned = false;
    let close!: () => void;
    const closed = new Promise<void>((resolve) => (close = resolve));
    const handles = await Promise.all([
      AdMob.addListener(RewardAdPluginEvents.Rewarded, () => (earned = true)),
      AdMob.addListener(RewardAdPluginEvents.Dismissed, () => close()),
      AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => close()),
    ]);
    // showRewardVideoAd resolves on the reward; the ad is over once it's dismissed or fails.
    void AdMob.showRewardVideoAd()
      .then(() => (earned = true))
      .catch(() => close());
    await closed;
    for (const h of handles) void h.remove();
    void this.load();
    return earned;
  }
}
