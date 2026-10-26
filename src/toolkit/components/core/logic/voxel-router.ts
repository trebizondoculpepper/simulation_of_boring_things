import { JOINT_BEND, pipeClashes, portLead } from './pipe-route';
import type { DrawnRun, PipeJoint, PortEnd, Vec3 } from './pipe-route';

export interface RouterRegion {
  min: Vec3;
  max: Vec3;
  forbids: { runs: boolean };
}

export interface RouterLine {
  id: string;
  start: PortEnd;
  end: PortEnd;
  od: number;
  joint: PipeJoint;
  price: number;
  priority?: number;
  startStraight?: number;
  endStraight?: number;
  insulation?: number;
  /**
   * A gravity line (prompt 065): an overflow or a drain, which must fall
   * all the way. Its end must be below its start, and its route never
   * rises: level lengths and drops only.
   */
  gravity?: true;
}

export interface RouterRoom {
  halfX: number;
  halfZ: number;
  height: number;
  regions?: readonly RouterRegion[];
  obstacles?: readonly { min: Vec3; max: Vec3 }[];
}

export interface RouterResult {
  routes: Map<string, Vec3[]>;
  problems: string[];
}

const CLEARANCE = 0.005;
const STEP = 0.2;
const dist = (a: Vec3, b: Vec3) =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const lead = (end: PortEnd, length: number): Vec3 => [
  end.at[0] + end.outward[0] * length,
  end.at[1] + end.outward[1] * length,
  end.at[2] + end.outward[2] * length,
];
const drawing = (line: RouterLine, points: readonly Vec3[]): DrawnRun => ({
  name: line.id,
  points,
  od: line.od,
  joint: line.joint,
  insulation: line.insulation,
});

function intersectsBox(
  a: Vec3,
  b: Vec3,
  box: { min: Vec3; max: Vec3 },
  r: number,
) {
  let lo = 0;
  let hi = 1;
  for (let axis = 0; axis < 3; axis++) {
    const d = b[axis] - a[axis];
    const min = box.min[axis] - r;
    const max = box.max[axis] + r;
    if (Math.abs(d) < 1e-10) {
      if (a[axis] <= min || a[axis] >= max) return false;
    } else {
      const p = (min - a[axis]) / d;
      const q = (max - a[axis]) / d;
      lo = Math.max(lo, Math.min(p, q));
      hi = Math.min(hi, Math.max(p, q));
      if (lo >= hi) return false;
    }
  }
  return true;
}

function clear(
  points: readonly Vec3[],
  line: RouterLine,
  room: RouterRoom,
  previous: readonly DrawnRun[],
) {
  const reversesLead = (a: Vec3, b: Vec3, c: Vec3) => {
    const u = b.map((v, k) => v - a[k]);
    const v = c.map((x, k) => x - b[k]);
    const dot = u.reduce((sum, x, k) => sum + x * v[k], 0);
    return (
      dot < -1e-8 &&
      u.every(
        (x, k) =>
          Math.abs(x * v[k]) > 1e-8 ||
          (Math.abs(x) < 1e-8 && Math.abs(v[k]) < 1e-8),
      )
    );
  };
  if (
    points.length > 2 &&
    (reversesLead(points[0], points[1], points[2]) ||
      reversesLead(points.at(-1)!, points.at(-2)!, points.at(-3)!))
  )
    return false;
  const r = line.od / 2 + (line.insulation ?? 0) + CLEARANCE;
  for (const p of points)
    if (
      Math.abs(p[0]) + r >= room.halfX ||
      Math.abs(p[2]) + r >= room.halfZ ||
      p[1] - r < 0 ||
      p[1] + r > room.height
    )
      return false;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (
      room.regions?.some(
        (region) => region.forbids.runs && intersectsBox(a, b, region, r),
      )
    )
      return false;
    // The first and last lead are permitted to emerge from their own machine.
    if (
      i > 1 &&
      i < points.length - 1 &&
      room.obstacles?.some((box) => intersectsBox(a, b, box, r))
    )
      return false;
  }
  if (line.gravity && !neverRises(points)) return false;
  const run = drawing(line, points);
  return previous.every((other) => pipeClashes([other, run]).length === 0);
}

