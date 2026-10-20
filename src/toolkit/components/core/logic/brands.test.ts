import { describe, expect, it } from 'vite-plus/test';
import { BRANDS, brandById } from './brands';

describe('the brands', () => {
  it('are seventeen companies, each with an id and name of its own', () => {
    expect(BRANDS).toHaveLength(17);
    expect(new Set(BRANDS.map((b) => b.id)).size).toBe(17);
    expect(new Set(BRANDS.map((b) => b.name)).size).toBe(17);
  });

  it('keep the companies the two games have already named', () => {
    const names = BRANDS.map((b) => b.name);
    for (const name of [
      'Neumann Dynamik',
      'Volt Xoccula',
      'Bonk Industries',
      'Wonshou Labs',
      'Trager-Feinstein Laboratory',
      'Synclex',
      'Gorskiy',
      'Pepperdyne',
      'Voltara',
      'Fankel',
    ])
      expect(names).toContain(name);
  });

  it('give each brand its own logo and three colours', () => {
    expect(new Set(BRANDS.map((b) => b.mark)).size).toBe(17);
    for (const brand of BRANDS) {
      expect(brand.colours).toHaveLength(3);
      for (const colour of brand.colours)
        expect(colour).toMatch(/^#[0-9a-f]{6}$/);
      expect(brand.promise.length).toBeGreaterThan(0);
      expect(brand.founded).toBeGreaterThan(1900);
      expect(brand.founded).toBeLessThan(2026);
    }
  });

  it('find each brand by its id, as a device names its maker', () => {
    for (const brand of BRANDS) expect(brandById(brand.id)).toBe(brand);
  });
});
