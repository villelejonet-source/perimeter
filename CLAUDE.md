# CLAUDE.md — Sci-fi Idle Tower Defense (working title: PERIMETER)

Hybrid idle/active tower defense for iPhone. Endless waves on a fixed path, free tower
placement, 6 towers with specializations, energy/kinetic damage vs shields/armor,
roguelite artifact picks, meta progression (research lab), capped offline income,
monetized with rewarded ads + IAP.

Full design: `docs/GDD.md`. Build order and acceptance criteria: `docs/ROADMAP.md`.
Visual designs (Claude Design) live in `docs/design/`: design system, in-run and meta screens,
unit SVGs and map JSONs. `docs/DESIGN.md` maps each design to its phase, and
`docs/design/INVENTORY.md` lists what exists, what's missing and known issues.
Always check ROADMAP.md for the current phase before starting work, and DESIGN.md before building any UI.

## Stack

- Phaser 3 + TypeScript (strict) + Vite
- Capacitor 8 for the iOS shell (Xcode → TestFlight)
- Vitest for tests, ESLint + Prettier
- Node script for the headless balance simulator (`tools/balance-sim`)

## Commands

- `npm run dev` — browser dev server (primary playtest loop)
- `npm test` — unit tests (sim must stay green)
- `npm run sim -- --strategy=greedy --runs=200` — headless balance sim, writes CSV to `tools/out/`
- `npm run sim -- --mode=career --hours=50` — research-pace check against the meta presets
  (`--strategy=all --preset=all` for the full matrix, `--mode=specs` for the spec matrix; results in `docs/BALANCE.md`)
- `npm run build && npx cap sync ios` — build and sync to the iOS project

## Architecture rules (non-negotiable)

1. **`src/sim/` is pure TypeScript.** It never imports Phaser, DOM, or Capacitor.
   It must run in Node for tests and the balance sim.
2. **Fixed timestep.** The sim advances in fixed ticks (60 Hz). Game speed (1x/2x/3x)
   = more ticks per frame, never a bigger dt.
3. **Deterministic.** All randomness goes through the seeded RNG in `src/sim/rng.ts`.
   Same seed + same inputs = same outcome.
4. **Rendering reads, never writes.** `src/render/` reads sim state and draws it.
   Player input becomes commands (`PlaceTower`, `Upgrade`, `PickArtifact`...) sent to the sim.
5. **All tuning numbers live in `src/data/`.** No magic numbers for damage, costs,
   HP or growth rates in logic code.
6. **Object pooling** for enemies, projectiles, and VFX. No per-frame allocation in hot loops.
7. **Persistence through `src/platform/storage.ts`** (Capacitor Filesystem/Preferences).
   Never use raw localStorage, since iOS may evict WebView storage.
   Save files carry a `schemaVersion` with migrations in `src/meta/migrations.ts`.
8. **Platform code is isolated.** Ads, IAP, haptics, and storage live behind interfaces in
   `src/platform/` with web mocks, so the game runs fully in the browser.

## Folder layout

```
src/
  sim/       game state, tick loop, combat, waves, economy (pure TS)
  data/      towers, specs, enemies, artifacts, curves, research (typed config)
  render/    Phaser scenes, sprites, VFX, HUD
  ui/        DOM overlay UI (ui/dom/): HUD, controls, panels, menus, research lab, codex, shop
  meta/      save/load, currencies, offline income, crafting, migrations
  platform/  storage, ads, iap, haptics (interfaces + Capacitor + web mocks)
tools/balance-sim/
docs/
```

## Art approach

Designs in `docs/design/` are **visual reference, not code to drop in**. The `.dc.html` screens
are layout specs (390 × 844 logical px). Rebuild them; never ship their markup.

- **Design system:** `docs/design/design-system/` (README rules + `tokens.json`) is the source of
  truth for colour, type, spacing, chamfers, strokes and glow.
- **Units:** textures are baked at boot from the unit SVGs in `docs/design/units/` and packed into
  one atlas. Glow comes from additive blending of the baked art. **No per-sprite filters or
  preFX/postFX.** The 60 fps device budget still applies.
- **Maps:** loaded from the map JSONs (spawn, base, path control points, path width, build buffer,
  play area).
- **Anything else** (paths, grid, panels, UI chrome) is drawn with Phaser Graphics or text.

## Working conventions

- Work one roadmap phase at a time. Meet its acceptance criteria, then tick it off in ROADMAP.md.
- Write or update sim tests for any combat/economy change.
- After balance-relevant changes, run the balance sim and report the wall wave and run time.
- Keep functions small and typed; no `any`.
- If a design question is not answered in GDD.md, ask instead of inventing.
