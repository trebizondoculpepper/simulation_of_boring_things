/**
 * The operator's desk, softened (the owner, 2026-10-27: "can you soften
 * the corners of this desk ... perhaps round the convex edges"; then the
 * inside as well). Pure geometry, no Three.js: the desk's cross-section
 * as a rounded profile, swept round its run of segments with every
 * corner on plan rounded (the outside's convex corners and the operator's
 * concave ones), and the rounded wedges of the stations' consoles.
 */
import {
  DESK,
  DESK_TOP,
  DESK_UPSTAND,
  deskOuter,
  inward,
} from './control-room-prototype';
import type { Point } from './control-room-prototype';

/** A corner of a 2D outline (x across, y up) and its fillet's radius (0 sharp). */
export interface RoundCorner {
  x: number;
  y: number;
  r: number;
}

/** A sampled 2D outline point; `crease` where the outline breaks sharply (or a run ends). */
export interface OutlinePoint {
  x: number;
  y: number;
  crease: boolean;
}

/**
 * An outline's corners each rounded by its own radius, its arcs sampled
 * `segs` steps; the radius shrunk where its neighbours leave too little
 * room. Open: the first and last points stay as given.
 */
export function filletOutline(
  corners: readonly RoundCorner[],
  closed = false,
  segs = 6,
): OutlinePoint[] {
  const n = corners.length;
  const out: OutlinePoint[] = [];
  for (let i = 0; i < n; i++) {
    const b = corners[i];
    const end = !closed && (i === 0 || i === n - 1);
    if (end || b.r <= 0) {
      out.push({ x: b.x, y: b.y, crease: true });
      continue;
    }
    const a = corners[(i + n - 1) % n];
    const c = corners[(i + 1) % n];
    const la = Math.hypot(a.x - b.x, a.y - b.y);
    const lc = Math.hypot(c.x - b.x, c.y - b.y);
    const u1 = { x: (a.x - b.x) / la, y: (a.y - b.y) / la };
    const u2 = { x: (c.x - b.x) / lc, y: (c.y - b.y) / lc };
    const cos = Math.max(-1, Math.min(1, u1.x * u2.x + u1.y * u2.y));
    const half = Math.acos(cos) / 2;
    if (half > Math.PI / 2 - 1e-6 || half < 1e-6) {
      out.push({ x: b.x, y: b.y, crease: false });
      continue;
    }
    // Never more than half of either side.
    const r = Math.min(b.r, (Math.min(la, lc) / 2) * Math.tan(half));
    const t = r / Math.tan(half);
    const bis = { x: u1.x + u2.x, y: u1.y + u2.y };
    const bl = Math.hypot(bis.x, bis.y);
    const k = r / Math.sin(half) / bl;
    const centre = { x: b.x + bis.x * k, y: b.y + bis.y * k };
    const t1 = { x: b.x + u1.x * t, y: b.y + u1.y * t };
    const t2 = { x: b.x + u2.x * t, y: b.y + u2.y * t };
    const a1 = Math.atan2(t1.y - centre.y, t1.x - centre.x);
    let a2 = Math.atan2(t2.y - centre.y, t2.x - centre.x);
    while (a2 - a1 > Math.PI) a2 -= 2 * Math.PI;
    while (a2 - a1 < -Math.PI) a2 += 2 * Math.PI;
    for (let s = 0; s <= segs; s++) {
      const ang = a1 + ((a2 - a1) * s) / segs;
      out.push({
        x: centre.x + Math.cos(ang) * r,
        y: centre.y + Math.sin(ang) * r,
        crease: false,
      });
    }
  }
  return out;
}

/** The desk's roundings, metres. */
export const DESK_ROUND = {
  /** The outside's vertical corners where its segments meet. */
  outside: 0.09,
  /** The operator's side's inside corners (the top's edge, the knee face). */
  inside: 0.08,
  /** The top's operator edge, above and below. */
  edge: 0.025,
  edgeUnder: 0.012,
  /** The upstand's crest, front and back. */
  crest: 0.025,
  /** The crest's flat, from the outer face to the raked face's head. */
  crestFlat: 0.05,
  /** The small bends of the top's ledge under the screens. */
  ledge: 0.02,
} as const;

/** Where the body's charcoal gives way to the cream above, on the outer face. */
export const DESK_BODY_TOP = 0.72;
/** The knee space's back (the body's operator face), metres in from the outer edge. */
export const DESK_KNEE = 0.6;
/** The top's operator edge's underside. */
export const DESK_EDGE_UNDER = 0.7;

export type DeskFinish = 'cream' | 'charcoal';

/**
 * The desk's cross-section (x in from its outer edge, y up from the
 * floor), from the knee space's foot round to the outer face's foot,
 * each run its finish: the charcoal knee face; the cream underside, the
 * top's operator edge, the sloping top (its upstand edge 0.9 m, its
 * operator's edge 0.76, as `DESK_TOP`), the ledge under the screens, the
 * upstand's raked face and its crest; the charcoal body below 0.72 m.
 */
