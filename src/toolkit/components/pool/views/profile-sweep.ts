import {
  BufferGeometry,
  Float32BufferAttribute,
  ShapeUtils,
  Vector2,
} from 'three';
import type { Point } from '../logic/edge-profiles';
import { mitres, offsetAt } from '../logic/plan-path';

/**
 * A cross-section swept along a path in plan, mitred at each corner, as a
 * pool's edge runs round the pool. The profile is in metres: x across the
 * edge (to the path's right, as it is walked, +), y up. The path is in
 * plan, (x, z) metres. Its faces are group 0 for the profile's run and
 * group 1 for the cut faces: its two end caps, and any run of the profile
 * `cut` says is cut (the back and bottom of a section), so a mesh can
 * take `[surface, cut]` materials. Its faces may wind either way: give its
 * materials `side: DoubleSide`.
 */
export function sweepProfile(
  profile: readonly Point[],
  path: readonly (readonly [number, number])[],
  cut: (a: Point, b: Point) => boolean = () => false,
) {
  const n = path.length;
  const m = mitres(path);
  const ring = (i: number) =>
    profile.map(([px, py]) => {
      const [x, z] = offsetAt(path, m, i, px);
      return [x, py, z];
    });
  const rings = path.map((_, i) => ring(i));
  const surface: number[] = [];
  const cutFaces: number[] = [];
  const push = (into: number[], ...p: number[][]) => {
    for (const v of p) into.push(v[0], v[1], v[2]);
  };
  const k = profile.length;
  for (let j = 0; j < k; j++) {
    const into = cut(profile[j], profile[(j + 1) % k]) ? cutFaces : surface;
    for (let i = 0; i < n - 1; i++) {
      const a = rings[i][j],
        b = rings[i][(j + 1) % k],
        c = rings[i + 1][(j + 1) % k],
        d = rings[i + 1][j];
      push(into, a, b, c, a, c, d);
    }
  }
  // The cut faces at both ends.
  const contour = profile.map(([x, y]) => new Vector2(x, y));
  const triangles = ShapeUtils.triangulateShape(contour, []);
  for (const end of [0, n - 1]) {
    const r = rings[end];
    for (const [a, b, c] of triangles) push(cutFaces, r[a], r[b], r[c]);
  }
  const positions = [...surface, ...cutFaces];
  const sides = surface.length / 3;
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  geometry.addGroup(0, sides, 0);
  geometry.addGroup(sides, positions.length / 3 - sides, 1);
  return geometry;
}
