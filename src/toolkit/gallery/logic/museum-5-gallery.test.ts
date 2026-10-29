import { describe, expect, it } from 'vite-plus/test';
import {
  BAY,
  DECADES,
  FUTURE,
  POOLSIDE,
  WALL,
  bayPlaces,
  futureBayPlace,
} from './museum-5-gallery';
import { hallSize } from './museum-plan';

describe('Hall 5: a day in the life', () => {
  it('runs the decades earliest first, each with a morning, midday and night', () => {
    const years = DECADES.map((d) => Number(d.decade.slice(0, 4)));
    expect([...years].sort((a, b) => a - b)).toEqual(years);
    for (const d of DECADES)
      expect(d.photos.map((p) => p.when)).toEqual([
        'Morning',
        'Midday',
        'Night',
      ]);
  });

  it('hangs the earliest decade on the visitor’s left, facing each wall', () => {
    const bays = bayPlaces();
    const north = bays.filter((b) => b.wall === 'north');
    const east = bays.filter((b) => b.wall === 'east');
    // Facing north (−z), left is west (−x); facing east (+x), left is north (−z).
    for (let k = 1; k < north.length; k++)
      expect(north[k].x).toBeGreaterThan(north[k - 1].x);
    for (let k = 1; k < east.length; k++)
      expect(east[k].z).toBeGreaterThan(east[k - 1].z);
    // The north wall's decades come first.
    expect(bays.indexOf(north.at(-1)!)).toBeLessThan(bays.indexOf(east[0]));
  });

  it('keeps every bay on its wall, clear of the corners', () => {
    const { w, d } = hallSize('museum5');
    expect(WALL.east).toBeLessThan(w / 2);
    expect(-WALL.north).toBeLessThan(d / 2);
    for (const b of bayPlaces()) {
      const along = b.wall === 'north' ? b.x : b.z;
      const half = b.wall === 'north' ? w / 2 : d / 2;
      expect(Math.abs(along) + BAY.w / 2).toBeLessThan(half - 0.3);
    }
  });

  it('puts the poolside on the floor, clear of the archways', () => {
    const { deck, water, skimmer } = POOLSIDE;
    // West archway at x = −7.7, z = 0; south archway at x = 0, z = 6.7.
    expect(deck.minX).toBeGreaterThan(-7.7 + 1.5);
    expect(deck.maxZ).toBeLessThan(6.7 - 1);
    expect(skimmer.z).toBeLessThan(water.minZ);
  });

  it('sets the skimmer in the tiles, 7 cm clear of the coping', () => {
    const { water, coping, skimmer } = POOLSIDE;
    const lidRadius = 0.13;
    const clear = water.minZ - coping - (skimmer.z + lidRadius);
    expect(clear).toBeCloseTo(0.07, 3);
  });
});

describe('the Pool of the Future? bay', () => {
  it('ends the walk on the south wall, clear of the No running sign, the east wall and the last decade', () => {
    const f = futureBayPlace();
    expect(f.decade).toBe(FUTURE);
    expect(f.z).toBe(WALL.south);
    expect(f.yaw).toBeCloseTo(Math.PI);
    expect(f.x - BAY.w / 2).toBeGreaterThan(1.9 + 0.3);
    expect(f.x + BAY.w / 2).toBeLessThan(WALL.east - 0.5);
    const last = bayPlaces().at(-1)!;
    expect(last.decade.decade).toBe('2020s');
    expect(last.z + BAY.w / 2).toBeLessThan(WALL.south);
  });

  it('hangs three photographs, future-1 to future-3, the last pulling out the usual', () => {
    expect(FUTURE.decade).toBe('The Pool of the Future?');
    expect(FUTURE.photos.map((p) => p.file)).toEqual([
      'future-1',
      'future-2',
      'future-3',
    ]);
    expect(FUTURE.photos[2].caption).toMatch(/Some things never change\.$/);
  });
});
