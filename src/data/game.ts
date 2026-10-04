/** Global run tuning. World units = logical px of the 390 × 844 portrait design. */
export const GAME = {
  tickRate: 60,
  /** Cap on sim ticks per rendered frame at 1x, to avoid a spiral of death after a stall. */
  maxTicksPerFrame: 8,

  worldWidth: 390,
  worldHeight: 844,
  /**
   * Towers may not be built below this y even if a map's playArea says otherwise.
   * The in-run control row starts at y 654 (docs/design/screens/in-run/HANDOFF.md), but the
   * delivered maps set playArea.bottom = 720. Remove once the map JSONs are fixed.
   */
  buildAreaMaxBottom: 646,

  baseHp: 20, // GDD §5
  startCredits: 150, // TODO(balance): not in GDD

  waveIntervalSeconds: 20, // GDD §5
  firstWaveDelaySeconds: 8, // TODO(balance): not in GDD
  /** Call-early bonus per remaining second, scaled by the bounty curve. TODO(balance) */
  callEarlyCreditsPerSecond: 1.5,

  gridSize: 16, // GDD §7
  /** Towers occupy 2 × 2 grid cells (HANDOFF.md "Map geometry"). */
  towerFootprint: 32,
  sellRefund: 0.7, // GDD §7
} as const;
