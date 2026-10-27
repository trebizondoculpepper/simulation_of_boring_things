import { describe, expect, it } from 'vite-plus/test';
import {
  DESK_TOP,
  deskInner,
  deskOuter,
  insidePolygon,
} from './control-room-prototype';
import {
  DESK_ROUND,
  deskProfile,
  deskRun,
  deskSweep,
  filletOutline,
  planRadius,
  wedgeOutline,
} from './rounded-desk';

describe('the softened operator desk', () => {
  it('rounds a right angle with its arc tangent to both sides', () => {
    const pts = filletOutline([
      { x: 0, y: 0, r: 0 },
      { x: 1, y: 0, r: 0.2 },
      { x: 1, y: 1, r: 0 },
    ]);
    expect(pts[1].x).toBeCloseTo(0.8);
    expect(pts[1].y).toBeCloseTo(0);
    const last = pts[pts.length - 2];
    expect(last.x).toBeCloseTo(1);
    expect(last.y).toBeCloseTo(0.2);
    for (const p of pts.slice(1, -1))
      expect(Math.hypot(p.x - 0.8, p.y - 0.2)).toBeCloseTo(0.2);
  });

  it('sweeps round its built sides, the way in left open', () => {
    expect(deskRun()).toEqual([5, 6, 0, 1, 2]);
  });

  it('keeps the sloping top on its plane between the rounded edges, where the panels lie flush', () => {
    const cream = deskProfile().find((p) => p.finish === 'cream')!.points;
    // One straight run from the edge's rounding to the ledge's, on the plane.
    const i = cream.findIndex(
      (p, k) => p.x > 0.97 && k + 1 < cream.length && cream[k + 1].x < 0.31,
    );
    expect(i).toBeGreaterThan(0);
    for (const p of [cream[i], cream[i + 1]]) {
      const f = (p.x - 0.3) / 0.7;
      expect(p.y).toBeCloseTo(
        DESK_TOP.upstand + (DESK_TOP.edge - DESK_TOP.upstand) * f,
        3,
      );
    }
  });

  it('rounds the outside generously and the operator side to match', () => {
    expect(planRadius(0)).toBeCloseTo(DESK_ROUND.outside);
    expect(DESK_ROUND.outside).toBeGreaterThanOrEqual(0.06);
    expect(planRadius(1)).toBeCloseTo(DESK_ROUND.inside);
    expect(planRadius(0.6)).toBeCloseTo(DESK_ROUND.inside);
    for (let d = 0; d <= 1; d += 0.01)
      expect(planRadius(d)).toBeGreaterThan(0.03);
  });

  it('stays within the segments it is collided by, and clear of every sharp outer corner', () => {
    const outer = deskOuter();
    const inner = deskInner();
    const sweep = deskSweep();
    const run = deskRun();
    const joints = run.slice(1).map((s) => outer[s]);
    for (const m of [sweep.cream, sweep.charcoal]) {
      expect(m.indices.length % 3).toBe(0);
      for (let i = 0; i < m.positions.length; i += 3) {
        const x = m.positions[i];
        const z = m.positions[i + 2];
        // Inside the outer outline, outside the well (the inside's fillets
        // reaching at most a couple of centimetres into it, inside the
        // walking collision's half-cell tolerance).
        expect(insidePolygon(outer, x, z)).toBe(true);
        if (insidePolygon(inner, x, z))
          expect(depthIn(inner, x, z)).toBeLessThan(0.025);
        for (const j of joints)
          // Never at the sharp point: its rounding stands in from it.
          expect(Math.hypot(x - j.x, z - j.z)).toBeGreaterThan(0.003);
      }
    }
  });

  it('brings a console wedge in by its bevel, its top still on its slope', () => {
    const w = wedgeOutline(0.9, 0.76, 1.0, 0.03);
    const xs = w.map((p) => p.x);
    expect(Math.min(...xs)).toBeCloseTo(0.03);
    expect(Math.max(...xs)).toBeCloseTo(0.87);
    expect(Math.max(...w.map((p) => p.y))).toBeLessThan(1.0);
  });
});

/** How far (x, z) lies inside a convex polygon: its distance to the nearest side. */
function depthIn(poly: { x: number; z: number }[], x: number, z: number) {
  return Math.min(
    ...poly.map((a, i) => {
      const b = poly[(i + 1) % poly.length];
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      return Math.abs((b.x - a.x) * (z - a.z) - (b.z - a.z) * (x - a.x)) / len;
    }),
  );
}
