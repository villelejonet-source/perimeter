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
_Status 2026-10-04: browser verified; device playthrough pending._

## Phase 3 — Full combat content
- [ ] All 6 towers with base stats
- [ ] Damage types, shields (with regen), armor (flat with 10% floor), freeze + kinetic bonus
- [ ] Full enemy roster including flying and Splitter/Medic behaviors
- [ ] Elite waves and the 3 rotating bosses
- [ ] Wave composition generator (introduces types gradually, mixes defenses)

**Accept:** tests per tower/enemy mechanic; mixed waves demonstrably need mixed damage types.

## Phase 4 — Specializations
- [ ] Spec choice UI at level 5 (3 cards, locked after pick)
- [ ] All 18 specs implemented as data + behavior modules
- [ ] Type-changing specs (Flechette, Ion Rail, EMP Warheads) integrate with the damage model

**Accept:** each spec has a test showing its distinct behavior.

## Phase 5 — Balance simulator
- [ ] `tools/balance-sim`: runs the sim headless in Node at max speed
- [ ] Bot strategies: greedy-DPS, balanced-mix, spec-focused
- [ ] Output CSV + summary: wall wave, run duration, Credits curve, damage per tower/type
- [ ] Meta-level presets (fresh account, 10 h progress, 50 h progress)

**Accept:** fresh-account bots hit the wall at wave 30–40 within 10–15 min of game time;
no single tower/spec dominates every strategy. Report the numbers.

## Phase 6 — Meta layer and persistence
- [ ] Save/load with schemaVersion and migrations; autosave each wave and on app pause
- [ ] Mid-run resume after app kill
- [ ] Cores and Shards payout at run end
- [ ] Research Lab UI and all research effects (incl. tower unlocks, 3x speed)
- [ ] Offline income with cap (8 h, 12 h via research), clock-tamper guard, welcome-back screen

**Accept:** kill the app mid-wave → relaunch → identical state. Offline income math is unit-tested.

## Phase 7 — Artifacts
- [ ] Artifact data model with tiers, ~30 artifacts
- [ ] Crafting/upgrading with Shards, artifact codex UI
- [ ] Post-boss pick 1 of 3 from the crafted pool, weighted by tier, reroll with rising cost
- [ ] Dual Spec legendary

**Accept:** balance sim includes artifact picks; no artifact is a strictly dominant pick.

## Phase 8 — Juice and onboarding
- [ ] Pooled VFX: beams, rail trails, explosions, chain lightning, freeze
- [ ] Sound effects and music (with settings), haptics on key events
- [ ] Short interactive tutorial for the first run
- [ ] 3 maps

**Accept:** 60 fps on device in a late wave at 2x with heavy VFX.

## Phase 9 — Monetization and analytics
- [ ] Ads interface → AdMob (rewarded only), ATT prompt
- [ ] IAP interface → RevenueCat (Commander Pass, starter pack, Core/Shard packs)
- [ ] Revive, double offline, extra reroll, double Cores hooks
- [ ] Analytics events per GDD §12

**Accept:** sandbox purchases and test ads work on device; everything degrades gracefully offline.

## Phase 10 — Ship
- [ ] App icon, launch screen, store screenshots
- [ ] Privacy policy, App Privacy labels, age rating
- [ ] TestFlight beta, collect feedback, rebalance with the sim
- [ ] App Store submission
