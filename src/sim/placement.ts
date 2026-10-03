import { GAME } from '../data/game';
import type { Path } from './path';
import type { SimState } from './state';

export type PlacementError = 'outOfBounds' | 'onPath' | 'overlap';

/** Snap a world coordinate to the centre of its grid cell. */
export function snapToGrid(v: number): number {
  const g = GAME.gridSize;
  return Math.floor(v / g) * g + g / 2;
}

/**
 * Pure validity check shared by the sim (authoritative) and the renderer
 * (ghost preview). Expects already-snapped coordinates.
 */
export function placementError(
  state: SimState,
  path: Path,
  x: number,
  y: number,
): PlacementError | null {
  const r = GAME.towerRadius;
  if (
    x - r < 0 ||
    x + r > GAME.worldWidth ||
    y - r < GAME.playfieldTop ||
    y + r > GAME.playfieldBottom
  ) {
    return 'outOfBounds';
  }
  if (path.distanceTo(x, y) < GAME.pathBuffer) return 'onPath';
  const minSq = (r * 2) ** 2;
  for (const t of state.towers.items) {
    if (!t.alive) continue;
    const dx = t.x - x;
    const dy = t.y - y;
    if (dx * dx + dy * dy < minSq) return 'overlap';
  }
  return null;
}
