# Design Index

Visual designs made in Claude Design, mapped to the roadmap phase that needs them.
**Before building any UI, check this file.** If a design exists for the screen, follow it.
If it doesn't, ask before inventing one (see CLAUDE.md).

All design files live in `docs/design/` (paths below are relative to it).
Screens are **390 × 844 logical px**, portrait. The `.dc.html` files are layout specs
(absolute px + inline styles/SVG). They don't render standalone because the design tool's
`support.js` isn't included, so read them for numbers, not as code to ship.

## Source material

| Path | What it is |
|---|---|
| `design-system/README.md` | Rules: colour/shape twins, glow recipe, typography, chamfers, sunlight rules. **Follow it.** |
| `design-system/tokens.json` | Every colour, type style, spacing, chamfer, stroke, glow and touch token. |
| `screens/in-run/HANDOFF.md` | In-run spec: screen zones, map geometry, placement/panel/pause/alert/run-end behaviour. |
| `screens/in-run/canvas-layout.json` | Order and titles of the in-run screens (flow). |
| `screens/meta/README.md` | Meta-screen spec and rules (one primary button, upgrade states, rarity twins). |
| `units/glow/*.svg` | Unit art with glow baked in. |
| `units/core/*.svg` | Same art without glow, for runtime glow baking. |
| `units/manifest.json` | Frame size + glow padding per unit. |
| `units/gen_units.py` | Regenerates all unit SVGs (`python3 gen_units.py`). |
| `maps/map-0*.json` | Three maps: spawn, base, path control points, path width, build buffer, play area. |

Code mapping: tokens → `src/render/layout.ts` (`COLORS`, `FONT`); buttons → `src/ui/Button.ts`;
maps → `src/data/maps.ts`.

## Screens by phase

| Phase | Screen | Design file(s) | Code | Status |
|---|---|---|---|---|
| 2 (built) | Battlefield, mid-wave | `screens/in-run/Main.dc.html`, `Battlefield.dc.html` | `src/render/WorldView.ts` | applied |
| 2 (built) | HUD bar | `screens/in-run/Hud.dc.html` | `src/ui/dom/HudBar.ts` | applied |
| 2 (built) | Control row + build bar | `screens/in-run/Controls.dc.html` | `src/ui/dom/Controls.ts` | applied |
| 2 (built) | Placement: valid / path / buffer / overlap / no Credits | `screens/in-run/Place-*.dc.html` | `src/render/input/Placement.ts` | applied |
| 2 (built) | Tower panel | `screens/in-run/Panel-Railgun.dc.html` | `src/ui/dom/TowerPanel.ts` | applied |
| 2 (built) | Pause | `screens/in-run/Pause.dc.html` | none (only a pause toggle exists) | ready |
| 2 (built) | Run end | `screens/in-run/RunEnd.dc.html` | `src/ui/dom/RunEnd.ts` | applied |
| 2–3 | Unit art: towers L1/L5, enemies, bosses, base states, projectiles, status overlays | `units/` | `src/render/textures.ts` | ready, not applied |
| 3 | Elite / boss / base-hit alerts | `screens/in-run/Alert-*.dc.html` | none | ready |
| 4 | Tower panel at LV 4 (specialization preview) | `screens/in-run/Panel-Level4.dc.html` | none | ready |
| 4 | Specialization pick | `screens/meta/Specialization.dc.html` | none | ready |
| 6 | Main menu | `screens/meta/Main.dc.html` | none | ready |
| 6 | Research Lab: towers / base & idle / unlocks | `screens/meta/Research{Towers,Base,Unlocks}.dc.html` | none | ready |
| 6 | Welcome back (offline income) | `screens/meta/WelcomeBack.dc.html` | none | ready |
| 6 | Pause → Retreat confirm | `screens/in-run/Pause-Retreat.dc.html` | none | ready |
| 7 | Post-boss artifact pick | `screens/meta/ArtifactPick.dc.html` | none | ready |
| 7 | Artifact codex and crafting | `screens/meta/Codex.dc.html` | none | ready |
| 8 | 3 maps | `maps/map-01-s-curve.json`, `map-02-switchbacks.json`, `map-03-spiral.json` | `src/data/maps.ts` | ready, not applied |
| 8 | Tutorial overlays | none | none | missing |
| 8 | Map select | none | none | missing |
| 8 | Settings (sound, music, haptics) | none | none | missing |
| 9 | Shop, Commander Pass, packs | none | none | missing |
| 9 | Revive / rewarded-ad prompts | none | none | missing |
| 10 | App icon, launch screen, store screenshots | none | none | missing |

