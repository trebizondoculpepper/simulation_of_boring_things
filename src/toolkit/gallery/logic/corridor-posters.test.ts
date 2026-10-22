import { describe, expect, it } from 'vite-plus/test';
import {
  A1_POSTER,
  POSTER_COPY,
  corridorPosterPlacements,
} from './corridor-posters';
import { CORRIDOR_DOORS, corridorWalls } from './main-corridor';

describe('the main corridor poster gallery', () => {
  it('places thirty distinct A1 posters at eye level, clear of doors', () => {
    const placements = corridorPosterPlacements();
    const walls = corridorWalls();
    expect(placements).toHaveLength(30);
    expect(POSTER_COPY).toHaveLength(30);
    expect(new Set(placements.map((p) => p.poster)).size).toBe(30);
    expect(A1_POSTER).toEqual({ width: 0.594, height: 0.841, centreY: 1.72 });
    for (const { wall, at } of placements) {
      expect(at).toBeGreaterThanOrEqual(walls[wall].from + 1);
      expect(at).toBeLessThanOrEqual(walls[wall].to - 1);
      for (const door of CORRIDOR_DOORS.filter((d) => d.wall === wall))
        expect(Math.abs(at - door.at)).toBeGreaterThan(1.55);
    }
    for (const wall of Object.keys(walls) as (keyof typeof walls)[]) {
      const along = placements
        .filter((placement) => placement.wall === wall)
        .map((placement) => placement.at)
        .sort((a, b) => a - b);
      for (let i = 1; i < along.length; i++)
        expect(along[i] - along[i - 1]).toBeGreaterThan(0.65);
    }
  });
});
