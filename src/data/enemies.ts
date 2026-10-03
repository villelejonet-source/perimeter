export type EnemyKind = 'drone';

export interface EnemyDef {
  kind: EnemyKind;
  name: string;
  baseHp: number;
  /** World units per second along the path. */
  speed: number;
  baseBounty: number;
  radius: number;
  flying: boolean;
  /** Base HP lost on leak (GDD §5: normal 1, elite 3). */
  leakDamage: number;
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  drone: {
    kind: 'drone',
    name: 'Drone',
    baseHp: 18, // TODO(balance)
    speed: 36, // TODO(balance)
    baseBounty: 4, // TODO(balance)
    radius: 7,
    flying: false,
    leakDamage: 1,
  },
};
