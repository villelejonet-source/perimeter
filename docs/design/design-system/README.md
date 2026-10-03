PERIMETER is flat neon vector: simple geometric shapes, glowing strokes, a near-black ground. Every visual decision here exists so 300 enemies and 500 projectiles stay readable at 60 fps on a small phone, held in one hand, in sunlight, by players who may not see red and green apart.

## Rules that never bend

1. **Every colour code has a shape twin.** Damage types, defenses, currencies, rarity and states each carry an icon, frame shape, pattern or count that says the same thing as the colour. If you grey-scale a screen, it must still play.
2. **Shape first, colour second.** Within each group, the members also differ in lightness, so a grey-scale screenshot still sorts them.
3. **Neon only means something.** Saturated colour is reserved for the codes below and `accent`. Panels, text and chrome stay in the surface and ink ramp.
4. **Strokes, not fills.** Game objects are outlined shapes at `stroke-2` or heavier with a dark interior (`void`). Solid fills are for buttons, banners and small projectiles.
5. **No gradients, no textures.** Hatching and stripes are the only patterns, and each has one meaning (hatch = unavailable or invalid, hazard stripes = boss).

## Surfaces and ink

- `void` is the battlefield. `surface-100` is the menu background, `surface-200` panels and the HUD bar, `surface-300` cards and rows on panels.
- `grid` draws the placement grid at `stroke-hair`. It is decoration, never information.
- `line` is a hairline divider (decorative, under 3:1 on purpose). `line-strong` outlines controls and holds 3:1 on every surface.
- Text: `ink` for anything that matters, `ink-muted` for labels and secondary lines, `ink-faint` only for disabled labels. All three pass 4.5:1 (ink-faint 3:1) on every surface in both themes.
- Text on `accent`, `reward` and `warning` fills is `on-accent`, never white.

## Colour codes and their shape twins

| Group | Member | Token | Shape twin |
|---|---|---|---|
| Damage | Energy | `dmg-energy` | diamond frame, bolt glyph, continuous beam |
| Damage | Kinetic | `dmg-kinetic` | square frame, slug glyph, short solid dashes |
| Damage | Cryo (Utility) | `dmg-cryo` | hexagon frame, snowflake glyph, ring burst |
| Defense | Hull | `hp` | plain solid bar |
| Defense | Shield | `def-shield` | segmented bar + bubble ring (dashed while recharging) |
| Defense | Armor | `def-armor` | hatched bar + corner brackets |
| Currency | Credits (per run) | `cur-credits` | coin |
| Currency | Cores (permanent) | `cur-cores` | cube |
| Currency | Shards (permanent, rare) | `cur-shards` | crystal |
| Rarity | Common / Rare / Epic / Legendary | `rar-common` … `rar-legendary` | 1–4 pips, 0/1/2/4 cut corners, glow-0 → glow-lg |
| State | Success | `success` | check in circle, solid outline |
| State | Danger | `danger` | X in octagon, hatch + dashed outline |
| State | Warning | `warning` | ! in triangle, hazard stripes |
| Action | Rewarded ad | `reward` | play-in-circle icon, outlined button |

Some hues repeat across groups (Credits, `reward` and `warning` are all yellow-gold; `rar-common` matches `ink-muted`). They never share a context: damage colours live on the battlefield, currencies in the HUD chips and shop, rarity on artifact cards, warning only on the boss banner. Don't use a group's colour outside its context.

`danger` is the one red. Use it as text only at 19px bold or larger; at smaller sizes pair the danger icon with `ink` text.

## Typography

- **Display: Oxanium** (`--font-display`) for every number and every title. Always tabular figures, so counters don't jitter. Styles: `title-xl`, `title-lg`, `hud-xl`, `hud-lg`, `hud-md`, `dmg-crit`, `dmg-number`.
- **UI: Barlow Semi Condensed** (`--font-ui`) for labels, descriptions and buttons. Condensed widths fit long tower names on a 375pt screen. Styles: `panel-title`, `body`, `caption`, `label`, `button-lg`, `button-md`.
- Floor sizes for sunlight: 16px for reading text (`body`), 14px for captions, 13px for uppercase labels. Nothing smaller ships.
- Titles, labels and buttons are uppercase with tracking (0.04–0.08em). Body copy is sentence case.
- In Phaser, use BitmapText baked from Oxanium for damage numbers and HUD counters (one atlas per weight). Plain Text objects are for menus only.

