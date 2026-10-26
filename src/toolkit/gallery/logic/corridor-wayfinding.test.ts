import { describe, expect, it } from 'vite-plus/test';
import { CORRIDOR_DOORS } from './main-corridor';
import {
  corridorFirePoints,
  corridorPosterPlacements,
} from './corridor-posters';
import { wayfindingSigns } from './corridor-wayfinding';

describe('the main corridor’s wayfinding signs', () => {
  const signs = wayfindingSigns();

  it('stands two at each of the four outside corners', () => {
    expect(signs).toHaveLength(8);
    const corners = new Set(signs.map((s) => s.corner));
    expect(corners.size).toBe(4);
  });

  it('names every room off the corridor on some sign', () => {
    const named = new Set(signs.flatMap((s) => s.along));
    for (const d of CORRIDOR_DOORS) expect(named).toContain(d.to);
  });

  it('lists each side’s rooms nearest the corner first', () => {
    // From the north-west corner along the west side: the loading bay
    // before the footbath's and the jacuzzi's plant rooms.
    const west = signs.find(
      (s) => s.corner === 'north-west' && s.wall === 'west',
    )!;
    const i = (id: string) => west.along.indexOf(id);
    expect(i('loading_bay')).toBeLessThan(i('plant_pool_04'));
    expect(i('plant_pool_04')).toBeLessThan(i('plant_pool_03'));
  });

  it('points its arrow along its side, away from its corner', () => {
    // On the north wall at the north-west corner the way along is east:
    // to the right of a reader facing the north wall.
    const nw = signs.find(
      (s) => s.corner === 'north-west' && s.wall === 'north',
    )!;
    expect(nw.arrow).toBe('right');
    const ne = signs.find(
      (s) => s.corner === 'north-east' && s.wall === 'north',
    )!;
    expect(ne.arrow).toBe('left');
  });

  it('says what lies round the next corner', () => {
    const nw = signs.find(
      (s) => s.corner === 'north-west' && s.wall === 'north',
    )!;
    // East along the north side, then round onto the east side.
    expect(nw.then).toContain('air_plant');
  });

  it('stands clear of every door, poster and fire point on its wall', () => {
    for (const s of signs) {
      for (const d of CORRIDOR_DOORS.filter((d) => d.wall === s.wall))
        expect(Math.abs(d.at - s.at)).toBeGreaterThan(1.3);
      for (const p of corridorPosterPlacements().filter(
        (p) => p.wall === s.wall,
      ))
        expect(Math.abs(p.at - s.at)).toBeGreaterThan(0.65);
      for (const f of corridorFirePoints().filter((f) => f.wall === s.wall))
        expect(Math.abs(f.at - s.at)).toBeGreaterThan(0.7);
    }
  });
});
