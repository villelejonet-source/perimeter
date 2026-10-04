import type { Fx, FxKind, SimState } from './state';

/** Emit a short-lived visual record. Purely for the renderer; never affects gameplay. */
export function emitFx(
  state: SimState,
  kind: FxKind,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  ttl: number,
  radius = 0,
): Fx {
  const f = state.fx.acquire();
  f.kind = kind;
  f.x1 = x1;
  f.y1 = y1;
  f.x2 = x2;
  f.y2 = y2;
  f.radius = radius;
  f.ttl = ttl;
  f.maxTtl = ttl;
  return f;
}

export function updateFx(state: SimState): void {
  for (const f of state.fx.items) {
    if (!f.alive) continue;
    f.ttl--;
    if (f.ttl <= 0) f.alive = false;
  }
}