/** Whether a route never rises along it: each point no higher than the one before. */
export const neverRises = (points: readonly Vec3[]) =>
  points.every((p, i) => i === 0 || p[1] <= points[i - 1][1] + 1e-9);

function compact(points: readonly Vec3[]): Vec3[] {
  const result: Vec3[] = [];
  for (const p of points) {
    if (result.length && dist(result.at(-1)!, p) < 1e-7) continue;
    while (result.length > 1) {
      const a = result.at(-2)!;
      const b = result.at(-1)!;
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const v = [p[0] - b[0], p[1] - b[1], p[2] - b[2]];
      if (
        u.some((x, k) => x * v[k] < -1e-8) ||
        u.some(
          (x, k) =>
            Math.abs(x) > 1e-8 &&
            v.some((y, j) => j !== k && Math.abs(y) > 1e-8),
        )
      )
        break;
      result.pop();
    }
    result.push(p);
  }
  return result;
}

function candidate(
  line: RouterLine,
  room: RouterRoom,
  previous: readonly DrawnRun[],
): Vec3[] | null {
  const r = line.od / 2 + (line.insulation ?? 0);
  const endpoint = (port: PortEnd, wanted: number) => {
    const minimum =
      portLead(line.od, line.joint) + JOINT_BEND[line.joint] * line.od;
    for (
      let length = Math.max(minimum, wanted);
      length >= minimum - 1e-8;
      length = Math.max(minimum, length * 0.7)
    ) {
      const p = lead(port, length);
      if (
        Math.abs(p[0]) + r < room.halfX &&
        Math.abs(p[2]) + r < room.halfZ &&
        p[1] - r >= 0 &&
        p[1] + r <= room.height &&
        !room.regions?.some(
          (box) => box.forbids.runs && intersectsBox(port.at, p, box, r),
        )
      )
        return p;
      if (length === minimum) break;
    }
    return lead(port, minimum);
  };
  const s = endpoint(line.start, line.startStraight ?? 0);
  let t = endpoint(line.end, line.endStraight ?? 0);
  // A gravity line dropping into an end that faces up (a tundish): its
  // last length no higher than where it starts, short if it must be, so
  // it never climbs to come down into it.
  if (line.gravity && t[1] > s[1] && line.end.outward[1] > 0)
    t = lead(
      line.end,
      Math.max(0, (s[1] - line.end.at[1]) / line.end.outward[1]),
    );
  // Over everything between them, or, a gravity line, at a level between
  // its ends': across at its start's level or lower, then down.
  const levels = line.gravity
    ? [
        s[1],
        ...[
          0.2, 0.4, 0.6, 0.8, 1.1, 1.4, 1.7, 2, 2.3, 2.7, 3.2, 3.8, 4.5, 5.3,
        ].filter((y) => y < s[1] && y >= t[1]),
      ].sort((a, b) => b - a)
    : [
        0.8, 1.1, 1.4, 1.7, 2, 2.3, 2.7, 3.2, 3.8, 4.5, 5.3, 6.1, 6.9, 7.5,
      ].filter(
        (y) => y > Math.max(s[1], t[1]) + r && y < room.height - r - 0.03,
      );
  const xs = [s[0], t[0], 0, -room.halfX + r + 0.3, room.halfX - r - 0.3];
  const zs = [s[2], t[2], 0, -room.halfZ + r + 0.3, room.halfZ - r - 0.3];
  for (const y of levels)
    for (const x of xs)
      for (const z of zs) {
        const path = compact([
          line.start.at,
          s,
          [s[0], y, s[2]],
          [x, y, s[2]],
          [x, y, z],
          [t[0], y, z],
          [t[0], y, t[2]],
          t,
          line.end.at,
        ]);
        if (clear(path, line, room, previous)) return path;
      }
  return search(line, room, previous, s, t);
}

