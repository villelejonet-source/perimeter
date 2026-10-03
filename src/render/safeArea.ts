import type Phaser from 'phaser';
import { VIEW_HEIGHT } from './layout';

export interface Insets {
  top: number;
  bottom: number;
}

/**
 * Safe-area insets (notch, home indicator) converted to game pixels, minus any
 * letterboxing the FIT scaler already added.
 */
export function readSafeArea(game: Phaser.Game): Insets {
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;visibility:hidden;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)';
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const topCss = parseFloat(cs.paddingTop) || 0;
  const bottomCss = parseFloat(cs.paddingBottom) || 0;
  probe.remove();

  const rect = game.canvas.getBoundingClientRect();
  const scale = VIEW_HEIGHT / (rect.height || VIEW_HEIGHT);
  const letterTop = rect.top;
  const letterBottom = window.innerHeight - rect.bottom;
  return {
    top: Math.max(0, topCss - letterTop) * scale,
    bottom: Math.max(0, bottomCss - letterBottom) * scale,
  };
}
