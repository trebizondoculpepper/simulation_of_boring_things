import { describe, expect, it } from 'vite-plus/test';
import {
  corridorFloorAt,
  corridorFootprints,
  flight,
  insideCorridor,
  layoutCorridor,
} from './corridor-path';

describe('corridor paths', () => {
  it('runs a straight, turns left onto north, and right back onto east', () => {
    const { placed, end } = layoutCorridor(
      [
        { kind: 'straight', length: 6 },
        { kind: 'left' },
        { kind: 'straight', length: 4 },
        { kind: 'right' },
        { kind: 'straight', length: 3 },
      ],
      { x: 0, z: 0, heading: 0 },
    );
    expect(placed.map((p) => p.heading)).toEqual([0, 0, 1, 1, 0]);
    // The left turn leaves north from its square's side…
    expect(placed[2]).toMatchObject({
      x: expect.closeTo(6.6),
      z: expect.closeTo(-0.6),
    });
    // …and the right turn east again, 0.6 + 4 + 0.6 m further north.
    expect(placed[4]).toMatchObject({
      x: expect.closeTo(7.2),
      z: expect.closeTo(-5.2),
    });
    expect(end).toMatchObject({
      x: expect.closeTo(10.2),
      z: expect.closeTo(-5.2),
      heading: 0,
    });
  });

  it('walls a straight on both sides and a turn round its outer corner, open in the middle', () => {
    const { placed } = layoutCorridor(
      [
        { kind: 'straight', length: 2 },
        { kind: 'left' },
        { kind: 'straight', length: 2 },
      ],
      { x: 0, z: 0, heading: 0 },
    );
    const walls = corridorFootprints(placed);
    const hit = (x: number, z: number) =>
      walls.some((f) => x > f.minX && x < f.maxX && z > f.minZ && z < f.maxZ);
    // Down the middle of every piece, clear; in each wall, solid.
    for (const [x, z] of [
      [1, 0],
      [2.6, 0],
      [2.6, -0.4],
      [2.6, -2],
    ])
      expect(hit(x, z), `${x}, ${z}`).toBe(false);
    for (const [x, z] of [
      [1, 0.7],
      [1, -0.7],
      [2.6, 0.7],
      [3.3, -0.2],
      [3.3, -2],
    ])
      expect(hit(x, z), `${x}, ${z}`).toBe(true);
    expect(insideCorridor(placed, 2.6, -2)).toBe(true);
    expect(insideCorridor(placed, 5, 0)).toBe(false);
  });

  it('climbs a flight up, and comes down the same flight from its head', () => {
    const up = flight(2);
    expect(up.steps).toBe(12);
    expect(up.length).toBeCloseTo(12 * 0.28);
    const { placed, end } = layoutCorridor(
      [
        { kind: 'straight', length: 2 },
        { kind: 'stairs', rise: 2 },
        { kind: 'straight', length: 2 },
        { kind: 'stairs', rise: -2 },
        { kind: 'straight', length: 2 },
      ],
      { x: 0, z: 0, heading: 0 },
    );
    expect(end.y).toBeCloseTo(0);
    const L = up.length;
    // At the foot, the first tread; at the head, level with the landing.
    expect(corridorFloorAt(placed, 2.1, 0)).toBeCloseTo(up.riser);
    expect(corridorFloorAt(placed, 2 + L - 0.05, 0)).toBeCloseTo(2);
    expect(corridorFloorAt(placed, 2 + L + 1, 0)).toBeCloseTo(2);
    // Going down: just past the head still at the top, at the foot at 0.
    const head = 2 + L + 2;
    expect(corridorFloorAt(placed, head + 0.05, 0)).toBeCloseTo(2);
    expect(corridorFloorAt(placed, head + L - 0.05, 0)).toBeCloseTo(up.riser);
    expect(corridorFloorAt(placed, head + L + 1, 0)).toBeCloseTo(0);
    // Each step no more than a riser from the last, all the way.
    let last = 0;
    for (let x = 0.01; x < end.x; x += 0.05) {
      const y = corridorFloorAt(placed, x, 0)!;
      expect(Math.abs(y - last)).toBeLessThanOrEqual(up.riser + 1e-9);
      last = y;
    }
  });
});
