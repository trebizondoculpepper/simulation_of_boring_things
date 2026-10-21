import { BufferGeometry, Float32BufferAttribute } from 'three';

/**
 * Sweeping a section along a run: the geometry under every part of the
 * services ceiling (`service-parts.ts`). A run is a centre line in plan,
 * corners where it turns, filleted to its bend radius; a section is a
 * profile across it, (side, up). Metres.
 */

export type Point = readonly [number, number];

export interface Profile {
  points: readonly (readonly [number, number])[];
  /** Closed for a tube; open for a channel. */
  closed: boolean;
}

/** A round section, radius `r`. */
export const circle = (r: number, n = 14): Profile => ({
  points: Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [Math.cos(a) * r, Math.sin(a) * r] as const;
  }),
  closed: true,
});

/** An open-topped channel `w` wide and `h` deep, with small return lips. */
export const channel = (w: number, h: number): Profile => ({
  points: [
    [-w / 2 - 0.012, h / 2],
    [-w / 2, h / 2],
    [-w / 2, -h / 2],
    [w / 2, -h / 2],
    [w / 2, h / 2],
    [w / 2 + 0.012, h / 2],
  ],
  closed: false,
});

export interface PathSample {
  p: [number, number];
  /** The direction along the run there, a unit vector in plan. */
  t: [number, number];
}

/**
 * Points along a centre line, every 25 cm on the straights and eight to a
 * bend, each bend a quarter circle of up to `bend` radius.
 */
export function samplePath(points: readonly Point[], bend: number) {
  const out: PathSample[] = [];
  const push = (x: number, z: number, tx: number, tz: number) =>
    out.push({ p: [x, z], t: [tx, tz] });
  const dir = (a: Point, b: Point) => {
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return [(b[0] - a[0]) / l, (b[1] - a[1]) / l] as const;
  };
  let start: [number, number] = [points[0][0], points[0][1]];
  for (let i = 1; i < points.length; i++) {
    const b = points[i];
    const [dx, dz] = dir(points[i - 1], b);
    const len = Math.hypot(b[0] - start[0], b[1] - start[1]);
    const next = i === points.length - 1 ? null : points[i + 1];
    const r = next
      ? Math.min(bend, len / 2, Math.hypot(next[0] - b[0], next[1] - b[1]) / 2)
      : 0;
    const run = len - r;
    const steps = Math.max(1, Math.ceil(run / 0.25));
    for (let k = 0; k <= steps; k++) {
      if (k === 0 && out.length) continue;
      const s = (run * k) / steps;
      push(start[0] + dx * s, start[1] + dz * s, dx, dz);
    }
    if (!next) continue;
    const [ex, ez] = dir(b, next);
    const from: [number, number] = [b[0] - dx * r, b[1] - dz * r];
    const to: [number, number] = [b[0] + ex * r, b[1] + ez * r];
    const centre: [number, number] = [from[0] + ex * r, from[1] + ez * r];
    const a0 = Math.atan2(from[1] - centre[1], from[0] - centre[0]);
    const a1 = Math.atan2(to[1] - centre[1], to[0] - centre[0]);
    let turn = a1 - a0;
    while (turn > Math.PI) turn -= 2 * Math.PI;
    while (turn < -Math.PI) turn += 2 * Math.PI;
    for (let k = 1; k <= 8; k++) {
      const a = a0 + (turn * k) / 8;
      const share = k / 8;
      const tx = dx * (1 - share) + ex * share;
      const tz = dz * (1 - share) + ez * share;
      const tl = Math.hypot(tx, tz);
      push(
        centre[0] + Math.cos(a) * r,
        centre[1] + Math.sin(a) * r,
        tx / tl,
        tz / tl,
      );
    }
    start = to;
  }
  return out;
}

/**
 * Sweep `profile` along `path` at height `y`, moved `offset` across it:
 * uv u is metres along the run, v metres round the section.
 */
export function sweep(
  path: readonly PathSample[],
  profile: Profile,
  y: number,
  offset = 0,
) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const ring = profile.points.length + (profile.closed ? 1 : 0);
  const round: number[] = [0];
  for (let i = 1; i < ring; i++) {
    const a = profile.points[(i - 1) % profile.points.length];
    const b = profile.points[i % profile.points.length];
    round.push(round[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  let distance = 0;
  path.forEach(({ p, t }, k) => {
    if (k)
      distance += Math.hypot(p[0] - path[k - 1].p[0], p[1] - path[k - 1].p[1]);
    // Across the run, level: up × along.
    const sx = t[1];
    const sz = -t[0];
    for (let i = 0; i < ring; i++) {
      const [s, u] = profile.points[i % profile.points.length];
      positions.push(p[0] + sx * (s + offset), y + u, p[1] + sz * (s + offset));
      uvs.push(distance, round[i]);
    }
  });
  for (let k = 1; k < path.length; k++)
    for (let i = 1; i < ring; i++) {
      const a = (k - 1) * ring + i - 1;
      const b = a + 1;
      const c = k * ring + i - 1;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** The direction of a run's nearest straight to `at`: for hangers and fittings. */
export function headingAt(
  points: readonly Point[],
  [x, z]: Point,
): [number, number] {
  let best: [number, number] = [1, 0];
  let near = Infinity;
  for (let i = 1; i < points.length; i++) {
    const [a, b] = [points[i - 1], points[i]];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const t: [number, number] = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
    // Distance from the segment.
    const s = Math.max(0, Math.min(l, (x - a[0]) * t[0] + (z - a[1]) * t[1]));
    const d = Math.hypot(a[0] + t[0] * s - x, a[1] + t[1] * s - z);
    if (d < near) {
      near = d;
      best = t;
    }
  }
  return best;
}
