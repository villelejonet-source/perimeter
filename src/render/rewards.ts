import type Phaser from 'phaser';
import type { RewardPlacement } from '../platform/ads';
import type { RewardState } from '../ui/dom/RewardButton';
import { getPlatform, getStore } from './registry';

/** What a reward button should show right now (pass owners skip the ad). */
export function rewardState(scene: Phaser.Scene): RewardState {
  if (getStore(scene).profile.purchases.commanderPass) return 'pass';
  return getPlatform(scene).ads.available() ? 'ad' : 'unavailable';
}

/**
 * Plays a rewarded ad (or skips it for Commander Pass owners). Resolves true when the reward
 * should be granted. Never throws: no ad, no reward.
 */
export async function earnReward(
  scene: Phaser.Scene,
  placement: RewardPlacement,
): Promise<boolean> {
  const { ads, analytics } = getPlatform(scene);
  if (getStore(scene).profile.purchases.commanderPass) {
    analytics.track({ name: 'ad_view', placement, rewarded: true, viaPass: true });
    return true;
  }
  if (!ads.available()) return false;
  scene.sound.pauseAll();
  const rewarded = await ads.showRewarded(placement).catch(() => false);
  scene.sound.resumeAll();
  analytics.track({ name: 'ad_view', placement, rewarded, viaPass: false });
  return rewarded;
}
