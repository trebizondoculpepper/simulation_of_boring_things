import { describe, expect, it } from 'vite-plus/test';
import { placeInline, pointAlong, splitAt } from './inline-placement';
import type { Vec3 } from './pipe-route';

// Out of a port at 1 m, along 1.5 m, up to 3 m, along 4 m, down to 1 m, into a port.
const route: Vec3[] = [
  [0, 1, 0],
  [1.5, 1, 0],
  [1.5, 3, 0],
  [5.5, 3, 0],
  [5.5, 1, 0],
  [6, 1, 0],
];

describe('setting devices into a line', () => {
  it('sets each near its end, in order, within reach, clear of the leads and bends', () => {
    const { spots, problems } = placeInline(route, [
      { id: 'nrv', length: 0.1, near: 'start' },
      { id: 'iso-a', length: 0.08, near: 'start' },
      { id: 'iso-b', length: 0.08, near: 'end' },
    ]);
    expect(problems).toEqual([]);
    expect(spots.map((s) => s.id)).toEqual(['nrv', 'iso-a', 'iso-b']);
    for (const s of spots) {
      expect(s.reachable).toBe(true);
      expect(s.at[1]).toBeGreaterThanOrEqual(0.5);
      expect(s.at[1]).toBeLessThanOrEqual(1.8);
    }
    // Past the start's lead, and short of the first bend's fitting.
    expect(spots[0].s - 0.05).toBeGreaterThanOrEqual(0.15);
    expect(spots[1].s + 0.04).toBeLessThanOrEqual(1.5 - 0.12 + 1e-9);
    // Apart.
    expect(spots[1].s - spots[0].s).toBeGreaterThanOrEqual(0.09 + 0.08 - 1e-9);
  });

  it('marks a device it can only set out of reach, and names one it cannot set at all', () => {
    const high: Vec3[] = [
      [0, 3, 0],
      [4, 3, 0],
    ];
    const { spots, problems } = placeInline(high, [
      { id: 'iso', length: 0.08, near: 'start' },
      { id: 'huge', length: 9, near: 'end' },
    ]);
    expect(spots).toHaveLength(1);
    expect(spots[0].reachable).toBe(false);
    expect(problems).toEqual([
      'iso: out of reach',
      'huge: no straight long enough on its line',
    ]);
  });

  it('can be told where a person can stand', () => {
    const { spots } = placeInline(
      route,
      [{ id: 'iso', length: 0.08, near: 'start' }],
      { standing: (at) => at[0] > 1 },
    );
    expect(spots[0].at[0]).toBeGreaterThan(1);
  });

  it('cuts the route into runs between its devices', () => {
    const { spots } = placeInline(route, [
      { id: 'iso', length: 0.1, near: 'start' },
    ]);
    const pieces = splitAt(route, spots, new Map([['iso', 0.1]]));
    expect(pieces).toHaveLength(2);
    expect(pieces[0][0]).toEqual(route[0]);
    expect(pieces[1].at(-1)).toEqual(route.at(-1));
    const gap = Math.hypot(
      ...([0, 1, 2] as const).map(
        (k) => pieces[1][0][k] - pieces[0].at(-1)![k],
      ),
    );
    expect(gap).toBeCloseTo(0.1);
    expect(pointAlong(route, 2.5).at).toEqual([1.5, 2, 0]);
  });
});
