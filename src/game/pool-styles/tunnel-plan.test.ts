import { describe, expect, it } from 'vite-plus/test';
import {
  BOUNDS,
  CHAMBERS,
  CORRIDOR,
  DOOR_Z,
  MOUTHS,
  NARROWEST,
  STAIR,
  START,
  TUNNELS,
  floorAt,
  lengthOf,
  sideOf,
  solids,
  stations,
} from './tunnel-plan';
import { insideRect } from './geometry';

const blocked = (x: number, z: number) =>
  solids().some((r) => insideRect(r, x, z));

describe('the Porthole Tunnel, laid out', () => {
  it('opens its doors into tiled vestibules at its west and east ends', () => {
    const west = CHAMBERS.find((c) => c.id === 'west')!;
    const east = CHAMBERS.find((c) => c.id === 'east')!;
    expect(west.rect.minX).toBe(BOUNDS.minX);
    expect(east.rect.maxX).toBe(BOUNDS.maxX);
    for (const c of [west, east])
      expect(DOOR_Z).toBeGreaterThan(c.rect.minZ + 0.6);
    expect(insideRect(west.rect, START.x, START.z)).toBe(true);
  });

  it('meets every chamber’s wall with a tunnel, a corridor or an arch, each inside its wall', () => {
    for (const m of MOUTHS) {
      const c = CHAMBERS.find((x) => x.id === m.chamber)!;
      const s = sideOf(c.rect, m.side);
      expect(m.at - m.width / 2).toBeGreaterThan(s.from);
      expect(m.at + m.width / 2).toBeLessThan(s.to);
    }
  });

  it('narrows its long tunnel to barely a walker’s width and widens it again', () => {
    const long = TUNNELS.find((t) => t.id === 'long')!;
    const length = lengthOf(long);
    const widths = stations(long).map((s) => long.width(s.s, length));
    expect(Math.min(...widths)).toBeCloseTo(NARROWEST, 1);
    expect(widths[0]).toBeGreaterThan(3);
    expect(widths.at(-1)!).toBeGreaterThan(3);
  });

  it('climbs its stairway to an upper tunnel and comes down again', () => {
    const stair = TUNNELS.find((t) => t.id === 'stairway')!;
    const length = lengthOf(stair);
    expect(stair.floor(0, length)).toBe(0);
    expect(stair.floor(length / 2, length)).toBe(STAIR.rise);
    expect(stair.floor(length, length)).toBeCloseTo(0, 6);
    expect(floorAt(46, -6, 0)).toBeGreaterThan(1);
    expect(floorAt(49, -11, 3.2)).toBeCloseTo(STAIR.rise, 6);
  });

  it('puts water underfoot in the long tunnel’s first leg and the hotel corridor, and keeps the channel out of reach', () => {
    expect(floorAt(23, -6, 0)).toBeCloseTo(-0.15, 6);
    expect(floorAt(35, 1, 0)).toBe(CORRIDOR.floor);
    expect(blocked(11, 1)).toBe(true);
    expect(blocked(11, 0)).toBe(false);
    expect(blocked(11, 2.2)).toBe(false);
  });

  it('walls its tunnels in: off the side of one, the walker is stopped', () => {
    expect(blocked(11, 1 + 1.7)).toBe(true);
    expect(blocked(23 + 1.7, -8)).toBe(true);
    expect(blocked(23, -8)).toBe(false);
    // Open through every chamber's mouths.
    expect(blocked(2, 1.6)).toBe(false);
    expect(blocked(23, -2)).toBe(false);
  });
});
