import { TOWER_ORDER, TOWERS, type TowerKind } from './towers';

/** Research Lab (GDD §10). Layout follows docs/design/screens/meta/Research*.dc.html. */
export type ResearchGroup = 'towers' | 'base' | 'unlocks';
export type TowerTrack = 'damage' | 'fireRate' | 'range' | 'startingLevel';
export type GlobalTrack =
  'startCredits' | 'baseHp' | 'waveTimer' | 'bounty' | 'callEarly' | 'offlineRate' | 'offlineCap';
export type UnlockId =
  | 'unlock.arcCoil'
  | 'unlock.cryoProjector'
  | 'unlock.swarmLauncher'
  | 'speed3x'
  | 'artifactChoice4'
  | 'freeReroll';
export type ResearchId = `${TowerKind}.${TowerTrack}` | GlobalTrack | UnlockId;

export interface ResearchDef {
  id: ResearchId;
  group: ResearchGroup;
  /** Sub-heading on the Base tab ("Base · every run" / "Idle · while you're away"). */
  section?: 'base' | 'idle';
  name: string;
  maxLevel: number;
  /** Cost of level 1; each further level costs `growth`× the previous. */
  baseCost: number;
  growth: number;
  /** Effect per level, in the unit `format` shows. */
  perLevel: number;
  /** Must be owned first (tower unlock chain). */
  requires?: ResearchId;
  tower?: TowerKind;
  track?: TowerTrack;
  /** Effect text at a level ("+20%", "+3 s", "Lv 3"). */
  format: (level: number) => string;
}

const pct = (per: number) => (lvl: number) => `+${Math.round(per * lvl * 100)}%`;

/**
 * Global cost scale, calibrated with `npm run sim -- --mode=career` so ~10 h of play reaches the
 * 10 h preset and ~50 h the 50 h preset (src/data/meta.ts).
 */
export const RESEARCH_COST_SCALE = 8;

// Costs are starting values calibrated with `npm run sim -- --mode=career` against the
// 10 h / 50 h presets (decided 2026-10-04: research pace matches the presets).
const TOWER_TRACKS: Record<TowerTrack, Omit<ResearchDef, 'id' | 'tower' | 'group' | 'track'>> = {
  damage: {
    name: 'Damage',
    maxLevel: 30,
    baseCost: 60,
    growth: 1.15,
    perLevel: 0.05,
    format: pct(0.05),
  },
  fireRate: {
    name: 'Fire rate',
    maxLevel: 15,
    baseCost: 80,
    growth: 1.15,
    perLevel: 0.02,
    format: pct(0.02),
  },
  range: {
    name: 'Range',
    maxLevel: 15,
    baseCost: 50,
    growth: 1.15,
    perLevel: 0.01,
    format: pct(0.01),
  },
  startingLevel: {
    name: 'Starting level',
    maxLevel: 4,
    baseCost: 400,
    growth: 2,
    perLevel: 1,
    format: (l) => `Placed at Lv ${1 + l}`,
  },
};

const GLOBAL: Omit<ResearchDef, 'group'>[] = [
  {
    id: 'startCredits',
    section: 'base',
    name: 'Starting Credits',
    maxLevel: 20,
    baseCost: 80,
    growth: 1.15,
    perLevel: 25,
    format: (l) => `+${25 * l}`,
  },
  {
    id: 'baseHp',
    section: 'base',
    name: 'Base HP',
    maxLevel: 20,
    baseCost: 100,
    growth: 1.15,
    perLevel: 1,
    format: (l) => `+${l}`,
  },
  {
    id: 'waveTimer',
    section: 'base',
    name: 'Wave timer',
    maxLevel: 10,
    baseCost: 150,
    growth: 1.18,
    perLevel: 0.5,
    format: (l) => `+${(0.5 * l).toFixed(1)} s`,
  },
  {
    id: 'bounty',
    section: 'base',
    name: 'Credit bounty',
    maxLevel: 20,
    baseCost: 120,
    growth: 1.15,
    perLevel: 0.03,
    format: pct(0.03),
  },
  {
    id: 'callEarly',
    section: 'base',
    name: 'Call-early bonus',
    maxLevel: 10,
    baseCost: 100,
    growth: 1.2,
    perLevel: 0.1,
    format: pct(0.1),
  },
  {
    id: 'offlineRate',
    section: 'idle',
    name: 'Offline income',
    maxLevel: 20,
    baseCost: 150,
    growth: 1.15,
    perLevel: 0.1,
    format: pct(0.1),
  },
  {
    id: 'offlineCap',
    section: 'idle',
    name: 'Offline cap',
    maxLevel: 4,
    baseCost: 2000,
    growth: 1.8,
    perLevel: 1,
    format: (l) => `${8 + l} h`,
  },
];

/** Towers 4–6 unlock in order with Cores (decided 2026-10-04). */
const UNLOCKS: Omit<ResearchDef, 'group' | 'maxLevel' | 'growth' | 'perLevel' | 'format'>[] = [
  { id: 'unlock.arcCoil', name: TOWERS.arcCoil.name, baseCost: 1000, tower: 'arcCoil' },
  {
    id: 'unlock.cryoProjector',
    name: TOWERS.cryoProjector.name,
    baseCost: 2000,
    tower: 'cryoProjector',
    requires: 'unlock.arcCoil',
  },
  {
    id: 'unlock.swarmLauncher',
    name: TOWERS.swarmLauncher.name,
    baseCost: 5000,
    tower: 'swarmLauncher',
    requires: 'unlock.cryoProjector',
  },
  { id: 'speed3x', name: '3x game speed', baseCost: 750 },
  // GDD §10 unlocks for artifact picks (Phase 7). TODO(balance): costs are starting values.
  { id: 'artifactChoice4', name: '4th artifact choice', baseCost: 2500 },
  { id: 'freeReroll', name: 'Free reroll', baseCost: 1500 },
];

export const RESEARCH: readonly ResearchDef[] = [
  ...TOWER_ORDER.flatMap((tower) =>
    (Object.keys(TOWER_TRACKS) as TowerTrack[]).map((track): ResearchDef => ({
      ...TOWER_TRACKS[track],
      id: `${tower}.${track}`,
      group: 'towers',
      tower,
      track,
    })),
  ),
  ...GLOBAL.map((g): ResearchDef => ({ ...g, group: 'base' })),
  ...UNLOCKS.map((u): ResearchDef => ({
    ...u,
    group: 'unlocks',
    maxLevel: 1,
    growth: 1,
    perLevel: 1,
    format: (l) => (l ? 'Owned' : ''),
  })),
];

export const RESEARCH_BY_ID: ReadonlyMap<ResearchId, ResearchDef> = new Map(
  RESEARCH.map((r) => [r.id, r]),
);

/** Cost to go from `level` to `level + 1`. */
export function researchCost(def: ResearchDef, level: number): number {
  return Math.round(def.baseCost * RESEARCH_COST_SCALE * def.growth ** level);
}
