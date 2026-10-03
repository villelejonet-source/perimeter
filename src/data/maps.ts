export interface Point {
  x: number;
  y: number;
}

export interface MapDef {
  id: string;
  name: string;
  /** Catmull-Rom control points from spawn to base, in world units. */
  path: readonly Point[];
}

export const MAPS: Record<string, MapDef> = {
  serpent: {
    id: 'serpent',
    name: 'Serpent',
    path: [
      { x: 180, y: 88 },
      { x: 64, y: 172 },
      { x: 296, y: 277 },
      { x: 64, y: 391 },
      { x: 296, y: 506 },
      { x: 104, y: 601 },
      { x: 180, y: 660 },
    ],
  },
};
