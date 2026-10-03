import type { TowerKind } from '../data/towers';
import type { TargetingMode } from './state';

/** Player intent. Render/UI never mutates sim state; it enqueues these. */
export type Command =
  | { type: 'placeTower'; kind: TowerKind; x: number; y: number }
  | { type: 'upgradeTower'; towerId: number }
  | { type: 'sellTower'; towerId: number }
  | { type: 'setTargeting'; towerId: number; mode: TargetingMode }
  | { type: 'callEarly' }
  | { type: 'setPaused'; paused: boolean };
