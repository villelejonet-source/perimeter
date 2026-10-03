/** Scaling curves, GDD §5. Wave numbers start at 1. */
export const CURVES = {
  enemyHpGrowth: 1.08, // tune 1.07–1.10
  bountyGrowth: 1.045,
  upgradeCostGrowth: 1.18,
  /** Per-level tower damage multiplier. TODO(balance): not in GDD */
  towerDamageGrowth: 1.15,
  /** Enemies per wave: base + perWave * w. TODO(balance) */
  waveCountBase: 6,
  waveCountPerWave: 0.6,
  waveCountMax: 40,
  /** Seconds between spawns inside a wave. TODO(balance) */
  spawnSpacingSeconds: 0.8,
} as const;

export function enemyHp(baseHp: number, wave: number): number {
  return baseHp * CURVES.enemyHpGrowth ** wave;
}

export function bounty(baseBounty: number, wave: number): number {
  return Math.max(1, Math.round(baseBounty * CURVES.bountyGrowth ** wave));
}

/** Cost to upgrade from `level` to `level + 1`. */
export function upgradeCost(baseCost: number, level: number): number {
  return Math.round(baseCost * CURVES.upgradeCostGrowth ** level);
}

export function towerDamage(baseDamage: number, level: number): number {
  return baseDamage * CURVES.towerDamageGrowth ** (level - 1);
}

export function waveEnemyCount(wave: number): number {
  return Math.min(
    CURVES.waveCountMax,
    Math.floor(CURVES.waveCountBase + CURVES.waveCountPerWave * wave),
  );
}

export function callEarlyBonus(remainingSeconds: number, perSecond: number, wave: number): number {
  return Math.floor(remainingSeconds * perSecond * CURVES.bountyGrowth ** wave);
}
