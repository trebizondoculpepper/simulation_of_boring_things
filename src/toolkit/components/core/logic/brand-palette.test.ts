import { describe, expect, it } from 'vite-plus/test';
import { BRANDS, brandById } from './brands';
import {
  brandPalette,
  contrast,
  hexToHsl,
  hslToHex,
  luminance,
} from './brand-palette';

describe('colour arithmetic', () => {
  it('measures contrast as WCAG does', () => {
    expect(contrast('#ffffff', '#000000')).toBeCloseTo(21);
    expect(contrast('#777777', '#777777')).toBeCloseTo(1);
    expect(luminance('#ffffff')).toBeCloseTo(1);
  });

  it('turns colours to hue, saturation and lightness and back', () => {
    for (const hex of ['#3f9b3a', '#0b4f9c', '#e2462f', '#808080'])
      expect(hslToHex(hexToHsl(hex))).toBe(hex);
  });
});

describe('the brands’ house palettes', () => {
  it('give every brand an accent that stands out against its main colour', () => {
    for (const brand of BRANDS)
      expect(
        contrast(brandPalette(brand).accent, brand.colours[0]),
      ).toBeGreaterThanOrEqual(3);
  });

  it('take the accent from the far side of the colour wheel', () => {
    const { accent, main } = brandPalette(brandById('chlorella'));
    const gap = Math.abs(hexToHsl(accent).h - hexToHsl(main).h) % 360;
    expect(Math.min(gap, 360 - gap)).toBeGreaterThanOrEqual(150);
  });

  it('keep tints light, shades dark and casings nearly neutral', () => {
    for (const brand of BRANDS) {
      const p = brandPalette(brand);
      expect(hexToHsl(p.tint).l).toBeGreaterThan(0.85);
      expect(hexToHsl(p.shade).l).toBeLessThan(0.25);
      expect(hexToHsl(p.casing).s).toBeLessThanOrEqual(0.13);
    }
  });

  it('print legibly on the main colour and on the casing', () => {
    for (const brand of BRANDS) {
      const p = brandPalette(brand);
      expect(contrast(p.onMain, p.main)).toBeGreaterThanOrEqual(3);
      expect(contrast(p.onCasing, p.casing)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
