import { describe, expect, it } from 'vite-plus/test';
import {
  cleanRoute,
  crossings,
  jointsAlong,
  planRoute,
  routeLength,
} from './pipe-route';
import type { Bend } from './pipe-route';

describe('pipe routes', () => {
  it('turns a right-angle corner into a bend of the radius, trimming each side by it', () => {
    const s = planRoute(
      [
        [0, 0, 0],
        [2, 0, 0],
        [2, 0, 2],
      ],
      0.1,
    );
    expect(s.map((g) => g.kind)).toEqual(['straight', 'bend', 'straight']);
    const bend = s[1] as Bend;
    expect(bend.radius).toBeCloseTo(0.1);
    expect(bend.angle).toBeCloseTo(Math.PI / 2);
    expect(bend.start[0]).toBeCloseTo(1.9);
    expect(bend.end[2]).toBeCloseTo(0.1);
    expect(bend.centre).toEqual([expect.closeTo(1.9), 0, expect.closeTo(0.1)]);
    expect(routeLength(s)).toBeCloseTo(1.9 + 1.9 + (Math.PI / 2) * 0.1);
  });

  it('bends in any plane: a riser off a level run', () => {
    const s = planRoute(
      [
        [0, 0, 0],
        [1, 0, 0],
        [1, 1, 0],
      ],
      0.2,
    );
    const bend = s[1] as Bend;
    expect(bend.centre).toEqual([expect.closeTo(0.8), expect.closeTo(0.2), 0]);
  });

  it('cuts back a bend that the straights beside it are too short for', () => {
    const s = planRoute(
      [
        [0, 0, 0],
        [1, 0, 0],
        [1, 0, 0.1],
        [2, 0, 0.1],
      ],
      0.5,
    );
    const bends = s.filter((g): g is Bend => g.kind === 'bend');
    for (const b of bends) expect(b.radius).toBeLessThanOrEqual(0.05 + 1e-9);
  });

  it('merges points in line and drops repeats', () => {
    expect(
      cleanRoute([
        [0, 0, 0],
        [0, 0, 0],
        [1, 0, 0],
        [2, 0, 0],
        [2, 1, 0],
      ]),
    ).toEqual([
      [0, 0, 0],
      [2, 0, 0],
      [2, 1, 0],
    ]);
  });

  it('puts joints along the straights at the pipe’s length, not at their ends', () => {
    const s = planRoute(
      [
        [0, 0, 0],
        [7, 0, 0],
      ],
      0.1,
    );
    expect(jointsAlong(s, 3).map((j) => j.at[0])).toEqual([3, 6]);
    expect(jointsAlong(s, 0)).toEqual([]);
  });
  it('finds where a run passes through a plane, and not where it stops at one', () => {
    const run = planRoute(
      [
        [0, 0, 1],
        [0, 0, -1],
        [1, 0, -1],
      ],
      0.1,
    );
    const back = { at: [0, 0, -0.5] as const, normal: [0, 0, 1] as const };
    const hits = crossings(run, back);
    expect(hits.length).toBe(1);
    expect(hits[0].at[2]).toBeCloseTo(-0.5);
    expect(hits[0].dir[2]).toBeCloseTo(-1);
    expect(crossings(run, { at: [0, 0, 1], normal: [0, 0, 1] }).length).toBe(0);
  });
});
