import { insideRect, rect } from './geometry';
import type { Point, Rect } from './geometry';

/**
 * The Porthole Tunnel, laid out (`doc/design/pool-styles.md`, style 2):
 * barrel-vaulted tiled tunnels between four tiled chambers. A vestibule
 * by the west door; a straight tunnel with a channel of water down its
 * middle to a junction; from the junction, a long tunnel north that
 * bends east, narrows to barely a walker's width and widens again, then
 * bends south to the east vestibule, its first leg with water underfoot;
 * and, the other way from the junction, a flooded hotel corridor to a
 * second chamber, from which a stairway climbs to a short upper tunnel
 * and comes down again. Pure; metres, x east, z south.
 */

/** A chamber: a tiled box, its walls opened where tunnels meet it. */
export interface Chamber {
  id: string;
  rect: Rect;
  height: number;
}

/** A tunnel: its centre line, its width and floor along it (by `s`, metres from its start). */
export interface Tunnel {
  id: string;
  /** Its stencilled number. */
  number: string;
  corners: readonly Point[];
  /** How sharply its corners bend, metres. */
  bend: number;
  width(s: number, length: number): number;
  floor(s: number, length: number): number;
  /** A channel of water down its middle, `channel` metres wide. */
  channel?: number;
  /** Water underfoot over `wet` (from–to, metres along it), this deep. */
  wet?: { from: number; to: number; depth: number };
}

export const BOUNDS = rect(-4, 60, -20, 4);
/** The doors (the kit's), on the west and east walls, 1.1 m from the south. */
export const DOOR_Z = BOUNDS.maxZ - 1.1;

export const CHAMBERS: readonly Chamber[] = [
  { id: 'west', rect: rect(-4, 2, -2, 4), height: 3.4 },
  { id: 'junction', rect: rect(20, 26, -2, 4), height: 3.4 },
  { id: 'stairhead', rect: rect(44, 54, -2, 4), height: 3.4 },
  { id: 'east', rect: rect(54, 60, -2, 4), height: 3.4 },
];

/** The width every full tunnel has, metres, and the narrowest the long one gets. */
export const FULL = 3.2;
export const NARROWEST = 0.85;

const level = () => 0;
const constant = (w: number) => () => w;

/** The stairway's climb: up 3.2 m over its first 8 m, level, down over its last 8 m. */
export const STAIR = { rise: 3.2, run: 8 } as const;

export const TUNNELS: readonly Tunnel[] = [
  {
    id: 'channel',
    number: 'T-07',
    corners: [
      [2, 1],
      [20, 1],
    ],
    bend: 0,
    width: constant(FULL),
    floor: level,
    channel: 0.6,
  },
  {
    id: 'long',
    number: 'T-08',
    corners: [
      [23, -2],
      [23, -17],
      [57, -17],
      [57, -2],
    ],
    bend: 3,
    // Narrowing to barely a walker's width along its middle reach.
    width: (s) => {
      const from = 22,
        to = 40;
      if (s <= from || s >= to) return FULL;
      const t = (s - from) / (to - from);
      const pinch = Math.sin(Math.PI * t) ** 2;
      return FULL - (FULL - NARROWEST) * pinch;
    },
    floor: level,
    wet: { from: 0, to: 12, depth: 0.15 },
  },
  {
    id: 'stairway',
    number: 'T-09',
    corners: [
      [46, -2],
      [46, -11],
      [52, -11],
      [52, -2],
    ],
    bend: 1.2,
    width: constant(2),
    floor: (s, length) =>
      STAIR.rise * Math.min(1, s / STAIR.run, (length - s) / STAIR.run),
  },
];

/** The flooded hotel corridor, from the junction to the stairhead. */
export const CORRIDOR = {
  rect: rect(26, 44, -0.2, 2.2),
  floor: -0.3,
  height: 2.5,
  /** Its numbered doors: every 3 m down each side. */
  doors: [29, 32, 35, 38, 41].flatMap((x, i) => [
    { x, side: 'north' as const, number: String(401 + i * 2) },
    { x: x + 1.5, side: 'south' as const, number: String(402 + i * 2) },
  ]),
};

/** A point on a tunnel's centre line: where, which way it runs, and how far along. */
export interface Station {
  x: number;
  z: number;
  /** The unit vector to its right (looking along it). */
  rx: number;
  rz: number;
  s: number;
}

