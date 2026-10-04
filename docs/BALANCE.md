# Balance report

Generated with the headless balance sim (`tools/balance-sim`, ROADMAP Phase 5).
Last full run: 2026-10-04, 50 runs per strategy × preset, seeds 1–50, map 1.

```
npm run sim -- --strategy=all --preset=all --runs=50   # strategies × presets
npm run sim -- --mode=specs --runs=24                   # spec matrix
npm run sim -- --strategy=greedy --runs=200             # one strategy
npm run sim -- --mode=career --hours=50                 # research pace (Phase 6)
npm run sim -- --mode=artifacts --preset=10h --tier=1   # artifact matrix (Phase 7)
```

Each run writes `tools/out/balance-<time>-runs.csv` (one row per run, including damage by
tower and leaks by enemy), `-waves.csv` (Credits, base HP and towers per wave) and `-summary.md`.

## Bots

All bots play through commands only, decide 4× per second of game time, place towers on the
free spot whose range covers the most path, and call waves early when the field is clear and
the base is above 70%.

| Strategy | How it plays |
|---|---|
| `greedy-dps` | Buys whatever gives the most damage per Credit (new tower or upgrade), valued against the armor, shields and flyers it has seen. Never plans a mix on purpose. |
| `balanced-mix` | Grows its tower count with the wave, cycles a mixed build order (energy, kinetic, splash, then support once unlocked), upgrades the lowest level first, varies specs per tower. |
| `spec-focused` | Keeps a sensible tower count but rushes one tower at a time to level 5. Picks specs by value against observed threats, keeping at least 25% each of energy and kinetic damage. |

## Results (acceptance)

**Fresh account: wall at wave 30–40 within 10–15 minutes.** Met (median per strategy).

| preset | strategy | wall p10 / p50 / p90 | mean | run time p50 |
|---|---|---|---|---|
| fresh | greedy-dps | 36 / 37 / 44 | 37.5 | 11:42 |
| fresh | balanced-mix | 27 / 32 / 36 | 32.5 | 10:12 |
| fresh | spec-focused | 26 / 32 / 36 | 30.4 | 10:03 |
| 10h | greedy-dps | 56 / 56 / 56 | 56.0 | 17:28 |
| 10h | balanced-mix | 37 / 47 / 47 | 45.5 | 15:37 |
| 10h | spec-focused | 32 / 47 / 47 | 44.3 | 15:35 |
| 50h | greedy-dps | 82 / 86 / 86 | 84.5 | 28:57 |
| 50h | balanced-mix | 86 / 86 / 86 | 85.2 | 31:35 |
| 50h | spec-focused | 62 / 86 / 86 | 81.1 | 31:48 |

Meta progress pushes the wall later (GDD §5). The 10 h and 50 h presets (`src/data/meta.ts`)
are the targets the research costs are calibrated against (below).

**Where runs end:** the wall lands on content spikes: the wave-25 elites (armored Bulwarks
cost 3 HP each), the wave-30 Hive Carrier, the wave-35 elites. Wraiths are the most common leak
for every strategy: with the starting towers, only the Pulse Laser hits flyers.

## Dominance check

**Towers: no single tower leads in every strategy** (fresh-account damage share):

| strategy | Pulse Laser | Railgun | Plasma Mortar |
|---|---|---|---|
| greedy-dps | 42% | **50%** | 8% |
| balanced-mix | **47%** | 33% | 20% |
| spec-focused | 40% | **41%** | 20% |

**Specs: no spec ranks first in every strategy.** Spec matrix, mean wall with that tower forced
to the spec and everything else played by the bot (24 runs per cell):