function search(
  line: RouterLine,
  room: RouterRoom,
  previous: readonly DrawnRun[],
  start: Vec3,
  finish: Vec3,
): Vec3[] | null {
  const r = line.od / 2 + (line.insulation ?? 0) + CLEARANCE;
  const axes = [room.halfX, room.height / 2, room.halfZ].map((half, k) => {
    const min = k === 1 ? r : -half + r;
    const max = k === 1 ? room.height - r : half - r;
    const values: number[] = [];
    for (let n = 0; min + n * STEP <= max; n++) values.push(min + n * STEP);
    values.push(start[k], finish[k]);
    return [...new Set(values.map((v) => +v.toFixed(5)))].sort((a, b) => a - b);
  });
  const sizes = axes.map((a) => a.length);
  const stride = [1, sizes[0], sizes[0] * sizes[1]];
  const node = (x: number, y: number, z: number) =>
    x + sizes[0] * (y + sizes[1] * z);
  const point = (i: number): Vec3 => [
    axes[0][i % sizes[0]],
    axes[1][Math.floor(i / sizes[0]) % sizes[1]],
    axes[2][Math.floor(i / stride[2])],
  ];
  const index = (p: Vec3) =>
    node(
      ...(p.map((v, k) => axes[k].findIndex((x) => Math.abs(x - v) < 1e-5)) as [
        number,
        number,
        number,
      ]),
    );
  const source = index(start);
  const goal = index(finish);
  const count = sizes[0] * sizes[1] * sizes[2];
  const blocked = new Uint8Array(count);
  const occupied = previous.flatMap((run) => {
    const parts: { a: Vec3; b: Vec3; r: number }[] = [];
    for (let k = 1; k < run.points.length; k++)
      parts.push({
        a: run.points[k - 1],
        b: run.points[k],
        r: run.od / 2 + (run.insulation ?? 0) + r + STEP * 0.6,
      });
    return parts;
  });
  const pointSegment = (p: Vec3, a: Vec3, b: Vec3) => {
    const d = b.map((v, k) => v - a[k]);
    const l2 = d.reduce((v, x) => v + x * x, 0);
    const t = l2
      ? Math.max(
          0,
          Math.min(1, d.reduce((v, x, k) => v + x * (p[k] - a[k]), 0) / l2),
        )
      : 0;
    return Math.hypot(...p.map((v, k) => v - a[k] - d[k] * t));
  };
  const mark = (min: Vec3, max: Vec3, test?: (p: Vec3) => boolean) => {
    const lower = min.map((v, k) => axes[k].findIndex((x) => x >= v)) as [
      number,
      number,
      number,
    ];
    const upper = max.map((v, k) =>
      axes[k].reduce((last, x, i) => (x <= v ? i : last), -1),
    ) as [number, number, number];
    if (lower.some((v) => v < 0) || upper.some((v) => v < 0)) return;
    for (let z = lower[2]; z <= upper[2]; z++)
      for (let y = lower[1]; y <= upper[1]; y++)
        for (let x = lower[0]; x <= upper[0]; x++) {
          const i = node(x, y, z);
          if (i !== source && i !== goal && (!test || test(point(i))))
            blocked[i] = 1;
        }
  };
  for (const box of [
    ...(room.regions?.filter((v) => v.forbids.runs) ?? []),
    ...(room.obstacles ?? []),
  ]) {
    const pad = r + STEP;
    mark(
      [box.min[0] - pad, box.min[1] - pad, box.min[2] - pad],
      [box.max[0] + pad, box.max[1] + pad, box.max[2] + pad],
    );
  }
  for (const part of occupied) {
    const min: Vec3 = [
      Math.min(part.a[0], part.b[0]) - part.r,
      Math.min(part.a[1], part.b[1]) - part.r,
      Math.min(part.a[2], part.b[2]) - part.r,
    ];
    const max: Vec3 = [
      Math.max(part.a[0], part.b[0]) + part.r,
      Math.max(part.a[1], part.b[1]) + part.r,
      Math.max(part.a[2], part.b[2]) + part.r,
    ];
    mark(
      min,
      max,
      (p) =>
        pointSegment(p, part.a, part.b) < part.r &&
        dist(p, line.start.at) > 0.15 &&
        dist(p, line.end.at) > 0.15,
    );
  }
  // Dijkstra with an admissible Manhattan estimate and a binary heap.
  const costs = new Float64Array(count).fill(Infinity);
  const parents = new Int32Array(count).fill(-1);
  const directions = new Int8Array(count).fill(-1);
  const heap: { i: number; f: number }[] = [];
  const push = (item: { i: number; f: number }) => {
    heap.push(item);
    let k = heap.length - 1;
    while (k) {
      const p = (k - 1) >> 1;
      if (heap[p].f <= item.f) break;
      heap[k] = heap[p];
      k = p;
    }
    heap[k] = item;
  };
  const pop = () => {
    const first = heap[0];
    const last = heap.pop()!;
    if (heap.length) {
      let k = 0;
      while (2 * k + 1 < heap.length) {
        let c = 2 * k + 1;
        if (c + 1 < heap.length && heap[c + 1].f < heap[c].f) c++;
        if (heap[c].f >= last.f) break;
        heap[k] = heap[c];
        k = c;
      }
      heap[k] = last;
    }
    return first;
  };
  costs[source] = 0;
  push({ i: source, f: dist(start, finish) * line.price });
  while (heap.length) {
    const current = pop();
    const p = point(current.i);
    if (
      current.f >
      costs[current.i] +
        (Math.abs(p[0] - finish[0]) +
          Math.abs(p[1] - finish[1]) +
          Math.abs(p[2] - finish[2])) *
          line.price +
        1e-6
    )
      continue;
    if (current.i === goal) {
      const path: Vec3[] = [];
      for (let i = goal; i !== -1; i = parents[i]) path.push(point(i));
      const full = compact([line.start.at, ...path.reverse(), line.end.at]);
      return clear(full, line, room, previous) ? full : null;
    }
    const coordinates = [
      current.i % sizes[0],
      Math.floor(current.i / sizes[0]) % sizes[1],
      Math.floor(current.i / stride[2]),
    ];
    for (let axis = 0; axis < 3; axis++)
      for (const sign of [-1, 1]) {
        // A gravity line never steps up.
        if (line.gravity && axis === 1 && sign === 1) continue;
        const n = coordinates[axis] + sign;
        if (n < 0 || n >= sizes[axis]) continue;
        const next = current.i + sign * stride[axis];
        if (
          blocked[next] ||
          (next !== goal &&
            room.regions?.some(
              (box) =>
                box.forbids.runs && intersectsBox(p, point(next), box, r),
            ))
        )
          continue;
        const direction = axis * 2 + (sign === 1 ? 1 : 0);
        const step = Math.abs(axes[axis][n] - axes[axis][coordinates[axis]]);
        const cost =
          costs[current.i] +
          step * line.price +
          (directions[current.i] < 0 || directions[current.i] === direction
            ? 0
            : line.price * 0.2);
        if (cost >= costs[next]) continue;
        costs[next] = cost;
        parents[next] = current.i;
        directions[next] = direction;
        const q = point(next);
        push({
          i: next,
          f:
            cost +
            (Math.abs(q[0] - finish[0]) +
              Math.abs(q[1] - finish[1]) +
              Math.abs(q[2] - finish[2])) *
              line.price,
        });
      }
  }
  return null;
}

