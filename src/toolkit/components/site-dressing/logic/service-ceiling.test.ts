import { describe, expect, it } from 'vite-plus/test';
import {
  detectorRows,
  layOutServiceCeiling,
  runFootprint,
  SYSTEMS,
} from './service-ceiling';
import type { ServiceRun } from './service-ceiling';

const room = { minX: -10, maxX: 10, minZ: -6, maxZ: 6, deckY: 6 };

const layerOf = (run: ServiceRun) =>
  ({
    sprinkler: 'top',
    conduit: 'deck',
    pipe: 'pipes',
    duct: 'air',
    'lagged-duct': 'air',
    tray: 'cables',
    basket: 'cables',
    ladder: 'ladder',
  })[run.system];

describe('services ceiling', () => {
  it('lays out the same ceiling for the same seed', () => {
    expect(layOutServiceCeiling(room, { seed: 7 })).toEqual(
      layOutServiceCeiling(room, { seed: 7 }),
    );
    expect(layOutServiceCeiling(room, { seed: 7 })).not.toEqual(
      layOutServiceCeiling(room, { seed: 8 }),
    );
  });

  it('keeps runs in one layer clear of each other', () => {
    for (let seed = 1; seed < 40; seed++) {
      const runs = layOutServiceCeiling(room, { seed, density: 1.5 });
      for (const a of runs)
        for (const b of runs) {
          if (a === b || layerOf(a) !== layerOf(b)) continue;
          const fa = runFootprint(a.points, SYSTEMS[a.system].size / 2);
          const fb = runFootprint(b.points, SYSTEMS[b.system].size / 2);
          const touch = fa.some((p) =>
            fb.some(
              (q) =>
                p.minX < q.maxX &&
                q.minX < p.maxX &&
                p.minZ < q.maxZ &&
                q.minZ < p.maxZ,
            ),
          );
          expect(touch).toBe(false);
        }
    }
  });

  it('runs every system at its own height, under the deck, inside the room', () => {
    const runs = layOutServiceCeiling(room, { seed: 3, density: 1.5 });
    expect(new Set(runs.map((r) => r.system)).size).toBeGreaterThan(4);
    for (const run of runs) {
      expect(run.y).toBe(room.deckY - SYSTEMS[run.system].drop);
      for (const [x, z] of run.points) {
        expect(x).toBeGreaterThanOrEqual(room.minX);
        expect(x).toBeLessThanOrEqual(room.maxX);
        expect(z).toBeGreaterThanOrEqual(room.minZ);
        expect(z).toBeLessThanOrEqual(room.maxZ);
      }
      // Hung at its spacing, give or take the first half space.
      const length = run.points
        .slice(1)
        .reduce(
          (n, p, i) =>
            n + Math.hypot(p[0] - run.points[i][0], p[1] - run.points[i][1]),
          0,
        );
      expect(run.hangers.length).toBe(
        Math.ceil(length / SYSTEMS[run.system].hangEvery - 0.5),
      );
    }
  });

  it('keeps runs in a layer off the areas kept clear for it', () => {
    const strip = { minX: -10, maxX: 10, minZ: -0.2, maxZ: 0.2 };
    for (let seed = 1; seed < 30; seed++) {
      const runs = layOutServiceCeiling(room, {
        seed,
        density: 1.5,
        keepClear: [{ layers: ['deck'], box: strip }],
      });
      for (const run of runs.filter((r) => r.system === 'conduit'))
        for (const b of runFootprint(run.points, SYSTEMS.conduit.size / 2))
          expect(b.minZ < strip.maxZ && strip.minZ < b.maxZ).toBe(false);
    }
  });

  it('spaces smoke detectors on a grid covering the room', () => {
    const rows = detectorRows(room);
    expect(rows.length).toBe(2);
    expect(rows[0].detectors.length).toBe(3);
    for (const { detectors } of rows)
      for (const [x, z] of detectors) {
        expect(Math.abs(x)).toBeLessThan(10);
        expect(Math.abs(z)).toBeLessThan(6);
      }
  });

  it('thins out at low density', () => {
    const busy = layOutServiceCeiling(room, { seed: 5, density: 1.5 }).length;
    const sparse = layOutServiceCeiling(room, { seed: 5, density: 0.3 }).length;
    expect(sparse).toBeLessThan(busy);
  });
});
