import { ENEMIES, type EnemyKind } from '../../data/enemies';
import { enemyFrame } from '../../render/unitArt';
import { unitSvgUri } from '../../render/units';
import { icon } from './icons';
import { h } from './overlay';

/** How long each alert stays up (HANDOFF.md "Alerts"; base hit ~600 ms). */
const ELITE_MS = 2200;
const BOSS_MS = 2800;
const BASE_HIT_MS = 600;

/** One-line trait for the boss banner ("Juggernaut · heavy armor"). */
const BOSS_TRAIT: Partial<Record<EnemyKind, string>> = {
  juggernaut: 'heavy armor',
  aegis: 'regenerating shield, spawns Drones',
  hiveCarrier: 'flying, releases Wraiths',
};

/**
 * Elite-wave banner, boss-incoming banner and base-hit edge flash. Purely visual; driven by
 * GameScene from sim state changes. Pointer events pass through.
 */
export class Alerts {
  private banner: HTMLElement | null = null;
  private bannerTimer = 0;
  private hit: HTMLElement | null = null;
  private hitTimer = 0;

  constructor(private readonly parent: HTMLElement) {}

  elite(wave: number): void {
    this.showBanner(
      h(
        'div',
        'alert-elite',
        `<div class="inner"><img alt="" src="${unitSvgUri('enemy-drone-elite')}" style="width:52px;height:52px;flex:none">
         <div style="flex:1;display:flex;flex-direction:column;gap:2px">
           <span class="d alert-title">ELITE WAVE</span>
           <span class="caption muted">Wave ${wave} · tougher enemies, bigger Credit drops</span>
         </div>${icon.chevrons()}</div>`,
      ),
      ELITE_MS,
    );
  }

  boss(wave: number, kind: EnemyKind, also: EnemyKind | null): void {
    const name = also ? `${ENEMIES[kind].name} + ${ENEMIES[also].name}` : ENEMIES[kind].name;
    const trait = also ? `${BOSS_TRAIT[kind]} · ${BOSS_TRAIT[also]}` : (BOSS_TRAIT[kind] ?? '');
    const wrap = h('div');
    wrap.setAttribute('role', 'alert');
    wrap.append(
      h('div', 'alert-boss-frame'),
      h(
        'div',
        'alert-boss',
        `<div class="hazard"></div>
         <div class="body">
           <div style="flex:1;display:flex;flex-direction:column;gap:6px">
             <div style="display:flex;align-items:center;gap:8px">${icon.warning()}<span class="label" style="color:var(--warning)">WAVE ${wave}</span></div>
             <h2 class="d">BOSS<br>INCOMING</h2>
             <span style="font-size:16px;line-height:22px;font-weight:500">${name} · ${trait}</span>
           </div>
           <img alt="${name}" src="${unitSvgUri(enemyFrame(kind, false))}" style="width:120px;height:120px;flex:none">
         </div>
         <div class="hazard"></div>`,
      ),
    );
    this.showBanner(wrap, BOSS_MS);
  }

  /** Edge flash and floating "−N" near the base (logical screen px). */
  baseHit(amount: number, baseX: number, baseY: number): void {
    window.clearTimeout(this.hitTimer);
    this.hit?.remove();
    const el = h('div');
    el.setAttribute('aria-hidden', 'true');
    const edge = h(
      'div',
      'base-hit-edge',
      `<div style="left:0;top:0;width:100%;height:12px"></div><div style="left:0;bottom:0;width:100%;height:12px"></div><div style="left:0;top:0;width:12px;height:100%"></div><div style="right:0;top:0;width:12px;height:100%"></div>`,
    );
    const label = h('div', 'd base-hit-amount', `−${amount}`);
    // Right of the base ring, or left of it when the base is near the right edge.
    label.style.left = `${baseX + 52 + 32 > 390 - 12 ? baseX - 52 - 32 : baseX + 52}px`;
    label.style.top = `${baseY - 34}px`;
    el.append(edge, label);
    this.parent.appendChild(el);
    this.hit = el;
    this.hitTimer = window.setTimeout(() => this.fadeOut(el), BASE_HIT_MS);
  }

  private showBanner(el: HTMLElement, ms: number): void {
    window.clearTimeout(this.bannerTimer);
    this.banner?.remove();
    this.parent.appendChild(el);
    this.banner = el;
    this.bannerTimer = window.setTimeout(() => this.fadeOut(el), ms);
  }

  private fadeOut(el: HTMLElement): void {
    el.classList.add('fade-out');
    window.setTimeout(() => el.remove(), 300);
  }

  destroy(): void {
    window.clearTimeout(this.bannerTimer);
    window.clearTimeout(this.hitTimer);
    this.banner?.remove();
    this.hit?.remove();
  }
}
