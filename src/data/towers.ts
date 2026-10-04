import type { DamageType } from './damage';

export type TowerKind = 'pulseLaser';

export interface TowerDef {
  kind: TowerKind;
  name: string;
  damageType: DamageType;
  cost: number;
  /** Base of the upgrade cost curve, GDD §5. */
  upgradeBaseCost: number;
  damage: number;
  /** Shots per second. */
  fireRate: number;
  range: number;
  projectileSpeed: number;
  canHitFlying: boolean;
}

export const TOWERS: Record<TowerKind, TowerDef> = {
  pulseLaser: {
    kind: 'pulseLaser',
    name: 'Pulse Laser',
    damageType: 'energy',
    cost: 60, // TODO(balance)
    upgradeBaseCost: 40, // TODO(balance)
    damage: 6, // TODO(balance)
    fireRate: 2.5, // TODO(balance)
    range: 80, // TODO(balance): matches the Place-Valid mock (160 px circle); was 72 before the design build buffer
    projectileSpeed: 420,
    canHitFlying: true,
  },
};
