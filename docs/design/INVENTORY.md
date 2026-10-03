# Design Inventory

Audit of the Claude Design handoff in `docs/design/`, run 2026-10-04.
Legend: **FOUND** (file path) · **PARTIAL** (what's missing) · **MISSING**.
Paths are relative to `docs/design/`.

## How this was checked
- **Units:** parsed every SVG in `units/core/` and `units/glow/`. Read frame size from the root `width`/`height`, counted path nodes per file (each M/L/H/V point, each arc segment, each circle/rect), collected stroke/fill colours, and cross-checked `units/manifest.json` (50 entries, keys match the 50 files 1:1).
- **Screens:** extracted the visible text, `aria-label`s and script props from every `.dc.html`. Rendered each file at 390 × 844 in a browser and measured the on-screen y of every button and tappable control (without the missing `support.js`, so `dc-import` children don't render; component files were measured on their own).
- **Maps:** parsed each JSON and ran the control points through the game's own spline code (`src/sim/path.ts`, uniform Catmull-Rom, arc-length table). Measured the extents, the band (pathWidth / 2 + buildBuffer), how far the spline strays from the control polyline, the sharpest turn, and the closest gap between neighbouring lanes. Then drew the spline, the control polyline, the band, `playArea`, the HUD zone (48–104) and the control zone (654–844) on a 390 × 844 canvas to inspect them (`tools/out/maps.html`, not committed). **There is no map image in the handoff**, so the spline was compared to its own control polyline, not to a drawn map.
- **Consistency:** compared every hex colour in all folders against `design-system/tokens.json`, every `font-family`, and the colour next to each damage-type label.

---

## UNITS (`units/`)

All 50 units exist in both `core/` (no glow) and `glow/` (glow baked in, padded frame). Naming is consistent: `tower-<name>-l1|l5-base|turret`, `enemy-<name>`, `boss-<name>`, `state-<name>`, `proj-<name>`, `fx-<name>`, `base-<state>`. All units face east.

### Towers (64 × 64, base + turret as separate files, L1 + L5)
| Tower | Status | Files | Nodes (base / turret, L1 → L5) | Colour |
|---|---|---|---|---|
| Pulse Laser | FOUND | `units/*/tower-pulse-laser-l{1,5}-{base,turret}.svg` | 4/7 → 8/15 | `dmg-energy` |
| Railgun | FOUND | `units/*/tower-railgun-l{1,5}-{base,turret}.svg` | 8/8 → 12/14 | `dmg-kinetic` |
| Plasma Mortar | FOUND | `units/*/tower-plasma-mortar-l{1,5}-{base,turret}.svg` | 7/6 → 19/18 | `dmg-energy` |
| Arc Coil | FOUND | `units/*/tower-arc-coil-l{1,5}-{base,turret}.svg` | 16/18 → 20/21 | `dmg-energy` |
| Cryo Projector | FOUND | `units/*/tower-cryo-projector-l{1,5}-{base,turret}.svg` | 6/16 → 24/18 | `dmg-cryo` |
| Swarm Launcher | FOUND | `units/*/tower-swarm-launcher-l{1,5}-{base,turret}.svg` | 20/17 → 24/23 | `dmg-kinetic` |

L5 is the only upgraded look. There are no per-specialization variants (18 specs), which is a Phase 4 gap.

### Enemies (32 × 32)
| Enemy | Status | File | Nodes |
|---|---|---|---|
| Drone | FOUND | `units/*/enemy-drone.svg` | 6 |
| Skitter | FOUND | `units/*/enemy-skitter.svg` | 8 |
| Bulwark | FOUND | `units/*/enemy-bulwark.svg` | **22** |
| Warden | FOUND | `units/*/enemy-warden.svg` | 12 |
| Wraith (airborne cue) | PARTIAL | `units/*/enemy-wraith.svg` | 12. The airborne cue is an offset shadow filled `line-strong` at 45%. Under the additive blending the design system prescribes, a shadow *adds* light, so it reads as a grey glow, not a shadow. |
| Splitter | FOUND | `units/*/enemy-splitter.svg` | **15** |
| Medic | FOUND | `units/*/enemy-medic.svg` | **15** |

### Enemy state overlays (32 × 32)
| State | Status | File |
|---|---|---|
| Shield bubble | FOUND | `units/*/state-shield.svg`, plus `state-shield-recharging.svg` (dashed) |
| Armor plating | FOUND | `units/*/state-armor.svg` |
| Frozen | FOUND | `units/*/state-frozen.svg` |
| Slowed | FOUND | `units/*/state-slowed.svg` |
| Elite | PARTIAL | Only `units/*/enemy-drone-elite.svg`, a Drone-specific variant with an outer frame. There's no generic `state-elite` overlay for the other 6 enemies. |

### Bosses (96 × 96)
| Boss | Status | File | Nodes |
|---|---|---|---|
| Juggernaut | FOUND | `units/*/boss-juggernaut.svg` | **30** |
| Aegis | FOUND | `units/*/boss-aegis.svg` | **37** |
| Hive Carrier | PARTIAL | `units/*/boss-hive-carrier.svg` | **34**. Uses the same 45% shadow airborne cue as the Wraith, with the same additive-blend problem. |

### Projectiles / effects
| Item | Status | File |
|---|---|---|
| Laser beam | FOUND | `units/*/proj-laser-beam.svg` (64 × 8, stretch to length) |
| Rail trail | FOUND | `units/*/proj-rail-trail.svg` (64 × 8) |
| Mortar shell | FOUND | `units/*/proj-mortar-shell.svg` (16 × 16) |
| Mortar blast ring | FOUND | `units/*/fx-mortar-blast.svg` (64 × 64, solid + dashed ring) |
| Chain lightning | FOUND | `units/*/proj-chain-lightning.svg` (64 × 24) |
| Cryo beam | FOUND | `units/*/proj-cryo-beam.svg` (64 × 16) |
| Missile | FOUND | `units/*/proj-missile.svg` (16 × 8) |

### Base (96 × 96)
| State | Status | File | Nodes |
|---|---|---|---|
| Healthy | FOUND | `units/*/base-healthy.svg` | 13 |
| Damaged | FOUND | `units/*/base-damaged.svg` | **20** |
| Critical | FOUND | `units/*/base-critical.svg` (switches to `danger`) | 13 |

HP thresholds for damaged and critical are not specified.

### Unit checks
- **Frame sizes:** all correct. Towers 64 × 64, enemies and states 32 × 32, bosses 96 × 96, base 96 × 96. Glow frames are padded per `manifest.json` (towers 84, enemies 52, bosses 136, base 120).
- **Naming:** consistent across `core/`, `glow/` and `manifest.json`.
- **Vertex counts:** flagged above 12 nodes (bold): Bulwark 22, Splitter 15, Medic 15, all 3 bosses (30–37), base-damaged 20, and most L5 towers (14–24). **This has no runtime cost with the planned approach.** Each SVG is baked once into an atlas texture, so every sprite is one quad no matter how many nodes the source has. It would only matter if shapes were redrawn as Phaser Graphics every frame, which we don't do.
- **Additive blending caveat:** bodies use an opaque `void` fill to mask what's beneath. Under ADD blending that fill adds almost nothing, so it doesn't mask. Turret lines overlapping base lines (for example where the Pulse Laser barrel crosses the base diamond's tip) will glow brighter at the overlap. This is cosmetic and acceptable, but it means the art can't rely on fills to hide anything.

---

## SCREENS (`screens/in-run/`, 390 × 844)

All screens are 390 × 844 portrait (verified from root containers and `canvas-layout.json`). Screens are composed from three components: `Battlefield.dc.html`, `Hud.dc.html` (y 48–104) and `Controls.dc.html` (y 654–844).

| Item | Status | File(s) / notes |
|---|---|---|
| Battle: map + path | PARTIAL | `screens/in-run/Battlefield.dc.html`, `Main.dc.html`. The path drawn is the orthogonal `HANDOFF.md` path (`M-16 136 H304 …`, base at 192,600), **not any of the three map JSONs**. Path style (outline `line`, fill `surface-200`, dashed centre) and the grid are fully specified. |
| HUD: wave, Credits, base x/20, next-wave countdown | FOUND | `screens/in-run/Hud.dc.html` (4 cells; base-hit and credits-alert variants) |
| Call early with bonus | FOUND | `screens/in-run/Controls.dc.html` ("CALL EARLY +{bonus}") |
| Speed 1x / 2x / 3x, 3x locked | FOUND | `Controls.dc.html` (`aria-label="3x speed, locked"`) |
| Pause | FOUND | `Controls.dc.html` (pause icon button) |
| Build bar: cost / locked / unaffordable | FOUND | `Controls.dc.html`: 6 slots with available, "can't afford" (hatched) and locked (Swarm Launcher) states, plus the "DROP HERE TO CANCEL" drag variant |
| Placement: dragging, ghost + range circle | FOUND | `screens/in-run/Place-Valid.dc.html` |
| Placement: invalid spot | FOUND | `Place-Path.dc.html` (on the path), `Place-Buffer.dc.html` (in the buffer), `Place-Overlap.dc.html` (overlap, outlines the blocking tower) |
| Placement: not enough Credits | FOUND | `Place-NoCredits.dc.html` |
| Tower panel: level, damage type, stats, upgrade + cost, sell 70%, targeting | FOUND | `Panel-Railgun.dc.html` (LV pips, KINETIC chip, DAMAGE/RATE/RANGE/DPS with deltas, First/Last/Strongest/Closest, SELL +161 · 70%, UPGRADE + cost). The RANGE unit is unclear ("6.0" looks like tiles, not px). |
| Tower panel: LV 4 spec hint | FOUND | `Panel-Level4.dc.html` ("SPECIALIZATION AT LV 5", unaffordable upgrade "Need 180 more Credits") |
| Pause menu with Retreat + confirm | FOUND | `Pause.dc.html`, `Pause-Retreat.dc.html` |
| Alert: elite wave | FOUND | `Alert-Elite.dc.html` |
| Alert: boss wave | FOUND | `Alert-Boss.dc.html` |
| Alert: base taking damage | FOUND | `Alert-BaseHit.dc.html` |
| Run end: wave reached, best, Cores + Shards, double-Cores ad, play again, menu | FOUND | `RunEnd.dc.html` |

### Screen checks
- **390 × 844 portrait:** yes, all 17 in-run files.
- **Interactive controls in the lower part:** measured against the `thumb-zone` token (bottom 45%, so y ≥ 464).
  - The HUD has no taps. Control row 662–718, build bar 726–810. Pause, Retreat, Resume and both confirm buttons sit at 664–810. Run end's Play Again and Back to Menu are at 694–810. Tower panel targeting is at 613–713 and Sell/Upgrade at 731–810. All inside.
  - Just above the line: the LV 4 panel's **close button at y 437** (the LV 2 panel's is at 493), and Run end's **Double Cores at y 450**.

---

## MAPS (`maps/`)

| Map | Status | File |
|---|---|---|
| S-curve | FOUND | `maps/map-01-s-curve.json` ("Outpost Run") |
| Switchbacks | FOUND | `maps/map-02-switchbacks.json` ("Canyon Switchbacks") |
| Spiral toward the centre | FOUND | `maps/map-03-spiral.json` ("Station Ring") |

All three JSONs have every required key: id, name, spawn, base, pathWidth, buildBuffer, pathControlPoints, playArea {top, bottom}.

| Check | map-01 | map-02 | map-03 |
|---|---|---|---|
| JSON parses | yes | yes | yes |
| Control points | 14 | 41 | 52 |
| All points inside 390 × 844 | yes | yes | yes |
| Spawn = first point / base = last point | yes / yes | yes / yes | yes / yes |
| pathWidth / buildBuffer → band half-width | 32 / 16 → 32 | 32 / 16 → 32 | 24 / 12 → 24 |
| Spline length (engine) | **1055.2** | 1629.4 | 2319.9 |
| Band y-extent vs playArea 112–720 | 144–640, inside | 127–641, inside | 127–705, inside |
| Band x-extent inside 0–390 | **no**, spawn at x 24 → band reaches x −8 | **no**, same at spawn | yes |
| Max spline deviation from control polyline | 7.1 | 2.9 | 3.0 |
| Sharpest turn (° per 8 units) | 5.1, smooth | 18.3, the 180° arcs | 17.4, the corners |
| Closest neighbouring-lane gap (centrelines) | 125 | 109 | 58 (bands don't overlap, but inner lanes leave only ~10 units of buildable space, too small for a 32 × 32 tower) |
| playArea overlaps HUD (48–104) | no | no | no |
| **playArea overlaps control row (654+)** | **yes** (bottom 720) | **yes** (bottom 720) | **yes** (bottom 720) |
| **Path band overlaps control row** | no (ends at 640) | no (ends at 641) | **yes**: the bottom lane at y 680 runs under the control row |

**Smoothness:** the visual render shows all three splines follow their control polylines closely, with no loops, overshoot or self-intersection. Map 1 is a clean S. Maps 2 and 3 encode their corners as short arc point runs, so the uniform spline holds the arcs well.

**Spawn:** every map spawns on-screen (x 24). The Battlefield mockup starts its path off-screen (x −16), so enemies would pop into view at the spawn point.

---

## META (`screens/meta/`, reference for Phases 4, 6, 7)

| Item | Status | File / notes |
|---|---|---|
| Main menu / title | FOUND | `screens/meta/Main.dc.html` (currencies, best wave, sector, Research Lab, Codex, Play) |
| Specialization pick: 3 cards, damage-type change | FOUND | `screens/meta/Specialization.dc.html` (Overclock / Flechette / Prism, Energy → Kinetic strip, "Later") |
| Artifact pick: 1 of 3, rarity tiers, reroll cost | FOUND | `screens/meta/ArtifactPick.dc.html` (Common / Epic / Legendary, Reroll 150 → next 300, locked 4th choice) |
| Research Lab: per-tower tracks | FOUND | `screens/meta/ResearchTowers.dc.html` (damage, fire rate, range, starting level) |
| Research Lab: global upgrades | FOUND | `screens/meta/ResearchBase.dc.html` (starting Credits, base HP, wave timer, bounty, call-early) |
| Research Lab: unlocks | FOUND | `screens/meta/ResearchUnlocks.dc.html` (towers 4–6, 3x speed, map, 4th artifact choice, free reroll) |
| Research Lab: idle upgrades | FOUND | `screens/meta/ResearchBase.dc.html` (offline income, offline cap 8 h / 12 h) |
| Artifact Codex: crafted vs not, tier upgrade | PARTIAL | `screens/meta/Codex.dc.html` shows crafted / not crafted tiles and the upgrade-tier sheet ("Upgrade to Epic"). It has no detail state for **crafting** a not-yet-crafted artifact. |
| Welcome back: time away, earnings, double with ad, collect | FOUND | `screens/meta/WelcomeBack.dc.html` (away 11 h 42 m, capped 8 h, Cores + Shards, Double with ad, Collect) |

**Thumb zone (meta):** each screen's one primary button is at y 754–810. Scrolling lists and grids (Research rows, Codex tiles, artifact cards) and the back buttons (y 56) sit higher, as you'd expect for content.

---

## CONSISTENCY

- **Colours:** consistent. Every hex colour in `units/`, `screens/in-run/` and `screens/meta/` (11, 21 and 23 distinct colours) is a token from `design-system/tokens.json`, and no file uses an off-token colour. The `rgba()` values are token colours with alpha.
- **Fonts:** consistent. All screens use Oxanium for numbers and titles and Barlow Semi Condensed for UI text. **No font files are included** (`tokens.json` → `type.fonts: []`; the screens load them from Google Fonts).
- **Damage-type colour coding:** consistent everywhere checked. Energy `#ff4fd8` covers the Pulse Laser, Arc Coil and Plasma Mortar art, the laser, chain-lightning and mortar projectiles, the Panel-Level4 ENERGY chip, and the Specialization and ResearchTowers labels. Kinetic `#ff7a33` covers the Railgun and Swarm Launcher art, the rail trail, the missile, the Panel-Railgun KINETIC chip, and Specialization's Kinetic badge. Cryo/Utility `#8ff3ff` covers the Cryo Projector art, the cryo beam, and the frozen and slowed overlays.
- **Content inconsistencies** (placeholders, but they conflict with the GDD or with each other):
  - Tower names: `ResearchTowers` / `ResearchUnlocks` use Mass Driver, Frost Coil, Arc Lance, Flak Battery and Stasis Field. Units, Controls and Panel use the GDD names.
  - Base HP: meta screens show /40 (Specialization "Base 34 / 40", Research "Base HP 40 → 42"). The HUD and GDD say /20.
  - Wave timer: ResearchBase shows 30 s. The GDD says 20 s.
  - Map names: the main menu says "Sector 01 Outer Ring" and "Sector 02 Fracture Belt", and ResearchUnlocks says "Deep Rift". The map JSONs say Outpost Run, Canyon Switchbacks and Station Ring.
  - Artifact names differ from the GDD starter set: Bounty Ledger vs Bounty Protocol, Last Stand Protocol vs Last Stand, Overflow Coil vs Overflow Reactor.

---

## 1. Blockers for Phase 2

Nothing is missing for the Drone, Pulse Laser, base, battle screen, placement, tower panel, HUD or run-end. These need a fix or a decision first:

1. **map-01 `playArea.bottom` = 720 overlaps the control row (starts at 654).** Towers could be placed under the controls and build bar. The fix is `playArea.bottom ≤ 646`, either in the JSON or clamped in code.
2. **The battle-screen mockups use a different path than map 1.** This is fine for layout and style, but the screens can't be checked pixel-for-pixel against the game.
3. **Base damaged / critical thresholds are unspecified** (which base HP triggers each art state).
4. **The tower panel's RANGE unit is unclear** ("6.0", which looks like tiles). The game stores range in px.
5. **The tower panel must "stay below the selected tower's range circle (move the camera if needed)".** The map fills the screen, so this needs a decision: pan the world up, or let the sheet cover the lower map.
6. **Font files aren't included.** Oxanium and Barlow Semi Condensed must be bundled so the iOS app works offline. Not a design blocker: we can bundle them from npm (`@fontsource`).
7. **Pulse Laser shape twin:** the design calls for a "continuous beam" (`proj-laser-beam` stretched from tower to target), but the sim fires travelling bolts. This is a rendering decision, not a design gap: draw a brief beam per shot.

## 2. Gaps for later phases

- **Phase 3:** no generic elite overlay (Drone only). The Wraith and Hive Carrier airborne shadows don't work with additive blending. Map 3's bottom lane runs under the control row, and all maps' `playArea` overlaps it.
- **Phase 4:** no per-specialization art (18 specs). No projectile or FX art for the type-changing specs (Flechette slugs, Ion Rail beam, EMP warhead) or for the other spec effects (plasma pools, cluster submunitions, overload stun, stasis aura, Capacitor burst, Hunter-Killer crit). Only Pulse Laser specs are mocked.
- **Phase 6:** the meta screens use placeholder names and numbers that conflict with the GDD (tower names, base HP 40, wave timer 30 s). Settings, reached from Pause, has no design.
- **Phase 7:** the Codex has no "craft new artifact" state. Artifact names differ from the GDD.
- **Phase 8:** no tutorial, map select or settings screens. Main-menu sector names don't match the map names. Damage-number BitmapText fonts aren't supplied.
- **Phase 9:** no shop, Commander Pass, pack or revive / rewarded-ad prompt screens.
- **Phase 10:** no app icon, launch screen or store screenshots.
- **Thumb zone:** the Panel-Level4 close button (y 437) and Run-end Double Cores (y 450) are just above the 45% line.

## 3. Requests for Claude Design (ready to paste)

1. > In all three map JSONs, set `playArea.bottom` to 646. The control row starts at y 654, and towers must not be placeable under it.
2. > In map-03-spiral, move the bottom lane (currently y 680) up so the path band (pathWidth/2 + buildBuffer = 24) ends above y 646.
3. > Move each map's spawn point off-screen (for example x = −16, like the Battlefield mockup) so enemies walk in from the edge, or confirm that on-screen spawning is intended and add a spawn-gate unit SVG.
4. > Redraw Battlefield / Main / Place-* using map-01-s-curve's path instead of the orthogonal HANDOFF path, so the in-run mockups match real map data.
5. > The Wraith and Hive Carrier use a 45%-opacity offset shadow as the airborne cue. The game renders units with additive blending, where a shadow becomes a grey glow. Please replace it with an additive-safe cue, such as a dashed ground ring in `line-strong` under the unit.
6. > Add a generic `state-elite.svg` (32 × 32 frame, same glow manifest format) that can be layered over any enemy, matching the outer frame on enemy-drone-elite.
7. > Specify the base-HP thresholds for base-healthy / base-damaged / base-critical (for example damaged ≤ 50%, critical ≤ 25% of 20).
8. > In the tower panel, state the unit for RANGE (px or 16-px tiles), and say what should happen when the bottom sheet would cover the selected tower's range circle on a full-screen map.
9. > Use the GDD names in all meta screens: towers Pulse Laser, Railgun, Plasma Mortar, Arc Coil, Cryo Projector, Swarm Launcher; base HP out of 20; wave timer starting at 20 s; starter artifacts Superconductor, Ricochet Matrix, Cryo Lattice, Bounty Protocol, Interest Engine, Overflow Reactor, Last Stand, Targeting Uplink, Dual Spec. Align main-menu sector names with the map names (Outpost Run, Canyon Switchbacks, Station Ring).
10. > Move the tower panel's close button (Panel-Level4, y 437) and Run-end's Double Cores button (y 450) into the bottom 45% thumb zone.
11. > Add a Codex detail state for crafting an artifact that isn't crafted yet (cost in Shards, what it does at Common).
12. > For Phase 4, design per-specialization tower variants and the projectile and FX art for type-changing and effect specs: Flechette slug, Ion Rail beam, EMP warhead, cluster submunition, plasma pool, stasis aura, overload stun, capacitor burst.
13. > Design the missing screens: Settings (sound, music, haptics, Sunlight boost), first-run tutorial overlays, map select, shop / Commander Pass / packs, revive and rewarded-ad prompts, app icon and launch screen.
14. > Include the Oxanium and Barlow Semi Condensed font files (or confirm OFL licensing for bundling) in the design-system export.
