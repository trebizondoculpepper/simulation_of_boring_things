import { describe, expect, it } from 'vite-plus/test';
import { OUTSIDE, fabricLoss, overTick, ventilationLoss } from './heat-loss';

describe('heat lost to the cold world', () => {
  it('loses through a wall in proportion to its area and the difference across it', () => {
    const one = fabricLoss('wall', 100, 29, OUTSIDE);
    expect(fabricLoss('wall', 200, 29, OUTSIDE)).toBeCloseTo(2 * one, 9);
    expect(fabricLoss('wall', 100, 29 + 24, OUTSIDE)).toBeCloseTo(2 * one, 9);
    // 100 m² of wall, 24 K across it: about a kilowatt.
    expect(one).toBeCloseTo(1.08, 2);
  });

  it('loses nothing once inside is as cold as outside', () => {
    expect(fabricLoss('roof', 500, OUTSIDE, OUTSIDE)).toBe(0);
    expect(ventilationLoss(1000, 4, OUTSIDE, OUTSIDE, 0.6)).toBe(0);
  });

  it('wins back what heat recovery recovers from the air it changes', () => {
    const raw = ventilationLoss(5000, 4, 29, OUTSIDE, 0);
    expect(ventilationLoss(5000, 4, 29, OUTSIDE, 0.6)).toBeCloseTo(
      0.4 * raw,
      9,
    );
  });

  it('turns a rate into a tick’s loss', () => {
    expect(overTick(36, 100)).toBeCloseTo(1, 9);
  });
});
