# PERIMETER unit SVGs

- glow/  : glow baked in (far halo .12, near halo .35, stroke, white hot core .55 for glow-md+). viewBox padded by `glowPad` (manifest.json); anchor at centre (origin 0.5).
- core/  : stroke + void fill only, viewBox = logical frame. Feed to the design system's bakeGlow() at boot if you prefer runtime glow.
- All units face east (+x) = Phaser rotation 0. Turrets rotate about frame centre; draw turret over base.
- Tower files: tower-<name>-l1|l5-base|turret.svg. State overlays (state-*.svg) are 32x32, layer over any enemy and scale to its frame.
- Beams/trails are 64px long: stretch with setDisplaySize. Load with this.load.svg(key, url, { width, height }) at devicePixelRatio scale, pack into one atlas, render with BlendModes.ADD.
- gen_units.py regenerates everything (python3 gen_units.py).
