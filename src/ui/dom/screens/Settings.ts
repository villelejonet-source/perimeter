import type { Settings } from '../../../meta/profile';
import type { MetaStore } from '../../../meta/store';
import { icon } from '../icons';
import { h } from '../overlay';

export interface SettingsActions {
  back(): void;
  /** Main menu only: run the first-run tutorial again on the next run. */
  replayTutorial?: () => void;
  /** Main menu only: start the performance test run. */
  stressTest?: () => void;
}

const ROWS: { key: keyof Settings; name: string; note: string }[] = [
  { key: 'sound', name: 'Sound effects', note: 'Weapons, hits, alerts' },
  { key: 'music', name: 'Music', note: 'Menu and battle tracks' },
  { key: 'haptics', name: 'Haptics', note: 'Vibration on key events' },
];

/**
 * Settings (no Claude Design mockup yet; built from the design system, decided 2026-10-04).
 * Opened from the main menu, and from the pause menu during a run (as an overlay).
 */
export class SettingsScreen {
  readonly el: HTMLElement;

  constructor(
    parent: HTMLElement,
    private readonly store: MetaStore,
    private readonly actions: SettingsActions,
    overlay = false,
  ) {
    this.el = h('section', `screen pad settings${overlay ? ' over' : ''}`);
    this.el.setAttribute('aria-label', 'Settings');
    this.el.addEventListener('click', (e) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
      if (!t) return;
      const [act, key] = (t.dataset.act ?? '').split(':');
      if (act === 'back') this.actions.back();
      else if (act === 'replay') this.actions.replayTutorial?.();
      else if (act === 'stress') this.actions.stressTest?.();
      else if (act === 'toggle') {
        const k = key as keyof Settings;
        this.store.updateSettings({ [k]: !this.store.profile.settings[k] });
        this.render();
      }
    });
    parent.appendChild(this.el);
    this.render();
  }

  private render(): void {
    const st = this.store.profile.settings;
    const rows = ROWS.map(
      (
        r,
      ) => `<button class="set-row" data-act="toggle:${r.key}" role="switch" aria-checked="${st[r.key]}">
        <span style="display:flex;flex-direction:column;align-items:flex-start;flex:1"><span class="name">${r.name}</span><span class="caption muted">${r.note}</span></span>
        <span class="switch ${st[r.key] ? 'on' : ''}"><span class="knob"></span></span>
      </button>`,
    ).join('');
    this.el.innerHTML = `<div style="display:flex;align-items:center;gap:10px">
        <button class="btn-sq" data-act="back" aria-label="Back"><span class="inner">${icon.back()}</span></button>
        <h1 class="d title-lg">Settings</h1>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:24px">${rows}</div>
      <span class="caption muted" style="margin-top:8px">Sound and music play once the audio files are added.</span>
      <div style="flex:1"></div>
      ${
        this.actions.replayTutorial
          ? `<button class="btn-secondary" data-act="replay" style="height:56px"><span class="inner btn-md-text">Replay tutorial on next run</span></button>`
          : ''
      }
      ${
        this.actions.stressTest
          ? `<button class="btn-secondary" data-act="stress" style="height:48px;margin-top:8px"><span class="inner btn-md-text">Performance test</span></button>
             <span class="caption muted" style="text-align:center;margin-top:4px">Late wave at 2x with heavy effects. Shows fps; nothing is saved.</span>`
          : ''
      }`;
  }

  destroy(): void {
    this.el.remove();
  }
}
