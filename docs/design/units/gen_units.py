"""PERIMETER unit set generator.
Every unit: flat neon vector, faces EAST (+x, Phaser rotation 0), strokes over a void interior.
Writes two SVGs per unit:
  glow/<name>.svg  - glow passes baked in (far halo, near halo, stroke, hot core), viewBox padded by `pad`
  core/<name>.svg  - stroke + fill only, viewBox = logical frame (feed this to bakeGlow at boot)
"""
import math, os, json

VOID = "#06080d"
INK = "#eaf0fa"
E, K, C = "#ff4fd8", "#ff7a33", "#8ff3ff"   # dmg-energy, dmg-kinetic, dmg-cryo
SHIELD, ARMOR = "#5b8cff", "#c3ccd9"
ACCENT, DANGER = "#c6ff3d", "#ff3355"
SHADOW = "#5d6e94"  # `line-strong` token, used as the flyer ground shadow

OUT = "/mnt/user-data/outputs/perimeter-units"

def f(v):
    return ("%.2f" % v).rstrip("0").rstrip(".")

def poly(pts, closed=True):
    d = "M" + " L".join(f"{f(x)} {f(y)}" for x, y in pts)
    return d + (" Z" if closed else "")

def reg(cx, cy, r, n, rot=0):
    return [(cx + r * math.cos(math.radians(rot + i * 360 / n)),
             cy + r * math.sin(math.radians(rot + i * 360 / n))) for i in range(n)]

def circ(cx, cy, r):
    return f"M{f(cx-r)} {f(cy)} A{f(r)} {f(r)} 0 1 0 {f(cx+r)} {f(cy)} A{f(r)} {f(r)} 0 1 0 {f(cx-r)} {f(cy)} Z"

def arc(cx, cy, r, a0, a1):
    x0, y0 = cx + r * math.cos(math.radians(a0)), cy + r * math.sin(math.radians(a0))
    x1, y1 = cx + r * math.cos(math.radians(a1)), cy + r * math.sin(math.radians(a1))
    large = 1 if (a1 - a0) % 360 > 180 else 0
    return f"M{f(x0)} {f(y0)} A{f(r)} {f(r)} 0 {large} 1 {f(x1)} {f(y1)}"

def line(*pts):
    return poly(pts, closed=False)

def rect(x0, y0, x1, y1):
    return poly([(x0, y0), (x1, y0), (x1, y1), (x0, y1)])

def el(d, color, sw, fill=None, dash=None, glow=True, fill_op=1.0):
    return dict(d=d, color=color, sw=sw, fill=fill, dash=dash, glow=glow, fill_op=fill_op)

UNITS = []  # (name, w, h, halo, pad, elements)

def unit(name, w, h, halo, pad, els):
    UNITS.append((name, w, h, halo, pad, els))

# ---------------------------------------------------------------- TOWERS 64x64
T, TP, TH = 64, 10, 8   # frame, pad, glow-md
S3, S2 = 3, 2

def diamond(r): return poly(reg(32, 32, r, 4, -90))
def square(i): return rect(i, i, 64 - i, 64 - i)
def hexa(r): return poly(reg(32, 32, r, 6, 0))

def base(kind, l5, extra):
    col = {"E": E, "K": K, "C": C}[kind]
    shape = {"E": diamond, "K": lambda r: square(32 - r), "C": hexa}[kind]
    if not l5:
        els = [el(shape(22), col, S3, fill=VOID)]
    else:
        els = [el(shape(27), col, S2, fill=VOID), el(shape(21), col, S3)]
    return els + [dict(e, color=col) for e in extra(l5)]

def no_extra(l5): return []
def mortar_pit(l5):
    out = [el(circ(32, 32, 13), E, S2)]
    if l5:
        out += [el(line((32, 6.5), (32, 11.5)), E, S2), el(line((32, 52.5), (32, 57.5)), E, S2),
                el(line((6.5, 32), (11.5, 32)), E, S2), el(line((52.5, 32), (57.5, 32)), E, S2)]
    return out
def coil_posts(l5):
    r = 27 if l5 else 22
    return [el(circ(x, y, 3.5), E, S2, fill=VOID) for x, y in reg(32, 32, r, 4, -90)]
def rail_bed(l5):
    a, b = (14, 50) if l5 else (16, 48)
    return [el(line((a, 20), (b, 20)), K, S2), el(line((a, 44), (b, 44)), K, S2)]
