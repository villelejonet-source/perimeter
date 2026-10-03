import type { Sim } from './sim';

/** FNV-1a over a canonical dump of the gameplay state. Used by determinism tests. */
export function stateHash(sim: Sim): string {
  const s = sim.state;
  const parts: (number | string | boolean)[] = [
    s.tick,
    s.baseHp,
    s.credits,
    s.wave,
    s.nextWaveIn,
    s.nextId,
    s.gameOver,
    sim.rng.state,
    s.stats.kills,
    s.stats.leaks,
    s.stats.damageDealt,
  ];
  for (const e of s.enemies.items) if (e.alive) parts.push(e.id, e.dist, e.hp);
  for (const t of s.towers.items)
    if (t.alive) parts.push(t.id, t.x, t.y, t.level, t.cooldown, t.targeting);
  for (const p of s.projectiles.items) if (p.alive) parts.push(p.x, p.y, p.targetId);
  const str = parts.join('|');
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}
