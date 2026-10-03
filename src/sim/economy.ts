import { upgradeCost } from '../data/curves';
import { GAME } from '../data/game';
import { TOWERS, type TowerKind } from '../data/towers';
import type { Tower } from './state';

export function placeCost(kind: TowerKind): number {
  return TOWERS[kind].cost;
}

export function upgradeCostFor(tower: Tower): number {
  return upgradeCost(TOWERS[tower.kind].upgradeBaseCost, tower.level);
}

export function sellValue(tower: Tower): number {
  return Math.floor(tower.invested * GAME.sellRefund);
}
