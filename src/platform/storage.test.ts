import { describe, expect, it } from 'vitest';
import { WebStorage } from './storage';

describe('WebStorage (web mock)', () => {
  it('round-trips JSON values and removes keys', async () => {
    const s = new WebStorage();
    expect(await s.get('missing')).toBeNull();
    await s.set('save', { schemaVersion: 1, cores: 42 });
    expect(await s.get('save')).toEqual({ schemaVersion: 1, cores: 42 });
    await s.remove('save');
    expect(await s.get('save')).toBeNull();
  });
});
