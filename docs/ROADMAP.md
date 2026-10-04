# Build Roadmap

Work top to bottom. Each phase ends with something playable or testable. Tick boxes when
acceptance criteria are met. Do not start a phase before the previous one passes.

## Phase 0 — Scaffold and performance gate
- [x] Vite + TS (strict) + Phaser 3 + Vitest + ESLint/Prettier
- [x] Folder layout per CLAUDE.md, platform interfaces with web mocks
- [x] Capacitor 8 iOS project, app runs on a physical iPhone
- [x] **Perf spike:** 300 moving enemies + 500 pooled projectiles + glow effects on device
  (2026-10-04: min 60 / avg 60 fps on device, Release build)

**Accept:** stable ~60 fps on device in the perf spike. If this fails, stop and report;
the fallback is native SpriteKit (the pure-TS sim design keeps logic portable).

## Phase 1 — Core simulation (headless)
- [x] Fixed-timestep tick loop, seeded RNG, command queue
- [x] Path as spline with distance-based enemy movement
- [x] One enemy (Drone), one tower (Pulse Laser), projectiles, base HP
- [x] Wave timer, call-early, Credits economy, scaling curves from `src/data/curves.ts`

**Accept:** unit tests cover movement, targeting, damage, wave spawning, and economy.
A scripted test run is deterministic (same seed → identical result).

## Phase 2 — Playable vertical slice
- [x] Phaser scene rendering sim state (neon vector shapes)
- [x] Free placement: drag to place, snap grid, invalid-spot feedback, range preview
- [x] Tower panel: upgrade, sell, targeting mode
- [x] HUD: wave, Credits, base HP, next-wave timer, call-early, speed 1x/2x, pause
- [x] Run-end screen

**Accept:** a full run is playable in the browser and on device with one tower type.
_Accepted 2026-10-04: verified in the browser and on device._

## Phase 3 — Full combat content
- [x] All 6 towers with base stats
- [x] Damage types, shields (with regen), armor (flat with 10% floor), freeze + kinetic bonus
- [x] Full enemy roster including flying and Splitter/Medic behaviors
- [x] Elite waves and the 3 rotating bosses
- [x] Wave composition generator (introduces types gradually, mixes defenses)

**Accept:** tests per tower/enemy mechanic; mixed waves demonstrably need mixed damage types.
_Accepted 2026-10-04: per-mechanic tests in `src/sim/*.test.ts`; `mixedDamage.test.ts` shows equal-budget mixed loadouts beat energy-only and kinetic-only on mixed waves. Arc Coil, Cryo and Swarm are locked until the Research Lab (Phase 6); `?unlock=all` in dev builds._

## Phase 4 — Specializations
- [x] Spec choice UI at level 5 (3 cards, locked after pick)
- [x] All 18 specs implemented as data + behavior modules
- [x] Type-changing specs (Flechette, Ion Rail, EMP Warheads) integrate with the damage model

**Accept:** each spec has a test showing its distinct behavior.
_Accepted 2026-10-04: `src/sim/specs.test.ts` (one test per spec plus command rules). Spec data in `src/data/specs.ts`, behaviour in `src/sim/specs.ts` + `towers.ts`/`projectiles.ts`; pick screen `src/ui/dom/SpecPicker.ts`._

## Phase 5 — Balance simulator
- [x] `tools/balance-sim`: runs the sim headless in Node at max speed
- [x] Bot strategies: greedy-DPS, balanced-mix, spec-focused
- [x] Output CSV + summary: wall wave, run duration, Credits curve, damage per tower/type
- [x] Meta-level presets (fresh account, 10 h progress, 50 h progress)

**Accept:** fresh-account bots hit the wall at wave 30–40 within 10–15 min of game time;
no single tower/spec dominates every strategy. Report the numbers.
_Accepted 2026-10-04: fresh medians wave 37 / 32 / 32 (greedy / balanced / spec-focused) at
11:42 / 10:12 / 10:03; no tower or spec ranks first in every strategy. Full numbers and the
tuning log in `docs/BALANCE.md`._

