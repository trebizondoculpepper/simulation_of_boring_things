import { describe, expect, it } from 'vite-plus/test';
import { cutOpenings, slide } from './walk-collision';

const wall = { minX: -10, maxX: 10, minZ: 4, maxZ: 5 };

describe('slide', () => {
  it('moves freely through open floor', () => {
    const { x, z } = slide([wall], 0, 0, 1, 1, 0.5);
    expect(x).toBeCloseTo(1);
    expect(z).toBeCloseTo(1);
  });

  it('stops at a wall, keeping the walker a radius away', () => {
    const { z } = slide([wall], 0, 0, 0, 10, 0.5);
    expect(z).toBeLessThanOrEqual(3.5);
    expect(z).toBeGreaterThan(3);
  });

  it('slides along a wall when walking into it at an angle', () => {
    const { x, z } = slide([wall], 0, 3, 2, 2, 0.5);
    expect(x).toBeCloseTo(2);
    expect(z).toBeLessThanOrEqual(3.5);
  });

  it('cannot tunnel through a thin wall in one long step', () => {
    const thin = { minX: -10, maxX: 10, minZ: 4, maxZ: 4.05 };
    expect(slide([thin], 0, 0, 0, 40, 0.5).z).toBeLessThan(4);
  });

  it('passes through a doorway between two wall sections', () => {
    const left = { minX: -10, maxX: -1, minZ: 4, maxZ: 5 };
    const right = { minX: 1, maxX: 10, minZ: 4, maxZ: 5 };
    expect(slide([left, right], 0, 0, 0, 8, 0.5).z).toBeCloseTo(8);
  });

  it('lets a walker caught inside something step back out', () => {
    expect(slide([wall], 0, 4.5, 0, -3, 0.5).z).toBeCloseTo(1.5);
  });
});

describe('openings cut through solids', () => {
  it('lets a walker through a doorway in a wall, and not beside it', () => {
    const wall = { minX: -5, maxX: 5, minZ: -0.15, maxZ: 0.15 };
    const door = { minX: -0.5, maxX: 0.5, minZ: -1, maxZ: 1 };
    const cut = cutOpenings([wall], [door]);
    const through = slide(cut, 0, 1, 0, -2, 0.25);
    expect(through.z).toBeCloseTo(-1);
    const beside = slide(cut, 2, 1, 0, -2, 0.25);
    expect(beside.z).toBeGreaterThan(0.15);
    // Nothing is cut from a solid the opening misses.
    expect(cutOpenings([wall], [{ ...door, minX: 6, maxX: 7 }])).toEqual([
      wall,
    ]);
  });
});
