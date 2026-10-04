import { GAME } from '../../data/game';
import type { SimState } from '../../sim';
import { icon } from './icons';
import { fmt, h, setText, toggleClass } from './overlay';

/** How long the base cell shows "BASE HIT" after a leak (HANDOFF.md "Alerts": ~600 ms). */
const BASE_HIT_MS = 600;

/** Top status bar, y 48–104: WAVE · BASE x/20 · CREDITS · NEXT WAVE. Read-only, no taps. */
export class HudBar {
  readonly el: HTMLDivElement;
  private readonly wave: HTMLElement;
  private readonly baseCell: HTMLElement;
  private readonly baseLabel: HTMLElement;
  private readonly baseIcon: HTMLElement;
  private readonly base: HTMLElement;
  private readonly creditsCell: HTMLElement;
  private readonly credits: HTMLElement;
  private readonly next: HTMLElement;
  private lastBaseHp = -1;
  private baseHitUntil = 0;

  constructor(parent: HTMLElement) {
    this.el = h('div', 'hud');
    this.el.setAttribute('role', 'status');
    const cell = (label: string, value: string): HTMLElement => {
      const c = h('div', 'hud-cell', `<span class="label muted">${label}</span>${value}`);
      this.el.appendChild(c);
      return c;
    };
    this.wave = cell('WAVE', '<span class="d hud-num"></span>').querySelector('.hud-num')!;
    this.baseCell = cell(
      'BASE',
      `<div class="hud-value"><span class="ico"></span><span class="d hud-num"></span><span class="d hud-sub">/${GAME.baseHp}</span></div>`,
    );
    this.baseLabel = this.baseCell.querySelector('.label')!;
    this.baseIcon = this.baseCell.querySelector('.ico')!;
    this.baseIcon.innerHTML = icon.base();
    this.base = this.baseCell.querySelector('.hud-num')!;
    this.creditsCell = cell(
      'CREDITS',
      `<div class="hud-value">${icon.coin()}<span class="d hud-num"></span></div>`,
    );
    this.credits = this.creditsCell.querySelector('.hud-num')!;
    this.next = cell(
      'NEXT WAVE',
      `<div class="hud-value">${icon.clock()}<span class="d hud-num"></span></div>`,
    ).querySelector('.hud-num')!;
    parent.appendChild(this.el);
  }

  setCreditsAlert(on: boolean): void {
    toggleClass(this.creditsCell, 'alert', on);
  }

  update(s: SimState, now: number): void {
    setText(this.wave, String(s.wave));
    setText(this.base, String(s.baseHp));
    setText(this.credits, fmt.int(s.credits));
    setText(this.next, fmt.clock(s.nextWaveIn / GAME.tickRate));

    if (this.lastBaseHp >= 0 && s.baseHp < this.lastBaseHp) this.baseHitUntil = now + BASE_HIT_MS;
    this.lastBaseHp = s.baseHp;
    const hit = now < this.baseHitUntil;
    if (this.baseCell.classList.contains('alert') !== hit) {
      toggleClass(this.baseCell, 'alert', hit);
      setText(this.baseLabel, hit ? 'BASE HIT' : 'BASE');
      this.baseIcon.innerHTML = hit ? icon.xOctagon() : icon.base();
    }
  }
}
