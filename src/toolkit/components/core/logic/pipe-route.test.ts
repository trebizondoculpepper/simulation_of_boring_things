import { describe, expect, it } from 'vite-plus/test';
import {
  cleanRoute,
  crossings,
  jointsAlong,
  planRoute,
  routeLength,
  jointFitting,
  pipeClashes,
} from './pipe-route';
import type { DrawnRun } from './pipe-route';
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

describe('pipes clashing', () => {
  // The owner's case: a flanged 80 mm run turning down at a bend, and a
  // 40 mm pipe rising past it, clear of the pipe but not of its flange.
  const elbow: DrawnRun = {
    name: 'flanged',
    points: [
      [0, 2, 0],
      [2, 2, 0],
      [2, 0, 0],
    ],
    od: 0.0889,
    joint: 'flange',
  };
  const passing = (x: number): DrawnRun => ({
    name: 'passing',
    points: [
      [x, 0, 0.09],
      [x, 3, 0.09],
    ],
    od: 0.04,
    joint: 'thread',
  });

  it('finds a flange cutting into a pipe that clears the pipe itself', () => {
    const bendStart = 2 - 1.5 * 0.0889;
    const clashes = pipeClashes([elbow, passing(bendStart)]);
    expect(clashes.map((c) => c.what)).toContain('fitting');
    expect(clashes.some((c) => c.what === 'pipe')).toBe(false);
  });

  it('finds none once the pipe passes clear of the flange', () => {
    expect(pipeClashes([elbow, passing(1.2)])).toEqual([]);
  });

  it('lets a branch end on its main', () => {
    const main: DrawnRun = {
      name: 'main',
      points: [
        [0, 1, 0],
        [4, 1, 0],
      ],
      od: 0.11,
      joint: 'socket',
    };
    const branch: DrawnRun = {
      name: 'branch',
      points: [
        [2, 1, 0],
        [2, 1, 1],
      ],
      od: 0.05,
      joint: 'socket',
    };
    expect(pipeClashes([main, branch])).toEqual([]);
  });

  it('sizes a flange at about twice its pipe', () => {
    expect(jointFitting('flange', 0.05).radius).toBeCloseTo(0.095, 6);
    expect(jointFitting('socket', 0.05).radius).toBeCloseTo(0.06, 6);
  });
});