/** Route the hardest lines first, then retry failed lines with deterministic orders. */
export function routeVoxelLines(
  room: RouterRoom,
  given: readonly RouterLine[],
  fixed: readonly DrawnRun[] = [],
): RouterResult {
  // A gravity line whose end is not below its start cannot fall to it:
  // refused, never routed uphill.
  const uphill = given.filter(
    (line) => line.gravity && line.end.at[1] >= line.start.at[1] - 1e-9,
  );
  const lines = given.filter((line) => !uphill.includes(line));
  const ordered = [...lines].sort(
    (a, b) =>
      (b.priority ?? b.od) - (a.priority ?? a.od) || a.id.localeCompare(b.id),
  );
  let best = new Map<string, Vec3[]>();
  for (let retry = 0; retry < Math.min(4, Math.max(1, lines.length)); retry++) {
    const routes = new Map<string, Vec3[]>();
    const drawn = [...fixed];
    const attempt = retry
      ? [...ordered.slice(retry), ...ordered.slice(0, retry)]
      : ordered;
    for (const line of attempt) {
      const points = candidate(line, room, drawn);
      if (!points) continue;
      routes.set(line.id, points);
      drawn.push(drawing(line, points));
    }
    if (routes.size > best.size) best = routes;
    if (routes.size === lines.length) break;
  }
  return {
    routes: best,
    problems: [
      ...uphill.map(
        (line) => `${line.id}: a gravity line whose end is not below its start`,
      ),
      ...lines
        .filter((line) => !best.has(line.id))
        .map((line) =>
          line.gravity
            ? `${line.id}: no clash-free route that only falls`
            : `${line.id}: no clash-free route`,
        ),
    ],
  };
}
