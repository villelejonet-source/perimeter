/**
 * Copies the design files the game ships with from docs/design/ (the Claude Design handoff,
 * kept as delivered) into src/. Re-run after a new handoff: `npm run sync:design`.
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..', '..');
const design = join(root, 'docs', 'design');

const MAPS = ['map-01-s-curve'];
const UNITS = [
  'enemy-drone',
  'tower-pulse-laser-l1-base',
  'tower-pulse-laser-l1-turret',
  'tower-pulse-laser-l5-base',
  'tower-pulse-laser-l5-turret',
  'base-healthy',
  'base-damaged',
  'base-critical',
  'proj-laser-beam',
];

const mapsOut = join(root, 'src', 'data', 'maps');
const unitsOut = join(root, 'src', 'assets', 'units');
mkdirSync(mapsOut, { recursive: true });
mkdirSync(unitsOut, { recursive: true });
for (const m of MAPS) copyFileSync(join(design, 'maps', `${m}.json`), join(mapsOut, `${m}.json`));
for (const u of UNITS)
  copyFileSync(join(design, 'units', 'glow', `${u}.svg`), join(unitsOut, `${u}.svg`));
console.log(`synced ${MAPS.length} maps, ${UNITS.length} units`);