def corner_pads(l5):
    i = 11 if l5 else 10
    s = 7
    out = []
    for (x, y) in [(i, i), (64 - i - s, i), (64 - i - s, 64 - i - s), (i, 64 - i - s)]:
        out.append(el(rect(x, y, x + s, y + s), K, S2))
    return out
def cryo_spokes(l5):
    if not l5: return []
    return [el(line(p, q), C, S2) for p, q in zip(reg(32, 32, 21, 6, 0), reg(32, 32, 27, 6, 0))]

TOWERS = [
    ("pulse-laser", "E", no_extra),
    ("railgun", "K", rail_bed),
    ("plasma-mortar", "E", mortar_pit),
    ("arc-coil", "E", coil_posts),
    ("cryo-projector", "C", cryo_spokes),
    ("swarm-launcher", "K", corner_pads),
]

def turret(name, l5):
    if name == "pulse-laser":
        if not l5:
            return [el(rect(39, 29, 54, 35), E, S3, fill=VOID), el(circ(32, 32, 8), E, S3, fill=VOID)]
        return [el(rect(39, 24, 57, 30), E, S3, fill=VOID), el(rect(39, 34, 57, 40), E, S3, fill=VOID),
                el(circ(32, 32, 9.5), E, S3, fill=VOID), el(poly(reg(32, 32, 4, 4, 0)), E, S2)]
    if name == "railgun":
        if not l5:
            return [el(line((30, 27), (58, 27)), K, S3), el(line((30, 37), (58, 37)), K, S3),
                    el(rect(18, 23, 32, 41), K, S3, fill=VOID)]
        return [el(line((28, 26), (60, 26)), K, S3), el(line((28, 38), (60, 38)), K, S3),
                el(line((38, 22), (38, 42)), K, S2), el(line((46, 22), (46, 42)), K, S2),
                el(line((54, 22), (54, 42)), K, S2), el(rect(13, 21, 30, 43), K, S3, fill=VOID)]
    if name == "plasma-mortar":
        if not l5:
            return [el(circ(31, 32, 11), E, S3, fill=VOID), el(circ(35, 32, 5.5), E, S3)]
        out = []
        for cx, cy in [(38, 32), (25, 23.5), (25, 40.5)]:
            out += [el(circ(cx, cy, 8), E, S3, fill=VOID), el(circ(cx + 2.5, cy, 3.5), E, S2)]
        return out
    if name == "arc-coil":
        r, nr, hub = (22, 4, 7) if l5 else (17, 3.5, 6)
        out = []
        if l5: out.append(el(circ(32, 32, 12.5), E, S2))
        for (x, y), (hx, hy) in zip(reg(32, 32, r, 3, 0), reg(32, 32, hub, 3, 0)):
            out.append(el(line((hx, hy), (x, y)), E, S3))
        out += [el(circ(x, y, nr), E, S3, fill=VOID) for x, y in reg(32, 32, r, 3, 0)]
        out.append(el(circ(32, 32, hub), E, S3, fill=VOID))
        return out
    if name == "cryo-projector":
        if not l5:
            hub, cx, noz = 8, 29, [(36, 29), (52, 22), (52, 42), (36, 35)]
        else:
            hub, cx, noz = 10, 27, [(36, 28), (58, 18), (58, 46), (36, 36)]
        out = [el(poly(noz), C, S3, fill=VOID)]
        if l5: out.append(el(line((43, 32), (54, 32)), C, S2))
        out.append(el(poly(reg(cx, 32, hub, 6, 30)), C, S3, fill=VOID))
        g = hub * 0.55
        for a in (0, 60, 120):
            dx, dy = g * math.cos(math.radians(a)), g * math.sin(math.radians(a))
            out.append(el(line((cx - dx, 32 - dy), (cx + dx, 32 + dy)), C, S2))
        return out
    if name == "swarm-launcher":
        if not l5:
            pod = [(19, 22), (41, 22), (48, 32), (41, 42), (19, 42)]
            tubes = [(26, 28), (36, 28), (26, 36), (36, 36)]
        else:
            pod = [(14, 18), (45, 18), (54, 32), (45, 46), (14, 46)]
            tubes = [(22, 26), (32, 26), (42, 26), (22, 38), (32, 38), (42, 38)][:3] + [(22, 38), (32, 38), (42, 38)]
            tubes = [(22, 26), (31, 26), (40, 26), (22, 38), (31, 38), (40, 38)]
        return [el(poly(pod), K, S3, fill=VOID)] + [el(circ(x, y, 3), K, S2) for x, y in tubes]

