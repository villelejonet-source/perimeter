import { GAME } from '../../data/game';
import { TOWERS } from '../../data/towers';
import { placementError, upgradeCostFor, type Sim } from '../../sim';
import { h, setText } from './overlay';
import { TYPE_COLOR, typeFrame } from './specIcons';

type Step = 'place' | 'upgrade' | 'callEarly' | 'types' | 'done';

export interface TutorialActions {
  /** Hold or release the run (step 1 waits for the first tower; the damage tip pauses). */
  setPaused(paused: boolean): void;
  /** Finished or skipped: never show again (Settings can replay it). */
  finish(): void;
}

/** Tower kind step 1 asks for. */
const FIRST_TOWER = 'pulseLaser';
/** Path sample spacing when looking for a good first spot (world px). */
const SAMPLE = 8;

/**
 * First-run tutorial (decided 2026-10-04: short guided steps, skippable). No Claude Design
 * mockup yet; built from the design system. 1) drag a tower onto the glowing spot (the run
 * waits), 2) tap it and upgrade, 3) call a wave early when the field is clear, 4) a one-time tip
 * on shields and armor when the first defended enemy shows up (pauses until dismissed).
 */
export class Tutorial {
  private readonly card: HTMLElement;
  private readonly title: HTMLElement;
  private readonly body: HTMLElement;
  private readonly ok: HTMLButtonElement;
  private readonly ring: HTMLElement;
  private step: Step = 'place';
  private shown: Step | null = null;
  private heldByTutorial = false;
  private readonly spot: { x: number; y: number } | null;

  constructor(
    private readonly root: HTMLElement,
    private readonly sim: Sim,
    private readonly actions: TutorialActions,
  ) {
    this.spot = bestFirstSpot(sim);
    this.ring = h('div', 'coach-ring');
    this.card = h(
      'div',
      'coach',
      `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
         <span class="label" style="color:var(--accent)"></span>
         <button class="coach-skip label muted">Skip tutorial</button>
       </div>
       <div class="coach-body"></div>
       <button class="btn-primary btn-md-text coach-ok" style="height:44px" hidden>Got it</button>`,
    );
    this.card.setAttribute('role', 'dialog');
    this.title = this.card.querySelector('.label')!;
    this.body = this.card.querySelector('.coach-body')!;
    this.ok = this.card.querySelector('.coach-ok')!;
    this.card.querySelector('.coach-skip')!.addEventListener('click', () => this.finish());
    this.ok.addEventListener('click', () => this.advance());
    root.append(this.ring, this.card);
  }

  /** Per frame: move to the next step when its goal is met, keep the highlight on target. */
  update(): void {
    const s = this.sim.state;
    if (this.step === 'done') return;
    const towers = s.towers.items.filter((t) => t.alive);
    switch (this.step) {
      case 'place':
        // Re-hold if something else (the pause menu) resumed the run before the first tower.
        if (!s.paused && towers.length === 0) {
          this.heldByTutorial = false;
          this.hold(true);
        }
        if (towers.length > 0) {
          this.hold(false);
          this.advance();
        }
        break;
      case 'upgrade':
        if (towers.some((t) => t.level >= 2)) this.advance();
        break;
      case 'callEarly':
        // Done once a wave starts after the card went up (called early, or the timer ran out).
        if (this.shown === 'callEarly' && s.wave > this.waveAtCallEarly) this.advance();
        break;
      case 'types':
        break;
    }
    this.render();
  }

  private waveAtCallEarly = 0;

  private advance(): void {
    if (this.step === 'types' && this.heldByTutorial) this.hold(false);
    const order: Step[] = ['place', 'upgrade', 'callEarly', 'types', 'done'];
    this.step = order[order.indexOf(this.step) + 1]!;
    if (this.step === 'done') this.finish();
  }

  private hold(paused: boolean): void {
    if (paused === this.heldByTutorial) return;
    this.heldByTutorial = paused;
    this.actions.setPaused(paused);
  }

  private finish(): void {
    if (this.heldByTutorial) this.hold(false);
    this.step = 'done';
    this.destroy();
    this.actions.finish();
  }

  /** Which step's card is up right now (some wait for their moment). */
  private active(): Step | null {
    const s = this.sim.state;
    switch (this.step) {
      case 'place':
        return 'place';
      case 'upgrade': {
        const t = this.sim.state.towers.items.find((o) => o.alive);
        return t && s.wave >= 1 && s.credits >= upgradeCostFor(t, s.art) ? 'upgrade' : null;
      }
      case 'callEarly': {
        const clear = s.wave >= 1 && s.spawns.length === 0 && s.enemies.countAlive() === 0;
        const time = s.nextWaveIn > GAME.tickRate * 3;
        if (clear && time && this.shown !== 'callEarly') this.waveAtCallEarly = s.wave;
        return (clear && time) || this.shown === 'callEarly' ? 'callEarly' : null;
      }
      case 'types': {
        const defended = s.enemies.items.some((e) => e.alive && (e.maxShield > 0 || e.armor > 0));
        if (defended && this.shown !== 'types') this.hold(true);
        return defended || this.shown === 'types' ? 'types' : null;
      }
      default:
        return null;
    }
  }

