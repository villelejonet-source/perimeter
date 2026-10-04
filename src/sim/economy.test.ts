import { describe, expect, it } from 'vitest';
import { upgradeCost } from '../data/curves';
import { GAME } from '../data/game';
import { TOWERS } from '../data/towers';
import { sellValue, upgradeCostFor } from './economy';
import { buildAreaBottom, placementError, snapToGrid } from './placement';
import { Sim } from './sim';
import { freezeWaves, spotNear } from './testUtils';

function setup() {
  const sim = new Sim({ seed: 1 });
  freezeWaves(sim);
  return sim;
}

describe('economy and placement', () => {
  it('placing a tower costs Credits and snaps to the grid', () => {
    const sim = setup();
    const spot = spotNear(sim, 150);
    sim.enqueue({ type: 'placeTower', kind: 'pulseLaser', x: spot.x + 3, y: spot.y - 2 });
    sim.step();
    const t = sim.state.towers.items.find((x) => x.alive)!;
    expect(sim.state.credits).toBe(GAME.startCredits - TOWERS.pulseLaser.cost);
    expect(t.x).toBe(snapToGrid(spot.x + 3));
    // 2 × 2 footprint: centre on a grid intersection.
    expect(t.x % GAME.gridSize).toBe(0);
    expect(t.y % GAME.gridSize).toBe(0);
  });

  it('rejects placement without enough Credits', () => {
    const sim = setup();
    sim.state.credits = TOWERS.pulseLaser.cost - 1;
    sim.enqueue({ type: 'placeTower', kind: 'pulseLaser', ...spotNear(sim, 150) });
    sim.step();
    expect(sim.state.towers.countAlive()).toBe(0);
    expect(sim.state.lastRejection).toBe('credits');
  });

  it('rejects placement in the no-build buffer beside the path', () => {
    const sim = setup();
    const p = sim.path.positionAt(sim.path.length / 2, { x: 0, y: 0 });
    // Footprint edge 8 units outside the path band: inside the 16-unit buffer.
    const half = GAME.towerFootprint / 2;
    const offset = sim.map.pathWidth / 2 + 8 + half;
    let rejected: string | null = null;
    for (const [dx, dy] of [
      [0, offset],
      [0, -offset],
      [offset, 0],
      [-offset, 0],
    ] as const) {
      const x = snapToGrid(p.x + dx);
      const y = snapToGrid(p.y + dy);
      const err = placementError(sim.state, sim.path, sim.map, x, y);
      if (err === 'nearPath') rejected = err;
    }
    expect(rejected).toBe('nearPath');
  });

  it('never allows building under the control row', () => {
    const sim = setup();
    expect(buildAreaBottom(sim.map)).toBeLessThanOrEqual(GAME.buildAreaMaxBottom);
    expect(placementError(sim.state, sim.path, sim.map, 48, 704)).toBe('outOfBounds');
  });

  it('rejects placement on the path, overlapping, or out of bounds', () => {
    const sim = setup();
    sim.state.credits = 10_000;
    const onPath = sim.path.positionAt(200, { x: 0, y: 0 });
    sim.enqueue({ type: 'placeTower', kind: 'pulseLaser', ...onPath });
    sim.step();
    expect(sim.state.lastRejection).toBe('onPath');

    const spot = spotNear(sim, 150);
    sim.enqueue({ type: 'placeTower', kind: 'pulseLaser', ...spot });
    sim.enqueue({ type: 'placeTower', kind: 'pulseLaser', ...spot });
    sim.step();
    expect(sim.state.lastRejection).toBe('overlap');
    expect(sim.state.towers.countAlive()).toBe(1);

    sim.enqueue({ type: 'placeTower', kind: 'pulseLaser', x: -50, y: 300 });
    sim.step();
    expect(sim.state.lastRejection).toBe('outOfBounds');
  });

  it('upgrades follow baseCost × 1.18^level', () => {
    const sim = setup();
    sim.state.credits = 10_000;
    sim.enqueue({ type: 'placeTower', kind: 'pulseLaser', ...spotNear(sim, 150) });
    sim.step();
    const t = sim.state.towers.items.find((x) => x.alive)!;
    for (let lvl = 1; lvl <= 5; lvl++) {
      const cost = upgradeCostFor(t);
      expect(cost).toBe(upgradeCost(TOWERS.pulseLaser.upgradeBaseCost, lvl));
      const before = sim.state.credits;
      sim.enqueue({ type: 'upgradeTower', towerId: t.id });
      sim.step();
      expect(sim.state.credits).toBe(before - cost);
      expect(t.level).toBe(lvl + 1);
    }
  });

  it('selling refunds 70% of everything invested', () => {
    const sim = setup();
    sim.state.credits = 10_000;
    sim.enqueue({ type: 'placeTower', kind: 'pulseLaser', ...spotNear(sim, 150) });
    sim.step();
    const t = sim.state.towers.items.find((x) => x.alive)!;
    sim.enqueue({ type: 'upgradeTower', towerId: t.id });
    sim.step();
    const invested = TOWERS.pulseLaser.cost + upgradeCost(TOWERS.pulseLaser.upgradeBaseCost, 1);
    expect(sellValue(t)).toBe(Math.floor(invested * 0.7));
    const before = sim.state.credits;
    sim.enqueue({ type: 'sellTower', towerId: t.id });
    sim.step();
    expect(sim.state.towers.countAlive()).toBe(0);
    expect(sim.state.credits).toBe(before + Math.floor(invested * 0.7));
  });

  it('sets targeting mode and pauses', () => {
    const sim = setup();
    sim.enqueue({ type: 'placeTower', kind: 'pulseLaser', ...spotNear(sim, 150) });
    sim.step();
    const t = sim.state.towers.items.find((x) => x.alive)!;
    sim.enqueue({ type: 'setTargeting', towerId: t.id, mode: 'strongest' });
    sim.enqueue({ type: 'setPaused', paused: true });
    sim.step();
    expect(t.targeting).toBe('strongest');
    const tick = sim.state.tick;
    sim.step();
    expect(sim.state.tick).toBe(tick);
    sim.enqueue({ type: 'setPaused', paused: false });
    sim.step();
    expect(sim.state.tick).toBe(tick + 1);
  });
});
