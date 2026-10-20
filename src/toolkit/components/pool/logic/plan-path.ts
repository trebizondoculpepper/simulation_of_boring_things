/**
 * Paths in plan, (x, z) metres, as a pool's edge runs round it: the mitre
 * at each corner, and the outline of a band swept along a path. Pure.
 * Offsets are to the path's right as it is walked (+) or its left (−).
 */

export type PlanPoint = readonly [number, number];

/** A path segment's right-hand normal. */
const normal = (a: PlanPoint, b: PlanPoint): PlanPoint => {
  const dx = b[0] - a[0],
    dz = b[1] - a[1];
  const l = Math.hypot(dx, dz);
  return [-dz / l, dx / l];
};

/**
 * Each vertex's mitre: the bisector of the normals either side of it,
 * lengthened so that an offset along it keeps its distance from both
 * segments.
 */
export function mitres(path: readonly PlanPoint[]): PlanPoint[] {
  const n = path.length;
  return path.map((_, i) => {
    const before =
      i > 0 ? normal(path[i - 1], path[i]) : normal(path[0], path[1]);
    const after = i < n - 1 ? normal(path[i], path[i + 1]) : before;
    const mx = before[0] + after[0],
      mz = before[1] + after[1];
    const l = Math.hypot(mx, mz);
    const scale = 1 / ((mx / l) * before[0] + (mz / l) * before[1]);
    return [(mx / l) * scale, (mz / l) * scale];
  });
}

/** The point `offset` from path vertex `i`, along its mitre. */
export const offsetAt = (
  path: readonly PlanPoint[],
  m: readonly PlanPoint[],
  i: number,
  offset: number,
): PlanPoint => [path[i][0] + m[i][0] * offset, path[i][1] + m[i][1] * offset];

/**
 * The outline in plan of a band swept along `path` from `left` to `right`
 * of it (offsets, metres): down one side and back up the other.
 */
export function bandOutline(
  path: readonly PlanPoint[],
  left: number,
  right: number,
): PlanPoint[] {
  const m = mitres(path);
  const one = path.map((_, i) => offsetAt(path, m, i, left));
  const other = path.map((_, i) => offsetAt(path, m, i, right)).reverse();
  return [...one, ...other];
}

/** A polygon's area (positive either way round), square metres. */
export function area(points: readonly PlanPoint[]) {
  let a = 0;
  for (let i = 0; i < points.length; i++) {
    const [x0, z0] = points[i],
      [x1, z1] = points[(i + 1) % points.length];
    a += x0 * z1 - x1 * z0;
  }
  return Math.abs(a / 2);
}

/**
 * A closed polygon moved `by` metres in from each of its edges (out, if
 * negative), its corners mitred, whichever way round it is drawn: as the
 * water is drawn a millimetre clear of the tiles it lies against, so the
 * two surfaces never share a plane.
 */
export function insetPolygon(
  points: readonly PlanPoint[],
  by: number,
): PlanPoint[] {
  const n = points.length;
  let signed = 0;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = points[i],
      [x1, y1] = points[(i + 1) % n];
    signed += x0 * y1 - x1 * y0;
  }
  // Inward is to the left of each edge when drawn anticlockwise.
  const inward = signed > 0 ? 1 : -1;
  const edgeNormal = (a: PlanPoint, b: PlanPoint): PlanPoint => {
    const dx = b[0] - a[0],
      dy = b[1] - a[1];
    const l = Math.hypot(dx, dy);
    return [(-dy / l) * inward, (dx / l) * inward];
  };
  return points.map((p, i) => {
    const before = edgeNormal(points[(i - 1 + n) % n], p);
    const after = edgeNormal(p, points[(i + 1) % n]);
    const mx = before[0] + after[0],
      my = before[1] + after[1];
    const l = Math.hypot(mx, my);
    // A spike (edges doubling back) is moved along its edge's normal.
    if (l < 1e-9) return [p[0] + before[0] * by, p[1] + before[1] * by];
    const scale = by / ((mx / l) * before[0] + (my / l) * before[1]);
    return [p[0] + (mx / l) * scale, p[1] + (my / l) * scale];
  });
}

/** A path with its two ends drawn in `by` metres along it. */
export function trimPath(path: readonly PlanPoint[], by: number): PlanPoint[] {
  const pull = (a: PlanPoint, toward: PlanPoint): PlanPoint => {
    const dx = toward[0] - a[0],
      dz = toward[1] - a[1];
    const l = Math.hypot(dx, dz);
    return [a[0] + (dx / l) * by, a[1] + (dz / l) * by];
  };
  const n = path.length;
  return [
    pull(path[0], path[1]),
    ...path.slice(1, -1),
    pull(path[n - 1], path[n - 2]),
  ];
}
