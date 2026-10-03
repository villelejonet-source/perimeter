import { describe, expect, it } from 'vitest';
import { upgradeCost } from '../data/curves';
import { GAME } from '../data/game';
import { TOWERS } from '../data/towers';
import { sellValue, upgradeCostFor } from './economy';
import { snapToGrid } from './placement';
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
    expect(t.x % GAME.gridSize).toBe(GAME.gridSize / 2);
  });

  it('rejects placement without enough Credits', () => {
    const sim = setup();
    sim.state.credits = TOWERS.pulseLaser.cost - 1;
    sim.enqueue({ type: 'placeTower', kind: 'pulseLaser', ...spotNear(sim, 150) });
    sim.step();
    expect(sim.state.towers.countAlive()).toBe(0);
    expect(sim.state.lastRejection).toBe('credits');
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
