import { ARTIFACTS, artifactValue, rerollCost, type OwnedArtifact } from '../../data/artifacts';
import { nextRerollCost } from '../../sim/artifacts';
import type { ArtifactOffer, SimState } from '../../sim/state';
import { artifactIcon, tierFrame, tierPips } from './artifactArt';
import { C, icon } from './icons';
import { fmt, h, setText } from './overlay';

export interface ArtifactPickActions {
  take(index: number): void;
  reroll(): void;
}

/**
 * Post-boss artifact pick (meta/ArtifactPick.dc.html): 3 (or 4) cards framed by tier, select
 * one, then TAKE. Reroll costs Credits and the next price is shown. The run is paused while
 * it's open; there's no skip.
 */
export class ArtifactPick {
  private readonly el: HTMLElement;
  private readonly cards: HTMLElement;
  private readonly takeBtn: HTMLButtonElement;
  private readonly rerollBtn: HTMLButtonElement;
  private readonly rerollCostEl: HTMLElement;
  private readonly nextEl: HTMLElement;
  private offer: ArtifactOffer | null = null;
  private selected = -1;

  constructor(
    parent: HTMLElement,
    private readonly state: SimState,
    private readonly actions: ArtifactPickActions,
  ) {
    this.el = h('section', 'art-pick');
    this.el.setAttribute('aria-label', 'Artifact pick');
    const col = h('div', 'col');
    const locked =
      state.meta.artifactChoices < 4
        ? `<div class="locked-choice">${icon.lock(16, C.inkMuted, 2)}<span class="caption">4th choice · unlock in Research Lab</span></div>`
        : '';
    col.innerHTML = `
      <div class="art-head">
        <span class="chip-boss">${icon.checkCircle(18)}<span class="label">Boss down · Wave ${state.offer?.wave ?? state.wave}</span></span>
        <h1 class="d title-lg" style="text-align:center">Choose an artifact</h1>
        <span class="caption muted">Active for the rest of this run · Artifact ${state.artifacts.length + 1} of run</span>
      </div>
      <div class="art-cards"></div>
      ${locked}
      <div class="art-actions">
        <div class="reroll-col">
          <button class="btn-secondary reroll" style="width:132px;height:56px"><span class="inner" style="gap:8px">
            <svg class="icon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" style="fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round"><path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v5h-5"/></svg>
            <span style="display:flex;flex-direction:column;align-items:flex-start"><span class="btn-md-text" style="line-height:18px">Reroll</span><span class="reroll-cost d"></span></span>
          </span></button>
          <span class="caption muted next-reroll"></span>
        </div>
        <button class="btn-primary btn-lg-text take" style="flex:1;height:56px" disabled>Pick one</button>
      </div>`;
    this.el.appendChild(col);
    this.cards = col.querySelector('.art-cards')!;
    this.takeBtn = col.querySelector('.take')!;
    this.rerollBtn = col.querySelector('.reroll')!;
    this.rerollCostEl = col.querySelector('.reroll-cost')!;
    this.nextEl = col.querySelector('.next-reroll')!;
    this.cards.addEventListener('click', (e) => {
      const card = (e.target as HTMLElement).closest<HTMLElement>('[data-i]');
      if (card) this.select(Number(card.dataset.i));
    });
    this.takeBtn.addEventListener('click', () => {
      if (this.selected >= 0) this.actions.take(this.selected);
    });
    this.rerollBtn.addEventListener('click', () => this.actions.reroll());
    parent.appendChild(this.el);
    parent.classList.add('picking');
    this.update();
  }

  /** Per frame: redraw after a reroll, keep the reroll price and affordability current. */
  update(): void {
    const s = this.state;
    if (s.offer && s.offer !== this.offer) {
      this.offer = s.offer;
      this.renderCards(s.offer.choices);
    }
    const cost = nextRerollCost(s);
    const next = s.freeRerolls > 1 ? 0 : rerollCost(s.freeRerolls > 0 ? s.rerolls : s.rerolls + 1);
    const afford = s.credits >= cost;
    this.rerollBtn.disabled = !afford;
    const costHtml = cost
      ? `${icon.coin(14, afford ? C.credits : C.inkFaint)}${fmt.int(cost)}`
      : '<span class="label" style="color:var(--accent)">Free</span>';
    if (this.rerollCostEl.dataset.v !== `${cost}|${afford}`) {
      this.rerollCostEl.dataset.v = `${cost}|${afford}`;
      this.rerollCostEl.innerHTML = costHtml;
    }
    setText(
      this.nextEl,
      afford
        ? `Next reroll ${next ? fmt.int(next) : 'free'}`
        : `Need ${fmt.int(cost - s.credits)} more`,
    );
    this.rerollBtn.setAttribute(
      'aria-label',
      cost ? `Reroll for ${cost} Credits` : 'Reroll for free',
    );
  }

  private renderCards(choices: OwnedArtifact[]): void {
    this.selected = -1;
    this.takeBtn.disabled = true;
    this.takeBtn.textContent = 'Pick one';
    this.cards.innerHTML = choices
      .map((c, i) => {
        const def = ARTIFACTS[c.id];
        const body = `${artifactIcon(c.id, c.tier)}
          <span style="display:flex;flex-direction:column;gap:4px;min-width:0">
            <span class="name">${def.name}</span>
            ${tierPips(c.tier)}
            <span class="desc">${def.describe(artifactValue(c.id, c.tier))}</span>
          </span>`;
        return `<div class="art-card glow${c.tier}" data-i="${i}"><button aria-pressed="false" aria-label="${def.name}, ${def.describe(artifactValue(c.id, c.tier))}">${tierFrame(c.tier, body, 'art-body')}</button></div>`;
      })
      .join('');
  }

  private select(i: number): void {
    const c = this.offer?.choices[i];
    if (!c) return;
    this.selected = i;
    for (const card of this.cards.querySelectorAll<HTMLElement>('[data-i]')) {
      const on = Number(card.dataset.i) === i;
      card.classList.toggle('selected', on);
      card.querySelector('button')!.setAttribute('aria-pressed', String(on));
      card.querySelector('.check-badge')?.remove();
      if (on) {
        card.insertAdjacentHTML(
          'beforeend',
          `<span class="check-badge"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" style="fill:none;stroke:${C.onAccent};stroke-width:3;stroke-linecap:round;stroke-linejoin:round"><path d="M5 12.5l4.5 4.5L19 7"/></svg></span>`,
        );
      }
    }
    this.takeBtn.disabled = false;
    this.takeBtn.textContent = `Take ${ARTIFACTS[c.id].name}`;
  }

  destroy(): void {
    this.el.parentElement?.classList.remove('picking');
    this.el.remove();
  }
}
