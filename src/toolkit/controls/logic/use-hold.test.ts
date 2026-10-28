import { describe, expect, it } from 'vite-plus/test';
import { RELEASED, createUseHolds } from './use-hold';

describe('a use held', () => {
  it('is held from its press until its source is let go', () => {
    const holds = createUseHolds();
    const h = holds.press('mouse');
    expect(h.held).toBe(true);
    expect(holds.holding('mouse')).toBe(true);
    holds.release('mouse');
    expect(h.held).toBe(false);
    expect(holds.holding('mouse')).toBe(false);
  });

  it('keeps each source to itself', () => {
    const holds = createUseHolds();
    const key = holds.press('key');
    const pad = holds.press('pad');
    holds.release('key');
    expect(key.held).toBe(false);
    expect(pad.held).toBe(true);
  });

  it('lets go of an earlier hold from the same source on a new press', () => {
    const holds = createUseHolds();
    const first = holds.press('touch');
    const second = holds.press('touch');
    expect(first.held).toBe(false);
    expect(second.held).toBe(true);
  });

  it('lets go of everything at once', () => {
    const holds = createUseHolds();
    const a = holds.press('hud');
    const b = holds.press('mouse');
    holds.releaseAll();
    expect([a.held, b.held]).toEqual([false, false]);
  });

  it('releasing what is not held does nothing', () => {
    const holds = createUseHolds();
    expect(() => holds.release('pad')).not.toThrow();
    expect(RELEASED.held).toBe(false);
  });
});