for name, kind, extra in TOWERS:
    for lv, l5 in (("l1", False), ("l5", True)):
        unit(f"tower-{name}-{lv}-base", T, T, TH, TP, base(kind, l5, extra))
        unit(f"tower-{name}-{lv}-turret", T, T, TH, TP, turret(name, l5))

# ---------------------------------------------------------------- ENEMIES 32x32
N, NP, NH, S = 32, 10, 4, 2

def arrow(cx, cy, s):
    return poly([(cx + 7 * s, cy), (cx - 5 * s, cy - 5 * s), (cx - 2 * s, cy), (cx - 5 * s, cy + 5 * s)])

drone = [el(poly([(26, 16), (9, 7), (9, 25)]), INK, S, fill=VOID), el(circ(14, 16, 2), INK, S)]
unit("enemy-drone", N, N, NH, NP, drone)
unit("enemy-skitter", N, N, NH, NP, [
    el(line((14, 12), (9, 8)), INK, S), el(line((14, 20), (9, 24)), INK, S),
    el(poly([(25, 16), (11, 9.5), (15.5, 16), (11, 22.5)]), INK, S, fill=VOID)])
unit("enemy-bulwark", N, N, NH, NP, [
    el(poly([(8, 8), (21, 8), (26, 13), (26, 19), (21, 24), (8, 24)]), INK, S, fill=VOID),
    el(line((13, 11), (13, 21)), INK, S), el(line((18, 11), (18, 21)), INK, S)] + [
    el(line(*b), ARMOR, S) for b in [((3, 8), (3, 3), (8, 3)), ((24, 3), (29, 3), (29, 8)),
                                     ((29, 24), (29, 29), (24, 29)), ((8, 29), (3, 29), (3, 24))]])
unit("enemy-warden", N, N, NH, NP, [
    el(poly(reg(11, 16, 6.5, 6, 0)), INK, S, fill=VOID),
    el(arc(11, 16, 14, -62, -24), SHIELD, 3), el(arc(11, 16, 14, -17, 17), SHIELD, 3),
    el(arc(11, 16, 14, 24, 62), SHIELD, 3)])
wraith = [(26, 15), (9, 4), (13, 12), (6, 15), (13, 18), (9, 26)]
unit("enemy-wraith", N, N, NH, NP, [
    el(poly([(x + 3, y + 5) for x, y in wraith]), SHADOW, 0, fill=SHADOW, glow=False),
    el(poly(wraith), INK, S, fill=VOID)])
unit("enemy-splitter", N, N, NH, NP, [
    el(poly([(29, 16), (4, 3), (4, 29)]), INK, 1.5, dash="1.5 3.5"),
    el(arrow(21, 16, 0.7), INK, S, fill=VOID), el(arrow(11.5, 10.5, 0.7), INK, S, fill=VOID),
    el(arrow(11.5, 21.5, 0.7), INK, S, fill=VOID)])
cross = [(12.5, 7), (19.5, 7), (19.5, 12.5), (25, 12.5), (25, 19.5), (19.5, 19.5),
         (19.5, 25), (12.5, 25), (12.5, 19.5), (7, 19.5), (7, 12.5), (12.5, 12.5)]
unit("enemy-medic", N, N, NH, NP, [el(circ(16, 16, 14), INK, S, dash="3 4"),
                                   el(poly(cross), INK, S, fill=VOID)])
unit("enemy-drone-elite", N, N, 8, NP, [
    el(poly([(30.5, 16), (5, 2.5), (5, 29.5)]), INK, S),
    el(poly([(26, 16), (9, 7), (9, 25)]), INK, 3, fill=VOID), el(circ(14, 16, 2), INK, S)])

# state overlays (same 32 frame, centred on the enemy)
unit("state-shield", N, N, NH, NP, [el(circ(16, 16, 14), SHIELD, S)])
unit("state-shield-recharging", N, N, NH, NP, [el(circ(16, 16, 14), SHIELD, S, dash="4 4")])
unit("state-armor", N, N, NH, NP, [el(line(*b), ARMOR, S) for b in [
    ((3, 8), (3, 3), (8, 3)), ((24, 3), (29, 3), (29, 8)), ((29, 24), (29, 29), (24, 29)), ((8, 29), (3, 29), (3, 24))]])
