import type { PortEnd, Vec3 } from '../../components/core/logic/pipe-route';

/**
 * Trials of ways to route a room's lines without one passing through
 * another (the owner, 2026-10-23: "try the different approaches"), for
 * comparing against each other and against prompt 021's router:
 *
 * - **A, rack levels:** east–west runs on one set of levels, north–south
 *   runs on another, each line given the lowest pair of levels where its
 *   runs and risers meet nothing already placed. No grid.
 * - **B, voxel search:** each placed line reserves its cells; the next
 *   finds a free path through the grid (A*, square moves, a cost for each
 *   bend and each metre at the line's price). Biggest first.
 * - **C, voxel search with the rack rule:** as B, horizontal moves dearer
 *   on levels meant for the other direction.
 * - **D, C with rip-up and reroute:** lines are routed together, cells
 *   used by more than one growing dearer each round (negotiated
 *   congestion), then routed for good in order.
 *
 * Pure; metres. Experimental: not used by any room.
 */

export interface TrialLine {
  id: string;
  /** Outside radius, lagging included, metres. */
  radius: number;
  /** £ a metre. */
  price: number;
  /** Its two ends, each a port and the way it faces; `to` null for a flue to the ceiling. */
  from: PortEnd;
  to: PortEnd | null;
  /** How far each end runs straight out of its port first. */
  lead: number;
}

export interface Box {
  min: Vec3;
  max: Vec3;
}

export interface TrialRoom {
  w: number;
  d: number;
  h: number;
  /** What no run may pass through: machines, and regions that forbid runs. */
  obstacles: readonly Box[];
}

export interface TrialResult {
  runs: { id: string; points: Vec3[] }[];
  failed: string[];
  ms: number;
}

const CLEAR = 0.025;
const add = (a: Vec3, b: Vec3, k = 1): Vec3 => [
  a[0] + b[0] * k,
  a[1] + b[1] * k,
  a[2] + b[2] * k,
];

/** Points with repeats and points in line dropped. */
function tidy(points: readonly Vec3[]): Vec3[] {
  const kept: Vec3[] = [];
  for (const p of points) {
    const q = kept.at(-1);
    if (!q || Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) > 1e-6)
      kept.push(p);
  }
  return kept.filter((p, i) => {
    if (i === 0 || i === kept.length - 1) return true;
    const a = kept[i - 1];
    const b = kept[i + 1];
    const u = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
    const v = [b[0] - p[0], b[1] - p[1], b[2] - p[2]];
    const cross = Math.hypot(
      u[1] * v[2] - u[2] * v[1],
      u[2] * v[0] - u[0] * v[2],
      u[0] * v[1] - u[1] * v[0],
    );
    return cross > 1e-9;
  });
}