## Phase 6 — Meta layer and persistence
- [x] Save/load with schemaVersion and migrations; autosave each wave and on app pause
- [x] Mid-run resume after app kill
- [x] Cores and Shards payout at run end
- [x] Research Lab UI and all research effects (incl. tower unlocks, 3x speed)
- [x] Offline income with cap (8 h, 12 h via research), clock-tamper guard, welcome-back screen

**Accept:** kill the app mid-wave → relaunch → identical state. Offline income math is unit-tested.
_Accepted 2026-10-04 (browser): autosave on hide mid-wave 20 → reload → Resume gives an identical
sim hash, paused with the pause menu open. `src/sim/snapshot.test.ts` round-trips a busy mid-wave
snapshot through JSON and keeps playing identically; `src/meta/meta.test.ts` covers offline income
(rate, cap, research, tamper guard), rewards and save migrations. Research pace calibrated with
`npm run sim -- --mode=career` (`docs/BALANCE.md`). Device check pending._

## Phase 7 — Artifacts
- [x] Artifact data model with tiers, ~30 artifacts
- [x] Crafting/upgrading with Shards, artifact codex UI
- [x] Post-boss pick 1 of 3 from the crafted pool, weighted by tier, reroll with rising cost
- [x] Dual Spec legendary

**Accept:** balance sim includes artifact picks; no artifact is a strictly dominant pick.
_Accepted 2026-10-04: all three bots take artifacts after bosses (`tools/balance-sim/bots/common.ts`).
The artifact matrix (`--mode=artifacts`) shows no artifact best in every strategy after tuning
Last Stand and Long Barrels. 30 artifacts in `src/data/artifacts.ts`, effect tests in
`src/sim/artifacts.test.ts`, crafting and save migration tests in `src/meta/meta.test.ts`.
Numbers in `docs/BALANCE.md`. Device check pending._

## Phase 8 — Juice and onboarding
- [x] Pooled VFX: beams, rail trails, explosions, chain lightning, freeze
- [ ] Sound effects and music (with settings), haptics on key events
  _System, Settings toggles and haptics done; silent until audio files are delivered
  (decided 2026-10-04: wait for real assets; manifest in `src/data/audio.ts`)._
- [x] Short interactive tutorial for the first run
- [x] 3 maps

**Accept:** 60 fps on device in a late wave at 2x with heavy VFX.
_Pending device check: Settings → Performance test runs wave 60+ at 2x with 18 specialized
towers on a 50 h account, stacks waves, and shows min/avg fps over 30 s (PASS at avg ≥ 58,
min ≥ 50). Browser (desktop Chrome, ~145 enemies): avg 58, min 47._

## Phase 9 — Monetization and analytics
- [x] Ads interface → AdMob (rewarded only), ATT prompt
- [x] IAP interface → RevenueCat (Commander Pass, starter pack, Core/Shard packs)
- [x] Revive, double offline, extra reroll, double Cores hooks
- [x] Analytics events per GDD §12 (local buffer; provider later)

**Accept:** sandbox purchases and test ads work on device; everything degrades gracefully offline.
_Partly verified 2026-10-04 in the iOS Simulator (native build): the tracking prompt, an AdMob
test ad played to "Reward granted" and doubled the run's Cores, and the shop shows "Store
unavailable" with no store configured. Browser mocks cover every purchase, pass and revive flow.
Pending your accounts and device: sandbox purchases need App Store Connect products and a
RevenueCat key (steps in `docs/MONETIZATION.md`)._

## Phase 10 — Ship
- [ ] App icon, launch screen, store screenshots
- [ ] Privacy policy, App Privacy labels, age rating
- [ ] TestFlight beta, collect feedback, rebalance with the sim
- [ ] App Store submission
