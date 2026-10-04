import {
  ARTIFACT_ORDER,
  ARTIFACT_TUNING,
  artifactValue,
  rerollCost,
  type OwnedArtifact,
} from '../data/artifacts';
import { bounty } from '../data/curves';
import type { Rng } from './rng';
import { refreshAllStats, type ArtifactValues, type SimState } from './state';

export function emptyArtifactValues(): ArtifactValues {
  return Object.fromEntries(ARTIFACT_ORDER.map((id) => [id, 0])) as ArtifactValues;
}

/** Rebuild the effect values from the active artifacts (after a pick or a restore). */
export function recomputeArtifactValues(state: SimState): void {
  const art = emptyArtifactValues();
  for (const a of state.artifacts) art[a.id] += artifactValue(a.id, a.tier);
  state.art = art;
}

/**
 * Draws up to `meta.artifactChoices` distinct artifacts from the crafted pool, skipping ones
 * already active, weighted by tier (rarer tiers show up less often, GDD §9).
 */
export function drawChoices(state: SimState, rng: Rng): OwnedArtifact[] {
  const active = new Set(state.artifacts.map((a) => a.id));
  const candidates = state.meta.artifactPool.filter((a) => !active.has(a.id));
  const picks: OwnedArtifact[] = [];
  const n = Math.min(state.meta.artifactChoices, candidates.length);
  while (picks.length < n) {
    let total = 0;
    for (const c of candidates) total += ARTIFACT_TUNING.tierWeight[c.tier]!;
    let r = rng.next() * total;
    let i = 0;
    for (; i < candidates.length - 1; i++) {
      r -= ARTIFACT_TUNING.tierWeight[candidates[i]!.tier]!;
      if (r < 0) break;
    }
    picks.push({ ...candidates[i]! });
    candidates.splice(i, 1);
  }
  return picks;
}

/** Turns a queued boss kill into an offer (nothing to offer = the pick is skipped). */
export function updateOffers(state: SimState, rng: Rng): void {
  if (state.offer || state.offersQueued <= 0) return;
  state.offersQueued--;
  const choices = drawChoices(state, rng);
  if (choices.length) state.offer = { wave: state.wave, choices };
}

/** Credits the next reroll costs (0 while free rerolls are left). */
export function nextRerollCost(state: SimState): number {
  return state.freeRerolls > 0 ? 0 : rerollCost(state.rerolls);
}

/** Activates the chosen artifact and applies its one-time effects. */
export function takeArtifact(state: SimState, a: OwnedArtifact): void {
  state.artifacts.push({ id: a.id, tier: a.tier });
  recomputeArtifactValues(state);
  const v = artifactValue(a.id, a.tier);
  if (a.id === 'reinforcedHull') {
    const hp = Math.round(v);
    state.maxBaseHp += hp;
    state.baseHp += hp;
  } else if (a.id === 'supplyDrop') {
    const credits = Math.round(bounty(ARTIFACT_TUNING.supplyDropBase * v, state.wave));
    state.credits += credits;
    state.stats.creditsEarned += credits;
  }
  refreshAllStats(state);
}
