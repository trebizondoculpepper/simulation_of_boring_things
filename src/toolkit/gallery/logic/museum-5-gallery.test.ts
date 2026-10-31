import { describe, expect, it } from 'vite-plus/test';
import {
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
    const bays = [...bayPlaces(), futureBayPlace()];
    // Round the hall with the wall on the left: north west to east, east
    // north to south, south east to west, west south to north.
    const along = (b: (typeof bays)[number]) =>
      b.wall === 'north'
        ? b.x
        : b.wall === 'east'
          ? b.z
          : b.wall === 'south'
            ? -b.x
            : -b.z;
    const order = ['north', 'east', 'south', 'west'];
    for (let k = 1; k < bays.length; k++) {
      const a = order.indexOf(bays[k - 1].wall);
      const b = order.indexOf(bays[k].wall);
      expect(b).toBeGreaterThanOrEqual(a);
      if (a === b) expect(along(bays[k])).toBeGreaterThan(along(bays[k - 1]));
    }
  });

  it('hangs the walls on their faces', () => {
    const { w, d } = hallSize('museum5');
    expect(WALL.east).toBeCloseTo(w / 2, 6);
    expect(-WALL.north).toBeCloseTo(d / 2, 6);
  });

  it('puts the poolside on the floor, clear of the archways', () => {
    const { deck, water, skimmer } = POOLSIDE;
    // West archway at x = −7.7, z = 0; south archway at x = 0, z = 6.7.
    expect(deck.minX).toBeGreaterThan(-7.7 + 1.5);
    expect(deck.maxZ).toBeLessThan(6.7 - 1);
    expect(skimmer.z).toBeLessThan(water.minZ);
    // On the deck, its collar (0.155 m) clear of the coping.
    expect(skimmer.z + 0.155).toBeLessThan(water.minZ - POOLSIDE.coping);
  });

  it('sets the skimmer in the tiles, 7 cm clear of the coping', () => {
    const { water, coping, skimmer } = POOLSIDE;
    const lidRadius = 0.13;
    const clear = water.minZ - coping - (skimmer.z + lidRadius);
    expect(clear).toBeCloseTo(0.07, 3);
  });
});

describe('the Pool of the Future? bay', () => {
  it('ends the walk after the 2020s, on the west wall facing east', () => {
    const f = futureBayPlace();
    expect(f.decade).toBe(FUTURE);
    expect(f.x).toBe(WALL.west);
    expect(f.yaw).toBeCloseTo(Math.PI / 2);
    const last = bayPlaces().at(-1)!;
    expect(last.decade.decade).toBe('2020s');
    expect(last.z).toBeGreaterThan(f.z);
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