| tower | spec | greedy | balanced | spec-focused |
|---|---|---|---|---|
| Pulse Laser | Overclock | 37.0 | 32.3 | **35.0** |
| Pulse Laser | Flechette | 37.0 | 31.0 | 29.0 |
| Pulse Laser | Prism | 37.0 | **32.5** | 34.9 |
| Railgun | Accelerator | 37.0 | 30.9 | 29.8 |
| Railgun | Executioner | **38.3** | **31.1** | 30.1 |
| Railgun | Ion Rail | 37.7 | 30.3 | **31.0** |
| Plasma Mortar | Plasma Pools | 37.0 | 31.6 | 27.5 |
| Plasma Mortar | Cluster | 37.0 | 31.0 | 27.2 |
| Plasma Mortar | Siege | 37.0 | **31.8** | **29.3** |

Greedy rarely gets Pulse Lasers or Mortars to level 5, so their specs barely move its result.
**Watch:** Siege leads both strategies where Mortar specs matter (by 0.2 and 1.8 waves), and
Flechette is weak for spec-focused builds. Arc Coil, Cryo and Swarm specs aren't in the fresh
matrix (locked); run `--mode=specs --preset=50h` to compare them.

## Tuning log (Phase 5)

| Change | Why |
|---|---|
| Overclock max +70% (mockup +100%) | Best Pulse spec in every strategy. |
| Prism 65% per beam (mockup 45%) | Weakest Pulse spec in every strategy. |
| Flechette +25% damage | Losing energy's shield bonus left it behind. |
| Siege damage ×1.65 (was ×1.5) | Extra range didn't make up for the slower rate. |
| Accelerator +3 pierce, +40% per pierce (was +2, +25%) | Weakest Railgun spec for focused builds. |
| Executioner threshold 20%, +75% vs bosses (was 15%, +50%) | Lost to Ion Rail everywhere. |
| Ion Rail strips 4× hit damage of shield (was all), 70% damage | Deleted boss shields outright, and big hits barely notice armor, so going energy cost it nothing: it was the best Railgun spec in every strategy. |
| Aegis shield 180, regen 10%/s (was 260, 15%/s) | At wave 20 it regenerated ~165 shield/s; any kinetic-leaning build lost to it. |

Earlier tuning (Phase 3): Pulse damage 8, Railgun cost 110 / 0.4 per s / 2 hits, Juggernaut
180 HP / 7 armor, Cryo chill 0.25 per hit with 0.2/s decay.

## Meta economy (Phase 6)

**Rewards** (`REWARDS` in `src/data/meta.ts`): a run that reaches wave w pays floor(w² × 0.25)
Cores (wave 20 → 100, wave 40 → 400). 1 Shard per boss, plus 3 Shards the first time each 10th
wave is reached. Offline: the best-wave run reward per hour (+10% per Offline income level),
0.25 Shards per hour, capped at 8 h (+1 h per Offline cap level, max 12 h). A clock that moved
backwards pays nothing.

**Research costs** (`src/data/research.ts`): base cost × 8 × growth^level. The career sim plays
balanced-bot runs, adds 4 h of offline income after every second run, buys tower unlocks in
order (saving for one when it costs ≤ 8 runs of income), and otherwise buys the cheapest research.

| play h | runs | wall | Pulse dmg | Pulse rate | towers | +Credits | +Base HP | start Lv |
|---|---|---|---|---|---|---|---|---|
| 1.1 | 6 | 27 | ×1.05 | ×1.00 | 3 | +0 | +0 | 1 |
| 5.2 | 28 | 37 | ×1.25 | ×1.04 | 3 | +50 | +1 | 1 |
| 10.0 | 52 | 47 | ×1.30 | ×1.08 | 4 | +100 | +3 | 1 |
| 20.3 | 93 | 56 | ×1.45 | ×1.12 | 5 | +150 | +5 | 1 |
| 50.1 | 182 | 62 | ×1.75 | ×1.26 | 6 | +300 | +11 | 2 |

Against the presets (10 h: ×1.3 / ×1.1 / 5 towers / +100 / +5 HP; 50 h: ×2.0 / ×1.3 / 6 / +300 /
+15 / Lv 3) the damage and Credits tracks land on target. The cheap-first bot spreads Cores
across all six towers, so per-tower depth and Base HP run a little behind at 50 h; a player who
focuses a few towers will be ahead of the bot.