## Decisions and open questions
Full audit: `design/INVENTORY.md` (what's found, missing, and requests for Claude Design).

Decided 2026-10-04:
- Designs are visual reference. The sim stays pure TS.
- Units are baked into textures from the SVGs in `units/`, with glow via additive blending and no per-sprite filters.
- The world moves to the designs' 390 × 844 logical space. Map 1 is loaded from its JSON.
- GDD names win over placeholder names in the mockups.

- In-run UI (HUD, controls, build bar, placement chip, tower panel, run end) is a **DOM overlay** (`src/ui/dom/`), scaled over the canvas in the design's 390 × 844 px. Phaser draws only world-space things.
- Tower RANGE shows in 16-px grid tiles.
- Base art: healthy above 50% HP, damaged at 50% or below, critical at 25% or below (11–20 / 6–10 / 0–5 of 20). Not from the handoff, so change it if Claude Design specifies otherwise.
- When the tower panel would cover the selected tower's range circle, the map scrolls up just enough and scrolls back on close.
- Map 1's build area is clamped to y 646 in code until the JSON's `playArea.bottom` is fixed.

Open: the remaining requests in `design/INVENTORY.md` §3.

## Applied
Log when a design has been implemented, so drift is visible later.

| Date | Design | Applied to |
|---|---|---|
| 2026-10-04 | `maps/map-01-s-curve.json` | Loaded via `src/data/maps.ts` (copied by `npm run sync:design`); world is now 390 × 844 |
| 2026-10-04 | `units/glow/` Drone, Pulse Laser L1/L5, base ×3, laser beam | Baked into one atlas at boot (`src/render/units.ts`), single ADD layer |
| 2026-10-04 | `screens/in-run/Battlefield.dc.html` | Grid, path band, buffer hatch, spawn label, hull bars, selection brackets (`src/render/WorldView.ts`) |
| 2026-10-04 | `screens/in-run/Place-*.dc.html` | Ghost lift, local grid, valid/invalid footprint + range, overlap outline (`src/render/input/Placement.ts`). Chip label pending the HUD decision |
| 2026-10-04 | `design-system/` fonts | Oxanium + Barlow Semi Condensed bundled from `@fontsource` (OFL) |
| 2026-10-04 | `screens/in-run/Hud.dc.html` | DOM HUD bar incl. BASE HIT and Credits alert states (`src/ui/dom/HudBar.ts`) |
| 2026-10-04 | `screens/in-run/Controls.dc.html` | Pause, 1x/2x/locked 3x, CALL EARLY, build bar (available / can't afford / denied / locked), drop-to-cancel (`src/ui/dom/Controls.ts`) |
| 2026-10-04 | `screens/in-run/Place-*.dc.html` chip, `Place-NoCredits.dc.html` | Placement chip and not-enough-Credits status (`src/ui/dom/PlacementChip.ts`, `Controls.ts`) |
| 2026-10-04 | `screens/in-run/Panel-Railgun.dc.html` | Tower panel for the Pulse Laser. The LV 4 spec hint waits for Phase 4 (`src/ui/dom/TowerPanel.ts`) |
| 2026-10-04 | `screens/in-run/RunEnd.dc.html` | Run end with wave reached, run time, kills, Play Again. Best, Cores/Shards and Menu wait for Phase 6; Double Cores waits for Phase 9 (`src/ui/dom/RunEnd.ts`) |
