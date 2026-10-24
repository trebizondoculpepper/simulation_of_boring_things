import { describe, expect, it } from 'vite-plus/test';
import { climb, ladderToUse } from './ladder-zone';

const zone = {
  minX: 1.75,
  maxX: 2.35,
  minZ: 0.5,
  maxZ: 1.3,
  bottom: -3.5,
  top: 0,
  bottomExit: { x: 2.25, z: 0.9 },
  topExit: { x: 1.6, z: 0.9 },
  rung: { x: 2, z: 0.9 },
};

describe('ladder controls', () => {
  it('mounts with Use only when near an end at the right height', () => {
    expect(ladderToUse([zone], 2.3, -3.5, 0.9, 1)).toEqual({
      zone,
      end: 'bottom',
    });
    expect(ladderToUse([zone], 1.6, 0, 0.9, 1)).toEqual({
      zone,
      end: 'top',
    });
    expect(ladderToUse([zone], 2.7, 0, 0.9, 1)).toBeNull();
    expect(ladderToUse([zone], 4, -3.5, 0.9, 1)).toBeNull();
  });

  it('climbs with W and descends with S independent of view pitch', () => {
    expect(climb(zone, -2, 1, 1, 1)).toBeCloseTo(-1.1);
    expect(climb(zone, -2, -1, 1, 1)).toBeCloseTo(-2.9);
    expect(climb(zone, -2, 0, 1, 1)).toBe(-2);
  });

  it('stops at the ends', () => {
    expect(climb(zone, -0.2, 1, 10, 1)).toBe(0);
    expect(climb(zone, -3.3, -1, 10, 1)).toBe(-3.5);
  });
});
