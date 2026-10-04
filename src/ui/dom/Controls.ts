import { callEarlyBonus } from '../../data/curves';
import { GAME } from '../../data/game';
import { TOWER_ORDER, TOWERS, type TowerKind } from '../../data/towers';
import { placeCost, type SimState } from '../../sim';
import { towerFrames } from '../../render/unitArt';
import { unitSvgUri } from '../../render/units';
import { icon, C } from './icons';
import { fmt, h, setText, toggleClass } from './overlay';

/** How long the "not enough Credits" state stays up after a denied tap. */
const DENIED_MS = 1800;

export interface ControlsActions {
  togglePause(): void;
  setSpeed(speed: number): void;
  callEarly(): void;
  dragStart(kind: TowerKind, e: PointerEvent): void;
  dragMove(e: PointerEvent): void;
  dragEnd(e: PointerEvent): void;
  denied(on: boolean): void;
}

interface Slot {
  kind: TowerKind;
  el: HTMLButtonElement;
  cost: HTMLElement;
}

/** Control row (pause · speed · CALL EARLY) and build bar, y 654–844. */
export class Controls {
  readonly el: HTMLDivElement;
  private readonly row: HTMLDivElement;
  private readonly pause: HTMLButtonElement;
  private readonly speeds: HTMLButtonElement[] = [];
  private readonly bonus: HTMLElement;
  private readonly status: HTMLDivElement;
  private readonly statusDetail: HTMLElement;
  private readonly statusShort: HTMLElement;
  private readonly slotsEl: HTMLDivElement;
  private readonly dropCancel: HTMLDivElement;
  private readonly slots: Slot[] = [];
  private dragging = false;
  private deniedUntil = 0;
  private wasDenied = false;
  private paused: boolean | null = null;
  private deniedSlot: Slot | null = null;
  private deniedCost = 0;
  private deniedName = '';

  constructor(
    parent: HTMLElement,
    unlocked: readonly TowerKind[],
    speeds: readonly number[],
    private readonly actions: ControlsActions,
  ) {
    this.el = h('div', 'controls');

    this.row = h('div', 'control-row');
    this.pause = h('button', 'pause-btn btn-secondary', '<span class="inner"></span>');
    this.pause.addEventListener('click', () => actions.togglePause());
    const speedGroup = h('div', 'speed-group');
    speedGroup.setAttribute('role', 'group');
    speedGroup.setAttribute('aria-label', 'Game speed');
    for (const n of speeds) {
      const b = h('button', '', `${n}x`);
      b.addEventListener('click', () => actions.setSpeed(n));
      speedGroup.appendChild(b);
      this.speeds.push(b);
    }
    if (!speeds.includes(3)) {
      // 3x unlocks in the Research Lab.
      const locked3x = h('button', '', `${icon.lock(14)}3x`);
      locked3x.disabled = true;
      locked3x.setAttribute('aria-label', '3x speed, locked (Research Lab)');
      speedGroup.appendChild(locked3x);
    }
    const call = h(
      'button',
      'call-early btn-primary',
      `<span class="btn-lg-text">CALL EARLY</span><span class="bonus d">${icon.coin(14, C.onAccent)}<span></span></span>`,
    );
    call.setAttribute('aria-label', 'Call next wave early for bonus Credits');
    call.addEventListener('click', () => actions.callEarly());
    this.bonus = call.querySelector('.bonus > span')!;
    this.row.append(this.pause, speedGroup, call);

    this.status = h(
      'div',
      'status-bar',
      `${icon.xOctagon(24)}<div style="display:flex;flex-direction:column;gap:2px;flex:1"><span class="btn-md-text">NOT ENOUGH CREDITS</span><span class="caption muted"></span></div><div class="money d">${icon.coin()}<span></span></div>`,
    );
    this.status.setAttribute('role', 'status');
    this.status.hidden = true;
    this.statusDetail = this.status.querySelector('.caption')!;
    this.statusShort = this.status.querySelector('.money > span')!;
    const rowWrap = h('div');
    rowWrap.style.position = 'relative';
    rowWrap.append(this.row, this.status);

    const bar = h('div', 'build-bar');
    this.slotsEl = h('div', 'slots');
    // Build bar in tower order (Controls.dc.html); towers not yet researched show LOCKED.
    for (const kind of TOWER_ORDER) {
      if (unlocked.includes(kind)) this.slotsEl.appendChild(this.buildSlot(kind));
      else {
        const b = h(
          'button',
          'slot locked',
          `<span class="art" style="display:flex;align-items:center;justify-content:center">${icon.lock(24, C.inkFaint, 2)}</span><span class="lock-label">LOCKED</span>`,
        );
        b.disabled = true;
        b.setAttribute('aria-label', `${TOWERS[kind].name}, locked`);
        this.slotsEl.appendChild(b);
      }
    }
    this.dropCancel = h(
      'div',
      'drop-cancel',
      `${icon.close(20, C.inkMuted)}<span class="btn-md-text">DROP HERE TO CANCEL</span>`,
    );
    this.dropCancel.hidden = true;
    bar.append(this.slotsEl, this.dropCancel);

    this.el.append(rowWrap, bar);
    parent.appendChild(this.el);
  }

