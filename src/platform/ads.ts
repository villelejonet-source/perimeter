export type RewardPlacement = 'double_offline' | 'revive' | 'extra_reroll' | 'double_cores';

/** Rewarded ads only (GDD §12). Resolves true if the reward should be granted. */
export interface Ads {
  isReady(placement: RewardPlacement): Promise<boolean>;
  showRewarded(placement: RewardPlacement): Promise<boolean>;
}

/** Web mock: always ready, grants the reward after a short fake "ad". */
export class MockAds implements Ads {
  constructor(private readonly delayMs = 500) {}
  async isReady(): Promise<boolean> {
    return true;
  }
  async showRewarded(placement: RewardPlacement): Promise<boolean> {
    console.info(`[MockAds] showing rewarded ad: ${placement}`);
    await new Promise((r) => setTimeout(r, this.delayMs));
    return true;
  }
}
