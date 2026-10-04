# Monetization setup (Phase 9)

The game ships with rewarded ads (AdMob) and in-app purchases (RevenueCat) wired up behind
`src/platform/ads.ts` and `src/platform/iap.ts`. Everything works without accounts:

- **Browser:** mock ads (always granted after 0.5 s) and a mock store (every purchase succeeds).
- **Device / Simulator, today:** real AdMob **test** ads (Google's public test IDs) and the
  tracking prompt. The shop says "Store unavailable" until a RevenueCat key is set.

All keys live in one file, `src/platform/config.ts`, plus the AdMob app id in
`ios/App/App/Info.plist`. After changing either: `npm run build && npx cap sync ios`.

## 1. AdMob (rewarded ads)

1. Create an account at admob.google.com and add an **iOS app** (you can link it to the App
   Store listing later).
2. Copy the **App ID** (`ca-app-pub-…~…`) into `ios/App/App/Info.plist` →
   `GADApplicationIdentifier` (replacing Google's test app id).
3. Create one **Rewarded** ad unit and copy its id (`ca-app-pub-…/…`) into
   `MONETIZATION_CONFIG.admob.rewardedAdUnitIos`.
4. Keep `testing: true` while developing. Set it to `false` only for the App Store build.
   Clicking real ads on your own device can get the account suspended.
5. In AdMob → Privacy & messaging, set up the IDFA explainer if you want one; the system
   prompt text is `NSUserTrackingUsageDescription` in Info.plist.
6. Add Google's full SKAdNetwork list to Info.plist before release (only Google's own id is
   there now): developers.google.com/admob/ios/quick-start → "Update your Info.plist".

## 2. App Store Connect (products)

1. Sign the **Paid Apps agreement** (Agreements, Tax, and Banking). Purchases don't work
   without it, even in the sandbox.
2. Create the app record (bundle id from `capacitor.config.ts`).
3. Add in-app purchases with these **exact product ids** (`src/data/shop.ts`):

   | Product id | Type | Price |
   |---|---|---|
   | `commander_pass` | Non-Consumable | $4.99 |
   | `starter_pack` | Non-Consumable | $1.99 |
   | `cores_s` | Consumable | $0.99 |
   | `cores_m` | Consumable | $4.99 |
   | `cores_l` | Consumable | $9.99 |
   | `shards_s` | Consumable | $0.99 |
   | `shards_m` | Consumable | $4.99 |

4. Create a **Sandbox tester** (Users and Access → Sandbox) for device testing.
5. In Xcode: App target → Signing & Capabilities → **+ In-App Purchase**.

## 3. RevenueCat (purchases + receipt validation)

1. Create a project at app.revenuecat.com and add an **App Store** app (bundle id as above).
2. Upload the **In-App Purchase key** (App Store Connect → Users and Access → Integrations →
   In-App Purchase) as RevenueCat asks.
3. Import the products above (Products → Import).
4. Copy the **public iOS API key** (`appl_…`) into `MONETIZATION_CONFIG.revenuecat.iosApiKey`.
   It's a public client key and safe to commit; never put the secret key in the app.

## 4. Testing on device (acceptance)

1. `npm run build && npx cap sync ios`, run from Xcode on your iPhone.
2. **Ads:** finish a run → Double Cores → a "Test mode" ad plays → Cores double. Also try
   Welcome back → Double with ad, the revive prompt, and Free reroll on an artifact pick.
3. **Purchases:** Shop → buy anything → sign in with the sandbox tester → contents arrive.
   Delete and reinstall the app → Shop → Restore purchases → Commander Pass comes back.
4. **Offline:** turn on Airplane Mode → reward buttons say "No ad available right now", the
   shop says "Store unavailable", and the game plays normally.

## Analytics

`src/platform/analytics.ts` records the GDD §12 events (run start/end, spec and artifact picks,
ad views, purchases, tutorial) into a local buffer (the last 200 events, key
`perimeter.analytics`). No data leaves the device yet. To add a provider, implement
`Analytics` and return it from `createPlatform()` in `src/platform/index.ts`.