export function deskProfile(): {
  finish: DeskFinish;
  points: OutlinePoint[];
}[] {
  const R = DESK_ROUND;
  const top = DESK.top;
  const under =
    DESK_BODY_TOP -
    ((DESK_BODY_TOP - DESK_EDGE_UNDER) * (DESK_KNEE - DESK_TOP.from)) /
      (1 - DESK_TOP.from);
  const knee: RoundCorner[] = [
    { x: DESK_KNEE, y: 0, r: 0 },
    { x: DESK_KNEE, y: under, r: 0 },
  ];
  const cream: RoundCorner[] = [
    { x: DESK_KNEE, y: under, r: 0 },
    { x: top, y: DESK_EDGE_UNDER, r: R.edgeUnder },
    { x: top, y: DESK_TOP.edge, r: R.edge },
    { x: top * DESK_TOP.from, y: DESK_TOP.upstand, r: R.ledge },
    { x: DESK_UPSTAND.head, y: DESK_UPSTAND.low, r: R.ledge },
    { x: R.crestFlat, y: DESK_UPSTAND.high, r: R.crest },
    { x: 0, y: DESK_UPSTAND.high, r: R.crest },
    { x: 0, y: DESK_BODY_TOP, r: 0 },
  ];
  const body: RoundCorner[] = [
    { x: 0, y: DESK_BODY_TOP, r: 0 },
    { x: 0, y: 0, r: 0 },
  ];
  return [
    { finish: 'charcoal', points: filletOutline(knee) },
    { finish: 'cream', points: filletOutline(cream) },
    { finish: 'charcoal', points: filletOutline(body) },
  ];
}

/**
 * How round the desk's plan is at a depth `d` in from its outer edge: the
 * outside's corners `DESK_ROUND.outside`, shrinking inward with the
 * crest (concentric), then easing up the raked face to the inside's
 * radius, which every face on the operator's side keeps.
 */
export function planRadius(d: number): number {
  const { outside, inside, crestFlat } = DESK_ROUND;
  const head = DESK_UPSTAND.head;
  if (d <= crestFlat) return outside - d;
  const r0 = outside - crestFlat;
  if (d < head)
    return r0 + ((inside - r0) * (d - crestFlat)) / (head - crestFlat);
  return inside;
}

/** The desk's sides in order round its run (the open ones left out), and its corners: the ends then the joints. */
export function deskRun(): number[] {
  const n = deskOuter().length;
  const open = new Set(DESK.open);
  // Start just after the open sides, so the run is contiguous.
  const start = (Math.max(...DESK.open) + 1) % n;
  const out: number[] = [];
  for (let k = 0; k < n; k++) {
    const s = (start + k) % n;
    if (!open.has(s)) out.push(s);
  }
  return out;
}

/** A swept surface: triangles (counter-clockwise from outside) by position and index. */
export interface SweepMesh {
  positions: number[];
  indices: number[];
}

/**
 * The desk as swept surfaces, one per finish, in plan metres (y from its
 * foot): its profile carried along its run, the plan at each depth its
 * outline moved in that far with its corners rounded by `planRadius`
 * (a corner's arc centred on the outline moved in by depth and radius
 * together), its ends on the mitres of the open side (as the segments'),
 * left open for the cheeks to close.
 */
