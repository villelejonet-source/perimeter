import { CURVES, towerDamage } from '../../data/curves';
import { GAME } from '../../data/game';
import { TOWERS } from '../../data/towers';
import {
  sellValue,
  TARGETING_MODES,
  upgradeCostFor,
  type Command,
  type Sim,
  type Tower,
} from '../../sim';
import { unitSvgUri } from '../../render/units';
import { icon, C } from './icons';
import { fmt, h, setText, toggleClass } from './overlay';

/** Ranges show in 16-px grid tiles (decided 2026-10-04). */
const tiles = (px: number): string => (px / GAME.gridSize).toFixed(1);

/** Bottom sheet for the selected tower (Panel-Railgun.dc.html). Sends commands only. */
export class TowerPanel {
  readonly el: HTMLElement;
  private towerId = -1;
  private readonly baseImg: HTMLImageElement;
  private readonly turretImg: HTMLImageElement;
  private readonly title: HTMLElement;
  private readonly level: HTMLElement;
  private readonly pips: HTMLElement[];
  private readonly stats: Record<
    'dmg' | 'rate' | 'range' | 'dps',
    { now: HTMLElement; next: HTMLElement }
  >;
  private readonly targeting: HTMLButtonElement[] = [];
  private readonly sellBtn: HTMLButtonElement;
  private readonly sellAmount: HTMLElement;
  private readonly upgradeBtn: HTMLButtonElement;
  private readonly upgradeTitle: HTMLElement;
  private readonly upgradeSub: HTMLElement;
  private readonly upgradeCost: HTMLElement;
  private readonly upgradeCoin: HTMLElement;
  private l5: boolean | null = null;
  private lastAfford: boolean | null = null;

  constructor(
    parent: HTMLElement,
    private readonly sim: Sim,
    private readonly send: (cmd: Command) => void,
    private readonly onClose: () => void,
  ) {
    this.el = h('section', 'panel');
    this.el.hidden = true;

    const head = h(
      'div',
      'panel-head',
      `<div class="panel-art"><img alt=""><img alt=""></div>
       <div style="flex:1;display:flex;flex-direction:column;gap:4px">
         <h2 class="panel-title"></h2>
         <div style="display:flex;align-items:center;gap:10px">
           <span style="display:flex;align-items:center;gap:6px"><span class="d lvl" style="font-size:15px;font-weight:700"></span><span class="pips">${'<span class="pip"></span>'.repeat(5)}</span></span>
           <span style="display:flex;align-items:center;gap:4px">${icon.energy()}<span class="label">ENERGY</span></span>
         </div>
       </div>`,
    );
    const close = h('button', 'close-btn', icon.close());
    close.setAttribute('aria-label', 'Close tower panel');
    close.addEventListener('click', () => this.onClose());
    head.appendChild(close);
    const imgs = head.querySelectorAll('img');
    this.baseImg = imgs[0]!;
    this.turretImg = imgs[1]!;
    this.title = head.querySelector('.panel-title')!;
    this.level = head.querySelector('.lvl')!;
    this.pips = [...head.querySelectorAll<HTMLElement>('.pip')];

    const statsEl = h('div', 'stats');
    const stat = (label: string): { now: HTMLElement; next: HTMLElement } => {
      const s = h(
        'div',
        'stat',
        `<span class="label muted">${label}</span><span class="d now"></span><span class="d next"></span>`,
      );
      statsEl.appendChild(s);
      return { now: s.querySelector('.now')!, next: s.querySelector('.next')! };
    };
    this.stats = {
      dmg: stat('DAMAGE'),
      rate: stat('RATE'),
      range: stat('RANGE'),
      dps: stat('DPS'),
    };

    const targetingEl = h('div', '', '<span class="label muted">TARGETING</span>');
    targetingEl.style.cssText = 'display:flex;flex-direction:column;gap:6px';
    const seg = h('div', 'segmented');
    for (const mode of TARGETING_MODES) {
      const b = h('button', '', mode.toUpperCase());
      b.addEventListener('click', () =>
        this.send({ type: 'setTargeting', towerId: this.towerId, mode }),
      );
      seg.appendChild(b);
      this.targeting.push(b);
    }
    targetingEl.appendChild(seg);

    const actions = h('div', 'panel-actions');
    this.sellBtn = h(
      'button',
      'sell-btn btn-secondary',
      `<span class="inner"><span class="btn-md-text">SELL</span><span class="money d">${icon.coin(14)}<span class="amt"></span><span class="caption muted" style="font-family:var(--font-ui)">· 70%</span></span></span>`,
    );
    this.sellAmount = this.sellBtn.querySelector('.amt')!;
    this.sellBtn.addEventListener('click', () => {
      this.send({ type: 'sellTower', towerId: this.towerId });
      this.onClose();
    });
    this.upgradeBtn = h(
      'button',
      'upgrade-btn btn-primary',
      `<span style="display:flex;flex-direction:column;align-items:flex-start;gap:2px"><span class="btn-lg-text t"></span><span class="caption s"></span></span><span class="cost d"><span class="coin"></span><span class="n"></span></span>`,
    );
    this.upgradeTitle = this.upgradeBtn.querySelector('.t')!;
    this.upgradeSub = this.upgradeBtn.querySelector('.s')!;
    this.upgradeCost = this.upgradeBtn.querySelector('.n')!;
    this.upgradeCoin = this.upgradeBtn.querySelector('.coin')!;
    this.upgradeBtn.addEventListener('click', () =>
      this.send({ type: 'upgradeTower', towerId: this.towerId }),
    );
    actions.append(this.sellBtn, this.upgradeBtn);

    this.el.append(head, statsEl, targetingEl, actions);
    parent.appendChild(this.el);
  }

