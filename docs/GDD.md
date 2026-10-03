# Game Design Document — PERIMETER (working title)

All numbers here are **starting values** for the balance sim to tune, not final values.

## 1. Pillars
1. **Every run hits a wall, every wall moves.** Endless waves outscale you; meta progress pushes the wall later.
2. **Build decisions matter.** Placement, damage-type mix, specialization picks, and artifact synergies.
3. **Respect idle players, reward active ones.** Offline income exists; active play earns more.

## 2. Core loop
```
Run (10–15 min)                           Between runs
 place/upgrade towers ──► kill waves       spend Cores in Research Lab
        ▲                    │             craft/upgrade artifacts with Shards
        └── Credits ◄────────┘             collect offline income (capped)
 boss every 10 waves ──► pick 1 of 3 artifacts
 base HP hits 0 ──► run ends ──► Cores + Shards
```

## 3. Format
- iPhone, **portrait**, one-handed play (open decision, see §13)
- Fixed path (spline) from spawn to the base. Several maps unlocked over time, each with a distinct path shape.
- Game speed: 1x / 2x / 3x (3x unlocked via research). Pause anytime.

## 4. Currencies
| Currency | Scope | Source | Spent on |
|---|---|---|---|
| **Credits** | Single run, resets | Kills, call-early bonus, interest artifacts | Placing/upgrading towers, artifact rerolls |
| **Cores** | Permanent | End of run (scales with highest wave), offline income | Research Lab |
| **Shards** | Permanent | Bosses, milestones, small offline trickle | Crafting/upgrading artifacts |

## 5. Waves and scaling
- Waves auto-spawn on a timer (start: 20 s). **Call early** grants bonus Credits proportional to the remaining time.
- Elite wave every 5th wave, **boss every 10th**.
- Enemy HP: `hp(w) = baseHp × 1.08^w` (tune range 1.07–1.10)
- Shields and armor scale separately (armor grows slower, roughly linearly, so it stays meaningful but not absolute).
- Credits per kill: `baseBounty × 1.045^w` (grows slower than HP, which creates the wall).
- Tower upgrade cost: `baseCost × 1.18^level`.
- **Target:** a fresh account hits its wall around wave 30–40 in 10–15 minutes. Each meta upgrade pushes this later. The balance sim verifies this.
- Base HP: 20. A normal leak costs 1, an elite 3, a boss costs the remaining HP minus 1 (a boss leak is nearly fatal but not instant).
- Optional **Retreat** button: end the run early and keep 100% of rewards earned so far.

## 6. Damage model
- **Energy:** Pulse Laser, Arc Coil, Plasma Mortar
- **Kinetic:** Railgun, Swarm Launcher
- **Utility:** Cryo Projector (no damage type)

| Defense | Behavior | Energy | Kinetic |
|---|---|---|---|
| Shield | Regenerating HP layer on top of HP, regenerates after 3 s without taking damage | ×1.5 | ×0.5 |
| Armor | Flat reduction per hit (min 10% of hit gets through) | normal | normal (big hits barely notice it) |

Armor naturally punishes fast/weak hits and rewards slow/heavy ones. **Frozen** enemies take +50% kinetic damage (the Cryo combo).

## 7. Towers (6)
Free placement anywhere off the path on an invisible 16 px snap grid. Towers cannot overlap the path buffer or each other. Selling refunds 70%. Levels are uncapped with exponential cost. **At level 5, pick 1 of 3 specializations (locked for that tower).** Start with 3 towers unlocked; the rest are unlocked in the Research Lab.

| Tower | Type | Role | Can hit flying |
|---|---|---|---|
| Pulse Laser | Energy | Fast single target, cheap backbone | Yes |
| Railgun | Kinetic | Slow, huge damage, pierces a line | No |
| Plasma Mortar | Energy | Lobbed splash vs swarms | No |
| Arc Coil | Energy | Chains between nearby enemies | Yes |
| Cryo Projector | Utility | Slow → freeze, support | Yes |
| Swarm Launcher | Kinetic | Homing missiles, anti-air | Yes |

