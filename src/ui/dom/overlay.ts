import type Phaser from 'phaser';
import { GAME } from '../../data/game';
import './ui.css';

/**
 * The DOM layer for in-run UI. It is exactly the 390 × 844 design, scaled and positioned
 * over the canvas, so every element uses the design's logical px. It only reads sim state
 * and sends commands; the root ignores pointer events except on controls.
 */
export class Overlay {
  readonly root: HTMLDivElement;
  private scale = 1;
  private left = 0;
  private top = 0;

  constructor(private readonly game: Phaser.Game) {
    const existing = document.getElementById('ui');
    existing?.remove();
    this.root = document.createElement('div');
    this.root.id = 'ui';
    document.body.appendChild(this.root);
    this.fit = this.fit.bind(this);
    game.scale.on('resize', this.fit);
    window.addEventListener('resize', this.fit);
    this.fit();
  }

  /** Match the canvas's on-screen rect. */
  fit(): void {
    const r = this.game.canvas.getBoundingClientRect();
    this.scale = r.width / GAME.worldWidth || 1;
    this.left = r.left;
    this.top = r.top;
    this.root.style.transform = `translate(${r.left}px, ${r.top}px) scale(${this.scale})`;
  }

  /** Client (CSS) coordinates → logical screen px of the design. */
  toLogical(clientX: number, clientY: number): { x: number; y: number } {
    return { x: (clientX - this.left) / this.scale, y: (clientY - this.top) / this.scale };
  }

  destroy(): void {
    this.game.scale.off('resize', this.fit);
    window.removeEventListener('resize', this.fit);
    this.root.remove();
  }
}

/** Tiny element builder: h('div', 'cls', html?). */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  html = '',
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (html) el.innerHTML = html;
  return el;
}

/** Sets text only when it changed, so per-frame updates don't touch the DOM. */
export function setText(el: Element, value: string): void {
  if (el.textContent !== value) el.textContent = value;
}

export function toggleClass(el: Element, cls: string, on: boolean): void {
  if (el.classList.contains(cls) !== on) el.classList.toggle(cls, on);
}

export const fmt = {
  int: (n: number): string => Math.floor(n).toLocaleString('en-US'),
  clock: (seconds: number): string => {
    const s = Math.max(0, Math.ceil(seconds));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  },
};
