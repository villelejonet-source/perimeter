import { icon } from './icons';
import { fmt, h } from './overlay';

export interface RunEndData {
  wave: number;
  /** Best wave before this run. */
  previousBest: number;
  cores: number;
  shards: number;
  milestoneShards: number;
  retreated: boolean;
}

/**
 * Run end (in-run/RunEnd.dc.html): wave vs best, rewards, BACK TO MENU / PLAY AGAIN.
 * The optional "double Cores" ad arrives with ads in Phase 9.
 */
export class RunEnd {
  private readonly el: HTMLElement;

  constructor(parent: HTMLElement, d: RunEndData, actions: { menu(): void; again(): void }) {
    const newBest = d.wave > d.previousBest;
    this.el = h(
      'div',
      'run-end',
      `<div style="display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center">
         <span class="label muted">RUN OVER</span>
         <h1 class="d">${d.retreated ? 'RETREATED' : 'BASE BREACHED'}</h1>
       </div>
       <div class="cards">
         <div class="card"><span class="label muted">WAVE REACHED</span><span class="d big" ${newBest ? 'style="color:var(--accent)"' : ''}>${d.wave}</span>${newBest ? '<span class="label" style="color:var(--accent)">NEW BEST</span>' : ''}</div>
         <div class="card"><span class="label muted">BEST EVER</span><span class="d big muted">${Math.max(d.previousBest, d.wave)}</span></div>
       </div>
       <div style="display:flex;flex-direction:column;gap:8px">
         <span class="label muted">REWARDS EARNED</span>
         <div class="card" style="padding:12px 16px;background:var(--surface-300);border:0;flex-direction:row;align-items:center;gap:12px;clip-path:var(--chamfer-sm)">
           ${icon.cores(28)}<span style="flex:1;font-size:16px;line-height:22px;font-weight:500">Cores</span><span class="d" style="font-size:28px;line-height:30px;font-weight:700">${fmt.int(d.cores)}</span>
         </div>
         <div class="card" style="padding:12px 16px;background:var(--surface-300);border:0;flex-direction:row;align-items:center;gap:12px;clip-path:var(--chamfer-sm)">
           ${icon.shards(28)}<span style="flex:1;display:flex;flex-direction:column"><span style="font-size:16px;line-height:22px;font-weight:500">Shards</span>${d.milestoneShards ? `<span class="caption muted">incl. ${d.milestoneShards} for new wave milestones</span>` : ''}</span><span class="d" style="font-size:28px;line-height:30px;font-weight:700">${fmt.int(d.shards)}</span>
         </div>
         <span class="caption muted" style="text-align:center">Saved. Spend Cores in the Research Lab.</span>
       </div>
       <div class="actions">
         <button class="btn-secondary menu" style="height:48px"><span class="inner btn-md-text">Back to menu</span></button>
         <button class="btn-primary btn-lg-text again" style="height:56px">Play again</button>
       </div>`,
    );
    this.el.querySelector('.menu')!.addEventListener('click', () => actions.menu());
    this.el.querySelector('.again')!.addEventListener('click', () => actions.again());
    parent.appendChild(this.el);
  }

  destroy(): void {
    this.el.remove();
  }
}
