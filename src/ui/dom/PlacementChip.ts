import { TOWERS, type TowerKind } from '../../data/towers';
import { placeCost } from '../../sim';
import type { PlacementRejection } from '../../render/input/Placement';
import { icon } from './icons';
import { fmt, h } from './overlay';

/** Copy from docs/design/screens/in-run/Place-*.dc.html. */
function reasonText(reason: PlacementRejection, blocker: string): string {
  switch (reason) {
    case 'onPath':
      return "CAN'T BUILD ON THE PATH";
    case 'nearPath':
      return 'TOO CLOSE TO THE PATH';
    case 'overlap':
      return `SPACE TAKEN BY ${blocker.toUpperCase()}`;
    case 'credits':
      return 'NOT ENOUGH CREDITS';
    case 'outOfBounds':
      return "CAN'T BUILD HERE";
  }
}

export interface ChipState {
  kind: TowerKind;
  /** Ghost centre in logical screen px. */
  x: number;
  y: number;
  /** Range radius in logical px. */
  range: number;
  error: PlacementRejection | null;
  blocker: string;
}

/** Label above the placement ghost: name + cost when valid, the reason when not. */
export class PlacementChip {
  private readonly el: HTMLDivElement;
  private key = '';

  constructor(parent: HTMLElement) {
    this.el = h('div', 'chip');
    this.el.hidden = true;
    parent.appendChild(this.el);
  }

  show(c: ChipState): void {
    const key = `${c.kind}|${c.error}|${c.blocker}`;
    if (key !== this.key) {
      this.key = key;
      this.el.className = `chip ${c.error ? 'invalid' : 'valid'}`;
      this.el.innerHTML = c.error
        ? `${icon.xOctagon()}<span>${reasonText(c.error, c.blocker)}</span>`
        : `${icon.checkCircle()}<span>${TOWERS[c.kind].name.toUpperCase()}</span>${icon.coin(14)}<span class="d" style="font-size:15px">${fmt.int(placeCost(c.kind))}</span>`;
    }
    this.el.hidden = false;
    const w = this.el.offsetWidth;
    // Sit 8 px above the range circle (below it if that would hit the HUD), clamped to the screen.
    let top = c.y - c.range - 8 - 32;
    if (top < 112) top = c.y + c.range + 8;
    const left = Math.min(Math.max(c.x - w / 2, 8), 390 - 8 - w);
    this.el.style.transform = `translate(${left}px, ${top}px)`;
  }

  hide(): void {
    this.el.hidden = true;
  }
}
