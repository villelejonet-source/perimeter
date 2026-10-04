import { MAP_ORDER, MAPS } from '../../../data/maps';
import type { Profile } from '../../../meta/profile';
import { affordableCount, unlockedMaps } from '../../../meta/research';
import { craftableCount } from '../../../meta/artifacts';
import { C, icon } from '../icons';
import { fmt, h } from '../overlay';

export interface MainMenuActions {
  play(): void;
  research(): void;
  codex(): void;
  settings(): void;
  selectMap(mapId: string): void;
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
    resume: { wave: number; mapId: string } | null,
    actions: MainMenuActions,
  ) {
    const affordable = affordableCount(p);
    const craftable = craftableCount(p);
    // A saved run pins the sector until it's finished.
    const mapId = resume?.mapId ?? p.mapId;
    const map = MAPS[mapId] ?? MAPS[MAP_ORDER[0]!]!;
    const index = MAP_ORDER.indexOf(map.id);
    const locked = !unlockedMaps(p).includes(map.id);
    const best = p.bestByMap[map.id] ?? 0;
    const cycle = (d: number): string =>
      MAP_ORDER[(index + d + MAP_ORDER.length) % MAP_ORDER.length]!;
    const sector = String(index + 1).padStart(2, '0');
    this.el = h(
      'section',
      'screen pad',
      `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
         <div style="display:flex;gap:8px">
           <div class="chip-cur">${icon.cores()}<span class="d">${fmt.int(p.cores)}</span><span class="label muted">Cores</span></div>
           <div class="chip-cur">${icon.shards()}<span class="d">${fmt.int(p.shards)}</span><span class="label muted">Shards</span></div>
         </div>
         <button class="btn-sq settings" aria-label="Settings"><span class="inner">${icon.gear()}</span></button>
       </div>
       <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px">
         <svg width="72" height="72" viewBox="0 0 48 48" aria-hidden="true" style="fill:none;stroke:#c6ff3d;stroke-width:2.5;stroke-linejoin:round;filter:drop-shadow(0 0 8px rgba(198,255,61,.5))"><path d="M24 4l17.3 10v20L24 44 6.7 34V14z"/><path d="M24 15l7.8 4.5v9L24 33l-7.8-4.5v-9z"/></svg>
         <h1 class="d" style="margin:0;font-size:52px;line-height:56px;font-weight:800;letter-spacing:.1em;text-transform:uppercase">Perimeter</h1>
         <div class="chip-cur" style="height:auto;padding:8px 16px;gap:12px">
           <span class="label muted">Best wave</span><span class="d" style="font-size:28px;line-height:30px">${best}</span>
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
           <button class="menu-card codex"><span class="inner">
             <span style="display:flex;align-items:center;justify-content:space-between">${icon.shards(24)}${craftable ? `<span class="badge d">${icon.next(14)}${craftable}</span>` : ''}</span>
             <span class="btn-md-text">Artifact Codex</span>
             <span class="caption muted">${craftable ? `${craftable} craftable` : 'Craft artifacts with Shards'}</span>
           </span></button>
         </div>
         <div class="sector">
           <button class="btn-sq prev" ${resume ? 'disabled' : ''} aria-label="Previous sector"><span class="inner">${icon.back()}</span></button>
           <div style="flex:1;display:flex;flex-direction:column;align-items:center"><span class="label muted">Sector ${sector} · ${locked ? 'Locked' : `Best wave ${best}`}</span><span style="display:flex;align-items:center;gap:6px;font-size:19px;line-height:24px;font-weight:700${locked ? ';color:var(--ink-muted)' : ''}">${locked ? icon.lock(16, C.inkMuted, 2) : ''}${map.name}</span></div>
           <button class="btn-sq next" ${resume ? 'disabled' : ''} aria-label="Next sector"><span class="inner">${icon.next()}</span></button>
         </div>
         <button class="btn-primary btn-lg-text play" ${locked ? 'disabled' : ''} style="height:56px;display:flex;align-items:center;justify-content:center;gap:10px">${locked ? `${icon.lock(18, C.inkFaint, 2.5)}Unlock in Research Lab` : `${icon.playSolid()}${resume ? `Resume · wave ${resume.wave}` : 'Play'}`}</button>
       </div>`,
    );
    this.el.querySelector('.research')!.addEventListener('click', () => actions.research());
    this.el.querySelector('.codex')!.addEventListener('click', () => actions.codex());
    this.el.querySelector('.settings')!.addEventListener('click', () => actions.settings());
    this.el.querySelector('.prev')!.addEventListener('click', () => actions.selectMap(cycle(-1)));
    this.el.querySelector('.next')!.addEventListener('click', () => actions.selectMap(cycle(1)));
    this.el.querySelector('.play')!.addEventListener('click', () => actions.play());
    parent.appendChild(this.el);
  }

  destroy(): void {
    this.el.remove();
  }
}
