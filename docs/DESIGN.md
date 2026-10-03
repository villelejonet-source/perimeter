# Design Index

Visual designs made in Claude Design, mapped to the roadmap phase that needs them.
**Before building any UI, check this file.** If a design exists for the screen, follow it.
If it doesn't, ask before inventing one (see CLAUDE.md).

## How to add a design
- **Claude Design link:** paste the `claude.ai/artifact/...` URL into the table below.
- **Exported file:** put it in `docs/design/` and add the relative path, e.g. `design/hud.png`.
- Set **Status** to `ready` when the design is final enough to build from.

Designs are a visual reference. Per CLAUDE.md ("Art approach"), screens are rebuilt as
Phaser vector shapes; no external image assets are shipped unless that rule is changed.

## Design system
Tokens (colors, type, spacing, radii) map to `src/render/layout.ts` (`COLORS`, `FONT`).
Buttons map to `src/ui/Button.ts`.

| Item | Link / file | Status | Notes |
|---|---|---|---|
| Design system | | missing | Colors, typography, buttons, panels, icons |

## Screens by phase

| Phase | Screen | Code | Link / file | Status |
|---|---|---|---|---|
| 2 (built) | HUD: wave, Credits, base HP, timer, controls | `src/render/Hud.ts` | | missing |
| 2 (built) | Tower panel: upgrade, sell, targeting | `src/ui/TowerPanel.ts` | | missing |
| 2 (built) | Placement ghost and range preview | `src/render/input/Placement.ts` | | missing |
| 2 (built) | Run-end screen | `src/ui/RunEndScene.ts` | | missing |
| 3 | Tower bar with 6 towers, enemy and boss visuals | | | missing |
| 4 | Specialization pick (3 cards at level 5) | | | missing |
| 6 | Main menu / between-runs hub | | | missing |
| 6 | Research Lab | | | missing |
| 6 | Run-end payout (Cores, Shards) | | | missing |
| 6 | Welcome back (offline income) | | | missing |
| 7 | Post-boss artifact pick (1 of 3, reroll) | | | missing |
| 7 | Artifact codex and crafting | | | missing |
| 8 | Tutorial overlays | | | missing |
| 8 | Map select | | | missing |
| 8 | Settings (sound, music, haptics) | | | missing |
| 9 | Shop, Commander Pass, packs | | | missing |
| 9 | Revive / rewarded-ad prompts | | | missing |
| 10 | App icon, launch screen, store screenshots | | | missing |

## Applied
Log when a design has been implemented, so drift is visible later.

| Date | Design | Applied to |
|---|---|---|