  private buildSlot(kind: TowerKind): HTMLElement {
    const frames = towerFrames(kind, 1);
    const art = `<span class="art"><img alt="" src="${unitSvgUri(frames.base)}"><img alt="" src="${unitSvgUri(frames.turret)}"></span>`;
    const el = h(
      'button',
      'slot',
      `${art}<span class="cost d"><span class="coin"></span><span class="n"></span></span>`,
    );
    const cost = el.querySelector<HTMLElement>('.n')!;
    const slot: Slot = { kind, el, cost };
    this.slots.push(slot);

    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (el.classList.contains('unaffordable')) {
        this.deny(slot);
        return;
      }
      // Capture keeps move/up events on the slot while the finger travels over the canvas.
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        // Synthetic or already-released pointers can't be captured; moves still bubble here.
      }
      this.dragging = true;
      this.actions.dragStart(kind, e);
    });
    el.addEventListener('pointermove', (e) => {
      if (this.dragging) this.actions.dragMove(e);
    });
    const end = (e: PointerEvent): void => {
      if (!this.dragging) return;
      this.dragging = false;
      this.actions.dragEnd(e);
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    return el;
  }

  /** While a tower is being dragged: hide the control row, turn the bar into a cancel zone. */
  setDragMode(on: boolean): void {
    this.row.style.visibility = on ? 'hidden' : '';
    this.slotsEl.hidden = on;
    this.dropCancel.hidden = !on;
  }

  private deny(slot: Slot): void {
    const def = TOWERS[slot.kind];
    this.deniedUntil = performance.now() + DENIED_MS;
    this.deniedSlot = slot;
    this.deniedCost = placeCost(slot.kind);
    this.deniedName = def.name;
  }
  update(s: SimState, speed: number, now: number): void {
    if (this.paused !== s.paused) {
      this.paused = s.paused;
      this.pause.firstElementChild!.innerHTML = s.paused ? icon.play() : icon.pause();
      this.pause.setAttribute('aria-label', s.paused ? 'Resume' : 'Pause');
    }
    this.speeds.forEach((b, i) => {
      const on = String(i + 1 === speed);
      // Speed buttons are 1x, 2x[, 3x] in order.
      if (b.getAttribute('aria-pressed') !== on) b.setAttribute('aria-pressed', on);
    });
    setText(
      this.bonus,
      `+${fmt.int(callEarlyBonus(s.nextWaveIn / GAME.tickRate, GAME.callEarlyCreditsPerSecond, s.wave + 1))}`,
    );

    for (const slot of this.slots) {
      const cost = placeCost(slot.kind);
      setText(slot.cost, fmt.int(cost));
      const afford = s.credits >= cost;
      toggleClass(slot.el, 'unaffordable', !afford);
      slot.el.setAttribute(
        'aria-label',
        `${TOWERS[slot.kind].name}, ${cost} Credits${afford ? '' : ", can't afford"}`,
      );
      const coin = slot.el.querySelector('.coin')!;
      const want = afford ? 'ok' : 'no';
      if (coin.getAttribute('data-s') !== want) {
        coin.setAttribute('data-s', want);
        coin.innerHTML = icon.coin(14, afford ? C.credits : C.inkFaint);
      }
    }

    // Not-enough-Credits state clears early once the player can afford it.
    const deniedSlot = this.deniedSlot;
    const need = this.deniedCost - s.credits;
    const denied = deniedSlot !== null && now < this.deniedUntil && need > 0;
    if (denied) {
      setText(
        this.statusDetail,
        `${this.deniedName} costs ${fmt.int(this.deniedCost)}. You need ${fmt.int(need)} more.`,
      );
      setText(this.statusShort, `−${fmt.int(need)}`);
    }
    if (denied !== this.wasDenied) {
      this.wasDenied = denied;
      this.status.hidden = !denied;
      this.row.style.visibility = denied ? 'hidden' : '';
      for (const slot of this.slots) toggleClass(slot.el, 'denied', denied && slot === deniedSlot);
      this.actions.denied(denied);
      if (!denied) this.deniedSlot = null;
    }
  }
}
