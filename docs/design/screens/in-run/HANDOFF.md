# PERIMETER — in-run UI handoff

Design reference for implementing the in-run screens in Phaser (iPhone, portrait).
All coordinates are logical px on a **390 × 844** screen (multiply by devicePixelRatio when baking).

## What's in here

| Path | What it is |
|---|---|
| `screens/*.dc.html` | One file per screen. HTML markup with absolute px positions — read it as an exact layout spec, not as code to ship. |
| `screens/canvas-layout.json` | Order and titles of the screens (flow). |
| `units/glow/*.svg` | Unit art with glow baked in (what the screens reference). |
| `units/core/*.svg` | Same art without glow, for runtime `bakeGlow()`. |
| `units/manifest.json` | Frame size + glow padding per unit. |
| `design-system/README.md` | PERIMETER rules: colour/shape twins, glow recipe, typography, sunlight rules. **Follow it.** |
| `design-system/tokens.json` | Every colour, type style, spacing, chamfer, stroke, glow and touch token. |

### Reading the `.dc.html` files
- They're written in a small template format: `<sc-if value="{{ x }}">` = conditional block, `<dc-import name="Hud" ...>` = embeds `Hud.dc.html` with props (kebab-case attr → camelCase prop). Logic is in the `<script type="text/x-dc">` block at the bottom.
- Screens compose three shared components:
  - `Battlefield.dc.html` (390×844, at 0,0) — props `showBuffer`, `showFx`, `baseState` (healthy|damaged|critical), `elite`, `boss`
  - `Hud.dc.html` (390×56, at y=48) — props `wave`, `base`, `credits`, `next`, `baseAlert`, `creditsAlert`
  - `Controls.dc.html` (390×190, at y=654) — prop `variant` (normal|drag|denied), `bonus`
- `support.js` is the design tool's runtime and is not included; the files won't render standalone. Use them for numbers.

## Screen layout

| Zone | y range | Rule |
|---|---|---|
| Status-bar safe area | 0–48 | Map shows through. |
| HUD bar | 48–104 | Info only, no taps. surface-200 @ 88%, 4 equal cells: WAVE · BASE x/20 · CREDITS · NEXT WAVE. |
| Map | 104–654 | Keep clear. Alerts may overlay briefly. |
| Control row | 662–718 | Pause 48×48 · speed 1x/2x/3x (3x locked) · CALL EARLY (primary, 56 tall, shows `+bonus` Credits). |
| Build bar | 726–810 (+34 home-indicator padding) | 6 slots, 16 px gutters, 6 px gaps, 76 tall. |

All interactive controls sit in the bottom 45% (`thumb-zone`).

## Map geometry (16 px grid)
- Path centreline: `M-16 136 H304 V264 H80 V400 H304 V520 H192 V600` — 32 px wide, spawn at left edge (y 136), base centred at (192, 600).
- No-build buffer: 16 px on each side of the path (64 px total band).
- Towers occupy 2×2 cells (32×32 footprint). Art is drawn at 0.5 scale: 84 px glow SVG → 42 px, offset −5 px from the footprint's top-left.
- Enemies: 52 px glow SVG → 32 px (0.625). Bosses: 136 → 68 px on the map. Base: 120 → 72 px.
- Units face east; rotate turrets/enemies about the centre. Beams: transform-origin left-centre, stretch width to target distance.

## Interaction specs

**Placement drag**
- Ghost tower floats 72 px above the finger, snapped to the 16 px grid, opacity 0.85.
- While dragging: buffer band is hatched; a local 96×96 grid brightens (`line`) around the snap cell; build bar becomes a "DROP HERE TO CANCEL" zone; control row hides.
- Valid: footprint + range circle in `accent`, solid 2 px, range fill accent @ 7%; chip with check icon + name + cost.
- Invalid (on path / in buffer / overlapping tower): footprint dashed `danger` with danger hatch fill, range circle dashed `danger`, ghost opacity 0.45, chip with X-octagon + reason ("CAN'T BUILD ON THE PATH", "TOO CLOSE TO THE PATH", "SPACE TAKEN BY <TOWER>"). Overlap also outlines the blocking tower.
- Not enough Credits: tapped slot gets dashed danger border + lifts 4 px; status bar replaces the control row ("NOT ENOUGH CREDITS · Arc Coil costs 260. You need 20 more."); HUD Credits cell gets a dashed danger outline.

**Build bar slot states**: available (surface-300) · can't afford (hatched, art 35% opacity, cost in ink-faint) · locked (hatched, lock icon, "LOCKED").

**Tower panel** (tap a tower): bottom sheet, chamfer-lg top corners, top edge must stay below the selected tower's range circle (move the camera if needed). Selected tower: accent corner brackets + range circle. Contents: art, name, LV pips (5), damage-type chip (icon + label), 4 stats with upgrade delta in accent, targeting segmented control (First/Last/Strongest/Closest), SELL (secondary, shows +refund · 70%), UPGRADE (primary, cost + what improves). LV 4 adds a "SPECIALIZATION AT LV 5" card with the L5 art. Unaffordable upgrade = disabled hatched button with "Need N more Credits".

**Pause**: 82% void scrim, "PAUSED" title at top, earned Cores/Shards card, bottom sheet with SETTINGS + RETREAT, caption, RESUME (primary). Retreat → confirm sheet: "RETREAT?", kept rewards, YES, RETREAT (secondary), KEEP FIGHTING (primary, bottom).

**Alerts**
- Elite wave (every 5th): white 3 px chamfered banner below HUD, elite drone art, "ELITE WAVE".
- Boss (every 10th): hazard-stripe band (warning/void, 14 px top and bottom), "BOSS INCOMING" title-xl in warning, boss art 120 px, plus a 4 px warning frame around the whole screen.
- Base hit: 12 px danger-hatch bands on all screen edges + 2 px danger border, dashed danger ring (4 px) around the base, floating "−2" (22 px bold, danger), HUD base cell switches to "BASE HIT" with dashed danger outline. Keep it brief (~600 ms).

**Run end**: surface-100 screen. "RUN OVER / BASE BREACHED", Wave reached vs Best ever, Cores + Shards rows, optional DOUBLE CORES rewarded-ad button (outlined `reward`, play-in-circle icon, caption "Optional. Your rewards are already saved."), BACK TO MENU (secondary), PLAY AGAIN (primary, bottom).

## Placeholder values
Tower costs (100/140/120/260/320, Swarm Launcher locked), stats, rewards, wave numbers and the 240 Credits balance are mock values for the design — replace with the game's real balance data.
