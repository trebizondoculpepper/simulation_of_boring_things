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

// ---- Joints, and their fittings ---------------------------------------------

/** How lengths of pipe are joined, and its fittings made (`views/pipe-route.ts` draws them). */
export type PipeJoint =
  | 'socket'
  | 'flange'
  | 'groove'
  | 'thread'
  | 'solder'
  | 'weld'
  | 'band'
  | 'none';

/** A bend's centre-line radius, in outside diameters, by joint. */
export const JOINT_BEND: Record<PipeJoint, number> = {
  socket: 0.9,
  flange: 1.5,
  groove: 1.0,
  thread: 0.8,
  solder: 1.0,
  weld: 1.5,
  band: 1.2,
  none: 3,
};

/** The lengths pipe comes in, m, by joint: a joint between each. */
export const JOINT_LENGTHS: Record<PipeJoint, number> = {
  socket: 6,
  flange: 6,
  groove: 6,
  thread: 6.4,
  solder: 3,
  weld: 6,
  band: 1,
  none: 0,
};

/**
 * A joint's fitting, on a pipe of radius `r` (outside diameter `2r`): its
 * outside radius, and its length along the pipe (a flanged joint's is its
 * flange pair's). As the view draws it.
 */
export function jointFitting(joint: PipeJoint, r: number, end = false) {
  const od = 2 * r;
  switch (joint) {
    case 'socket':
      return { radius: r * 1.2, length: od * (end ? 0.7 : 1.4) };
    case 'flange':
      return {
        radius: Math.max(r * 1.9, r + 0.04),
        length: 2 * Math.max(0.012, od * 0.12),
      };
    case 'groove':
      return { radius: r * 1.32, length: od * 0.5 };
    case 'thread':
      return { radius: r * 1.3, length: od * 0.9 };
    case 'solder':
      return { radius: r * 1.1, length: od * 0.8 };
    case 'band':
      return { radius: r * 1.05, length: od * 0.09 };
    case 'weld':
      return { radius: r * 1.04, length: od * 0.12 };
    case 'none':
      return { radius: r, length: 0 };
  }
}

/** A pipe run as drawn: its points, size and joint system. */
export interface DrawnRun {
  name: string;
  points: readonly Vec3[];
  od: number;
  joint: PipeJoint;
  /** A bend's radius in outside diameters; its joint's if not given. */
  bend?: number;
  lengths?: number;
  /** Lagging's thickness: the cladding is the run's outside. */
  insulation?: number;
}

/** The run's segments, as the view bends them. */
export function drawnSegments(run: DrawnRun) {
  const lag = run.insulation ?? 0;
  return planRoute(
    run.points,
    Math.max(run.bend ?? JOINT_BEND[run.joint], lag ? 1.5 : 0) *
      (run.od + 2 * lag),
  );
}

/** Each fitting along a run, where the view draws one: at each bend's ends, between lengths, and at its ends. */
export function fittingsOf(run: DrawnRun) {
  const r = run.od / 2;
  const segments = drawnSegments(run);
  const out: { at: Vec3; dir: Vec3; radius: number; length: number }[] = [];
  const add = (at: Vec3, dir: Vec3, end: boolean) => {
    const f = jointFitting(run.joint, r, end);
    out.push({ at, dir, ...f });
  };
  if (run.joint === 'none') return out;
  for (const s of segments)
    if (s.kind === 'bend' && run.joint !== 'weld') {
      add(s.start, s.in, true);
      add(s.end, s.out, true);
    }
  for (const j of jointsAlong(
    segments,
    run.lengths ?? JOINT_LENGTHS[run.joint],
  ))
    add(j.at, j.dir, false);
  return out;
}

/** The run's centre line as straight pieces, its bends cut into short chords. */
function centreLine(segments: readonly RouteSegment[]) {
  const pieces: [Vec3, Vec3][] = [];
  for (const s of segments) {
    if (s.kind === 'straight') {
      pieces.push([s.from, s.to]);
      continue;
    }
    const n = Math.max(2, Math.ceil(s.angle / (Math.PI / 16)));
    const a = sub(s.start, s.centre);
    const b = sub(s.end, s.centre);
    let prev = s.start;
    for (let k = 1; k <= n; k++) {
      // Slerp between the two radii about the centre.
      const t = k / n;
      const w0 = Math.sin((1 - t) * s.angle) / Math.sin(s.angle);
      const w1 = Math.sin(t * s.angle) / Math.sin(s.angle);
      const p = add(s.centre, add(scale(a, w0), scale(b, w1)));
      pieces.push([prev, p]);
      prev = p;
    }
  }
  return pieces;
}

