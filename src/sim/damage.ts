import { DAMAGE, type DamageType } from '../data/damage';
import { SPEC_TUNING } from '../data/specs';
import type { TowerKind } from '../data/towers';
import { SHIELD_REGEN_DELAY_TICKS, spawnEnemy } from './enemies';
import type { Path } from './path';
import { NO_MODS, type HitMods } from './specs';
import type { Enemy, SimState } from './state';

const BRITTLE_ARMOR = 1 - SPEC_TUNING.brittle.armorLoss;

/**
 * Applies one hit (GDD §6, order decided 2026-10-04): the shield absorbs first with its
 * type multiplier, then armor reduces what reaches the hull (flat, with a 10% floor).
 * Frozen enemies take +50% kinetic. `mods` carries specialization effects (boss bonus, EMP
 * shield break, execute, stun). Returns the damage actually dealt.
 */
export function applyHit(
  state: SimState,
  path: Path,
  e: Enemy,
  amount: number,
  type: DamageType,
  source: TowerKind,
  mods: Readonly<HitMods> = NO_MODS,
): number {
  if (!e.alive || amount <= 0 || type === 'utility') return 0;
  let dmg = amount;
  if (e.boss) dmg *= 1 + mods.bossBonus;
  if (e.frozen > 0 && type === 'kinetic') dmg *= DAMAGE.frozenKineticBonus;

  let dealt = 0;
  if (e.shield > 0) {
    const mult = DAMAGE.vsShield[type] * mods.shieldMult;
    const absorbed = dmg * mult;
    if (absorbed <= e.shield) {
      e.shield -= absorbed;
      dealt += absorbed;
      dmg = 0;
    } else {
      dealt += e.shield;
      dmg -= e.shield / mult;
      e.shield = 0;
    }
  }
  if (e.maxShield > 0) e.shieldDelay = SHIELD_REGEN_DELAY_TICKS;

  if (dmg > 0) {
    const armor = e.brittle > 0 ? e.armor * BRITTLE_ARMOR : e.armor;
    const through = Math.max(dmg - armor, dmg * DAMAGE.armorFloor);
    const hull = Math.min(e.hp, through);
    e.hp -= hull;
    dealt += hull;
  }
  // Executioner: finish off non-bosses left below the threshold.
  if (mods.execute > 0 && !e.boss && e.hp > 0 && e.hp < e.maxHp * mods.execute) {
    dealt += e.hp;
    e.hp = 0;
  }
  if (mods.stunTicks > 0 && !e.boss && e.hp > 0) e.stunned = Math.max(e.stunned, mods.stunTicks);

  const stats = state.stats;
  stats.damageDealt += dealt;
  stats.damageByType[type] += dealt;
  stats.damageByTower[source] = (stats.damageByTower[source] ?? 0) + dealt;
  if (e.hp <= 0) kill(state, path, e);
  return dealt;
}

function kill(state: SimState, path: Path, e: Enemy): void {
  e.alive = false;
  state.credits += e.bounty;
  state.stats.creditsEarned += e.bounty;
  state.stats.kills++;
  if (e.splitKind) {
    // Copy first: the dead splitter's pool slot is reused by its first child.
    const kind = e.splitKind;
    const count = e.splitCount;
    const dist = e.dist;
    const wave = e.wave;
    // Children spread around where it died.
    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) / 2) * 6;
      spawnEnemy(state, path, kind, wave, false, Math.max(0, dist + offset));
    }
  }
}
