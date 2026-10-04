import { MAPS, DEFAULT_MAP_ID } from '../../../data/maps';
import type { Profile } from '../../../meta/profile';
import { affordableCount } from '../../../meta/research';
import { icon } from '../icons';
import { fmt, h } from '../overlay';

export interface MainMenuActions {
  play(): void;
  research(): void;
}

/**
 * Hub between runs (meta/Main.dc.html). Reading zone on top (balances, best wave), every
 * control in the bottom thumb zone, PLAY as the one primary button.
 */
export class MainMenu {
  readonly el: HTMLElement;

  constructor(
    parent: HTMLElement,
    p: Profile,
    resumeWave: number | null,
    actions: MainMenuActions,
  ) {
    const affordable = affordableCount(p);
    const map = MAPS[DEFAULT_MAP_ID]!;
    this.el = h(
      'section',
      'screen pad',
      `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
         <div style="display:flex;gap:8px">
           <div class="chip-cur">${icon.cores()}<span class="d">${fmt.int(p.cores)}</span><span class="label muted">Cores</span></div>
           <div class="chip-cur">${icon.shards()}<span class="d">${fmt.int(p.shards)}</span><span class="label muted">Shards</span></div>
         </div>
         <button class="btn-sq" disabled aria-label="Settings (coming soon)"><span class="inner">${icon.gear()}</span></button>
       </div>
       <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px">
         <svg width="72" height="72" viewBox="0 0 48 48" aria-hidden="true" style="fill:none;stroke:#c6ff3d;stroke-width:2.5;stroke-linejoin:round;filter:drop-shadow(0 0 8px rgba(198,255,61,.5))"><path d="M24 4l17.3 10v20L24 44 6.7 34V14z"/><path d="M24 15l7.8 4.5v9L24 33l-7.8-4.5v-9z"/></svg>
         <h1 class="d" style="margin:0;font-size:52px;line-height:56px;font-weight:800;letter-spacing:.1em;text-transform:uppercase">Perimeter</h1>
         <div class="chip-cur" style="height:auto;padding:8px 16px;gap:12px">
           <span class="label muted">Best wave</span><span class="d" style="font-size:28px;line-height:30px">${p.bestWave}</span>
           <span style="width:1px;height:24px;background:var(--line)"></span><span class="caption muted">${map.name}</span>
         </div>
       </div>
       <div style="display:flex;flex-direction:column;gap:12px">
         <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">
           <button class="menu-card research"><span class="inner">
             <span style="display:flex;align-items:center;justify-content:space-between">${icon.cores(24)}${affordable ? `<span class="badge d">${icon.next(14)}${affordable}</span>` : ''}</span>
             <span class="btn-md-text">Research Lab</span>
             <span class="caption muted">${affordable ? `${affordable} upgrade${affordable === 1 ? '' : 's'} affordable` : 'Spend Cores on upgrades'}</span>
           </span></button>
           <button class="menu-card" disabled><span class="inner">
             <span>${icon.shards(24)}</span>
             <span class="btn-md-text">Artifact Codex</span>
             <span class="caption">Arrives with artifacts</span>
           </span></button>
         </div>
         <div class="sector">
           <button class="btn-sq" disabled aria-label="Previous sector"><span class="inner">${icon.back()}</span></button>
           <div style="flex:1;display:flex;flex-direction:column;align-items:center"><span class="label muted">Sector 01 · Wave 1</span><span style="font-size:19px;line-height:24px;font-weight:700">${map.name}</span></div>
           <button class="btn-sq" disabled aria-label="Next sector"><span class="inner">${icon.next()}</span></button>
         </div>
         <button class="btn-primary btn-lg-text play" style="height:56px;display:flex;align-items:center;justify-content:center;gap:10px">${icon.playSolid()}${resumeWave ? `Resume · wave ${resumeWave}` : 'Play'}</button>
       </div>`,
    );
    this.el.querySelector('.research')!.addEventListener('click', () => actions.research());
    this.el.querySelector('.play')!.addEventListener('click', () => actions.play());
    parent.appendChild(this.el);
  }

  destroy(): void {
    this.el.remove();
  }
}
