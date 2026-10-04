# Balance report

Generated with the headless balance sim (`tools/balance-sim`, ROADMAP Phase 5).
Last full run: 2026-10-04, 50 runs per strategy × preset, seeds 1–50, map 1.

```
npm run sim -- --strategy=all --preset=all --runs=50   # strategies × presets
npm run sim -- --mode=specs --runs=24                   # spec matrix
npm run sim -- --strategy=greedy --runs=200             # one strategy
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

Meta progress pushes the wall later (GDD §5). The 10 h and 50 h presets are stand-ins
(`src/data/meta.ts`) until Phase 6 sets real research costs.

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

## Next balance work

- Wraith leaks dominate: consider a little more Pulse Laser range or fewer early Wraiths, once
  players can unlock Arc Coil / Swarm (Phase 6).
- The 50 h preset reaches wave ~86 in ~30 min: tune research costs in Phase 6 so late runs stay
  within a sensible session length.
- Re-run the spec matrix at the 10 h / 50 h presets once Arc Coil, Cryo and Swarm are reachable.
