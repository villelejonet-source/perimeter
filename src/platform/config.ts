/**
 * Third-party keys (docs/MONETIZATION.md). Until real ones are filled in, ads use Google's public
 * test ad unit and purchases are disabled on device (the shop says the store is unavailable).
 * These are public client identifiers, safe to commit; never put server secrets here.
 */
export const MONETIZATION_CONFIG = {
  admob: {
    /** Google's public iOS rewarded test unit. Replace with your unit id for release. */
    rewardedAdUnitIos: 'ca-app-pub-3940256099942544/1712485313',
    /** Serve test ads (keep true until App Store release). */
    testing: true,
  },
  revenuecat: {
    /** RevenueCat public iOS API key ("appl_..."). null = store disabled. */
    iosApiKey: null as string | null,
  },
} as const;
