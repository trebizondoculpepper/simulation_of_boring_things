import { describe, expect, it } from 'vite-plus/test';
import {
  ABSORPTION,
  CAUSTIC_FOCUS,
  causticFocus,
  throughWater,
  transmittance,
  viewPath,
} from './water-optics';

describe('light through the pool’s water', () => {
  it('follows Beer–Lambert: each metre keeps the same fraction, red least', () => {
    const [r1, g1, b1] = transmittance(1);
    const [r2] = transmittance(2);
    expect(r1).toBeCloseTo(Math.exp(-ABSORPTION[0]), 12);
    expect(r2).toBeCloseTo(r1 * r1, 12);
    expect(r1).toBeLessThan(g1);
    expect(g1).toBeLessThan(b1);
  });

  it('lengthens the line of sight as the view flattens, bent by refraction', () => {
    expect(viewPath(1, -1)).toBeCloseTo(1, 12);
    expect(viewPath(1, -0.5)).toBeGreaterThan(1);
    // Refraction keeps even a grazing view's path finite.
    expect(viewPath(1, 0)).toBeLessThan(1.6);
  });

  it('turns white tile turquoise, then deeper blue-green, with depth', () => {
    const shallow = throughWater([1, 1, 1], 0.9, -0.7);
    const deep = throughWater([1, 1, 1], 2, -0.7);
    expect(shallow[0]).toBeLessThan(shallow[2]);
    expect(deep[0]).toBeLessThan(shallow[0]);
    expect(deep[1] + deep[2]).toBeLessThan(shallow[1] + shallow[2]);
  });

  it('focuses its caustics: none at the surface, brightest at the focal depth, fading beyond', () => {
    expect(causticFocus(0)).toBe(0);
    expect(causticFocus(CAUSTIC_FOCUS)).toBeCloseTo(1, 12);
    expect(causticFocus(0.2)).toBeLessThan(causticFocus(0.6));
    expect(causticFocus(2)).toBeLessThan(causticFocus(1));
  });
});
