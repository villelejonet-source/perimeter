import type { DamageType } from '../../data/damage';
import { SPECS, TOWER_SPECS, type SpecDef, type SpecId } from '../../data/specs';
import { TOWERS, type TowerKind } from '../../data/towers';
import type { SimState } from '../../sim';
import { icon, C } from './icons';
import { fmt, h } from './overlay';
import { specIcon, TYPE_COLOR, TYPE_LABEL, typeFrame } from './specIcons';

export interface SpecPickerActions {
  pick(spec: SpecId): void;
  later(): void;
}

/**
 * Specialization pick at level 5 (meta/Specialization.dc.html): 3 cards, select one, then
 * LOCK IN. The run is paused while it's open; LATER closes it without choosing.
 */
export class SpecPicker {
  private readonly el: HTMLElement;
  private selected: SpecId | null = null;
  private readonly cards = new Map<SpecId, HTMLButtonElement>();
  private readonly lockIn: HTMLButtonElement;

  /** `current` set = Dual Spec: pick a second spec other than this one. */
  constructor(
    parent: HTMLElement,
    kind: TowerKind,
    state: SimState,
    actions: SpecPickerActions,
    current: SpecId | null = null,
  ) {
    const def = TOWERS[kind];
    this.el = h('section', 'spec-pick');
    this.el.setAttribute('aria-label', 'Specialization pick');
    const col = h('div', 'col');

    const baseFrac = Math.max(0, state.baseHp / state.maxBaseHp);
    col.append(
      h(
        'div',
        'spec-hud',
        `<div style="display:flex;flex-direction:column"><span class="label muted">Wave</span><span class="d" style="font-size:20px;line-height:24px;font-weight:700">${state.wave}</span></div>
         <div style="display:flex;flex-direction:column;gap:4px;width:110px"><span class="label muted">Base ${state.baseHp} / ${state.maxBaseHp}</span><span class="base-bar"><span style="width:${Math.round(baseFrac * 100)}%"></span></span></div>
         <div style="display:flex;align-items:center;gap:4px">${icon.coin(20)}<span class="d" style="font-size:20px;line-height:24px;font-weight:700">${fmt.int(state.credits)}</span></div>
         <span class="label paused">Paused</span>`,
      ),
      h(
        'div',
        '',
        `<div style="display:flex;align-items:center;gap:12px">${typeFrame(def.damageType, 48)}
           <div style="display:flex;flex-direction:column">
             <span class="label" style="color:var(--accent)">${current ? `Dual Spec · ${def.name} · ${SPECS[current].name}` : `${def.name} reached level 5`}</span>
             <h1 class="d" style="margin:0;font-size:28px;line-height:32px;font-weight:700;letter-spacing:.04em;text-transform:uppercase">${current ? 'Second path' : 'Specialize'}</h1>
             <span class="caption muted">${current ? 'Both specializations apply. Locked until the run ends.' : 'Pick one. Locked for this tower until the run ends.'}</span>
           </div></div>`,
      ),
    );

    const cards = h('div', 'spec-cards');
    for (const id of TOWER_SPECS[kind]) {
      if (id !== current) cards.appendChild(this.card(SPECS[id], def.damageType));
    }
    col.appendChild(cards);

    const actionsEl = h('div', 'spec-actions');
    const later = h('button', 'btn-secondary', '<span class="inner btn-md-text">Later</span>');
    later.style.cssText = 'width:112px;height:56px;flex:none';
    later.addEventListener('click', () => actions.later());
    this.lockIn = h('button', 'btn-primary btn-lg-text', 'Pick one');
    this.lockIn.style.cssText = 'flex:1;height:56px';
    this.lockIn.disabled = true;
    this.lockIn.addEventListener('click', () => {
      if (this.selected) actions.pick(this.selected);
    });
    actionsEl.append(later, this.lockIn);
    col.appendChild(actionsEl);

    this.el.appendChild(col);
    parent.appendChild(this.el);
    parent.classList.add('picking');
  }

  private card(spec: SpecDef, towerType: DamageType): HTMLButtonElement {
    const type = spec.damageType ?? towerType;
    const b = h('button', 'spec-card');
    b.setAttribute('aria-pressed', 'false');
    const typeChip = `<span style="display:flex;align-items:center;gap:4px">${typeFrame(type)}<span class="label" style="color:${TYPE_COLOR[type]}">${TYPE_LABEL[type]}</span></span>`;
    const changes = spec.damageType && spec.damageType !== towerType;
    const header = changes
      ? `<span class="type-change">
           <span class="label" style="flex:1">Damage type changes</span>
           <span style="display:flex;align-items:center;gap:4px">${typeFrame(towerType, 18)}<span class="label" style="color:${TYPE_COLOR[towerType]};text-decoration:line-through">${TYPE_LABEL[towerType]}</span></span>
           <svg class="icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" style="fill:none;stroke:${C.ink};stroke-width:2;stroke-linecap:round;stroke-linejoin:round"><path d="M4 12h15M14 7l5 5-5 5"/></svg>
           <span class="type-chip" style="background:${TYPE_COLOR[type]}">${typeFrame(type, 16, C.onAccent)}<span class="label">${TYPE_LABEL[type]}</span></span>
         </span>`
      : '';
    const extra = changes
      ? `<span class="caption muted">${spec.shapeNote ?? ''}</span>
         <span style="display:flex;flex-wrap:wrap;gap:6px">
           ${spec.strongVs ? `<span class="tag"><span class="label">Now strong vs ${spec.strongVs}</span></span>` : ''}
           ${spec.loses ? `<span class="tag"><span class="label muted">Loses ${spec.loses}</span></span>` : ''}
         </span>`
      : `<span class="d stat">${spec.statLine}</span>`;
    b.innerHTML = `<span class="inner">${header}
      <span class="body">${specIcon(spec.id, type)}
        <span style="display:flex;flex-direction:column;gap:${changes ? 6 : 4}px">
          <span style="display:flex;align-items:center;justify-content:space-between;gap:8px"><span class="name">${spec.name}</span>${changes ? '' : typeChip}</span>
          <span class="desc">${spec.description}</span>
          ${extra}
        </span>
      </span></span>`;
    b.addEventListener('click', () => this.select(spec.id));
    this.cards.set(spec.id, b);
    return b;
  }

  private select(id: SpecId): void {
    this.selected = id;
    for (const [sid, card] of this.cards) {
      const on = sid === id;
      card.setAttribute('aria-pressed', String(on));
      card.querySelector('.check-badge')?.remove();
      if (on) {
        card.insertAdjacentHTML(
          'beforeend',
          `<span class="check-badge"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" style="fill:none;stroke:${C.onAccent};stroke-width:3;stroke-linecap:round;stroke-linejoin:round"><path d="M5 12.5l4.5 4.5L19 7"/></svg></span>`,
        );
      }
    }
    this.lockIn.disabled = false;
    this.lockIn.textContent = `Lock in ${SPECS[id].name}`;
  }

  destroy(): void {
    this.el.parentElement?.classList.remove('picking');
    this.el.remove();
  }
}
