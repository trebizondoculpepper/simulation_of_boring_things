import { describe, expect, it } from 'vite-plus/test';
import {
  APPROACHES,
  COLUMNS,
  INTERIOR,
  distanceTo,
  fittingPlaces,
  footprints,
  nodeShape,
  pipeRuns,
} from './museum-4-layout';
import { FITTINGS, LINKS } from '../../../game/plant/museum-4-lab';

describe('Hall 4’s layout', () => {
  const feet = footprints();
  it("fits the hall and keeps both archways' approaches clear", () => {
    for (const f of feet) {
      expect(f.minX).toBeGreaterThanOrEqual(INTERIOR.minX);
      expect(f.maxX).toBeLessThanOrEqual(INTERIOR.maxX);
      expect(f.minZ).toBeGreaterThanOrEqual(INTERIOR.minZ);
      expect(f.maxZ).toBeLessThanOrEqual(INTERIOR.maxZ);
      for (const a of APPROACHES)
        expect(
          f.maxX <= a.minX ||
            f.minX >= a.maxX ||
            f.maxZ <= a.minZ ||
            f.minZ >= a.maxZ,
        ).toBe(true);
    }
  });
  it('overlaps nothing on the floor with anything else', () => {
    feet.forEach((a, i) =>
      feet
        .slice(i + 1)
        .forEach((b, j) =>
          expect(
            a.maxX <= b.minX ||
              a.minX >= b.maxX ||
              a.maxZ <= b.minZ ||
              a.minZ >= b.maxZ,
            `${i} and ${i + j + 1}`,
          ).toBe(true),
        ),
    );
  });
  it('stands clear of the columns', () => {
    for (const c of COLUMNS)
      for (const f of feet)
        expect(
          c.x < f.minX - 0.3 ||
            c.x > f.maxX + 0.3 ||
            c.z < f.minZ - 0.3 ||
            c.z > f.maxZ + 0.3,
        ).toBe(true);
  });
  it('draws every link of the schematic, and nothing else', () => {
    expect(
      pipeRuns()
        .map((r) => r.edge)
        .sort(),
    ).toEqual(LINKS.map((l) => l.id).sort());
  });
  it('runs every pipe from its node to its node, each end within 5 mm', () => {
    const byId = new Map(LINKS.map((l) => [l.id, l]));
    for (const run of pipeRuns()) {
      const link = byId.get(run.edge)!;
      const ends = [run.points[0], run.points.at(-1)!];
      const nodes = [link.sourceId, link.targetId];
      nodes.forEach((node, k) =>
        expect(
          distanceTo(nodeShape(node), ends[k]),
          `${run.edge} at ${node}`,
        ).toBeLessThanOrEqual(0.005),
      );
    }
  });
  it('sets every fitting of the schematic on its own line, along it', () => {
    const places = fittingPlaces();
    expect(Object.keys(places).sort()).toEqual(
      FITTINGS.map((f) => f.id).sort(),
    );
    const runs = new Map(pipeRuns().map((r) => [r.edge, r]));
    for (const f of FITTINGS) {
      const p = places[f.id];
      expect(p.edge, f.id).toBe(f.edge);
      const pts = runs.get(p.edge)!.points;
      const on = pts.slice(1).some((b, k) => {
        const a = pts[k];
        const d = [0, 1, 2].map((n) => b[n] - a[n]);
        const len = Math.hypot(d[0], d[1], d[2]);
        const u = d.map((v) => v / len);
        const s = [0, 1, 2].reduce(
          (acc, n) => acc + (p.at[n] - a[n]) * u[n],
          0,
        );
        const off = [0, 1, 2].map((n) => p.at[n] - a[n] - s * u[n]);
        return (
          s > 0.05 &&
          s < len - 0.05 &&
          Math.hypot(off[0], off[1], off[2]) < 1e-6 &&
          [0, 1, 2].every((n) => Math.abs(u[n] - p.along[n]) < 1e-6)
        );
      });
      expect(on, `${f.id} on ${p.edge}`).toBe(true);
    }
  });
});
