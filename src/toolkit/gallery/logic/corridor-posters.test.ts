import { describe, expect, it } from 'vitest';
import {
  A3_POSTER,
  POSTER_COPY,
  corridorPosterPlacements,
} from './corridor-posters';
import { CORRIDOR_DOORS, corridorWalls } from './main-corridor';

describe('the main corridor poster gallery', () => {
  it('places thirty distinct A3 posters at eye level, clear of doors', () => {
    const placements = corridorPosterPlacements();
    const walls = corridorWalls();
    expect(placements).toHaveLength(30);
    expect(POSTER_COPY).toHaveLength(30);
    expect(new Set(placements.map((p) => p.poster)).size).toBe(30);
    expect(A3_POSTER).toEqual({ width: 0.297, height: 0.42, centreY: 1.6 });
    for (const { wall, at } of placements) {
      expect(at).toBeGreaterThanOrEqual(walls[wall].from + 1);
      expect(at).toBeLessThanOrEqual(walls[wall].to - 1);
      for (const door of CORRIDOR_DOORS.filter((d) => d.wall === wall))
        expect(Math.abs(at - door.at)).toBeGreaterThan(1.55);
    }
  });
});
