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
 * take `[surface, cut]` materials. Its UVs are in metres: u along the
 * path, v across it (the profile's x), for a texture laid along the edge,
 * as a grating's bars are. u is measured square to each run, so a pattern
 * stays square to the edge and meets itself at each mitre. Its faces may wind either way: give its
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
  // How far along the path each of its vertices is.
  const along = path.map(() => 0);
  for (let i = 1; i < n; i++)
    along[i] =
      along[i - 1] +
      Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
  const surface: number[] = [];
  const cutFaces: number[] = [];
  const surfaceUv: number[] = [];
  const cutUv: number[] = [];
  const push = (into: number[], ...p: number[][]) => {
    for (const v of p) into.push(v[0], v[1], v[2]);
  };
  // u for a ring point on run i (path[i] to path[i + 1]): how far along
  // that run it lies, square to it.
  const uvOf = (run: number, ringAt: number, j: number) => {
    const [ax, az] = path[run],
      [bx, bz] = path[run + 1];
    const l = Math.hypot(bx - ax, bz - az);
    const p = rings[ringAt][j];
    const u =
      along[run] + ((p[0] - ax) * (bx - ax) + (p[2] - az) * (bz - az)) / l;
    return [u, profile[j][0]];
  };
  const k = profile.length;
  for (let j = 0; j < k; j++) {
    const isCut = cut(profile[j], profile[(j + 1) % k]);
    const into = isCut ? cutFaces : surface;
    const uvs = isCut ? cutUv : surfaceUv;
    const j1 = (j + 1) % k;
    for (let i = 0; i < n - 1; i++) {
      const a = rings[i][j],
        b = rings[i][j1],
        c = rings[i + 1][j1],
        d = rings[i + 1][j];
      push(into, a, b, c, a, c, d);
      for (const [pi, pj] of [
        [i, j],
        [i, j1],
        [i + 1, j1],
        [i, j],
        [i + 1, j1],
        [i + 1, j],
      ])
        uvs.push(...uvOf(i, pi, pj));
    }
  }
  // The cut faces at both ends.
  const contour = profile.map(([x, y]) => new Vector2(x, y));
  const triangles = ShapeUtils.triangulateShape(contour, []);
  for (const end of [0, n - 1]) {
    const r = rings[end];
    for (const [a, b, c] of triangles) {
      push(cutFaces, r[a], r[b], r[c]);
      for (const j of [a, b, c]) cutUv.push(profile[j][0], profile[j][1]);
    }
  }
  const positions = [...surface, ...cutFaces];
  const sides = surface.length / 3;
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute(
    'uv',
    new Float32BufferAttribute([...surfaceUv, ...cutUv], 2),
  );
  geometry.computeVertexNormals();
  geometry.addGroup(0, sides, 0);
  geometry.addGroup(sides, positions.length / 3 - sides, 1);
  return geometry;
}
