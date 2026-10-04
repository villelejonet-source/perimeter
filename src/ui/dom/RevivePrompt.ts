import { h } from './overlay';
import { RewardButton, type RewardState } from './RewardButton';

/**
 * Base fell (GDD §12): one revive per run for a rewarded ad (free with the Commander Pass).
 * No mockup yet; built from the design system. "End run" goes to the run end as before.
 */
export class RevivePrompt {
  private readonly el: HTMLElement;
  private readonly button: RewardButton;

  constructor(
    parent: HTMLElement,
    info: { wave: number; reviveHp: number; maxBaseHp: number },
    actions: {
      earn(): Promise<boolean>;
      state(): RewardState;
      revive(): void;
      end(): void;
    },
  ) {
    this.el = h(
      'section',
      'revive',
      `<div class="scrim"></div>
       <div class="revive-col">
         <div style="display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center">
           <span class="label" style="color:var(--danger)">Base breached · wave ${info.wave}</span>
           <h1 class="d title-lg" style="font-size:36px;line-height:40px">Revive?</h1>
           <span class="caption muted">Come back with ${info.reviveHp} / ${info.maxBaseHp} base HP and keep this run going. Once per run.</span>
         </div>
         <div class="revive-actions" style="display:flex;flex-direction:column;gap:12px">
           <button class="btn-secondary end" style="height:48px"><span class="inner btn-md-text">End run</span></button>
         </div>
       </div>`,
    );
    this.button = new RewardButton(
      'Revive',
      `${info.reviveHp} base HP`,
      '',
      actions.state,
      () => void this.button.run(actions.earn, actions.revive),
    );
    this.el.querySelector('.revive-actions')!.prepend(this.button.el);
    this.el.querySelector('.end')!.addEventListener('click', () => actions.end());
    parent.appendChild(this.el);
  }

  destroy(): void {
    this.button.destroy();
    this.el.remove();
  }
}
