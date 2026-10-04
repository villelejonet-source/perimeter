import {
  RESEARCH,
  RESEARCH_BY_ID,
  researchCost,
  type ResearchDef,
  type ResearchGroup,
} from '../../../data/research';
import { TOWER_ORDER, TOWERS, type TowerKind } from '../../../data/towers';
import type { MetaStore } from '../../../meta/store';
import { buyBlock, researchLevel, unlockedTowers } from '../../../meta/research';
import { towerFrames } from '../../../render/unitArt';
import { unitSvgUri } from '../../../render/units';
import { icon, C } from '../icons';
import { fmt, h } from '../overlay';
import { TYPE_COLOR, TYPE_LABEL, typeFrame } from '../specIcons';

const TABS: { id: ResearchGroup; label: string }[] = [
  { id: 'towers', label: 'Towers' },
  { id: 'base', label: 'Base' },
  { id: 'unlocks', label: 'Unlocks' },
];

/** Later-phase systems listed on the Unlocks tab (ResearchUnlocks.dc.html), not buyable yet. */
const COMING: { name: string; note: string }[] = [];

/** Sub-line for the non-tower unlocks. */
const SYSTEM_NOTE: Partial<Record<ResearchDef['id'], string>> = {
  speed3x: 'Adds 3x to the speed toggle',
  artifactChoice4: 'Artifact picks offer 4 instead of 3',
  freeReroll: 'One free artifact reroll per run',
  'unlock.map2': 'New sector: a long switchback path',
  'unlock.map3': 'New sector: a tight spiral to the core',
};

/**
 * Research Lab (meta/ResearchTowers, ResearchBase, ResearchUnlocks .dc.html). Rows show
 * level, progress, now → next, and a buy button: outlined when affordable, hatched with the
 * reason when not, a check when maxed. Re-renders after each purchase.
 */
export class ResearchLab {
  readonly el: HTMLElement;
  private tab: ResearchGroup = 'towers';
  private tower: TowerKind = 'pulseLaser';
  private readonly body: HTMLElement;
  private readonly tabbar: HTMLElement;

  constructor(
    parent: HTMLElement,
    private readonly store: MetaStore,
    private readonly onBack: () => void,
  ) {
    this.el = h('section', 'screen');
    this.body = h('div', 'lab-body');
    this.tabbar = h('div', 'tabbar');
    this.el.append(this.body, this.tabbar);
    this.el.addEventListener('click', (e) => this.onClick(e));
    parent.appendChild(this.el);
    this.render();
  }

  destroy(): void {
    this.el.remove();
  }

