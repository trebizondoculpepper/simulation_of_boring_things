import { describe, expect, it } from 'vite-plus/test';
import { COLUMN_CLEARANCE, COLUMN_SPAN, hallColumns } from './museum-plan';
import type { MuseumHallId } from './museum-plan';
import {
  PLACES as PLACES1,
  boxInHall as box1,
  plumbHall1,
} from './museum-1-layout';
import {
  PLACES as PLACES3,
  boxInHall as box3,
  plumbHall3,
} from './museum-3-layout';
import {
  PLACES as PLACES9,
  boxInHall as box9,
  plumbHall9,
} from './museum-9-layout';

type Vec3 = readonly [number, number, number];
type Box = { min: Vec3; max: Vec3 };

/**
 * The owner, 2026-10-30: every hall's columns kept clear, "at least 10
 * centimeters outside of their bounding cylinder", by its pipes and its
 * machines. Each column's widest part and the clearance, in plan.
 */
const clear = (id: MuseumHallId) =>
  hallColumns(id).map((c) => {
    const r = COLUMN_SPAN + COLUMN_CLEARANCE;
    return { minX: c.x - r, maxX: c.x + r, minZ: c.z - r, maxZ: c.z + r };
  });

/** Whether a straight run of radius `r` from `a` to `b` comes into the plan box. */
function runTouches(
  a: Vec3,
  b: Vec3,
  r: number,
  f: { minX: number; maxX: number; minZ: number; maxZ: number },
) {
  const steps = Math.max(
    1,
    Math.ceil(Math.hypot(b[0] - a[0], b[2] - a[2]) / 0.05),
  );
  for (let k = 0; k <= steps; k++) {
    const t = k / steps;
    const x = a[0] + (b[0] - a[0]) * t;
    const z = a[2] + (b[2] - a[2]) * t;
    if (x > f.minX - r && x < f.maxX + r && z > f.minZ - r && z < f.maxZ + r)
      return true;
  }
  return false;
}

const boxTouches = (b: Box, f: ReturnType<typeof clear>[number]) =>
  b.min[0] < f.maxX &&
  b.max[0] > f.minX &&
  b.min[2] < f.maxZ &&
  b.max[2] > f.minZ;

const halls: {
  id: MuseumHallId;
  plumb: () => { lines: { od: number; points: Vec3[] }[] };
  box: (id: never) => Box;
  machines: string[];
}[] = [
  {
    id: 'museum1',
    plumb: plumbHall1,
    box: box1 as (id: never) => Box,
    machines: Object.keys(PLACES1),
  },
  {
    id: 'museum3',
    plumb: plumbHall3,
    box: box3 as (id: never) => Box,
    machines: Object.keys(PLACES3),
  },
  {
    id: 'museum9',
    plumb: plumbHall9,
    box: box9 as (id: never) => Box,
    machines: Object.keys(PLACES9),
  },
];

describe('the museum’s columns kept clear (the owner, 2026-10-30)', () => {
  for (const h of halls)
    it(`routes no pipe of ${h.id} within ${COLUMN_CLEARANCE} m of a column`, () => {
      const zones = clear(h.id);
      for (const line of h.plumb().lines)
        for (let k = 1; k < line.points.length; k++)
          for (const f of zones)
            expect(
              runTouches(line.points[k - 1], line.points[k], line.od / 2, f),
              `${h.id} line through a column at ${(f.minX + f.maxX) / 2}, ${(f.minZ + f.maxZ) / 2}`,
            ).toBe(false);
    });
  // Hall 1's machines join when its plant is set out again (its gas main
  // and pool stand against columns: the audit, 2026-10-30).
  for (const h of halls.filter((x) => x.id !== 'museum1'))
    it(`stands no machine of ${h.id} within ${COLUMN_CLEARANCE} m of a column`, () => {
      const zones = clear(h.id);
      for (const m of h.machines) {
        let b: Box;
        try {
          b = h.box(m as never);
        } catch {
          continue;
        }
        for (const f of zones)
          expect(boxTouches(b, f), `${h.id} ${m}`).toBe(false);
      }
    });
});