### Specializations (18)
| Tower | Spec A | Spec B | Spec C |
|---|---|---|---|
| Pulse Laser | **Overclock**: fire rate ramps while firing continuously | **Flechette**: becomes kinetic, pierces 2 | **Prism**: splits beam across 3 targets |
| Railgun | **Accelerator**: +pierce, damage grows per enemy pierced | **Executioner**: kills non-bosses below 15% HP, +dmg vs bosses | **Ion Rail**: becomes energy, strips shields along the line |
| Plasma Mortar | **Plasma Pools**: leaves burning ground | **Cluster**: splits into 5 submunitions | **Siege**: huge range, bigger blast, slower |
| Arc Coil | **Storm**: +3 chain jumps | **Overload**: chains stun briefly | **Capacitor**: charges up, releases one huge burst |
| Cryo Projector | **Deep Freeze**: freeze chance, longer freeze | **Brittle**: slowed enemies lose 30% armor | **Stasis Field**: aura slow around the tower |
| Swarm Launcher | **Hunter-Killer**: targets bosses/elites first, crits | **Saturation**: many small missiles | **EMP Warheads**: becomes energy, shield-break + micro-stun |

Each tower has a targeting mode: First / Last / Strongest / Closest.

## 8. Enemies
Introduced gradually (new type roughly every 5 waves early on).
| Enemy | Trait |
|---|---|
| Drone | Baseline |
| Skitter | Fast, low HP |
| Bulwark | Heavy armor |
| Warden | Large shield |
| Wraith | Flying (ignores Railgun and Mortar) |
| Splitter | Splits into 3 Skitters on death |
| Medic | Heals nearby enemies |

**Bosses** rotate every 10 waves:
- **Juggernaut:** massive armor
- **Aegis:** regenerating shield, spawns Drones
- **Hive Carrier:** flying, releases Wraiths

From wave 50 onward, bosses combine traits.

## 9. Artifacts
- **In-run:** after each boss, pick 1 of 3 random artifacts. A reroll costs Credits (price grows per use).
- **Out of run:** artifacts must be **crafted with Shards** to enter your draw pool. Crafting again raises the artifact's tier (Common → Rare → Epic → Legendary), which strengthens it whenever it is drawn.
- Rarer tiers appear less often in draws, so investing in a favorite trades breadth for power.

Starter set (expand to ~30):
| Artifact | Effect |
|---|---|
| Superconductor | Energy damage +X% vs shields |
| Ricochet Matrix | Kinetic projectiles bounce once |
| Cryo Lattice | Frozen enemies shatter on death, dealing AoE |
| Bounty Protocol | +X% Credits per kill |
| Interest Engine | Earn X% interest on banked Credits each wave |
| Overflow Reactor | Overkill damage carries to the next enemy |
| Last Stand | Below 25% base HP, all towers +X% fire rate |
| Targeting Uplink | +X% range for towers near another tower of the same type |
| Dual Spec (Legendary) | One tower may take a second specialization |

Synergies between artifacts, damage types and specs are intended. They are where build variety comes from.

## 10. Research Lab (Cores)
- Per-tower tracks: damage, fire rate, range, starting level
- Global: starting Credits, base HP, wave timer, Credit bounty, call-early bonus
- Unlocks: towers 4–6, game speed 3x, more maps, 4th artifact choice, one free reroll per run
- Idle: offline income rate, **offline cap 8 h → 12 h**

## 11. Idle and offline
- Closing the app **pauses the run**. Full run state is saved and resumed exactly.
- Offline income: `Cores/hour = f(bestWaveEver, research)` × elapsed time, **capped at 8 h** (12 h via research), plus a small Shard trickle.
- Clock tampering: if the device time is earlier than the last save, grant nothing. The cap limits abuse in every other case.
- "Welcome back" screen shows earnings, with a rewarded-ad option to double them.

## 12. Monetization (free-to-play, not pay-to-win)
- **Rewarded ads (opt-in only):** double offline earnings, one revive per run (restore 50% base HP), extra artifact reroll, double end-of-run Cores.
- **No forced interstitials mid-run.**
- **IAP:**
  - "Commander Pass" (one-time): removes the need to watch ads (rewards granted instantly), plus a permanent +20% Cores
  - Starter pack (one-time)
  - Core and Shard packs
  - Cosmetics later (tower skins, path themes)
- Tech: AdMob via a Capacitor plugin, RevenueCat for IAP and receipt validation. Requires the App Tracking Transparency prompt, App Privacy labels, and the Paid Apps agreement in App Store Connect.
- Track a few analytics events from day one: run start/end with wave reached, spec picks, artifact picks, ad views, purchases.

## 13. Open decisions
- Portrait vs landscape (portrait assumed)
- Final name and visual identity (neon vector placeholder)
- Map count at launch (suggestion: 3)
- Publishing entity: personal Apple developer account vs company (an organization account needs a D-U-N-S number)
- Cloud save (iCloud) at launch or later