export function deskSweep(arcSegs = 10): Record<DeskFinish, SweepMesh> {
  const outer = deskOuter();
  const n = outer.length;
  const normal = (side: number) => inward(outer[side], outer[(side + 1) % n]);
  const run = deskRun();
  // The path's stations: the first end, every joint's arc, the last end.
  type Station = (d: number, r: number) => { p: Point; n: Point };
  const stations: Station[] = [];
  const mitre = (a: Point, b: Point) => {
    const k = 1 + a.x * b.x + a.z * b.z;
    return { x: (a.x + b.x) / k, z: (a.z + b.z) / k };
  };
  const first = run[0];
  const last = run[run.length - 1];
  {
    const V = outer[first];
    const m = mitre(normal((first + n - 1) % n), normal(first));
    const nn = normal(first);
    stations.push((d) => ({
      p: { x: V.x + m.x * d, z: V.z + m.z * d },
      n: nn,
    }));
  }
  for (let k = 0; k + 1 < run.length; k++) {
    const n1 = normal(run[k]);
    const n2 = normal(run[k + 1]);
    const V = outer[run[k + 1]];
    const m = mitre(n1, n2);
    const a1 = Math.atan2(-n1.z, -n1.x);
    let a2 = Math.atan2(-n2.z, -n2.x);
    while (a2 - a1 > Math.PI) a2 -= 2 * Math.PI;
    while (a2 - a1 < -Math.PI) a2 += 2 * Math.PI;
    for (let s = 0; s <= arcSegs; s++) {
      const ang = a1 + ((a2 - a1) * s) / arcSegs;
      const o = { x: Math.cos(ang), z: Math.sin(ang) };
      stations.push((d, r) => ({
        p: {
          x: V.x + m.x * (d + r) + o.x * r,
          z: V.z + m.z * (d + r) + o.z * r,
        },
        n: { x: -o.x, z: -o.z },
      }));
    }
  }
  {
    const V = outer[(last + 1) % n];
    const m = mitre(normal(last), normal((last + 1) % n));
    const nn = normal(last);
    stations.push((d) => ({
      p: { x: V.x + m.x * d, z: V.z + m.z * d },
      n: nn,
    }));
  }

  const out: Record<DeskFinish, SweepMesh> = {
    cream: { positions: [], indices: [] },
    charcoal: { positions: [], indices: [] },
  };
  for (const { finish, points } of deskProfile()) {
    const mesh = out[finish];
    // Each run of the profile between creases is shaded smooth on its own.
    const runs: OutlinePoint[][] = [];
    let cur: OutlinePoint[] = [];
    points.forEach((p, i) => {
      cur.push(p);
      if (p.crease && i > 0 && i < points.length - 1) {
        runs.push(cur);
        cur = [p];
      }
    });
    runs.push(cur);
    for (const prof of runs) {
      if (prof.length < 2) continue;
      const base = mesh.positions.length / 3;
      const cols = prof.length;
      for (const st of stations)
        for (const q of prof) {
          const { p } = st(q.x, planRadius(q.x));
          mesh.positions.push(p.x, q.y, p.z);
        }
      const at = (j: number, i: number) => base + j * cols + i;
      const pos = mesh.positions;
      const v = (k: number) => [pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]];
      for (let j = 0; j + 1 < stations.length; j++)
        for (let i = 0; i + 1 < cols; i++) {
          // Outward: from the profile's direction (dx, dy), (dy, -dx) in
          // (in, up), in plan the station's inward normal.
          const dx = prof[i + 1].x - prof[i].x;
          const dy = prof[i + 1].y - prof[i].y;
          const nIn = stations[j](prof[i].x, planRadius(prof[i].x)).n;
          const want = [nIn.x * dy, -dx, nIn.z * dy];
          const quad = [at(j, i), at(j, i + 1), at(j + 1, i + 1), at(j + 1, i)];
          for (const [a, b, c] of [
            [quad[0], quad[1], quad[2]],
            [quad[0], quad[2], quad[3]],
          ]) {
            const A = v(a);
            const B = v(b);
            const C = v(c);
            const e1 = [B[0] - A[0], B[1] - A[1], B[2] - A[2]];
            const e2 = [C[0] - A[0], C[1] - A[1], C[2] - A[2]];
            const cr = [
              e1[1] * e2[2] - e1[2] * e2[1],
              e1[2] * e2[0] - e1[0] * e2[2],
              e1[0] * e2[1] - e1[1] * e2[0],
            ];
            const area = Math.hypot(cr[0], cr[1], cr[2]);
            if (area < 1e-12) continue;
            const dot = cr[0] * want[0] + cr[1] * want[1] + cr[2] * want[2];
            mesh.indices.push(...(dot >= 0 ? [a, b, c] : [a, c, b]));
          }
        }
    }
  }
  return out;
}

/**
 * An open end's cheek, in its own plane (x along the end's mitre from the
 * outer edge, metres of depth; y up): the desk's profile stood a little
 * proud (`proud`) all round, down to the floor across the knee space,
 * its corners rounded; the view rounds its faces' edges too.
 */
export function cheekOutline(proud = 0.006): OutlinePoint[] {
  const R = DESK_ROUND;
  const e = proud;
  const slope =
    (DESK_UPSTAND.head - R.crestFlat) / (DESK_UPSTAND.high - DESK_UPSTAND.low);
  const ledgeY = DESK_TOP.upstand + e;
  return filletOutline(
    [
      { x: -e, y: 0, r: 0 },
      { x: -e, y: DESK_UPSTAND.high + e, r: 0.02 },
      { x: R.crestFlat + e, y: DESK_UPSTAND.high + e, r: 0.015 },
      {
        x: DESK_UPSTAND.head + e + (DESK_UPSTAND.low + e - ledgeY) * slope,
        y: ledgeY,
        r: 0,
      },
      { x: DESK.top * DESK_TOP.from, y: ledgeY, r: 0 },
      { x: DESK.top + e, y: DESK_TOP.edge + e, r: 0.02 },
      { x: DESK.top + e, y: 0, r: 0 },
    ],
    true,
  );
}

/**
 * A console's side outline (x across its depth from its low edge, y up):
 * its sloping top from `low` to `high` over `depth`, brought in by
 * `bevel` all round but its foot (the view's bevel puts it back), the top
 * corners rounded `r`.
 */
export function wedgeOutline(
  depth: number,
  low: number,
  high: number,
  bevel: number,
  r = 0.015,
): OutlinePoint[] {
  const s = (high - low) / depth;
  const drop = bevel * Math.hypot(1, s);
  const y = (x: number) => low + s * x - drop;
  return filletOutline(
    [
      { x: bevel, y: 0, r: 0 },
      { x: depth - bevel, y: 0, r: 0 },
      { x: depth - bevel, y: y(depth - bevel), r },
      { x: bevel, y: y(bevel), r },
    ],
    true,
  );
}
