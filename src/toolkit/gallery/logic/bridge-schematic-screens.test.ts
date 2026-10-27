import { describe, expect, it } from 'vite-plus/test';
import {
  REAR_STATIONS,
  STATIONS,
  STOREY,
  deskScreenPlaces,
  deskSegments,
  stationScreenPlaces,
  upstandScreens,
} from './control-room-prototype';
import { stationNamed } from './station-schematics';

describe('the bridge’s schematic screens (mission 095)', () => {
  it('give every forward and rear station a screen of its own browser', () => {
    const places = stationScreenPlaces();
    expect(places.map((p) => p.station)).toEqual([
      ...STATIONS,
      ...REAR_STATIONS.map((r) => r.role),
    ]);
    for (const p of places)
      expect(stationNamed(p.station), p.station).toBeDefined();
  });

  it('fill every opening in the desk’s upstands, each with a known station', () => {
    const places = deskScreenPlaces();
    const expected = deskSegments().reduce(
      (t, s) =>
        t +
        upstandScreens(
          Math.hypot(s.outer[1].x - s.outer[0].x, s.outer[1].z - s.outer[0].z),
        ),
      0,
    );
    expect(places).toHaveLength(expected);
    for (const p of places) {
      expect(stationNamed(p.station)).toBeDefined();
      expect(p.size.w).toBeGreaterThan(0.3);
      expect(p.size.h).toBeGreaterThan(0.2);
      // Within the upstand's face, 0.9 to 1.45 m over the floor.
      expect(p.y - STOREY - p.size.h / 2).toBeGreaterThan(0.9);
      expect(p.y - STOREY + p.size.h / 2).toBeLessThan(1.45);
    }
  });

  it('keep the forward stations’ upper screens low, under the seated view of the big wall', () => {
    for (const p of stationScreenPlaces().slice(0, STATIONS.length))
      expect(p.y - STOREY + (p.size.h / 2) * Math.cos(p.tilt)).toBeLessThan(
        1.6,
      );
  });
});
