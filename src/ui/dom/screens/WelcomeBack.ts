import type { OfflineEarnings } from '../../../meta/offline';
import { icon } from '../icons';
import { fmt, h } from '../overlay';

const dur = (ms: number): string => {
  const m = Math.floor(ms / 60_000);
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
};

/**
 * Offline income on return (meta/WelcomeBack.dc.html). COLLECT is the one primary button;
 * the "double with ad" option arrives with ads in Phase 9.
 */
export class WelcomeBack {
  readonly el: HTMLElement;

  constructor(
    parent: HTMLElement,
    e: OfflineEarnings,
    actions: { collect(): void; research(): void },
  ) {
    const frac = e.capMs ? Math.min(1, e.countedMs / e.capMs) : 0;
    const r = 88;
    const c = 2 * Math.PI * r;
    this.el = h(
      'section',
      'screen pad',
      `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;text-align:center">
         <span class="label muted">${e.tampered ? 'Device clock changed' : 'The perimeter held'}</span>
         <h1 class="d" style="margin:-12px 0 0;font-size:40px;line-height:44px;font-weight:800;letter-spacing:.04em;text-transform:uppercase">Welcome back</h1>
         <div style="position:relative;width:200px;height:200px">
           <svg width="200" height="200" viewBox="0 0 200 200" aria-hidden="true" style="fill:none">
             <circle cx="100" cy="100" r="${r}" stroke="#2a3550" stroke-width="8"/>
             <circle cx="100" cy="100" r="${r}" stroke="#c6ff3d" stroke-width="8" stroke-dasharray="${c * frac} ${c}" transform="rotate(-90 100 100)"/>
           </svg>
           <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px">
             <span class="label muted">Time counted</span>
             <span class="d" style="font-size:40px;line-height:44px;font-weight:800">${dur(e.countedMs)}</span>
             ${e.capped ? `<span class="chip-cur" style="height:auto;padding:2px 8px">${icon.checkCircle(14)}<span class="label">Cap reached</span></span>` : ''}
           </div>
         </div>
         <span class="caption muted">${
           e.tampered
             ? 'The clock is earlier than your last session, so no offline time was counted.'
             : `Away <span class="d" style="color:var(--ink);font-weight:600">${dur(e.awayMs)}</span> · offline cap is ${Math.round(e.capMs / 3_600_000)} h${e.capped ? ' · <a href="#" class="raise" style="color:var(--accent)">raise it in Research Lab</a>' : ''}`
         }</span>
         <div style="width:100%;display:flex;flex-direction:column;background:var(--surface-200);padding:4px 16px;box-sizing:border-box;clip-path:var(--chamfer-md)">
           <div class="earn-row">${icon.cores(28)}<span style="flex:1;display:flex;flex-direction:column;align-items:flex-start"><span style="font-size:19px;line-height:24px;font-weight:700">Cores</span><span class="caption muted">${fmt.int(e.coresPerHour)} per hour</span></span><span class="d" style="font-size:28px;line-height:30px;font-weight:700">+${fmt.int(e.cores)}</span></div>
           <div class="earn-row">${icon.shards(28)}<span style="flex:1;display:flex;flex-direction:column;align-items:flex-start"><span style="font-size:19px;line-height:24px;font-weight:700">Shards</span><span class="caption muted">${e.shardsPerHour} per hour</span></span><span class="d" style="font-size:28px;line-height:30px;font-weight:700">+${fmt.int(e.shards)}</span></div>
         </div>
       </div>
       <button class="btn-primary btn-lg-text collect" style="height:56px">Collect</button>`,
    );
    this.el.querySelector('.collect')!.addEventListener('click', () => actions.collect());
    this.el.querySelector('.raise')?.addEventListener('click', (ev) => {
      ev.preventDefault();
      actions.research();
    });
    parent.appendChild(this.el);
  }

  destroy(): void {
    this.el.remove();
  }
}
