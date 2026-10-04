import type { ArtifactId } from '../data/artifacts';
import { upgradeCost } from '../data/curves';
import { GAME } from '../data/game';
import { TOWERS, type TowerKind } from '../data/towers';
import type { Tower } from './state';

export function placeCost(kind: TowerKind): number {
  return TOWERS[kind].cost;
}

type Art = Readonly<Partial<Record<ArtifactId, number>>>;

/** Upgrade cost; Field Engineering discounts it. */
export function upgradeCostFor(tower: Tower, art: Art = {}): number {
  const cost = upgradeCost(TOWERS[tower.kind].upgradeBaseCost, tower.level);
  return Math.round(cost * (1 - (art.fieldEngineering ?? 0)));
}

/** Sell refund; Salvage Rights raises it. */
export function sellValue(tower: Tower, art: Art = {}): number {
  return Math.floor(tower.invested * Math.min(1, GAME.sellRefund + (art.salvageRights ?? 0)));
}
