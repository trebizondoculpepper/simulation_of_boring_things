import { describe, expect, it } from 'vite-plus/test';
import { openingsOf, roomById, sideSpan } from './facility-plan';
import { ROOFLIGHTS, WINDOWS, cutWindows } from './daylight-plan';
import { cutBasins } from './pool-layout';

const area = (r: { minX: number; maxX: number; minZ: number; maxZ: number }) =>
  (r.maxX - r.minX) * (r.maxZ - r.minZ);

describe('architectural daylight openings', () => {
  it('keeps rooflights inside the hall and below a quarter of roof area', () => {
    const hall = roomById('hall');
    for (const light of ROOFLIGHTS) {
      expect(light.minX).toBeGreaterThan(hall.minX);
      expect(light.maxX).toBeLessThan(hall.maxX);
      expect(light.minZ).toBeGreaterThan(hall.minZ);
      expect(light.maxZ).toBeLessThan(hall.maxZ);
    }
    const roofArea = area(hall);
    const glazingArea = ROOFLIGHTS.reduce((sum, light) => sum + area(light), 0);
    expect(glazingArea).toBeLessThan(roofArea * 0.25);
    expect(
      cutBasins(hall, ROOFLIGHTS).reduce((sum, piece) => sum + area(piece), 0),
    ).toBe(roofArea - glazingArea);
  });

  it('keeps each high window inside its named wall and above the floor', () => {
    for (const window of WINDOWS) {
      const room = roomById(window.room);
      const span = sideSpan(room, window.side);
      expect(window.from).toBeGreaterThan(span.from);
      expect(window.to).toBeLessThan(span.to);
      expect(window.bottom).toBeGreaterThan(0);
      expect(window.top).toBeLessThan(room.height);
    }
  });

  it('does not place a window across a doorway', () => {
    for (const window of WINDOWS) {
      const openings = openingsOf(roomById(window.room))[window.side];
      for (const door of openings)
        expect(window.to <= door.from || window.from >= door.to).toBe(true);
    }
  });

  it('replaces opaque wall area with exactly the window area', () => {
    const segment = { from: 0, to: 10, bottom: 0, top: 4 };
    const window = { from: 2, to: 6, bottom: 2, top: 3 };
    const { solid, glass } = cutWindows(segment, [window]);
    const size = (p: typeof segment) => (p.to - p.from) * (p.top - p.bottom);
    expect(glass).toEqual([window]);
    expect(
      solid.reduce((sum, patch) => sum + size(patch), 0) +
        glass.reduce((sum, patch) => sum + size(patch), 0),
    ).toBe(size(segment));
  });
});
