import { CURVES } from '../../data/curves';
import { CHILL, type DamageType } from '../../data/damage';
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
import { towerFrames } from '../../render/unitArt';
import { unitSvgUri } from '../../render/units';
import { SPEC_LEVEL, SPECS, TOWER_SPECS } from '../../data/specs';
import { towerStats, type TowerStats } from '../../sim/specs';
import { specIcon } from './specIcons';
import { artifactIcon } from './artifactArt';
import { canDualSpec } from '../../sim/sim';
import { icon, C } from './icons';
import { fmt, h, setText, toggleClass } from './overlay';

/** Damage-type chip: colour + shape twin + label (design-system README). */
function damageTypeChip(type: DamageType): string {
  const [ico, label] =
    type === 'energy'
      ? [icon.energy(), 'ENERGY']
      : type === 'kinetic'
        ? [icon.kinetic(), 'KINETIC']
        : [icon.cryo(), 'CRYO'];
  return `${ico}<span class="label">${label}</span>`;
}

/** First spec of the tower, for the choose card's icon. */
const SPECS_FOR_HINT = (t: Tower) => TOWER_SPECS[t.kind][0];

/** Hits per shot: missiles per salvo, Prism beams. */
function shotsPer(s: TowerStats): number {
  if (s.attack.type === 'missiles') return s.attack.count;
  if (s.attack.type === 'bolt') return s.attack.beams ?? 1;
  return 1;
}

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
  private readonly dmgType: HTMLElement;
  private readonly specName: HTMLElement;
  private readonly specSlot: HTMLElement;
  private specKey = '';
  private readonly statLabels: Record<'dmg' | 'dps', HTMLElement>;
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
  private artKey = '';
  private kindShown = '';
  private lastAfford: boolean | null = null;

  constructor(
    parent: HTMLElement,
    private readonly sim: Sim,
    private readonly send: (cmd: Command) => void,
    private readonly onClose: () => void,
    private readonly onChooseSpec: (towerId: number) => void,
  ) {
    this.el = h('section', 'panel');
    this.el.hidden = true;

    const head = h(
      'div',
      'panel-head',
      `<div class="panel-art"><img alt=""><img alt=""></div>
       <div style="flex:1;display:flex;flex-direction:column;gap:4px">
         <div style="display:flex;align-items:baseline;gap:8px;min-width:0"><h2 class="panel-title" style="white-space:nowrap;flex:none"></h2><span class="label spec-name" style="color:var(--accent);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0"></span></div>
         <div style="display:flex;align-items:center;gap:10px">
           <span style="display:flex;align-items:center;gap:6px"><span class="d lvl" style="font-size:15px;font-weight:700;white-space:nowrap"></span><span class="pips">${'<span class="pip"></span>'.repeat(5)}</span></span>
           <span class="dmg-type" style="display:flex;align-items:center;gap:4px"></span>
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
    this.dmgType = head.querySelector('.dmg-type')!;
    this.specName = head.querySelector('.spec-name')!;

    const statsEl = h('div', 'stats');
    const labels: HTMLElement[] = [];
    const stat = (label: string): { now: HTMLElement; next: HTMLElement } => {
      const s = h(
        'div',
        'stat',
        `<span class="label muted">${label}</span><span class="d now"></span><span class="d next"></span>`,
      );
      statsEl.appendChild(s);
      labels.push(s.querySelector('.label')!);
      return { now: s.querySelector('.now')!, next: s.querySelector('.next')! };
    };
    this.stats = {
      dmg: stat('DAMAGE'),
      rate: stat('RATE'),
      range: stat('RANGE'),
      dps: stat('DPS'),
    };
    this.statLabels = { dmg: labels[0]!, dps: labels[3]! };

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

    // LV 4 hint (Panel-Level4.dc.html), or a choose card for an unspecialized LV 5+ tower.
    this.specSlot = h('div');
    this.specSlot.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('button.spec-hint')) this.onChooseSpec(this.towerId);
    });

    this.el.append(head, statsEl, targetingEl, this.specSlot, actions);
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
    this.artKey = '';
    this.kindShown = '';
    this.specKey = '';
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
    const frames = towerFrames(t.kind, t.level);
    if (frames.base !== this.artKey) {
      this.artKey = frames.base;
      this.baseImg.src = unitSvgUri(frames.base);
      this.turretImg.src = unitSvgUri(frames.turret);
    }
    const kindKey = `${t.kind}|${t.spec}|${t.spec2}`;
    if (kindKey !== this.kindShown) {
      this.kindShown = kindKey;
      this.dmgType.innerHTML = damageTypeChip(t.stats.damageType);
      setText(
        this.specName,
        t.spec ? SPECS[t.spec].name + (t.spec2 ? ` + ${SPECS[t.spec2].name}` : '') : '',
      );
      const atk = t.stats.attack.type;
      setText(this.statLabels.dmg, atk === 'chill' ? 'CHILL' : atk === 'aura' ? 'AURA' : 'DAMAGE');
      setText(this.statLabels.dps, atk === 'chill' || atk === 'aura' ? 'MAX SLOW' : 'DPS');
    }
    setText(this.title, def.name);
    setText(this.level, `LV ${t.level}`);
    this.pips.forEach((p, i) => toggleClass(p, 'on', i < Math.min(t.level, 5)));
    this.renderSpecSlot(t);

    const now = t.stats;
    const next = towerStats(t.kind, t.level + 1, t.spec, this.sim.state.meta, {
      art: this.sim.state.art,
      spec2: t.spec2,
    });
    setText(this.stats.rate.now, now.attack.type === 'aura' ? '—' : `${now.fireRate.toFixed(1)}/s`);
    this.noChange(this.stats.rate.next);
    setText(this.stats.range.now, tiles(now.range));
    this.noChange(this.stats.range.next);
    const atk = now.attack;
    if (atk.type === 'chill') {
      setText(this.stats.dmg.now, `${Math.round(now.power * 100)}%`);
      this.setNext(this.stats.dmg.next, `→ ${Math.round(next.power * 100)}%`);
      setText(this.stats.dps.now, `${Math.round(CHILL.maxSlow * 100)}%`);
      this.noChange(this.stats.dps.next);
    } else if (atk.type === 'aura') {
      setText(this.stats.dmg.now, `${Math.round(atk.chill * CHILL.maxSlow * 100)}%`);
      this.noChange(this.stats.dmg.next);
      setText(this.stats.dps.now, `${Math.round(atk.chill * CHILL.maxSlow * 100)}%`);
      this.noChange(this.stats.dps.next);
    } else {
      const shots = shotsPer(now);
      setText(
        this.stats.dmg.now,
        shots > 1 ? `${now.power.toFixed(1)}×${shots}` : now.power.toFixed(1),
      );
      this.setNext(this.stats.dmg.next, `→ ${next.power.toFixed(1)}`);
      setText(this.stats.dps.now, fmt.int(now.power * shots * now.fireRate));
      this.setNext(
        this.stats.dps.next,
        `→ ${fmt.int(next.power * shotsPer(next) * next.fireRate)}`,
      );
    }

    this.targeting.forEach((b, i) => {
      const on = String(TARGETING_MODES[i] === t.targeting);
      if (b.getAttribute('aria-pressed') !== on) b.setAttribute('aria-pressed', on);
    });

    const refund = sellValue(t, this.sim.state.art);
    setText(this.sellAmount, `+${fmt.int(refund)}`);
    this.sellBtn.setAttribute('aria-label', `Sell for ${refund} Credits, 70 percent refund`);

    const cost = upgradeCostFor(t, this.sim.state.art);
    const afford = this.sim.state.credits >= cost;
    setText(this.upgradeTitle, `UPGRADE TO LV ${t.level + 1}`);
    setText(this.upgradeCost, fmt.int(cost));
    setText(
      this.upgradeSub,
      afford
        ? `${t.stats.attack.type === 'chill' ? 'Chill' : 'Damage'} +${Math.round((CURVES.towerDamageGrowth - 1) * 100)}%`
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

  /** LV 4: what's coming at LV 5. LV 5+ without a spec: a card that opens the pick. */
  private renderSpecSlot(t: Tower): void {
    const state = t.spec
      ? canDualSpec(this.sim.state, t)
        ? 'dual'
        : 'done'
      : t.level >= SPEC_LEVEL
        ? 'choose'
        : t.level === SPEC_LEVEL - 1
          ? 'hint'
          : 'none';
    const key = `${t.id}|${state}`;
    if (key === this.specKey) return;
    this.specKey = key;
    if (state === 'hint') {
      const l5 = towerFrames(t.kind, SPEC_LEVEL);
      this.specSlot.innerHTML = `<div class="spec-hint">
        <div class="panel-art"><img alt="" src="${unitSvgUri(l5.base)}"><img alt="" src="${unitSvgUri(l5.turret)}"></div>
        <div style="display:flex;flex-direction:column;gap:2px"><span class="label">SPECIALIZATION AT LV ${SPEC_LEVEL}</span><span class="caption muted">Next upgrade lets you pick a path for this tower.</span></div>
      </div>`;
    } else if (state === 'choose') {
      this.specSlot.innerHTML = `<button class="spec-hint" style="width:100%">
        ${specIcon(SPECS_FOR_HINT(t), t.stats.damageType)}
        <div style="display:flex;flex-direction:column;gap:2px;flex:1"><span class="label" style="color:var(--accent)">CHOOSE SPECIALIZATION</span><span class="caption muted">Pick a path for this tower. Locked once chosen.</span></div>
      </button>`;
    } else if (state === 'dual') {
      this.specSlot.innerHTML = `<button class="spec-hint" style="width:100%">
        ${artifactIcon('dualSpec', 3, 48)}
        <div style="display:flex;flex-direction:column;gap:2px;flex:1"><span class="label" style="color:var(--accent)">DUAL SPEC · SECOND PATH</span><span class="caption muted">Add a second specialization. One tower per run.</span></div>
      </button>`;
    } else {
      this.specSlot.innerHTML = '';
    }
  }

  private setNext(el: HTMLElement, text: string): void {
    setText(el, text);
    toggleClass(el, 'none', false);
  }

  private noChange(el: HTMLElement): void {
    setText(el, '—');
    toggleClass(el, 'none', true);
  }
}