/** The nearest points of two segments, and their distance. */
function segmentDistance(p1: Vec3, q1: Vec3, p2: Vec3, q2: Vec3) {
  const d1 = sub(q1, p1);
  const d2 = sub(q2, p2);
  const r = sub(p1, p2);
  const a = dot(d1, d1);
  const e = dot(d2, d2);
  const f = dot(d2, r);
  let s = 0;
  let t = 0;
  if (a <= 1e-12 && e <= 1e-12) {
    s = 0;
    t = 0;
  } else if (a <= 1e-12) {
    t = Math.min(1, Math.max(0, f / e));
  } else {
    const c = dot(d1, r);
    if (e <= 1e-12) s = Math.min(1, Math.max(0, -c / a));
    else {
      const b = dot(d1, d2);
      const den = a * e - b * b;
      s = den > 1e-12 ? Math.min(1, Math.max(0, (b * f - c * e) / den)) : 0;
      t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = Math.min(1, Math.max(0, -c / a));
      } else if (t > 1) {
        t = 1;
        s = Math.min(1, Math.max(0, (b - c) / a));
      }
    }
  }
  const c1 = add(p1, scale(d1, s));
  const c2 = add(p2, scale(d2, t));
  return { distance: length(sub(c1, c2)), on1: c1, on2: c2 };
}

export interface PipeClash {
  /** The run whose fitting or pipe cuts into the other's. */
  run: string;
  other: string;
  /** About where. */
  at: Vec3;
  what: 'fitting' | 'pipe';
}

/**
 * Where runs cut into each other: one run's pipe through another's, or
 * one's fitting (a flange, a socket, a coupling, all fatter than the
 * pipe) into another's pipe or fitting. Runs meet on purpose where one
 * ends on the other (a branch at its tee, two runs at one port): within
 * `joinZone` of such a meeting nothing counts. `clearance` is the gap
 * that must be left between surfaces, metres.
 */
export function pipeClashes(
  runs: readonly DrawnRun[],
  { clearance = 0.005, joinZone = 0.1 } = {},
): PipeClash[] {
  const drawn = runs.map((run) => {
    const segments = drawnSegments(run);
    const lag = run.insulation ?? 0;
    return {
      run,
      outside: run.od / 2 + lag,
      pieces: centreLine(segments),
      fittings: fittingsOf(run).map((f) => ({
        ...f,
        radius: Math.max(f.radius, run.od / 2 + lag),
      })),
      ends: [run.points[0], run.points[run.points.length - 1]],
    };
  });
  type D = (typeof drawn)[number];
  const near = (p: Vec3, d: D, by: number) =>
    d.pieces.some(([a, b]) => segmentDistance(p, p, a, b).distance <= by);
  // Where two runs meet on purpose: an end of one on the other's centre
  // line (or at the other's end).
  const meetings = (x: D, y: D) => [
    ...x.ends.filter((e) => near(e, y, y.outside + 0.02)),
    ...y.ends.filter((e) => near(e, x, x.outside + 0.02)),
  ];
  const clashes: PipeClash[] = [];
  for (let i = 0; i < drawn.length; i++)
    for (let j = 0; j < drawn.length; j++) {
      if (i === j) continue;
      const x = drawn[i];
      const y = drawn[j];
      const meet = meetings(x, y);
      const excused = (p: Vec3) =>
        meet.some((m) => length(sub(p, m)) <= joinZone + x.outside + y.outside);
      // Pipe through pipe: once for each pair.
      if (i < j)
        crossing: for (const [a, b] of x.pieces)
          for (const [c, d] of y.pieces) {
            const s = segmentDistance(a, b, c, d);
            if (
              s.distance < x.outside + y.outside + clearance - 1e-9 &&
              !excused(s.on1)
            ) {
              clashes.push({
                run: x.run.name,
                other: y.run.name,
                at: s.on1,
                what: 'pipe',
              });
              break crossing;
            }
          }
      // A fitting of x into y's pipe: a short fat cylinder against y's
      // centre line.
      for (const f of x.fittings) {
        if (excused(f.at)) continue;
        const half = f.length / 2;
        const a = add(f.at, scale(f.dir, -half));
        const b = add(f.at, scale(f.dir, half));
        const hit = y.pieces.some(([c, d]) => {
          // Sample y's piece near the fitting: radially and along its axis.
          const s = segmentDistance(a, b, c, d);
          if (s.distance >= f.radius + y.outside + clearance) return false;
          const n = 24;
          for (let k = 0; k <= n; k++) {
            const p = add(c, scale(sub(d, c), k / n));
            const rel = sub(p, f.at);
            const axial = dot(rel, f.dir);
            const radial = length(sub(rel, scale(f.dir, axial)));
            if (
              Math.abs(axial) < half + y.outside + clearance &&
              radial < f.radius + y.outside + clearance
            )
              return true;
          }
          // A long piece passing close: test its nearest point too.
          const rel = sub(s.on2, f.at);
          const axial = dot(rel, f.dir);
          const radial = length(sub(rel, scale(f.dir, axial)));
          return (
            Math.abs(axial) < half + y.outside + clearance &&
            radial < f.radius + y.outside + clearance
          );
        });
        if (hit) {
          clashes.push({
            run: x.run.name,
            other: y.run.name,
            at: f.at,
            what: 'fitting',
          });
          break;
        }
      }
    }
  return clashes;
}

