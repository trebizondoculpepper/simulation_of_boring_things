import type { Vec3 } from './pipe-route';

/**
 * Where a line's inline devices go on its route
 * (`doc/prompts/018-plumber-valves-and-isolators.md`): valves, non-return
 * valves and isolators set into a run that is already routed, each on a
 * straight long enough for it and clear of the bends and the ports'
 * leads, at a height a person can reach where there is one, in their order
 * along the line. Pure: metres.
 */

export interface InlineDevice {
  id: string;
  /** Its length along the pipe, metres. */
  length: number;
  /** The end of the line it belongs near. */
  near: 'start' | 'end';
}

export interface InlineSpot {
  id: string;
  /** Its middle, on the route. */
  at: Vec3;
  /** The way the line runs through it, start to end. */
  along: Vec3;
  /** Whether a person standing on the floor can reach it. */
  reachable: boolean;
  /** How far along the route its middle is, metres. */
  s: number;
}

export interface InlineOptions {
  /** Kept clear at each end of the route (the ports' leads), metres. */
  ends?: number;
  /** Kept clear either side of each bend (its fitting), metres. */
  bends?: number;
  /** Between devices, metres. */
  gap?: number;
  /** The height band a person can reach from the floor, metres. */
  reach?: readonly [number, number];
  /** Whether a person can stand to work a device at this point, as well as reach its height. */
  standing?: (at: Vec3) => boolean;
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/** The route's straights, each with where it starts along the route. */
function straights(route: readonly Vec3[]) {
  const out: { a: Vec3; b: Vec3; s0: number; length: number }[] = [];
  let s = 0;
  for (let i = 1; i < route.length; i++) {
    const length = len(sub(route[i], route[i - 1]));
    if (length > 1e-9)
      out.push({ a: route[i - 1], b: route[i], s0: s, length });
    s += length;
  }
  return { list: out, total: s };
}

/** The point `s` along the route, and the way it runs there. */
export function pointAlong(route: readonly Vec3[], s: number) {
  const { list } = straights(route);
  for (const piece of list)
    if (s <= piece.s0 + piece.length + 1e-9) {
      const t = Math.max(0, Math.min(1, (s - piece.s0) / piece.length));
      const d = sub(piece.b, piece.a);
      return {
        at: lerp(piece.a, piece.b, t),
        along: [
          d[0] / piece.length,
          d[1] / piece.length,
          d[2] / piece.length,
        ] as Vec3,
      };
    }
  const last = list[list.length - 1];
  const d = sub(last.b, last.a);
  return {
    at: last.b,
    along: [d[0] / last.length, d[1] / last.length, d[2] / last.length] as Vec3,
  };
}

/**
 * Each device's spot. Those near the start are set from the start, in
 * order; those near the end from the end, in reverse; each in the first
 * window of a straight that fits it and is reachable, else the first that
 * fits it, marked out of reach. A device that fits nowhere is left out and
 * named in `problems`.
 */
export function placeInline(
  route: readonly Vec3[],
  devices: readonly InlineDevice[],
  {
    ends = 0.15,
    bends = 0.12,
    gap = 0.08,
    reach = [0.5, 1.8],
    standing = () => true,
  }: InlineOptions = {},
): { spots: InlineSpot[]; problems: string[] } {
  const { list, total } = straights(route);
  // Windows along the route where a device may sit: each straight less its
  // bends' fittings, and the ends' leads.
  const windows = list.map((p, i) => ({
    ...p,
    from: Math.max(p.s0 + (i === 0 ? 0 : bends), ends),
    to: Math.min(
      p.s0 + p.length - (i === list.length - 1 ? 0 : bends),
      total - ends,
    ),
  }));
  const reachableAt = (s: number) => {
    const at = pointAlong(route, s).at;
    return at[1] >= reach[0] && at[1] <= reach[1] && standing(at);
  };
  const spots: InlineSpot[] = [];
  const problems: string[] = [];
  /** Taken stretches, [from, to] along the route. */
  const taken: [number, number][] = [];
  const free = (a: number, b: number) =>
    taken.every(([x, y]) => b + gap <= x || a >= y + gap);

  const set = (d: InlineDevice, fromStart: boolean) => {
    const candidates: { s: number; reachable: boolean }[] = [];
    const order = fromStart ? windows : [...windows].reverse();
    for (const w of order) {
      if (w.to - w.from < d.length) continue;
      // Slide along the window, from the end it is entered at, in small
      // steps, to the first free and (by preference) reachable position.
      const step = 0.02;
      const n = Math.floor((w.to - w.from - d.length) / step);
      for (let k = 0; k <= n; k++) {
        const start = fromStart
          ? w.from + k * step
          : w.to - d.length - k * step;
        if (!free(start, start + d.length)) continue;
        const mid = start + d.length / 2;
        candidates.push({ s: mid, reachable: reachableAt(mid) });
        if (candidates.at(-1)!.reachable) break;
      }
      if (candidates.some((c) => c.reachable)) break;
    }
    const pick = candidates.find((c) => c.reachable) ?? candidates[0];
    if (!pick) {
      problems.push(`${d.id}: no straight long enough on its line`);
      return;
    }
    taken.push([pick.s - d.length / 2, pick.s + d.length / 2]);
    if (!pick.reachable) problems.push(`${d.id}: out of reach`);
    const { at, along } = pointAlong(route, pick.s);
    spots.push({ id: d.id, at, along, reachable: pick.reachable, s: pick.s });
  };
  for (const d of devices.filter((x) => x.near === 'start')) set(d, true);
  for (const d of [...devices.filter((x) => x.near === 'end')].reverse())
    set(d, false);
  spots.sort((a, b) => a.s - b.s);
  return { spots, problems };
}

/** The route cut at its devices: the pieces between them, each a run. */
export function splitAt(
  route: readonly Vec3[],
  spots: readonly InlineSpot[],
  lengths: ReadonlyMap<string, number>,
): Vec3[][] {
  const { list } = straights(route);
  const cut = (from: number, to: number): Vec3[] => {
    const pts: Vec3[] = [pointAlong(route, from).at];
    for (const p of list) {
      const end = p.s0 + p.length;
      if (end > from + 1e-9 && end < to - 1e-9) pts.push(p.b);
    }
    pts.push(pointAlong(route, to).at);
    return pts;
  };
  const pieces: Vec3[][] = [];
  let from = 0;
  for (const spot of spots) {
    const half = (lengths.get(spot.id) ?? 0) / 2;
    pieces.push(cut(from, spot.s - half));
    from = spot.s + half;
  }
  pieces.push(cut(from, straights(route).total));
  return pieces;
}
