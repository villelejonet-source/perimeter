/**
 * Copies the design files the game ships with from docs/design/ (the Claude Design handoff,
 * kept as delivered) into src/. Re-run after a new handoff: `npm run sync:design`.
 */
import { copyFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..', '..');
const design = join(root, 'docs', 'design');

const MAPS = ['map-01-s-curve', 'map-02-switchbacks', 'map-03-spiral'];

const mapsOut = join(root, 'src', 'data', 'maps');
const unitsOut = join(root, 'src', 'assets', 'units');
mkdirSync(mapsOut, { recursive: true });
rmSync(unitsOut, { recursive: true, force: true });
mkdirSync(unitsOut, { recursive: true });

for (const m of MAPS) {
  copyFileSync(join(design, 'maps', `${m}.json`), join(mapsOut, `${m}.json`));
}

// Every unit SVG (glow variant) plus its manifest ships with the game.
const units = readdirSync(join(design, 'units', 'glow')).filter((f) => f.endsWith('.svg'));
for (const u of units) copyFileSync(join(design, 'units', 'glow', u), join(unitsOut, u));
copyFileSync(join(design, 'units', 'manifest.json'), join(unitsOut, 'manifest.json'));

console.log(`synced ${MAPS.length} maps, ${units.length} units`);
