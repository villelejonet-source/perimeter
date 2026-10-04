import { h, fmt } from './overlay';

export interface RunEndData {
  wave: number;
  seconds: number;
  kills: number;
}

/**
 * Run-end screen (RunEnd.dc.html). Phase 2 shows wave reached and run time; BEST EVER,
 * Cores/Shards and Back to Menu need saves and the meta layer (Phase 6), Double Cores
 * needs ads (Phase 9).
 */
export class RunEnd {
  private readonly el: HTMLElement;

  constructor(parent: HTMLElement, data: RunEndData, onPlayAgain: () => void) {
    const mins = Math.floor(data.seconds / 60);
    const secs = String(Math.floor(data.seconds % 60)).padStart(2, '0');
    this.el = h(
      'div',
      'run-end',
      `<div style="display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center">
         <span class="label muted">RUN OVER</span>
         <h1 class="d">BASE BREACHED</h1>
       </div>
       <div class="cards">
         <div class="card"><span class="label muted">WAVE REACHED</span><span class="d big">${data.wave}</span></div>
         <div class="card"><span class="label muted">RUN TIME</span><span class="d big muted">${mins}:${secs}</span></div>
       </div>
       <div class="card" style="padding:12px 16px;background:var(--surface-300);border:0;flex-direction:row;align-items:center;clip-path:var(--chamfer-sm)">
         <span style="flex:1;font-size:16px;line-height:22px;font-weight:500">Enemies destroyed</span>
         <span class="d" style="font-size:28px;line-height:30px;font-weight:700">${fmt.int(data.kills)}</span>
       </div>
       <div class="actions"></div>`,
    );
    const play = h('button', 'btn-primary btn-lg-text', 'PLAY AGAIN');
    play.style.height = '56px';
    play.addEventListener('click', onPlayAgain);
    this.el.querySelector('.actions')!.appendChild(play);
    parent.appendChild(this.el);
    play.focus({ preventScroll: true });
  }

  destroy(): void {
    this.el.remove();
  }
}
