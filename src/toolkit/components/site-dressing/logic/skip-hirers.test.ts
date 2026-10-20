import { describe, expect, it } from 'vite-plus/test';
import { SKIP_HIRERS, anySkipHirer } from './skip-hirers';

describe('the skip hire firms', () => {
  it('are ten, each with a name of its own', () => {
    expect(SKIP_HIRERS).toHaveLength(10);
    const names = SKIP_HIRERS.map((h) => h.name.join(' '));
    expect(new Set(names).size).toBe(10);
  });

  it('only give numbers kept for drama, so none rings a real line', () => {
    for (const { phone } of SKIP_HIRERS)
      expect(phone).toMatch(/^01632 960\d{3}$/);
    expect(new Set(SKIP_HIRERS.map((h) => h.phone)).size).toBe(10);
  });

  it('are chosen at random, every one of them in its turn', () => {
    const seen = new Set(
      Array.from({ length: 10 }, (_, i) => anySkipHirer(() => i / 10)),
    );
    expect(seen.size).toBe(10);
    expect(anySkipHirer(() => 0.999999)).toBe(SKIP_HIRERS[9]);
  });
});
