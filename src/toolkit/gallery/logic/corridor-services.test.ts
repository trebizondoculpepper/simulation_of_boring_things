import { describe, expect, it } from 'vite-plus/test';
import {
  CHEMICAL_ROOMS,
  CORRIDOR_HEADROOM,
  RING_ROOMS,
  corridorServices,
} from './corridor-services';
import type { CorridorRun, Vec3 } from './corridor-services';
import { corridorContainment } from './cable-containment';
import { MAIN_CORRIDOR } from './main-corridor';

const runs = corridorServices();

/** A run's outside radius: its lagging or its containment included. */
const radius = (r: CorridorRun) =>
  r.kind === 'lagged-heating'
    ? r.od / 2 + 0.04
    : r.contained
      ? Math.max(0.05, r.od * 1.9) / 2
      : r.od / 2;

/** Points along a run, every 5 cm. */
function samples(points: readonly Vec3[]) {
  const out: Vec3[] = [];
  for (let i = 1; i < points.length; i++) {
    const [a, b] = [points[i - 1], points[i]];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const n = Math.max(1, Math.ceil(L / 0.05));
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      out.push([
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t,
      ]);
    }
  }
  return out;
}

/** The distance from p to the segment a–b. */
function toSegment(p: Vec3, a: Vec3, b: Vec3) {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const L2 = d[0] ** 2 + d[1] ** 2 + d[2] ** 2;
  const t =
    L2 === 0
      ? 0
      : Math.max(
          0,
          Math.min(
            1,
            ((p[0] - a[0]) * d[0] +
              (p[1] - a[1]) * d[1] +
              (p[2] - a[2]) * d[2]) /
              L2,
          ),
        );
  return Math.hypot(
    p[0] - a[0] - d[0] * t,
    p[1] - a[1] - d[1] * t,
    p[2] - a[2] - d[2] * t,
  );
}

const toRun = (p: Vec3, r: CorridorRun) => {
  let best = Infinity;
  for (let i = 1; i < r.points.length; i++)
    best = Math.min(best, toSegment(p, r.points[i - 1], r.points[i]));
  return best;
};

describe('the services through the ring corridor (prompt 088)', () => {
  it('carries the research’s services', () => {
    const names = runs.map((r) => r.name);
    for (const want of [
      'LTHW flow ring, north',
      'LTHW return ring, west',
      'Make-up ring, south',
      'Make-up from the wet hall',
      'LTHW flow from the boiler house',
      'LTHW return to the boiler house',
      'Cold water main to the boiler house',
      'Hot water flow to the building',
      'Backwash main to the wet hall',
      'Backwash from plant_pool_02',
      'Hypochlorite main to the wet hall',
      'Acid main to the wet hall',
    ])
      expect(names).toContain(want);
  });

  it('takes every chemical branch from the wet hall to its plant room, double-contained', () => {
    for (const c of ['Hypochlorite', 'Acid'])
      for (const room of CHEMICAL_ROOMS) {
        const r = runs.find((x) => x.name === `${c} branch to ${room}`);
        expect(r, `${c} to ${room}`).toBeDefined();
        expect(r!.contained).toBe(true);
        expect(r!.rooms).toEqual(['wet_hall', room]);
        expect(r!.through).toHaveLength(2);
      }
  });

  it('tees every heated room off the heating and make-up rings', () => {
    for (const room of RING_ROOMS)
      for (const what of ['LTHW flow to', 'LTHW return from', 'Make-up to'])
        expect(runs.map((r) => r.name)).toContain(`${what} ${room}`);
  });

  it('keeps every line over the walkway’s headroom', () => {
    for (const r of runs)
      for (const p of r.points)
        expect(p[1], r.name).toBeGreaterThanOrEqual(CORRIDOR_HEADROOM);
  });

  it('keeps every line within the corridor, or in a wall it goes through', () => {
    const { side, width, wall } = MAIN_CORRIDOR;
    for (const r of runs)
      for (const [x, , z] of r.points) {
        const out =
          x < -wall - 1e-6 ||
          z < -wall - 1e-6 ||
          x > side + wall + 1e-6 ||
          z > side + wall + 1e-6;
        const inHall =
          x > width + wall + 1e-6 &&
          x < side - width - wall - 1e-6 &&
          z > width + wall + 1e-6 &&
          z < side - width - wall - 1e-6;
        expect(out || inHall, `${r.name} at ${x}, ${z}`).toBe(false);
      }
  });

  it('runs every line the way it flows: in from its source, out into its room', () => {
    const into = (r: CorridorRun, end: Vec3) =>
      r.through.some(
        (t) => Math.hypot(t.at[0] - end[0], t.at[2] - end[2]) < 0.15,
      );
    for (const c of ['Hypochlorite', 'Acid']) {
      const branch = runs.find(
        (r) => r.name === `${c} branch to plant_pool_01`,
      )!;
      expect(into(branch, branch.points.at(-1)!)).toBe(true);
    }
    const backwash = runs.find(
      (r) => r.name === 'Backwash main to the wet hall',
    )!;
    expect(backwash.points.at(-1)![2]).toBeGreaterThan(MAIN_CORRIDOR.width);
  });

  it('fire-stops every wall it passes through', () => {
    for (const r of runs) {
      const ends = [r.points[0], r.points.at(-1)!];
      for (const t of r.through)
        expect(
          ends.some((e) => Math.hypot(e[0] - t.at[0], e[2] - t.at[2]) < 0.15),
          r.name,
        ).toBe(true);
    }
  });

  it('never cuts into another line, except where it tees off it', () => {
    const family = (r: CorridorRun) => r.name.split(',')[0];
    for (let i = 0; i < runs.length; i++)
      for (let j = i + 1; j < runs.length; j++) {
        const [a, b] = [runs[i], runs[j]];
        if (family(a) === family(b)) continue;
        const joined =
          [a.points[0], a.points.at(-1)!].some((p) => toRun(p, b) < 1e-6) ||
          [b.points[0], b.points.at(-1)!].some((p) => toRun(p, a) < 1e-6);
        if (joined) continue;
        const gap = radius(a) + radius(b);
        const close = samples(a.points).find((p) => toRun(p, b) < gap);
        expect(close, `${a.name} into ${b.name}`).toBeUndefined();
      }
  });

  it('passes under the cable ladder, never through it', () => {
    const ladders = corridorContainment().runs;
    for (const r of runs)
      for (const p of samples(r.points))
        for (const l of ladders) {
          const minX =
            Math.min(l.from[0], l.to[0]) -
            (l.from[0] === l.to[0] ? l.width / 2 : 0);
          const maxX =
            Math.max(l.from[0], l.to[0]) +
            (l.from[0] === l.to[0] ? l.width / 2 : 0);
          const minZ =
            Math.min(l.from[2], l.to[2]) -
            (l.from[2] === l.to[2] ? l.width / 2 : 0);
          const maxZ =
            Math.max(l.from[2], l.to[2]) +
            (l.from[2] === l.to[2] ? l.width / 2 : 0);
          const R = radius(r);
          const inside =
            p[0] > minX - R &&
            p[0] < maxX + R &&
            p[2] > minZ - R &&
            p[2] < maxZ + R &&
            Math.abs(p[1] - l.from[1]) < l.depth / 2 + R;
          expect(inside, `${r.name} through ${l.name}`).toBe(false);
        }
  });
});
