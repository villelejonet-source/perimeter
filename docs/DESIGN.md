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
| 2 (built) | Battlefield, mid-wave | `screens/in-run/Main.dc.html`, `Battlefield.dc.html` | `src/render/WorldView.ts` | ready, not applied |
| 2 (built) | HUD bar | `screens/in-run/Hud.dc.html` | `src/render/Hud.ts` | ready, not applied |
| 2 (built) | Control row + build bar | `screens/in-run/Controls.dc.html` | `src/render/Hud.ts` | ready, not applied |
| 2 (built) | Placement: valid / path / buffer / overlap / no Credits | `screens/in-run/Place-*.dc.html` | `src/render/input/Placement.ts` | ready, not applied |
| 2 (built) | Tower panel | `screens/in-run/Panel-Railgun.dc.html` | `src/ui/TowerPanel.ts` | ready, not applied |
| 2 (built) | Pause | `screens/in-run/Pause.dc.html` | none (only a pause toggle exists) | ready |
| 2 (built) | Run end | `screens/in-run/RunEnd.dc.html` | `src/ui/RunEndScene.ts` | ready, not applied |
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

## Open questions (decide before applying)
1. **Art rule.** The unit SVGs are meant to be loaded as assets (`this.load.svg`, packed into an atlas).
   CLAUDE.md currently says "no external art assets, draw with Phaser Graphics". Should the rule change?
2. **Coordinate system.** Designs and maps use a 390 × 844 logical screen. The game currently uses a
   360 × 780 world (rendered at 720 × 1560). Matching the designs means moving the world to 390 × 844.
3. **Fonts.** Designs use Oxanium + Barlow Semi Condensed from Google Fonts. These need bundling
   locally so the iOS app works offline.
4. **Names.** `screens/meta/README.md` uses placeholder tower names (Mass Driver, Frost Coil, …).
   The GDD names (Railgun, Cryo Projector, …) are kept unless told otherwise. The unit files already use them.
5. **Map geometry.** The path in `HANDOFF.md` differs from the three map JSONs. The JSONs are treated
   as the source of truth for maps.
6. **Placeholder numbers.** Costs, stats and rewards in the mockups are mock values. Real values come from `src/data/`.

## Applied
Log when a design has been implemented, so drift is visible later.

| Date | Design | Applied to |
|---|---|---|