## Buttons

Primary (solid `accent`), Secondary (outlined `line-strong`), Disabled (hatched, `ink-faint`, shows the reason), Rewarded ad (outlined `reward` with the play icon and a caption line). All use a `chamfer-md` cut corner shape, at least `touch-min` tall, with one primary per screen in the bottom `thumb-zone`. See the Button component.

## Glow

The glow is geometry, not a shader. Each glowing object is the same path drawn up to four times, back to front, with additive blending:

| Pass | Width | Colour | Alpha |
|---|---|---|---|
| Far halo | stroke + 2 × halo | object colour | `glow-far` 0.12 |
| Near halo | stroke + halo | object colour | `glow-near` 0.35 |
| Stroke | stroke | object colour | `glow-core` 1 |
| Hot core (glow-md and up) | stroke × 0.5 | white | `glow-hot` 0.55 |

Halo is `glow-sm` 4px, `glow-md` 8px or `glow-lg` 16px. Strokes are `stroke-1` to `stroke-4`.

```js
// Bake once at boot: one texture per shape × colour × glow level.
function bakeGlow(scene, key, size, drawPath, color, stroke = 2, halo = 8) {
  const pad = stroke + 2 * halo, dim = size + pad * 2;
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.setPosition(pad, pad);
  [[stroke + 2 * halo, color, 0.12], [stroke + halo, color, 0.35], [stroke, color, 1]]
    .forEach(([w, c, a]) => { g.lineStyle(w, c, a); drawPath(g, size); });
  if (halo >= 8) { g.lineStyle(stroke * 0.5, 0xffffff, 0.55); drawPath(g, size); }
  g.generateTexture(key, dim, dim);
  g.destroy();
}
// Use: scene.add.image(x, y, 'enemy-tri-md').setBlendMode(Phaser.BlendModes.ADD)
// Projectiles: one baked texture per type in a pooled Blitter or Group, all with ADD.
```

- Keep every glowing texture in one atlas and one blend mode so the 800 battle objects batch into a few draw calls.
- Don't use per-object `preFX`/`postFX` glow. At most one optional camera bloom, off on low-end devices.
- Additive overlaps make crowds brighter on their own. That's intended: dense waves read as hotter.
- Pick glow by importance: projectiles and enemies `glow-sm`, towers and the primary button `glow-md`, bosses and base hits `glow-lg`. Text and panels never glow.

## Sunlight and accessibility

- The **Sunlight boost** theme (a settings toggle) drops surfaces to true black, lifts every text and neon colour to at least 7:1 (`danger` 4.5:1, used large) and lifts `line` to 3:1. Offer it at first launch if the screen is bright.
- Anything that carries meaning is drawn at `stroke-2` or heavier and is at least 16px on screen.
- `success` and `danger` differ in lightness by 3:1 as well as by icon, so they survive red-green colour blindness.
- Focus ring: 2px solid `accent`, 3px offset.
- Keep all frequent controls in the bottom `thumb-zone`. The top of the screen is for reading only (wave, base integrity, currencies).

## Iconography

- 24×24 grid, `stroke-2`, round joins, outline first with an optional small solid glyph. Drop to `stroke-1` when drawn at 16px.
- The Icons asset group holds the 12 game icons as SVG, each with its token colour baked in. In Phaser, load them with `this.load.svg(key, url, { width, height })` and bake glow with the recipe above, or redraw them as Graphics paths.
- No emoji, no pictorial icons. If a new concept needs an icon, build it from the frame shapes already here (circle, square, diamond, hexagon, octagon, triangle) and don't reuse a frame inside the same group.
