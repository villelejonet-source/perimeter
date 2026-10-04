import map01 from './maps/map-01-s-curve.json';

export interface Point {
  x: number;
  y: number;
}

/** A map as delivered by Claude Design (docs/design/maps/*.json). World units = logical px. */
export interface MapDef {
  id: string;
  name: string;
  spawn: Point;
  base: Point;
  /** Width of the walkable path band. */
  pathWidth: number;
  /** No-build margin on each side of the path band. */
  buildBuffer: number;
  /** Catmull-Rom control points from spawn to base. */
  path: readonly Point[];
  /** Vertical band where towers may be built. */
  playArea: { top: number; bottom: number };
}

function isPoint(v: unknown): v is Point {
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof (v as Point).x === 'number' &&
    typeof (v as Point).y === 'number'
  );
}

/** Validates raw map JSON at load time so a bad handoff fails loudly, not mid-run. */
export function parseMap(raw: unknown): MapDef {
  const m = raw as Record<string, unknown>;
  const fail = (msg: string): never => {
    throw new Error(`Invalid map ${String(m?.id)}: ${msg}`);
  };
  if (typeof m !== 'object' || m === null) fail('not an object');
  if (typeof m.id !== 'string' || typeof m.name !== 'string') fail('missing id/name');
  if (!isPoint(m.spawn) || !isPoint(m.base)) fail('missing spawn/base');
  if (typeof m.pathWidth !== 'number' || typeof m.buildBuffer !== 'number') fail('missing widths');
  const pts = m.pathControlPoints;
  if (!Array.isArray(pts) || pts.length < 2 || !pts.every(isPoint)) fail('bad pathControlPoints');
  const area = m.playArea as { top?: unknown; bottom?: unknown } | undefined;
  if (typeof area?.top !== 'number' || typeof area.bottom !== 'number') fail('missing playArea');
  const path = pts as Point[];
  const spawn = m.spawn as Point;
  const base = m.base as Point;
  const first = path[0]!;
  const last = path[path.length - 1]!;
  if (first.x !== spawn.x || first.y !== spawn.y) fail('spawn is not the first control point');
  if (last.x !== base.x || last.y !== base.y) fail('base is not the last control point');
  return {
    id: m.id as string,
    name: m.name as string,
    spawn,
    base,
    pathWidth: m.pathWidth as number,
    buildBuffer: m.buildBuffer as number,
    path,
    playArea: { top: area!.top as number, bottom: area!.bottom as number },
  };
}

const ALL: readonly MapDef[] = [parseMap(map01)];

export const MAPS: Readonly<Record<string, MapDef>> = Object.fromEntries(ALL.map((m) => [m.id, m]));
export const DEFAULT_MAP_ID = 'map-01-s-curve';
