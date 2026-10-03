# Running on a physical iPhone

## One-time setup
1. Plug in the iPhone and trust the Mac. On the phone, turn on **Settings → Privacy & Security → Developer Mode** (it restarts the phone).
2. `npm run build && npx cap sync ios`
3. `npx cap open ios`. This opens `ios/App/App.xcodeproj` in Xcode.
4. In Xcode, select the **App** target and open **Signing & Capabilities**:
   - Tick *Automatically manage signing* and pick your **Team** (a personal Apple ID works for dev).
   - If the bundle id `com.viktorolsson.perimeter` is taken, change it here and in `capacitor.config.ts`.
5. Pick your iPhone as the run destination and press **Run** (⌘R).
   On first launch, trust the developer certificate at **Settings → General → VPN & Device Management**.

## Phase 0 perf gate
The perf spike is the scene shown after you tap the title screen.
1. Build a **Release** configuration for realistic numbers: *Product → Scheme → Edit Scheme → Run → Build Configuration: Release*.
2. Launch the app, tap the title screen, and keep the phone still for ~35 s.
3. The overlay shows `fps`, `min`, `avg` and turns to `DONE` after 30 s of measurement (the first 2 s are skipped as warm-up).
4. **Pass:** `avg` ≥ ~58 and `min` ≥ ~50. Report both numbers, the iPhone model and the iOS version.
   Also note whether the phone got warm or the numbers drifted down over time (thermal throttling).

## After each web change
`npm run build && npx cap sync ios`, then Run again from Xcode.
