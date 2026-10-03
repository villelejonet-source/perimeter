# PERIMETER — meta & between-run screens (design handoff)

Portrait 390×844 mockups for the screens outside battle. Build them in Phaser 3 (or as DOM overlays) using
`design-system/` as the source of truth for colours, type, spacing, chamfers, strokes and glow.

## Files
| Screen | File | When it shows |
|---|---|---|
| 1 Main menu | screens/Main.dc.html | App start / between runs |
| 2 Specialization pick | screens/Specialization.dc.html | Mid-run, tower hits Lv 5 (pauses wave) |
| 3 Artifact pick | screens/ArtifactPick.dc.html | Mid-run, after each boss |
| 4a Research Lab — Towers | screens/ResearchTowers.dc.html | Per-tower tracks: damage, fire rate, range, starting level |
| 4b Research Lab — Base & Idle | screens/ResearchBase.dc.html | Global upgrades + offline income / cap (8 h → 12 h) |
| 4c Research Lab — Unlocks | screens/ResearchUnlocks.dc.html | Towers 4–6, 3x speed, maps, 4th artifact choice, free reroll |
| 5 Artifact Codex | screens/Codex.dc.html | Craft artifacts with Shards; re-craft raises tier |
| 6 Welcome back | screens/WelcomeBack.dc.html | App resume after time away |

The `.dc.html` files are design-canvas markup (HTML + inline styles + inline SVG). They reference `./support.js`
from the design tool, which is not included — read them as layout/style specs, not runnable pages.

## Rules carried into every screen
- One primary (solid accent) button per screen, in the bottom thumb zone (bottom 45%); top of screen is read-only.
- Chamfered corners (6 / 10 / 16 px), never rounded. Touch targets ≥ 48 px, primary buttons 56 px.
- Every colour code has a shape twin: currencies (coin / cube / crystal), damage types (diamond / square / hexagon),
  rarity (1–4 pips, 0/1/2/4 cut corners + double frame for Legendary, glow none→lg).
- Upgrade/buy states: affordable = outlined button; can't afford = hatched + "need N"; locked = hatched + lock + reason;
  maxed/owned = accent check-in-circle.
- A damage-type change on a specialization gets its own header strip: old type struck through → new type badge,
  plus projectile-shape change and the new "strong vs" defense.
- Reroll cost grows per use (show current cost and next cost).
- Welcome back: Collect is primary; "Double with ad" is opt-in, outlined `reward` gold with play-in-circle icon.

## Placeholders / assumptions to confirm
- Tower names other than Pulse Laser (Mass Driver, Frost Coil, Arc Lance, Flak Battery, Stasis Field), all artifact
  names, every cost, level cap and stat value are placeholders.
- Assumed matchups: Energy strong vs Shield, Kinetic strong vs Armor.
- Specialization pick offers "Later" so it doesn't block play.