unit("state-frozen", N, N, NH, NP, [el(poly(reg(16, 16, 14, 6, 30)), C, S, fill=C, fill_op=0.18),
                                    el(poly(reg(16, 16, 10, 6, 30)), C, 1.5)])
unit("state-slowed", N, N, NH, NP, [el(poly(reg(16, 16, 14, 6, 30)), C, S, dash="3 4")])

# ---------------------------------------------------------------- BOSSES 96x96
B, BP, BH, S4 = 96, 20, 16, 4
brackets_b = [((6, 18), (6, 6), (18, 6)), ((78, 6), (90, 6), (90, 18)),
              ((90, 78), (90, 90), (78, 90)), ((18, 90), (6, 90), (6, 78))]
unit("boss-juggernaut", B, B, BH, BP, [
    el(poly([(84, 48), (70, 22), (28, 18), (14, 32), (14, 64), (28, 78), (70, 74)]), INK, S4, fill=VOID),
    el(poly([(64, 48), (56, 34), (34, 32), (34, 64), (56, 62)]), INK, 3),
    el(line((18, 46), (28, 36)), INK, 3), el(line((18, 56), (28, 46)), INK, 3), el(line((18, 66), (28, 56)), INK, 3),
] + [el(line(*b), ARMOR, S4) for b in brackets_b])
aegis = [el(arc(48, 48, 41, a + 6, a + 54), SHIELD, S4) for a in range(0, 360, 60)]
aegis += [el(poly(reg(48, 48, 21, 6, 0)), INK, S4, fill=VOID), el(poly(reg(48, 48, 11, 6, 0)), INK, 3),
          el(line((43, 53), (51, 43)), INK, 3), el(line((47, 56), (55, 46)), INK, 2)]
for a in (60, 180, 300):
    cx, cy = 48 + 30 * math.cos(math.radians(a)), 48 + 30 * math.sin(math.radians(a))
    pts = [(cx + 5 * math.cos(math.radians(a + d)), cy + 5 * math.sin(math.radians(a + d))) for d in (0, 140, 220)]
    aegis.append(el(poly(pts), INK, S, fill=VOID))
unit("boss-aegis", B, B, BH, BP, aegis)
wing = [(86, 48), (58, 30), (40, 10), (14, 26), (22, 48), (14, 70), (40, 86), (58, 66)]
hive = [el(poly([(x + 5, y + 7) for x, y in wing]), SHADOW, 0, fill=SHADOW, glow=False),
        el(poly(wing), INK, S4, fill=VOID),
        el(line((22, 40), (28, 34)), INK, 3), el(line((22, 50), (32, 40)), INK, 3), el(line((24, 58), (32, 50)), INK, 3)]
for cx, cy in [(46, 33), (46, 63), (62, 48)]:
    hive.append(el(poly([(cx + 7, cy), (cx - 4, cy - 6), (cx - 1, cy), (cx - 4, cy + 6)]), INK, S))
unit("boss-hive-carrier", B, B, BH, BP, hive)

# ---------------------------------------------------------------- PROJECTILES / FX
PH, PP = 4, 6
unit("proj-laser-beam", 64, 8, PH, PP, [el(line((2, 4), (62, 4)), E, 3)])
unit("proj-rail-trail", 64, 8, PH, PP, [el(line((2, 4), (62, 4)), K, 3, dash="8 5")])
unit("proj-mortar-shell", 16, 16, PH, PP, [el(circ(8, 8, 4), E, S, fill=E)])
unit("fx-mortar-blast", 64, 64, PH, PP, [el(circ(32, 32, 29), E, 3), el(circ(32, 32, 20), E, S, dash="5 5")])
unit("proj-chain-lightning", 64, 24, PH, PP, [
    el(line((2, 12), (12, 4), (22, 18), (32, 6), (42, 20), (52, 8), (62, 12)), E, S)])
unit("proj-cryo-beam", 64, 16, PH, PP, [el(line((2, 8), (62, 8)), C, S)] +
     [el(circ(x, 8, 5), C, S) for x in (16, 34, 52)])
