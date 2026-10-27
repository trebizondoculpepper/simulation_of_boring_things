import { describe, expect, it } from 'vite-plus/test';
import { SWITCH_LOCATOR, locatorGlow } from './switch-locator';

describe('a light switch’s locator LED', () => {
  it('glows softly while its gang is off, so it can be found in the dark', () => {
    expect(locatorGlow(false, true)).toBe(SWITCH_LOCATOR.glow);
    expect(SWITCH_LOCATOR.glow).toBeGreaterThan(0);
    expect(SWITCH_LOCATOR.glow).toBeLessThan(1);
  });

  it('goes out while its gang is on, and without a supply', () => {
    expect(locatorGlow(true, true)).toBe(0);
    expect(locatorGlow(false, false)).toBe(0);
    expect(locatorGlow(true, false)).toBe(0);
  });
});