  private onClick(e: MouseEvent): void {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!target || (target as HTMLButtonElement).disabled) return;
    const [act, arg] = (target.dataset.act ?? '').split(':');
    if (act === 'back') this.onBack();
    else if (act === 'tab') this.tab = arg as ResearchGroup;
    else if (act === 'tower') this.tower = arg as TowerKind;
    else if (act === 'buy') this.store.buy(arg as ResearchDef['id']);
    this.render();
  }

  private render(): void {
    const p = this.store.profile;
    const scrollTop = this.body.scrollTop;
    const header = `<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
        <div style="display:flex;align-items:center;gap:10px">
          <button class="btn-sq" data-act="back" aria-label="Back to menu"><span class="inner">${icon.back()}</span></button>
          <div style="display:flex;flex-direction:column"><h1 class="d title-lg">Research Lab</h1>
          <span class="caption muted">${this.tab === 'unlocks' ? 'One-time unlocks.' : 'Permanent. Kept between runs.'}</span></div>
        </div>
        <div class="chip-cur">${icon.cores()}<span class="d">${fmt.int(p.cores)}</span></div>
      </div>`;
    this.body.innerHTML =
      header +
      (this.tab === 'towers'
        ? this.towersTab()
        : this.tab === 'base'
          ? this.baseTab()
          : this.unlocksTab());
    this.body.scrollTop = scrollTop;

    this.tabbar.innerHTML = TABS.map((t) => {
      const n = RESEARCH.filter((d) => d.group === t.id && buyBlock(p, d) === null).length;
      return `<button data-act="tab:${t.id}" aria-pressed="${t.id === this.tab}">${t.label}${n ? `<span class="count">${n}</span>` : ''}</button>`;
    }).join('');
  }

  private towersTab(): string {
    const p = this.store.profile;
    const unlocked = unlockedTowers(p);
    if (!unlocked.includes(this.tower)) this.tower = unlocked[0]!;
    const picker = TOWER_ORDER.map((k, i) => {
      if (!unlocked.includes(k)) {
        return `<button class="lab-tower" disabled><span class="inner">${icon.lock(20, C.inkFaint, 2)}<span style="display:flex;flex-direction:column"><span class="label">Tower ${i + 1}</span><span class="caption">In Unlocks</span></span></span></button>`;
      }
      const f = towerFrames(k, 1);
      return `<button class="lab-tower" data-act="tower:${k}" aria-pressed="${k === this.tower}"><span class="inner"><span style="position:relative;width:36px;height:36px;flex:none"><img alt="" src="${unitSvgUri(f.base)}" style="position:absolute;inset:0"><img alt="" src="${unitSvgUri(f.turret)}" style="position:absolute;inset:0"></span>${TOWERS[k].name}</span></button>`;
    }).join('');
    const type = TOWERS[this.tower].damageType;
    const rows = RESEARCH.filter((d) => d.tower === this.tower && d.group === 'towers')
      .map((d) => this.row(d))
      .join('');
    return `<div class="lab-towers">${picker}</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <div style="display:flex;align-items:baseline;justify-content:space-between"><span class="label muted">${TOWERS[this.tower].name} tracks</span><span style="display:flex;align-items:center;gap:4px">${typeFrame(type)}<span class="label" style="color:${TYPE_COLOR[type]}">${TYPE_LABEL[type]}</span></span></div>
        ${rows}
      </div>`;
  }

  private baseTab(): string {
    const section = (id: 'base' | 'idle', title: string): string =>
      `<span class="label muted">${title}</span>${RESEARCH.filter(
        (d) => d.group === 'base' && d.section === id,
      )
        .map((d) => this.row(d))
        .join('')}`;
    return `<div style="display:flex;flex-direction:column;gap:8px">${section('base', 'Base · every run')}</div>
      <div style="display:flex;flex-direction:column;gap:8px">${section('idle', "Idle · while you're away")}</div>`;
  }

  private unlocksTab(): string {
    const towers = RESEARCH.filter((d) => d.group === 'unlocks' && d.tower)
      .map((d) => this.unlockRow(d))
      .join('');
    const systems = RESEARCH.filter((d) => d.group === 'unlocks' && !d.tower)
      .map((d) => this.unlockRow(d))
      .join('');
    const coming = COMING.map(
      (
        c,
      ) => `<div class="r-row"><div class="info"><span class="name" style="color:var(--ink-muted)">${c.name}</span><span class="caption muted">${c.note}</span></div>
        <button class="r-buy" disabled><span class="inner"><span class="label">Later</span></span></button></div>`,
    ).join('');
    return `<span class="label muted">Towers</span><div style="display:flex;flex-direction:column;gap:8px">${towers}</div>
      <span class="label muted">Systems</span><div style="display:flex;flex-direction:column;gap:8px">${systems}${coming}</div>`;
  }

  /** Buy button for a research row: affordable, can't afford (need N), locked, or maxed. */
  private buyButton(d: ResearchDef): string {
    const p = this.store.profile;
    const lvl = researchLevel(p, d.id);
    const block = buyBlock(p, d);
    if (block === 'maxed') {
      return `<div class="r-max">${icon.checkCircle(20)}<span class="btn-md-text">${d.group === 'unlocks' ? 'Owned' : 'Max'}</span></div>`;
    }
    const cost = researchCost(d, lvl);
    if (block === 'requires') {
      return `<button class="r-buy" disabled><span class="inner">${icon.lock(16, C.inkFaint, 2)}<span class="label">Locked</span></span></button>`;
    }
    const need = block === 'cores' ? cost - p.cores : 0;
    return `<button class="r-buy" data-act="buy:${d.id}" ${block ? 'disabled' : ''} aria-label="Buy ${d.name} for ${cost} Cores">
      <span class="inner"><span class="cost d">${icon.cores(16)}${fmt.int(cost)}</span>${need ? `<span class="caption">need ${fmt.int(need)}</span>` : ''}</span></button>`;
  }

  private row(d: ResearchDef): string {
    const lvl = researchLevel(this.store.profile, d.id);
    const maxed = lvl >= d.maxLevel;
    const now = lvl ? d.format(lvl) : 'Not researched';
    const effect = maxed
      ? `<span style="color:var(--ink)">${d.format(lvl)}</span>`
      : `${now} → <span style="color:var(--ink)">${d.format(lvl + 1)}</span>`;
    return `<div class="r-row"><div class="info">
        <div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px"><span class="name">${d.name}</span><span class="d muted" style="font-size:15px;font-weight:600">LV ${lvl} / ${d.maxLevel}</span></div>
        <span class="r-bar ${maxed ? 'max' : ''}">${maxed ? '' : `<span style="width:${(100 * lvl) / d.maxLevel}%"></span>`}</span>
        <span class="caption muted">${effect}</span>
      </div>${this.buyButton(d)}</div>`;
  }

  private unlockRow(d: ResearchDef): string {
    const p = this.store.profile;
    const block = buyBlock(p, d);
    const req = d.requires ? RESEARCH_BY_ID.get(d.requires) : undefined;
    const sub = d.tower
      ? `Tower ${TOWER_ORDER.indexOf(d.tower) + 1} · ${TYPE_LABEL[TOWERS[d.tower].damageType]}${block === 'requires' && req ? ` · Unlock ${req.name} first` : ''}`
      : (SYSTEM_NOTE[d.id] ?? '');
    const art = d.tower
      ? `<span style="position:relative;width:44px;height:44px;flex:none;${block === 'requires' ? 'opacity:.35' : ''}"><img alt="" src="${unitSvgUri(towerFrames(d.tower, 1).base)}" style="position:absolute;inset:0;width:44px"><img alt="" src="${unitSvgUri(towerFrames(d.tower, 1).turret)}" style="position:absolute;inset:0;width:44px"></span>`
      : `<span style="width:44px;height:44px;display:flex;align-items:center;justify-content:center;flex:none">${icon.next(28)}</span>`;
    return `<div class="r-row">${art}<div class="info"><span class="name" ${block === 'requires' ? 'style="color:var(--ink-muted)"' : ''}>${d.name}</span><span class="caption muted">${sub}</span></div>${this.buyButton(d)}</div>`;
  }
}
