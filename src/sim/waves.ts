import { CURVES, bounty, callEarlyBonus, enemyHp, waveEnemyCount } from '../data/curves';
import { ENEMIES } from '../data/enemies';
import { GAME } from '../data/game';
import type { Path } from './path';
import type { SimState } from './state';

const spawnSpacingTicks = Math.round(CURVES.spawnSpacingSeconds * GAME.tickRate);
const waveIntervalTicks = Math.round(GAME.waveIntervalSeconds * GAME.tickRate);

export function startWave(state: SimState): void {
  state.wave++;
  state.nextWaveIn = waveIntervalTicks;
  state.spawns.push({ wave: state.wave, remaining: waveEnemyCount(state.wave), cooldown: 0 });
}

/** Start the next wave now, paying a bonus proportional to the remaining timer. */
export function callEarly(state: SimState): void {
  const remainingSeconds = state.nextWaveIn / GAME.tickRate;
  const bonus = callEarlyBonus(remainingSeconds, GAME.callEarlyCreditsPerSecond, state.wave + 1);
  state.credits += bonus;
  state.stats.creditsEarned += bonus;
  startWave(state);
}

export function updateWaves(state: SimState, path: Path): void {
  state.nextWaveIn--;
  if (state.nextWaveIn <= 0) startWave(state);

  for (let i = state.spawns.length - 1; i >= 0; i--) {
    const group = state.spawns[i]!;
    group.cooldown--;
    if (group.cooldown > 0) continue;
    spawnEnemy(state, path, group.wave);
    group.remaining--;
    group.cooldown = spawnSpacingTicks;
    if (group.remaining <= 0) state.spawns.splice(i, 1);
  }
}

function spawnEnemy(state: SimState, path: Path, wave: number): void {
  const def = ENEMIES.drone; // Phase 3: wave composition generator picks the kind.
  const e = state.enemies.acquire();
  e.id = state.nextId++;
  e.kind = def.kind;
  e.dist = 0;
  e.maxHp = enemyHp(def.baseHp, wave);
  e.hp = e.maxHp;
  e.speed = def.speed;
  e.bounty = bounty(def.baseBounty, wave);
  e.radius = def.radius;
  e.flying = def.flying;
  e.leakDamage = def.leakDamage;
  path.positionAt(0, e);
}