/** The nearest distance between two segments. */
function segmentDistance(p1: Vec3, q1: Vec3, p2: Vec3, q2: Vec3) {
  const d1 = [q1[0] - p1[0], q1[1] - p1[1], q1[2] - p1[2]];
  const d2 = [q2[0] - p2[0], q2[1] - p2[1], q2[2] - p2[2]];
  const r = [p1[0] - p2[0], p1[1] - p2[1], p1[2] - p2[2]];
  const dot = (a: number[], b: number[]) =>
    a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const a = dot(d1, d1);
  const e = dot(d2, d2);
  const f = dot(d2, r);
  let s = 0;
  let t = 0;
  if (a <= 1e-12 && e > 1e-12) t = Math.min(1, Math.max(0, f / e));
  else if (a > 1e-12) {
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
  const x = [
    p1[0] + d1[0] * s - p2[0] - d2[0] * t,
    p1[1] + d1[1] * s - p2[1] - d2[1] * t,
    p1[2] + d1[2] * s - p2[2] - d2[2] * t,
  ];
  return Math.hypot(x[0], x[1], x[2]);
}

/** Whether a segment, thickened by `r`, passes through a box. */
function hitsBox(a: Vec3, b: Vec3, r: number, box: Box) {
  let t0 = 0;
  let t1 = 1;
  for (let k = 0; k < 3; k++) {
    const lo = box.min[k] - r;
    const hi = box.max[k] + r;
    const d = b[k] - a[k];
    if (Math.abs(d) < 1e-12) {
      if (a[k] <= lo || a[k] >= hi) return false;
      continue;
    }
    let u = (lo - a[k]) / d;
    let v = (hi - a[k]) / d;
    if (u > v) [u, v] = [v, u];
    t0 = Math.max(t0, u);
    t1 = Math.min(t1, v);
    if (t0 >= t1) return false;
  }
  return true;
}

const order = (lines: readonly TrialLine[]) =>
  [...lines].sort((a, b) => b.radius * b.price - a.radius * a.price);

// ---- A: rack levels -------------------------------------------------------------------

export function routeRack(
  room: TrialRoom,
  lines: readonly TrialLine[],
): TrialResult {
  const t0 = performance.now();
  const base = 2.9;
  const step = 0.18;
  const levels = Math.floor((room.h - 0.4 - base) / step);
  const placed: { id: string; a: Vec3; b: Vec3; r: number; near: Vec3[] }[] =
    [];
  const runs: TrialResult['runs'] = [];
  const failed: string[] = [];
  /** Whether a segment of `line` meets anything placed, or an obstacle (its own ends' leads excused). */
  const blocked = (a: Vec3, b: Vec3, line: TrialLine, ends: Vec3[]) => {
    for (const s of placed) {
      if (segmentDistance(a, b, s.a, s.b) < line.radius + s.r + CLEAR) {
        // Lines meeting at a shared port meet on purpose.
        const shared = ends.some((e) =>
          s.near.some(
            (n) => Math.hypot(e[0] - n[0], e[1] - n[1], e[2] - n[2]) < 0.05,
          ),
        );
        if (!shared) return true;
      }
    }
    return false;
  };
  const inObstacle = (a: Vec3, b: Vec3, r: number, skip: Vec3[]) =>
    room.obstacles.some(
      (box) =>
        hitsBox(a, b, r, box) && !skip.some((p) => hitsBox(p, p, 0.05, box)),
    );
  for (const line of order(lines)) {
    const a = add(line.from.at, line.from.outward, line.lead);
    const ends = [line.from.at, ...(line.to ? [line.to.at] : [])];
    let best: Vec3[] | null = null;
    if (!line.to) {
      // A flue: straight up through the roof.
      best = [line.from.at, [line.from.at[0], room.h, line.from.at[2]]];
    } else {
      const b = add(line.to.at, line.to.outward, line.lead);
      search: for (let k = 0; k + 1 < levels; k++)
        for (const first of ['x', 'z'] as const) {
          // The first direction on its parity of level, the second on the next.
          const even = base + 2 * k * step;
          const odd = base + (2 * k + 1) * step;
          const [y1, y2] = first === 'x' ? [even, odd] : [odd, even];
          const corner: Vec3 =
            first === 'x' ? [b[0], y1, a[2]] : [a[0], y1, b[2]];
          const pts: Vec3[] = tidy([
            line.from.at,
            a,
            [a[0], y1, a[2]],
            corner,
            [corner[0], y2, corner[2]],
            [b[0], y2, b[2]],
            b,
            line.to.at,
          ]);
          let ok = true;
          for (let i = 1; i < pts.length && ok; i++) {
            if (blocked(pts[i - 1], pts[i], line, ends)) ok = false;
            // Leads and the first and last risers may leave their own machine.
            const own = i <= 2 || i >= pts.length - 2;
            if (!own && inObstacle(pts[i - 1], pts[i], line.radius, ends))
              ok = false;
          }
          if (ok) {
            best = pts;
            break search;
          }
        }
    }
    if (!best) {
      failed.push(line.id);
      continue;
    }
    for (let i = 1; i < best.length; i++)
      placed.push({
        id: line.id,
        a: best[i - 1],
        b: best[i],
        r: line.radius,
        near: ends,
      });
    runs.push({ id: line.id, points: best });
  }
  return { runs, failed, ms: performance.now() - t0 };
}

// ---- B, C, D: a voxel grid ------------------------------------------------------------------

const CELL = 0.1;

export function routeVoxel(
  room: TrialRoom,
  lines: readonly TrialLine[],
  { rack = false, rounds = 0 }: { rack?: boolean; rounds?: number } = {},
): TrialResult {
  const t0 = performance.now();
  const nx = Math.ceil(room.w / CELL);
  const ny = Math.ceil(room.h / CELL);
  const nz = Math.ceil(room.d / CELL);
  const N = nx * ny * nz;
  const idx = (i: number, j: number, k: number) => (j * nz + k) * nx + i;
  const cellOf = (p: Vec3): [number, number, number] => [
    Math.min(nx - 1, Math.max(0, Math.floor((p[0] + room.w / 2) / CELL))),
    Math.min(ny - 1, Math.max(0, Math.floor(p[1] / CELL))),
    Math.min(nz - 1, Math.max(0, Math.floor((p[2] + room.d / 2) / CELL))),
  ];
  const centre = (i: number, j: number, k: number): Vec3 => [
    -room.w / 2 + (i + 0.5) * CELL,
    (j + 0.5) * CELL,
    -room.d / 2 + (k + 0.5) * CELL,
  ];
  // Everything is grown by the biggest pipe's radius and the clearance, so
  // a pipe is a line of cells (a little conservative for small ones).
  const grow = Math.max(...lines.map((l) => l.radius)) + CLEAR;
  const solid = new Uint8Array(N);
  const markBox = (
    min: Vec3,
    max: Vec3,
    into: Uint8Array | Uint16Array,
    by: number,
  ) => {
    const [i0, j0, k0] = cellOf([min[0] - by, min[1] - by, min[2] - by]);
    const [i1, j1, k1] = cellOf([max[0] + by, max[1] + by, max[2] + by]);
    for (let j = j0; j <= j1; j++)
      for (let k = k0; k <= k1; k++)
        for (let i = i0; i <= i1; i++)
          into[idx(i, j, k)] = Math.min(65535, into[idx(i, j, k)] + 1);
  };
  for (const box of room.obstacles) markBox(box.min, box.max, solid, grow);
  // Each port's own way out stays open.
  const carve = (p: Vec3, r: number) => {
    const [i0, j0, k0] = cellOf([p[0] - r, p[1] - r, p[2] - r]);
    const [i1, j1, k1] = cellOf([p[0] + r, p[1] + r, p[2] + r]);
    for (let j = j0; j <= j1; j++)
      for (let k = k0; k <= k1; k++)
        for (let i = i0; i <= i1; i++) solid[idx(i, j, k)] = 0;
  };
  // Each end's way out of its machine: its lead, then straight up clear
  // of the tallest machine.
  const top = Math.max(0, ...room.obstacles.map((b) => b.max[1])) + grow + CELL;
  const exit = (end: PortEnd, lead: number) => {
    const a = add(end.at, end.outward, lead);
    for (let t = 0; t <= 1.0001; t += 0.25)
      carve(add(end.at, end.outward, lead * t), 0.12);
    for (
      let y = a[1];
      y <= Math.min(room.h - 0.2, Math.max(a[1], 3.2));
      y += CELL
    )
      carve([a[0], y, a[2]], 0.12);
    void top;
  };
  for (const l of lines) {
    exit(l.from, l.lead);
    if (l.to) exit(l.to, l.lead);
  }
  const used = new Uint16Array(N);
  /** Which group of lines (those leaving one port: a header or a bus) holds each cell; −1 none, −2 several. */
  const owner = new Int16Array(N).fill(-1);
  const groups = new Map<string, number>();
  const groupOf = (line: TrialLine) => {
    const key = line.from.at.map((v) => v.toFixed(3)).join(',');
    if (!groups.has(key)) groups.set(key, groups.size);
    return groups.get(key)!;
  };
  const history = new Float32Array(N);
  const reserve = (path: number[], by: number, into: Uint16Array, sign = 1) => {
    const r = Math.ceil(by / CELL);
    for (const c of path) {
      const i = c % nx;
      const k = Math.floor(c / nx) % nz;
      const j = Math.floor(c / (nx * nz));
      for (let dj = -r; dj <= r; dj++)
        for (let dk = -r; dk <= r; dk++)
          for (let di = -r; di <= r; di++) {
            const a = i + di;
            const b = j + dj;
            const e = k + dk;
            if (a < 0 || b < 0 || e < 0 || a >= nx || b >= ny || e >= nz)
              continue;
            const q = idx(a, b, e);
            into[q] = Math.max(0, into[q] + sign);
          }
    }
  };
  const level = (j: number) => Math.floor(((j + 0.5) * CELL - 2.9) / 0.18);

  /** A* from `a` to `b` (cells); `hard`: reserved cells are walls; else they cost. */
  const search = (
    line: TrialLine,
    a: number,
    b: number,
    hard: boolean,
    present: number,
  ) => {
    const mine = groupOf(line);
    const g = new Float32Array(N).fill(Infinity);
    const from = new Int32Array(N).fill(-1);
    const dirOf = new Int8Array(N).fill(-1);
    const heap: number[] = [];
    const f: number[] = [];
    const push = (c: number, cost: number) => {
      heap.push(c);
      f.push(cost);
      let n = heap.length - 1;
      while (n > 0) {
        const p = (n - 1) >> 1;
        if (f[p] <= f[n]) break;
        [heap[p], heap[n]] = [heap[n], heap[p]];
        [f[p], f[n]] = [f[n], f[p]];
        n = p;
      }
    };
    const pop = () => {
      const top = heap[0];
      const last = heap.pop()!;
      const lf = f.pop()!;
      if (heap.length) {
        heap[0] = last;
        f[0] = lf;
        let n = 0;
        for (;;) {
          const l = 2 * n + 1;
          const r = l + 1;
          let m = n;
          if (l < heap.length && f[l] < f[m]) m = l;
          if (r < heap.length && f[r] < f[m]) m = r;
          if (m === n) break;
          [heap[m], heap[n]] = [heap[n], heap[m]];
          [f[m], f[n]] = [f[n], f[m]];
          n = m;
        }
      }
      return top;
    };
    const [bi, bj, bk] = [
      b % nx,
      Math.floor(b / (nx * nz)),
      Math.floor(b / nx) % nz,
    ];
    const h = (c: number) => {
      const i = c % nx;
      const k = Math.floor(c / nx) % nz;
      const j = Math.floor(c / (nx * nz));
      return (
        (Math.abs(i - bi) + Math.abs(j - bj) + Math.abs(k - bk)) *
        CELL *
        line.price
      );
    };
    // Near its own ends a line may meet another (lines sharing a port).
    const own = [a, b].map((c) => [
      c % nx,
      Math.floor(c / (nx * nz)),
      Math.floor(c / nx) % nz,
    ]);
    const nearOwn = (c: number) => {
      const i = c % nx;
      const k = Math.floor(c / nx) % nz;
      const j = Math.floor(c / (nx * nz));
      return own.some(
        ([oi, oj, ok]) =>
          Math.abs(oi - i) + Math.abs(oj - j) + Math.abs(ok - k) <= 3,
      );
    };
    g[a] = 0;
    push(a, h(a));
    const D = [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
      [0, 0, 1],
      [0, 0, -1],
    ];
    let expanded = 0;
    while (heap.length && expanded < 1500000) {
      const c = pop();
      if (c === b) break;
      expanded++;
      const i = c % nx;
      const k = Math.floor(c / nx) % nz;
      const j = Math.floor(c / (nx * nz));
      for (let d = 0; d < 6; d++) {
        const a2 = i + D[d][0];
        const b2 = j + D[d][1];
        const e2 = k + D[d][2];
        if (a2 < 0 || b2 < 0 || e2 < 0 || a2 >= nx || b2 >= ny || e2 >= nz)
          continue;
        const q = idx(a2, b2, e2);
        if (solid[q] && q !== b) continue;
        if (
          hard &&
          owner[q] !== -1 &&
          owner[q] !== mine &&
          q !== b &&
          !nearOwn(q)
        )
          continue;
        let step = CELL * line.price;
        // A bend costs as half a metre of the pipe.
        if (dirOf[c] >= 0 && dirOf[c] !== d) step += 0.5 * line.price;
        // The rack rule: x-runs on even levels, z-runs on odd.
        if (rack && D[d][1] === 0 && b2 >= 29) {
          const even = level(b2) % 2 === 0;
          if ((D[d][0] !== 0 && !even) || (D[d][2] !== 0 && even)) step *= 3;
        }
        if (!hard) step *= (1 + used[q] * present) * (1 + history[q]);
        const ng = g[c] + step;
        if (ng < g[q]) {
          g[q] = ng;
          from[q] = c;
          dirOf[q] = d;
          push(q, ng + h(q));
        }
      }
    }
    if (from[b] < 0 && a !== b) return null;
    const path: number[] = [];
    for (let c = b; c >= 0; c = from[c]) {
      path.push(c);
      if (c === a) break;
    }
    return path.reverse();
  };
  const ends = (line: TrialLine) => {
    const a = add(line.from.at, line.from.outward, line.lead);
    const b: Vec3 = line.to
      ? add(line.to.at, line.to.outward, line.lead)
      : [line.from.at[0], room.h - 0.05, line.from.at[2]];
    const [ai, aj, ak] = cellOf(a);
    const [bi, bj, bk] = cellOf(b);
    return { a, b, ca: idx(ai, aj, ak), cb: idx(bi, bj, bk) };
  };
  const toPoints = (line: TrialLine, path: number[]) => {
    const { a, b } = ends(line);
    const pts: Vec3[] = [line.from.at, a];
    for (const c of path) {
      const i = c % nx;
      const k = Math.floor(c / nx) % nz;
      const j = Math.floor(c / (nx * nz));
      pts.push(centre(i, j, k));
    }
    pts.push(b);
    if (line.to) pts.push(line.to.at);
    else pts.push([line.from.at[0], room.h, line.from.at[2]]);
    // Square up: each point moved onto the previous one's axis where it drifted.
    const square: Vec3[] = [pts[0]];
    for (let n = 1; n < pts.length; n++) {
      const p = square.at(-1)!;
      const q = pts[n];
      const diffs = [0, 1, 2].filter((m) => Math.abs(p[m] - q[m]) > 1e-6);
      if (diffs.length <= 1) square.push(q);
      else {
        let cur: [number, number, number] = [p[0], p[1], p[2]];
        for (const m of diffs) {
          const next: [number, number, number] = [cur[0], cur[1], cur[2]];
          next[m] = q[m];
          square.push(next);
          cur = next;
        }
      }
    }
    return tidy(square);
  };

  const sorted = order(lines);
  const paths = new Map<string, number[]>();
  // D: negotiated rounds, sharing allowed but dearer each time.
  for (let round = 0; round < rounds; round++) {
    used.fill(0);
    paths.clear();
    for (const line of sorted) {
      const { ca, cb } = ends(line);
      const path = search(line, ca, cb, false, 0.5 + round);
      if (!path) continue;
      paths.set(line.id, path);
      reserve(path, 0, used);
    }
    for (let q = 0; q < N; q++)
      if (used[q] > 1) history[q] += 0.5 * (used[q] - 1);
  }
  // The final pass: each line for good, in order, reserved as it goes.
  used.fill(0);
  const runs: TrialResult['runs'] = [];
  const failed: string[] = [];
  for (const line of sorted) {
    const { ca, cb } = ends(line);
    const path = search(line, ca, cb, true, 0);
    if (!path) {
      failed.push(line.id);
      continue;
    }
    // Reserve its cells, grown by its radius and the clearance plus the biggest pipe's.
    const r = Math.ceil((line.radius + grow) / CELL);
    const mine = groupOf(line);
    for (const c of path) {
      const i = c % nx;
      const k = Math.floor(c / nx) % nz;
      const j = Math.floor(c / (nx * nz));
      for (let dj = -r; dj <= r; dj++)
        for (let dk = -r; dk <= r; dk++)
          for (let di = -r; di <= r; di++) {
            const a2 = i + di;
            const b2 = j + dj;
            const e2 = k + dk;
            if (a2 < 0 || b2 < 0 || e2 < 0 || a2 >= nx || b2 >= ny || e2 >= nz)
              continue;
            const q = idx(a2, b2, e2);
            owner[q] = owner[q] === -1 || owner[q] === mine ? mine : -2;
          }
    }
    runs.push({ id: line.id, points: toPoints(line, path) });
  }
  return { runs, failed, ms: performance.now() - t0 };
}