  private render(): void {
    const step = this.active();
    if (step !== this.shown) {
      this.shown = step;
      this.card.hidden = step === null;
      this.ok.hidden = step !== 'types';
      this.fill(step);
    }
    this.placeRing(step);
  }

  private fill(step: Step | null): void {
    const n = { place: 1, upgrade: 2, callEarly: 3, types: 4 } as const;
    if (!step || step === 'done') return;
    setText(this.title, `Tutorial · ${n[step]} of 4`);
    const name = TOWERS[FIRST_TOWER].name;
    this.body.innerHTML =
      step === 'place'
        ? `<b>Drag a ${name}</b> from the build bar onto the glowing ring. Enemies walk the path to your base; towers shoot whatever comes into range.`
        : step === 'upgrade'
          ? `You have the Credits: <b>tap your tower</b>, then <b>Upgrade</b>. Kills pay Credits; upgrades make towers hit harder.`
          : step === 'callEarly'
            ? `Field clear. <b>Call the next wave early</b> for bonus Credits. The sooner you call, the bigger the bonus.`
            : `<span style="display:flex;flex-direction:column;gap:8px">
                 <span>Some enemies are defended. Mix damage types:</span>
                 <span style="display:flex;align-items:center;gap:8px">${typeFrame('energy', 18)}<span><b style="color:${TYPE_COLOR.energy}">Energy</b> tears through <b>shields</b> (blue bubble).</span></span>
                 <span style="display:flex;align-items:center;gap:8px">${typeFrame('kinetic', 18)}<span><b style="color:${TYPE_COLOR.kinetic}">Kinetic</b> punches through <b>armor</b> (plating).</span></span>
               </span>`;
    this.card.style.top = step === 'types' ? '220px' : '104px';
  }

  /** Highlight ring on the step's target (spot, tower, button), in logical px. */
  private placeRing(step: Step | null): void {
    let r: { x: number; y: number; w: number; h: number; round: boolean } | null = null;
    if (step === 'place' && this.spot) {
      const d = TOWERS[FIRST_TOWER].range * 2;
      r = { x: this.spot.x - d / 2, y: this.spot.y - d / 2, w: d, h: d, round: true };
      const slot = this.find(`.slot[data-kind="${FIRST_TOWER}"]`);
      if (slot) this.slotRing(slot);
    } else {
      this.root.querySelector('.coach-slot')?.remove();
      if (step === 'upgrade') {
        const t = this.sim.state.towers.items.find((o) => o.alive);
        const panelOpen = this.find('.panel:not([hidden])');
        const btn = panelOpen ? this.find('.panel .upgrade-btn') : null;
        if (btn) r = { ...btn, round: false };
        else if (t) r = { x: t.x - 26, y: t.y - 26, w: 52, h: 52, round: true };
      } else if (step === 'callEarly') {
        const b = this.find('.call-early');
        if (b) r = { ...b, round: false };
      }
    }
    this.ring.hidden = r === null;
    if (r) {
      this.ring.classList.toggle('round', r.round);
      this.ring.style.cssText = `left:${r.x - 4}px;top:${r.y - 4}px;width:${r.w + 8}px;height:${r.h + 8}px`;
    }
  }

  private slotRing(slot: { x: number; y: number; w: number; h: number }): void {
    let el = this.root.querySelector<HTMLElement>('.coach-slot');
    if (!el) {
      el = h('div', 'coach-ring coach-slot');
      this.root.appendChild(el);
    }
    el.style.cssText = `left:${slot.x - 4}px;top:${slot.y - 4}px;width:${slot.w + 8}px;height:${slot.h + 8}px`;
  }

  /** Element rect in the overlay's logical px. */
  private find(sel: string): { x: number; y: number; w: number; h: number } | null {
    const el = this.root.querySelector<HTMLElement>(sel);
    if (!el || el.offsetParent === null) return null;
    const root = this.root.getBoundingClientRect();
    const k = root.width / GAME.worldWidth || 1;
    const b = el.getBoundingClientRect();
    return {
      x: (b.left - root.left) / k,
      y: (b.top - root.top) / k,
      w: b.width / k,
      h: b.height / k,
    };
  }

  destroy(): void {
    this.card.remove();
    this.ring.remove();
    this.root.querySelector('.coach-slot')?.remove();
  }
}

/** A valid first-tower spot that covers the most path (screen px = world px at scroll 0). */
function bestFirstSpot(sim: Sim): { x: number; y: number } | null {
  const range = TOWERS[FIRST_TOWER].range;
  const pts: { x: number; y: number }[] = [];
  for (let d = 0; d < sim.path.length; d += SAMPLE)
    pts.push(sim.path.positionAt(d, { x: 0, y: 0 }));
  let best: { x: number; y: number } | null = null;
  let bestN = 0;
  const g = GAME.towerFootprint;
  for (let y = sim.map.playArea.top + g; y < GAME.buildAreaMaxBottom; y += g / 2) {
    for (let x = g; x < GAME.worldWidth - g / 2; x += g / 2) {
      if (placementError(sim.state, sim.path, sim.map, x, y) !== null) continue;
      let n = 0;
      for (const p of pts) if ((p.x - x) ** 2 + (p.y - y) ** 2 <= range * range) n++;
      if (n > bestN) {
        bestN = n;
        best = { x, y };
      }
    }
  }
  return best;
}
