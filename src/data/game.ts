/** Global run tuning. World units are ~iOS points (portrait 360 x 780). */
export const GAME = {
  tickRate: 60,
  /** Cap on sim ticks per rendered frame at 1x, to avoid a spiral of death after a stall. */
  maxTicksPerFrame: 8,

  worldWidth: 360,
  worldHeight: 780,
  /** Vertical band where towers may be placed (HUD + notch above, control bar below). */
  playfieldTop: 84,
  playfieldBottom: 676,

  baseHp: 20, // GDD §5
  startCredits: 150, // TODO(balance): not in GDD

  waveIntervalSeconds: 20, // GDD §5
  firstWaveDelaySeconds: 8, // TODO(balance): not in GDD
  /** Call-early bonus per remaining second, scaled by the bounty curve. TODO(balance) */
  callEarlyCreditsPerSecond: 1.5,

  gridSize: 16, // GDD §7
  sellRefund: 0.7, // GDD §7
  /** Tower centres must be at least this far from the path centreline. */
  pathBuffer: 22,
  /** Tower footprint radius, for overlap checks. */
  towerRadius: 12,
} as const;