// ---- Leaving a port ---------------------------------------------------------

/** A run's end at a port: where the port is, and the way it faces, out of its machine. */
export interface PortEnd {
  at: Vec3;
  outward: Vec3;
}

/**
 * How far a run must go straight out of a port before it may bend: past
 * the joint's fitting at the port, and at least one and a half diameters.
 */
export function portLead(od: number, joint: PipeJoint) {
  return Math.max(
    1.5 * od,
    jointFitting(joint, od / 2, true).length + od,
    0.05,
  );
}

/**
 * The run's points, with a straight lead out of each port it starts or
 * ends at, along the port's own direction, so that it leaves the port
 * square and bends only beyond the lead. A run's first or last point must
 * be its port's. The bend after a lead is the route's to make.
 */
export function withPortLeads(
  points: readonly Vec3[],
  od: number,
  joint: PipeJoint,
  { start, end }: { start?: PortEnd; end?: PortEnd },
): Vec3[] {
  const lead = portLead(od, joint) + JOINT_BEND[joint] * od;
  const out: Vec3[] = [...points];
  const step = (p: PortEnd) => add(p.at, scale(unit(p.outward), lead));
  /**
   * From the lead's end back to the run's next point, squared off: one
   * axis at a time, the port's own axis last, so the turn off the lead
   * is a right angle and does not eat into it.
   */
  const squared = (p: PortEnd, next: Vec3): Vec3[] => {
    const l = step(p);
    const n = unit(p.outward);
    const axis = [0, 1, 2].find((k) => Math.abs(n[k]) > 1 - 1e-9);
    if (axis === undefined) return [l];
    const others = [0, 1, 2].filter((k) => k !== axis);
    const q1 = [...l] as [number, number, number];
    q1[others[0]] = next[others[0]];
    const q2 = [...q1] as [number, number, number];
    q2[others[1]] = next[others[1]];
    return [l, q1, q2];
  };
  const along = (from: Vec3, to: Vec3, dir: Vec3) =>
    length(sub(to, from)) > 1e-9 &&
    dot(unit(sub(to, from)), unit(dir)) > 1 - 1e-6;
  if (start) {
    if (length(sub(out[0], start.at)) > 1e-6)
      throw new Error('A run with a start port must begin at it');
    // Already leaving square, far enough: leave it.
    if (
      !(
        out.length > 1 &&
        along(out[0], out[1], start.outward) &&
        length(sub(out[1], out[0])) >= lead - 1e-9
      )
    )
      out.splice(1, 0, ...squared(start, out[1] ?? step(start)));
  }
  if (end) {
    const n = out.length - 1;
    if (length(sub(out[n], end.at)) > 1e-6)
      throw new Error('A run with an end port must finish at it');
    if (
      !(
        n > 0 &&
        along(out[n], out[n - 1], end.outward) &&
        length(sub(out[n - 1], out[n])) >= lead - 1e-9
      )
    )
      out.splice(n, 0, ...squared(end, out[n - 1] ?? step(end)).reverse());
  }
  return cleanRoute(out);
}

/**
 * Whether a run leaves each of its ports square: its first straight
 * runs along the port's direction for at least the port's lead before
 * any bend.
 */
export function leavesPortsSquare(
  run: DrawnRun,
  { start, end }: { start?: PortEnd; end?: PortEnd },
): boolean {
  const segments = drawnSegments(run);
  if (!segments.length) return false;
  const lead = portLead(run.od, run.joint);
  const check = (s: RouteSegment | undefined, p: PortEnd, first: boolean) => {
    if (!s || s.kind !== 'straight') return false;
    const from = first ? s.from : s.to;
    const to = first ? s.to : s.from;
    return (
      length(sub(from, p.at)) < 1e-6 &&
      dot(unit(sub(to, from)), unit(p.outward)) >
        Math.cos((5 * Math.PI) / 180) &&
      s.length >= lead - 1e-9
    );
  };
  return (
    (!start || check(segments[0], start, true)) &&
    (!end || check(segments[segments.length - 1], end, false))
  );
}