unit("proj-missile", 16, 8, PH, PP, [el(line((1, 4), (6, 4)), K, S, dash="2 2"),
                                     el(poly([(15, 4), (6, 1), (8, 4), (6, 7)]), K, 1.5, fill=K)])

# ---------------------------------------------------------------- BASE 96x96
BB, BBP = 96, 12
core_hex = poly(reg(48, 48, 20, 6, 30))
unit("base-healthy", BB, BB, 8, BBP, [
    el(circ(48, 48, 40), ACCENT, S4), el(core_hex, ACCENT, 3, fill=VOID),
    el(poly(reg(48, 48, 8, 4, 0)), ACCENT, 3)])
unit("base-damaged", BB, BB, 8, BBP, [
    el(arc(48, 48, 40, -80, 20), ACCENT, S4), el(arc(48, 48, 40, 40, 150), ACCENT, S4),
    el(arc(48, 48, 40, 175, 255), ACCENT, S4),
    el(core_hex, ACCENT, 3, fill=VOID), el(poly(reg(48, 48, 8, 4, 0)), ACCENT, 3),
    el(line((40, 33), (47, 44), (43, 50), (54, 63)), ACCENT, S)])
unit("base-critical", BB, BB, 8, BBP, [
    el(circ(48, 48, 40), DANGER, S4, dash="9 13"),
    el(core_hex, DANGER, 3, fill=VOID, dash="7 5"),
    el(line((41, 41), (55, 55)), DANGER, 3), el(line((55, 41), (41, 55)), DANGER, 3)])

# ---------------------------------------------------------------- render
def attrs(e, width, color, op, fill="none", fill_op=None):
    a = f'd="{e["d"]}" fill="{fill}" stroke="{color}" stroke-width="{f(width)}" stroke-linecap="round" stroke-linejoin="round"'
    if fill_op is not None and fill != "none": a += f' fill-opacity="{f(fill_op)}"'
    if op != 1: a += f' stroke-opacity="{f(op)}"'
    if e["dash"]: a += f' stroke-dasharray="{e["dash"]}"'
    return f"<path {a}/>"

def render(name, w, h, halo, pad, els, glow):
    out = []
    if glow:
        vb = f"{-pad} {-pad} {w + 2 * pad} {h + 2 * pad}"; W, H = w + 2 * pad, h + 2 * pad
    else:
        vb = f"0 0 {w} {h}"; W, H = w, h
    out.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="{vb}">')
    out.append(f"<title>{name}</title>")
    for e in els:  # non-glowing ground layer (shadows)
        if not e["glow"]:
            out.append(f'<path d="{e["d"]}" fill="{e["fill"]}" fill-opacity="0.45"/>')
    g = [e for e in els if e["glow"]]
    if glow:
        for wmul, op in ((2, 0.12), (1, 0.35)):
            out.append(f'<g id="halo-{"far" if wmul == 2 else "near"}">')
            out += [attrs(e, e["sw"] + wmul * halo, e["color"], op) for e in g]
            out.append("</g>")
    out.append('<g id="body">')
    for e in g:
        fill = VOID if e["fill"] == VOID else (e["fill"] or "none")
        out.append(attrs(e, e["sw"], e["color"], 1, fill=fill, fill_op=e["fill_op"]))
    out.append("</g>")
    if glow and halo >= 8:
        out.append('<g id="hot-core">')
        out += [attrs(e, e["sw"] * 0.5, "#ffffff", 0.55) for e in g]
        out.append("</g>")
    out.append("</svg>")
    return "\n".join(out) + "\n"

def verts(d):
    return d.count("L") + d.count("M") + d.count("A")

manifest = []
for sub in ("glow", "core"):
    os.makedirs(f"{OUT}/{sub}", exist_ok=True)
for name, w, h, halo, pad, els in UNITS:
    for sub, gl in (("glow", True), ("core", False)):
        open(f"{OUT}/{sub}/{name}.svg", "w").write(render(name, w, h, halo, pad, els, gl))
    mx = max(verts(e["d"]) for e in els)
    assert mx <= 12, (name, mx)
    manifest.append(dict(key=name, frame=[w, h], glowPad=pad, halo=halo))
json.dump(manifest, open(f"{OUT}/manifest.json", "w"), indent=1)
print(len(UNITS), "units")
