import { describe, expect, it } from 'vite-plus/test';
import { LENS_DAMAGE, lensDamageLevel, worsenLens } from './lens-damage';
import type { LensDamage } from './lens-damage';

describe('lens damage', () => {
  it('runs from intact to shattered', () => {
    expect(LENS_DAMAGE[0]).toBe('intact');
    expect(LENS_DAMAGE.at(-1)).toBe('shattered');
    expect(lensDamageLevel('cracked')).toBeLessThan(lensDamageLevel('chipped'));
  });

  it('worsens a step at a time, never past shattered, never better', () => {
    expect(worsenLens('intact')).toBe('scuffed');
    expect(worsenLens('scuffed', 2)).toBe('crazed');
    expect(worsenLens('chipped', 5)).toBe('shattered');
    expect(worsenLens('shattered')).toBe('shattered');
    expect(worsenLens('cracked', -3)).toBe('cracked');
    let lens: LensDamage = LENS_DAMAGE[0];
    for (let i = 1; i < LENS_DAMAGE.length; i++) {
      lens = worsenLens(lens);
      expect(lens).toBe(LENS_DAMAGE[i]);
    }
  });
});