  get selectedId(): number {
    return this.towerId;
  }

  /** Sheet height in logical px (for keeping the range circle visible above it). */
  get height(): number {
    return this.el.offsetHeight;
  }

  show(towerId: number): void {
    this.towerId = towerId;
    this.el.hidden = false;
    this.l5 = null;
    this.lastAfford = null;
    this.update();
  }

  hide(): void {
    this.towerId = -1;
    this.el.hidden = true;
  }

  update(): void {
    if (this.towerId < 0) return;
    const t = this.sim.findTower(this.towerId);
    if (!t) {
      this.onClose();
      return;
    }
    this.render(t);
  }

  private render(t: Tower): void {
    const def = TOWERS[t.kind];
    const l5 = t.level >= 5;
    if (l5 !== this.l5) {
      this.l5 = l5;
      const lvl = l5 ? 'l5' : 'l1';
      this.baseImg.src = unitSvgUri(`tower-pulse-laser-${lvl}-base`);
      this.turretImg.src = unitSvgUri(`tower-pulse-laser-${lvl}-turret`);
    }
    setText(this.title, def.name);
    setText(this.level, `LV ${t.level}`);
    this.pips.forEach((p, i) => toggleClass(p, 'on', i < Math.min(t.level, 5)));

    const dmg = towerDamage(def.damage, t.level);
    const nextDmg = towerDamage(def.damage, t.level + 1);
    setText(this.stats.dmg.now, dmg.toFixed(1));
    setText(this.stats.dmg.next, `→ ${nextDmg.toFixed(1)}`);
    setText(this.stats.rate.now, `${def.fireRate.toFixed(1)}/s`);
    this.noChange(this.stats.rate.next);
    setText(this.stats.range.now, tiles(def.range));
    this.noChange(this.stats.range.next);
    setText(this.stats.dps.now, fmt.int(dmg * def.fireRate));
    setText(this.stats.dps.next, `→ ${fmt.int(nextDmg * def.fireRate)}`);

    this.targeting.forEach((b, i) => {
      const on = String(TARGETING_MODES[i] === t.targeting);
      if (b.getAttribute('aria-pressed') !== on) b.setAttribute('aria-pressed', on);
    });

    const refund = sellValue(t);
    setText(this.sellAmount, `+${fmt.int(refund)}`);
    this.sellBtn.setAttribute('aria-label', `Sell for ${refund} Credits, 70 percent refund`);

    const cost = upgradeCostFor(t);
    const afford = this.sim.state.credits >= cost;
    setText(this.upgradeTitle, `UPGRADE TO LV ${t.level + 1}`);
    setText(this.upgradeCost, fmt.int(cost));
    setText(
      this.upgradeSub,
      afford
        ? `Damage +${Math.round((CURVES.towerDamageGrowth - 1) * 100)}%`
        : `Need ${fmt.int(cost - this.sim.state.credits)} more Credits`,
    );
    if (afford !== this.lastAfford) {
      this.lastAfford = afford;
      this.upgradeBtn.disabled = !afford;
      this.upgradeSub.classList.toggle('muted', !afford);
      this.upgradeCoin.innerHTML = icon.coin(16, afford ? C.onAccent : C.inkFaint);
    }
    this.upgradeBtn.setAttribute(
      'aria-label',
      `Upgrade to level ${t.level + 1} for ${cost} Credits${afford ? '' : `. Need ${cost - this.sim.state.credits} more.`}`,
    );
  }

  private noChange(el: HTMLElement): void {
    setText(el, '—');
    toggleClass(el, 'none', true);
  }
}