## Artifacts (Phase 7)

Bots now take artifacts after each boss: greedy and spec-focused by estimated value, and balanced
in rotation (bots never reroll). Dual Spec goes to the highest-level specialized tower.

**With artifacts in play, the fresh account still hits the wall at 30–40 in 10–15 min** (30 runs
each): greedy 37 / 11:51 → 37 / 12:02, balanced 36 / 11:33 → 36 / 11:32, spec-focused 36 / 11:24
→ 36 / 11:23 (median wall / run time, before → after tuning). The 10 h preset's medians rose to
62 / 52 / 53 and the 50 h preset's to 96 / 96 / 92 (~33–35 min runs).

**No artifact is a strictly dominant pick.** Artifact matrix: 10 h preset, each artifact held at
Rare from wave 1 with no other picks, mean wall over 12 runs (Δ vs no artifact):

| artifact | greedy | balanced | spec-focused |
|---|---|---|---|
| (none) | 56.1 | 44.8 | 44.0 |
| Capacitor Bank | **59.3 (+3.3)** | 47.6 (+2.8) | 43.8 (−0.3) |
| Dual Spec | 58.9 (+2.8) | 50.4 (+5.6) | 48.3 (+4.3) |
| Last Stand (tuned) | 58.4 (+2.3) | 51.2 (+6.3) | 48.0 (+4.0) |
| Specialist Doctrine | 58.3 (+2.2) | 50.6 (+5.8) | 48.9 (+4.9) |
| Long Barrels (tuned) | 56.3 (+0.2) | **51.5 (+6.7)** | **50.4 (+6.4)** |
| Priority Targeting | 56.7 (+0.6) | 50.0 (+5.2) | 49.0 (+5.0) |
| Ricochet Matrix | 57.3 (+1.3) | 48.6 (+3.8) | 48.8 (+4.8) |
| Cryo Lattice | 56.1 (+0.0) | 48.6 (+3.8) | 49.1 (+5.1) |
| Skyguard | 56.2 (+0.1) | 52.2 (+7.3)* | 43.6 (−0.4) |
| Bounty Protocol | 56.3 (+0.2) | 50.2 (+5.3) | 43.0 (−1.0) |

\* From the first full matrix (before tuning). The full 30-artifact table is in the first run's
output; after tuning only the leaders were re-run (`--only=`). Greedy only builds lasers and
railguns, so Cryo, Mortar and Arc artifacts do nothing for it.

| Change | Why |
|---|---|
| Last Stand +20% fire rate at Common (was +30%) | Best in every strategy (60.3 / 51.2 / 49.5). |
| Long Barrels +5% range at Common (was +6%) | Best in 2 of 3 strategies, by 1–2 waves. |

**Watch:** Reinforced Hull and Salvage Rights show +0.0. Runs end on a boss leak (which leaves
1 HP whatever the max), and bots never sell. Interest Engine hurts bots that don't bank Credits.
These need a player-style test, not the bots. 12 runs per cell is noisy (±1–2 waves).

**Career with artifacts** (`--mode=career`): research pace is unchanged within noise (Pulse damage
×1.35 at 10 h, ×1.80 at 50 h). The bot has 23 artifacts crafted by 10 h and 29 by 50 h, with
a tier sum of 26.

## Next balance work

- Wraith leaks dominate: consider a little more Pulse Laser range or fewer early Wraiths, once
  players can unlock Arc Coil / Swarm (Phase 6).
- The 50 h preset reaches wave ~86 in ~30 min; the career bot reaches ~62 at 50 h. Revisit late
  session length once artifacts (Phase 7) add power.
- Re-run the spec matrix at the 10 h / 50 h presets once Arc Coil, Cryo and Swarm are reachable.
