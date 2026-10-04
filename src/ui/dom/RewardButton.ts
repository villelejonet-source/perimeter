import { C } from './icons';
import { h } from './overlay';

export type RewardState = 'ad' | 'pass' | 'busy' | 'unavailable' | 'claimed';

const PLAY = `<svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" style="flex:none;fill:none;stroke:${C.credits};stroke-width:2"><circle cx="12" cy="12" r="9.5"/><path d="M10 8v8l6.5-4z" style="fill:${C.credits};stroke-linejoin:round"/></svg>`;
const CHECK = `<svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" style="flex:none;fill:none;stroke:${C.credits};stroke-width:2;stroke-linecap:round;stroke-linejoin:round"><circle cx="12" cy="12" r="9.5"/><path d="M8 12.5l3 3 5-6"/></svg>`;

/**
 * Opt-in rewarded-ad button (WelcomeBack.dc.html "Double with ad", RunEnd.dc.html "Double
 * Cores"): outlined in reward gold with a play-in-circle icon, never the primary button. With the
 * Commander Pass it grants without an ad.
 */
export class RewardButton {
  readonly el: HTMLButtonElement;
  private readonly sub: HTMLElement;
  private state: RewardState = 'ad';
  private readonly timer: ReturnType<typeof setInterval>;

  /** `poll` reports ad availability; it's re-checked every second until used. */
  constructor(
    title: string,
    private readonly detail: string,
    badge: string,
    private readonly poll: () => RewardState,
    onClick: () => void,
  ) {
    this.el = h(
      'button',
      'btn-reward',
      `<span class="inner"><span class="ic"></span>
        <span style="flex:1;display:flex;flex-direction:column;align-items:flex-start;text-align:left">
          <span class="btn-lg-text" style="color:var(--credits)">${title}</span>
          <span class="caption muted sub"></span>
        </span>
        ${badge ? `<span class="d" style="font-size:20px;line-height:24px;font-weight:700;color:var(--credits)">${badge}</span>` : ''}
      </span>`,
    );
    this.sub = this.el.querySelector('.sub')!;
    this.el.addEventListener('click', () => {
      if (this.state === 'ad' || this.state === 'pass') onClick();
    });
    this.set(poll());
    this.timer = setInterval(() => {
      if (!this.el.isConnected) return clearInterval(this.timer);
      if (this.state === 'ad' || this.state === 'unavailable') {
        const next = this.poll();
        if (next !== this.state) this.set(next);
      }
    }, 1000);
  }

  destroy(): void {
    clearInterval(this.timer);
  }

  /** Runs the reward flow: busy while the ad plays, claimed on success. */
  async run(earn: () => Promise<boolean>, grant: () => void): Promise<void> {
    this.set('busy');
    if (await earn()) {
      grant();
      this.set('claimed');
    } else {
      this.set(this.poll() === 'ad' ? 'ad' : 'unavailable');
    }
  }

  set(state: RewardState): void {
    this.state = state;
    this.el.disabled = state === 'busy' || state === 'unavailable' || state === 'claimed';
    this.el.querySelector('.ic')!.innerHTML =
      state === 'pass' || state === 'claimed' ? CHECK : PLAY;
    this.sub.textContent =
      state === 'ad'
        ? `Optional · short video · ${this.detail}`
        : state === 'pass'
          ? `Commander Pass · no ad · ${this.detail}`
          : state === 'busy'
            ? 'Playing ad…'
            : state === 'unavailable'
              ? 'No ad available right now'
              : 'Claimed';
  }
}
