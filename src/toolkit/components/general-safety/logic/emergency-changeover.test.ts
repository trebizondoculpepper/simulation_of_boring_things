import { describe, expect, it } from 'vite-plus/test';
import {
  CHANGEOVER_HIGHEST,
  CHANGEOVER_LOWEST,
  CHANGEOVER_RETURN_SECONDS,
  createChangeover,
} from './emergency-changeover';

describe('an emergency light changing over to its battery', () => {
  it('stays on mains at 85 % and above, and is on its battery at 60 %', () => {
    for (let seed = 0; seed < 50; seed++) {
      const c = createChangeover(seed);
      expect(c.step(0.01, 0.85)).toBe(false);
      expect(c.step(0.01, 0.6)).toBe(true);
    }
  });

  it('lights at once when its supply is cut', () => {
    expect(createChangeover(1).step(0.01, 0)).toBe(true);
  });

  it('goes back to charging only once the supply has recovered for a moment', () => {
    const c = createChangeover(2);
    c.step(0.01, 0);
    expect(c.step(0.1, 1)).toBe(true);
    let t = 0.1;
    while (t < CHANGEOVER_RETURN_SECONDS - 0.05) {
      expect(c.step(0.05, 1)).toBe(true);
      t += 0.05;
    }
    expect(c.step(0.1, 1)).toBe(false);
  });

  it('changes over at a threshold of its own, so a sag lights only some', () => {
    const thresholds = Array.from(
      { length: 40 },
      (_, i) => createChangeover(i).threshold,
    );
    for (const t of thresholds) {
      expect(t).toBeGreaterThanOrEqual(CHANGEOVER_LOWEST);
      expect(t).toBeLessThanOrEqual(CHANGEOVER_HIGHEST);
    }
    const sag = 0.7;
    const lit = thresholds.filter((t) => sag < t).length;
    expect(lit).toBeGreaterThan(0);
    expect(lit).toBeLessThan(thresholds.length);
  });
});
