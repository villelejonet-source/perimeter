import { ARTIFACTS, TIER_NAMES, type OwnedArtifact } from '../../data/artifacts';
import { artifactIcon } from './artifactArt';
import { icon } from './icons';
import { fmt, h } from './overlay';

export interface PauseInfo {
  wave: number;
  baseHp: number;
  maxBaseHp: number;
  /** What the run would pay if it ended now. */
  cores: number;
  shards: number;
  /** Artifacts picked this run. */
  artifacts: readonly OwnedArtifact[];
}

/**
 * Pause menu (in-run/Pause.dc.html) and its retreat confirmation (Pause-Retreat.dc.html).
 * GDD §5: retreat ends the run and keeps 100% of what was earned.
 */
export class PauseMenu {
  private readonly el: HTMLElement;

  constructor(
    parent: HTMLElement,
    private readonly info: PauseInfo,
    private readonly actions: { resume(): void; retreat(): void },
  ) {
    this.el = h('div');
    parent.appendChild(this.el);
    this.showPaused();
  }

  private earned(suffix: string): string {
    const s = this.info.shards;
    return `<div class="earned">
      <div>${icon.cores(24)}<span class="d">${fmt.int(this.info.cores)}</span><span class="caption muted">Cores${suffix}</span></div>
      <div>${icon.shards(24)}<span class="d">${fmt.int(s)}</span><span class="caption muted">${s === 1 ? 'Shard' : 'Shards'}${suffix}</span></div>
    </div>`;
  }

  private showPaused(): void {
    const i = this.info;
    this.el.innerHTML = `<div class="scrim"></div>
      <div style="position:absolute;left:16px;top:132px;width:358px;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center">
        <h1 class="d" style="margin:0;font-size:40px;line-height:44px;font-weight:800;letter-spacing:.04em">PAUSED</h1>
        <span class="muted" style="font-size:16px;line-height:22px;font-weight:500">Wave ${i.wave} · Base ${i.baseHp}/${i.maxBaseHp}</span>
      </div>
      <div style="position:absolute;left:16px;top:236px;width:358px;box-sizing:border-box;padding:16px;display:flex;flex-direction:column;gap:12px;background:var(--surface-200);border:1px solid var(--line)">
        <span class="label muted">EARNED THIS RUN</span>${this.earned('')}
      </div>
      <div style="position:absolute;left:16px;top:360px;width:358px;box-sizing:border-box;padding:16px;display:flex;flex-direction:column;gap:12px;background:var(--surface-200);border:1px solid var(--line)">
        <span class="label muted">ARTIFACTS · ${i.artifacts.length}</span>
        ${
          i.artifacts.length
            ? `<div style="display:flex;flex-wrap:wrap;gap:8px">${i.artifacts
                .map(
                  (a) =>
                    `<span role="img" aria-label="${ARTIFACTS[a.id].name}, ${TIER_NAMES[a.tier]}" title="${ARTIFACTS[a.id].name}">${artifactIcon(a.id, a.tier, 40)}</span>`,
                )
                .join('')}</div>`
            : '<span class="caption muted">None yet. Each boss you defeat offers one.</span>'
        }
      </div>
      <div class="sheet">
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">
          <button class="btn-secondary" disabled style="height:48px"><span class="inner btn-md-text" style="gap:8px">${icon.gear(18)}Settings</span></button>
          <button class="btn-secondary retreat" style="height:48px"><span class="inner btn-md-text" style="gap:8px">${icon.exit(18)}Retreat</span></button>
        </div>
        <span class="caption muted" style="text-align:center">Retreat ends the run now. You keep everything earned so far.</span>
        <button class="btn-primary btn-lg-text resume" style="height:56px;display:flex;align-items:center;justify-content:center;gap:8px">${icon.playSolid(18)}Resume</button>
      </div>`;
    this.el.querySelector('.resume')!.addEventListener('click', () => this.actions.resume());
    this.el.querySelector('.retreat')!.addEventListener('click', () => this.showConfirm());
  }

  private showConfirm(): void {
    this.el.innerHTML = `<div class="scrim"></div>
      <div class="sheet" role="dialog" aria-labelledby="retreat-title" style="padding-top:24px;gap:20px">
        <div style="display:flex;flex-direction:column;gap:8px">
          <h2 id="retreat-title" class="d" style="margin:0;font-size:28px;line-height:32px;font-weight:700;letter-spacing:.04em">RETREAT?</h2>
          <p class="muted" style="margin:0;font-size:16px;line-height:22px;font-weight:500">The run ends at wave ${this.info.wave}. You keep everything earned so far.</p>
        </div>
        ${this.earned(' kept')}
        <div style="display:flex;flex-direction:column;gap:12px">
          <button class="btn-secondary yes" style="height:48px"><span class="inner btn-md-text" style="gap:8px">${icon.exit(18)}Yes, retreat</span></button>
          <button class="btn-primary btn-lg-text keep" style="height:56px">Keep fighting</button>
        </div>
      </div>`;
    this.el.querySelector('.yes')!.addEventListener('click', () => this.actions.retreat());
    this.el.querySelector('.keep')!.addEventListener('click', () => this.showPaused());
  }

  destroy(): void {
    this.el.remove();
  }
}