/** A tunnel's centre line, sampled every `step` metres, its corners rounded to its `bend`. */
export function stations(tunnel: Tunnel, step = 0.25): Station[] {
  const c = tunnel.corners;
  const path: Point[] = [c[0]];
  for (let i = 1; i < c.length - 1; i++) {
    const [px, pz] = c[i - 1];
    const [x, z] = c[i];
    const [nx, nz] = c[i + 1];
    const inLen = Math.hypot(x - px, z - pz);
    const outLen = Math.hypot(nx - x, nz - z);
    const r = Math.min(tunnel.bend, inLen / 2, outLen / 2);
    const a: Point = [x - ((x - px) / inLen) * r, z - ((z - pz) / inLen) * r];
    const b: Point = [x + ((nx - x) / outLen) * r, z + ((nz - z) / outLen) * r];
    // A quadratic curve through the corner, from a to b.
    path.push(a);
    for (let k = 1; k < 8; k++) {
      const t = k / 8;
      path.push([
        (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * x + t * t * b[0],
        (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * z + t * t * b[1],
      ]);
    }
    path.push(b);
  }
  path.push(c[c.length - 1]);
  // Resample evenly.
  const out: Station[] = [];
  let s = 0;
  for (let i = 1; i < path.length; i++) {
    const [ax, az] = path[i - 1];
    const [bx, bz] = path[i];
    const length = Math.hypot(bx - ax, bz - az);
    if (length < 1e-9) continue;
    const dx = (bx - ax) / length,
      dz = (bz - az) / length;
    for (let d = 0; d < length - 1e-9; d += step)
      out.push({ x: ax + dx * d, z: az + dz * d, rx: -dz, rz: dx, s: s + d });
    s += length;
  }
  const [lx, lz] = path[path.length - 1];
  const prev = out[out.length - 1];
  out.push({ x: lx, z: lz, rx: prev.rx, rz: prev.rz, s });
  // Smooth the right vectors through the curves.
  for (let i = 1; i < out.length - 1; i++) {
    const a = out[i - 1],
      b = out[i + 1];
    const dx = b.x - a.x,
      dz = b.z - a.z;
    const l = Math.hypot(dx, dz) || 1;
    out[i].rx = -dz / l;
    out[i].rz = dx / l;
  }
  return out;
}

/** A tunnel's length, metres. */
export const lengthOf = (tunnel: Tunnel) => stations(tunnel).at(-1)!.s;

const sampled = new Map<string, Station[]>();
const stationsOf = (tunnel: Tunnel) => {
  let list = sampled.get(tunnel.id);
  if (!list) sampled.set(tunnel.id, (list = stations(tunnel)));
  return list;
};

/** The nearest station of `tunnel` to (x, z), and how far off its centre line (x, z) is. */
export function nearest(tunnel: Tunnel, x: number, z: number) {
  let best = stationsOf(tunnel)[0];
  let d = Infinity;
  for (const st of stationsOf(tunnel)) {
    const e = Math.hypot(st.x - x, st.z - z);
    if (e < d) {
      d = e;
      best = st;
    }
  }
  return { station: best, distance: d };
}

/** The tunnel (x, z) is in, if it is in one. */
export function tunnelAt(x: number, z: number) {
  for (const tunnel of TUNNELS) {
    const { station, distance } = nearest(tunnel, x, z);
    const length = stationsOf(tunnel).at(-1)!.s;
    if (distance <= tunnel.width(station.s, length) / 2 + 0.05)
      return { tunnel, station, length };
  }
  return null;
}

/** The floor under a walker at (x, z) who stood at `y`. */
export function floorAt(x: number, z: number, y: number): number {
  if (insideRect(CORRIDOR.rect, x, z)) return CORRIDOR.floor;
  for (const c of CHAMBERS) if (insideRect(c.rect, x, z)) return 0;
  const at = tunnelAt(x, z);
  if (!at) return y;
  const { tunnel, station, length } = at;
  const floor = tunnel.floor(station.s, length);
  const wet = tunnel.wet;
  return wet && station.s >= wet.from && station.s <= wet.to
    ? floor - wet.depth
    : floor;
}

/** Where each tunnel meets a chamber's wall: the wall's side, where along it, and how wide. */
export interface Mouth {
  chamber: string;
  side: 'north' | 'south' | 'east' | 'west';
  at: number;
  width: number;
  /** A tunnel's arched mouth, or the corridor's square one. */
  kind: 'tunnel' | 'corridor' | 'arch';
}

export const MOUTHS: readonly Mouth[] = [
  { chamber: 'west', side: 'east', at: 1, width: FULL, kind: 'tunnel' },
  { chamber: 'junction', side: 'west', at: 1, width: FULL, kind: 'tunnel' },
  { chamber: 'junction', side: 'north', at: 23, width: FULL, kind: 'tunnel' },
  { chamber: 'junction', side: 'east', at: 1, width: 2.4, kind: 'corridor' },
  { chamber: 'stairhead', side: 'west', at: 1, width: 2.4, kind: 'corridor' },
  { chamber: 'stairhead', side: 'north', at: 46, width: 2, kind: 'tunnel' },
  { chamber: 'stairhead', side: 'north', at: 52, width: 2, kind: 'tunnel' },
  // The stairhead and the east vestibule share a wall, opened in an arch.
  { chamber: 'stairhead', side: 'east', at: 1, width: 2.4, kind: 'arch' },
  { chamber: 'east', side: 'west', at: 1, width: 2.4, kind: 'arch' },
  { chamber: 'east', side: 'north', at: 57, width: FULL, kind: 'tunnel' },
];

/** A side's line and extent. */
export function sideOf(r: Rect, side: Mouth['side']) {
  switch (side) {
    case 'north':
      return { along: 'x' as const, at: r.minZ, from: r.minX, to: r.maxX };
    case 'south':
      return { along: 'x' as const, at: r.maxZ, from: r.minX, to: r.maxX };
    case 'west':
      return { along: 'z' as const, at: r.minX, from: r.minZ, to: r.maxZ };
    case 'east':
      return { along: 'z' as const, at: r.maxX, from: r.minZ, to: r.maxZ };
  }
}

/** Where the walker cannot go: the chambers' walls (but their mouths), the tunnels' sides, the channel, the corridor's walls. */
export function solids(): Rect[] {
  const list: Rect[] = [];
  const t = 0.15;
  for (const c of CHAMBERS)
    for (const side of ['north', 'south', 'east', 'west'] as const) {
      const s = sideOf(c.rect, side);
      const gaps = MOUTHS.filter((m) => m.chamber === c.id && m.side === side)
        .map((m) => [m.at - m.width / 2, m.at + m.width / 2] as const)
        .sort((a, b) => a[0] - b[0]);
      let from = s.from;
      const push = (a: number, b: number) => {
        if (b - a < 1e-6) return;
        list.push(
          s.along === 'x'
            ? rect(a, b, s.at - t, s.at + t)
            : rect(s.at - t, s.at + t, a, b),
        );
      };
      for (const [a, b] of gaps) {
        push(from, a);
        from = b;
      }
      push(from, s.to);
    }
  for (const tunnel of TUNNELS) {
    const list2 = stationsOf(tunnel);
    const length = list2.at(-1)!.s;
    for (const st of list2) {
      const half = tunnel.width(st.s, length) / 2 + 0.12;
      for (const side of [1, -1]) {
        const x = st.x + st.rx * half * side,
          z = st.z + st.rz * half * side;
        list.push(rect(x - 0.12, x + 0.12, z - 0.12, z + 0.12));
      }
    }
    if (tunnel.channel) {
      const [a, b] = [tunnel.corners[0], tunnel.corners.at(-1)!];
      const h = tunnel.channel / 2;
      list.push(
        rect(Math.min(a[0], b[0]), Math.max(a[0], b[0]), a[1] - h, a[1] + h),
      );
    }
  }
  const r = CORRIDOR.rect;
  list.push(rect(r.minX, r.maxX, r.minZ - 0.15, r.minZ + 0.05));
  list.push(rect(r.minX, r.maxX, r.maxZ - 0.05, r.maxZ + 0.15));
  return list;
}

/** Where a walker arriving by URL stands: in the west vestibule, facing the tunnel. */
export const START = { x: -1, z: 1, yaw: Math.PI / 2 };
