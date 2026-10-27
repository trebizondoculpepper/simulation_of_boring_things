import { describe, expect, it } from 'vite-plus/test';
import {
  BOTTLE,
  bottleLevel,
  bottleReadout,
  bottleBund,
  bottleSize,
  newDoseBottle,
  stepDoseBottle,
} from './dose-bottle';

describe('a dose bottle: sensor, switches, its own pump, its display', () => {
  it('calls at low and stops calling at high, filled through its lid', () => {
    let b = newDoseBottle(30, 0.15);
    b = stepDoseBottle(b, {}, 1);
    expect(b.calling).toBe(true);
    for (let t = 0; t < 600 && b.calling; t++)
      b = stepDoseBottle(b, { fillLpm: b.calling ? 5 : 0 }, 1);
    expect(b.calling).toBe(false);
    expect(bottleLevel(b)).toBeGreaterThanOrEqual(BOTTLE.high);
  });

  it('doses through its pump, cutting out before it runs dry', () => {
    let b = newDoseBottle(15, 0.1);
    for (let t = 0; t < 3600; t++) b = stepDoseBottle(b, { doseLpm: 1 }, 1);
    expect(b.pumping).toBe(false);
    expect(bottleLevel(b)).toBeGreaterThan(0);
    expect(bottleLevel(b)).toBeLessThanOrEqual(BOTTLE.empty + 0.01);
  });

  it('shows nothing, calls for nothing and pumps nothing unpowered', () => {
    const b = stepDoseBottle(
      newDoseBottle(60, 0.1),
      { doseLpm: 1, powered: false },
      5,
    );
    expect(b.pumping).toBe(false);
    expect(b.calling).toBe(false);
    expect(bottleReadout(b, false)).toMatchObject({
      litres: null,
      low: false,
      pumping: false,
    });
    expect(bottleReadout(newDoseBottle(60, 0.1)).low).toBe(true);
  });

  it('holds its litres in a bottle about 1.4 times as tall as wide', () => {
    for (const litres of [15, 30, 60, 200, 300, 500]) {
      const { d, h } = bottleSize(litres);
      expect(((Math.PI * d * d) / 4) * h * 1000).toBeCloseTo(litres, 6);
    }
  });

  it('stands on a spill pallet whose sump holds 110% of it', () => {
    for (const litres of [15, 30, 60, 200, 300, 500]) {
      const { side, sump } = bottleBund(litres);
      expect(side * side * sump * 1000).toBeCloseTo(litres * 1.1, 6);
    }
  });
});
