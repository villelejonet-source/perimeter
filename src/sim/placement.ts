import { GAME } from '../data/game';
import type { MapDef } from '../data/maps';
import type { Path } from './path';
import type { SimState, Tower } from './state';

/** Mirrors the invalid states in docs/design/screens/in-run/Place-*.dc.html. */
export type PlacementError = 'outOfBounds' | 'onPath' | 'nearPath' | 'overlap';

/**
 * Snap a world coordinate to the nearest grid line. Towers are 2 × 2 cells, so their
 * centre sits on a grid intersection and the footprint aligns with the cells.
 */
export function snapToGrid(v: number): number {
  const g = GAME.gridSize;
  return Math.round(v / g) * g;
}

/** Lowest y a tower footprint may reach on this map. */
export function buildAreaBottom(map: MapDef): number {
  return Math.min(map.playArea.bottom, GAME.buildAreaMaxBottom);
}

/** The tower whose footprint overlaps a footprint centred at (x, y), if any. */
export function blockingTower(state: SimState, x: number, y: number): Tower | null {
  const f = GAME.towerFootprint;
  for (const t of state.towers.items) {
    if (t.alive && Math.abs(t.x - x) < f && Math.abs(t.y - y) < f) return t;
  }
  return null;
}

/**
 * Pure validity check shared by the sim (authoritative) and the renderer (ghost preview).
 * Expects already-snapped coordinates.
 */
export function placementError(
  state: SimState,
  path: Path,
  map: MapDef,
  x: number,
  y: number,
): PlacementError | null {
  const half = GAME.towerFootprint / 2;
  if (
    x - half < 0 ||
    x + half > GAME.worldWidth ||
    y - half < map.playArea.top ||
    y + half > buildAreaBottom(map)
  ) {
    return 'outOfBounds';
  }
  const d = path.distanceToBox(x, y, half);
  if (d < map.pathWidth / 2) return 'onPath';
  if (d < map.pathWidth / 2 + map.buildBuffer) return 'nearPath';
  if (blockingTower(state, x, y)) return 'overlap';
  return null;
}
