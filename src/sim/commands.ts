import type { SpecId } from '../data/specs';
import type { TowerKind } from '../data/towers';
import type { TargetingMode } from './state';

/** Player intent. Render/UI never mutates sim state; it enqueues these. */
export type Command =
  | { type: 'placeTower'; kind: TowerKind; x: number; y: number }
  | { type: 'upgradeTower'; towerId: number }
  | { type: 'sellTower'; towerId: number }
  | { type: 'setTargeting'; towerId: number; mode: TargetingMode }
  | { type: 'specialize'; towerId: number; spec: SpecId }
  | { type: 'callEarly' }
  /** Take choice `index` of the pending artifact offer. */
  | { type: 'pickArtifact'; index: number }
  /** Redraw the pending offer for Credits (free rerolls first). */
  | { type: 'rerollArtifacts' }
  | { type: 'setPaused'; paused: boolean };
