/**
 * Pipe routes: a run of pipe given as the points it passes, turned into
 * the straight lengths and bends a pipefitter would make of it, in any
 * direction (risers and drops too, not only level runs). Pure; metres.
 *
 * Each corner becomes a bend of the given radius (an elbow fitting's, or a
 * pulled bend's), cut back where the lengths either side are too short to
 * take it; points in line are merged, and repeated points dropped. The
 * view (`views/pipe-route.ts`) draws the result, with the joints of the
 * pipe's kind.
 */

export type Vec3 = readonly [number, number, number];

export interface Straight {
  kind: 'straight';
  from: Vec3;
  to: Vec3;
  length: number;
}

export interface Bend {
  kind: 'bend';
  /** Where the bend leaves the incoming straight and joins the outgoing one. */
  start: Vec3;
  end: Vec3;
  /** Its centre of curvature, and radius, to the pipe's centre line. */
  centre: Vec3;
  radius: number;
  /** How far it turns, radians, and the directions in and out. */
  angle: number;
  in: Vec3;
  out: Vec3;
  length: number;
}

export type RouteSegment = Straight | Bend;

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const length = (a: Vec3) => Math.sqrt(dot(a, a));
const unit = (a: Vec3): Vec3 => scale(a, 1 / length(a));

/** The points, with repeats dropped and points in line with their neighbours merged. */
export function cleanRoute(points: readonly Vec3[], tolerance = 1e-6): Vec3[] {
  const kept: Vec3[] = [];
  for (const p of points)
    if (!kept.length || length(sub(p, kept[kept.length - 1])) > tolerance)
      kept.push(p);
  const out: Vec3[] = [];
  for (let i = 0; i < kept.length; i++) {
    if (i > 0 && i < kept.length - 1) {
      const a = unit(sub(kept[i], kept[i - 1]));
      const b = unit(sub(kept[i + 1], kept[i]));
      if (dot(a, b) > 1 - 1e-9) continue;
    }
    out.push(kept[i]);
  }
  return out;
}

/**
 * Plan a route through `points` with bends of `radius`: straights and
 * bends, in order. A bend's radius is cut back so that it takes no more
 * than half of either straight beside it (all of an end straight).
 */
export function planRoute(
  points: readonly Vec3[],
  radius: number,
): RouteSegment[] {
  const p = cleanRoute(points);
  if (p.length < 2) return [];
  // Each corner's bend: its cut-back radius and how far it trims the
  // straights either side.
  const corners = p.slice(1, -1).map((corner, k) => {
    const i = k + 1;
    const inLen = length(sub(corner, p[i - 1]));
    const outLen = length(sub(p[i + 1], corner));
    const dirIn = unit(sub(corner, p[i - 1]));
    const dirOut = unit(sub(p[i + 1], corner));
    const angle = Math.acos(Math.max(-1, Math.min(1, dot(dirIn, dirOut))));
    const tan = Math.tan(angle / 2);
    const room = Math.min(
      i === 1 ? inLen : inLen / 2,
      i === p.length - 2 ? outLen : outLen / 2,
    );
    const r = Math.min(radius, tan > 1e-9 ? room / tan : radius);
    return { corner, dirIn, dirOut, angle, r, trim: r * tan };
  });
  const segments: RouteSegment[] = [];
  let from = p[0];
  corners.forEach(({ corner, dirIn, dirOut, angle, r, trim }) => {
    const start = sub(corner, scale(dirIn, trim));
    const end = add(corner, scale(dirOut, trim));
    if (length(sub(start, from)) > 1e-9)
      segments.push({
        kind: 'straight',
        from,
        to: start,
        length: length(sub(start, from)),
      });
    // The centre lies from the bend's start toward the inside of the turn.
    const across = sub(dirOut, scale(dirIn, dot(dirIn, dirOut)));
    const centre = add(start, scale(unit(across), r));
    segments.push({
      kind: 'bend',
      start,
      end,
      centre,
      radius: r,
      angle,
      in: dirIn,
      out: dirOut,
      length: r * angle,
    });
    from = end;
  });
  const last = p[p.length - 1];
  if (length(sub(last, from)) > 1e-9)
    segments.push({
      kind: 'straight',
      from,
      to: last,
      length: length(sub(last, from)),
    });
  return segments;
}

/** The route's length along its centre line. */
export const routeLength = (segments: readonly RouteSegment[]) =>
  segments.reduce((s, g) => s + g.length, 0);

/**
 * Where joints fall along the straights: every `every` metres from each
 * straight's start (a pipe comes in lengths), not at its ends, which a
 * bend's fitting or the run's end already joins.
 */
export function jointsAlong(segments: readonly RouteSegment[], every: number) {
  const joints: { at: Vec3; dir: Vec3 }[] = [];
  if (every <= 0) return joints;
  for (const s of segments) {
    if (s.kind !== 'straight') continue;
    const dir = unit(sub(s.to, s.from));
    for (let d = every; d < s.length - every * 0.25; d += every)
      joints.push({ at: add(s.from, scale(dir, d)), dir });
  }
  return joints;
}

/** A surface a pipe may pass through: a point on it and the way it faces. */
export interface Plane {
  at: Vec3;
  normal: Vec3;
}

/**
 * Where a route's straights pass through `plane`: each crossing's point
 * and the pipe's direction there. A straight that only touches the plane
 * at its end does not cross it.
 */
export function crossings(segments: readonly RouteSegment[], plane: Plane) {
  const n = unit(plane.normal);
  const out: { at: Vec3; dir: Vec3 }[] = [];
  for (const s of segments) {
    if (s.kind !== 'straight') continue;
    const a = dot(sub(s.from, plane.at), n);
    const b = dot(sub(s.to, plane.at), n);
    if (a * b >= 0) continue;
    const k = a / (a - b);
    out.push({
      at: add(s.from, scale(sub(s.to, s.from), k)),
      dir: unit(sub(s.to, s.from)),
    });
  }
  return out;
}
