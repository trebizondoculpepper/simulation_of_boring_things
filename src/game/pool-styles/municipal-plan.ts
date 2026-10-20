import { insidePolygon, rect } from './geometry';
import type { Point, Rect } from './geometry';

/**
 * The Municipal Infinite (`doc/design/pool-styles.md`, style 1), laid
 * out: a council leisure pool of about 1975 that never stopped being
 * extended. Three tiled decks step down from south to north along curved
 * edges, each a pool of its own: a shallow learner pool on the top deck,
 * a kidney on the middle one, and on the lowest a long kidney whose
 * water runs on through an arch in the north wall and away down a
 * tunnel, as if the pool went on for ever. The doors to the other rooms
 * are on the top deck at the south end. Pure; metres, x east, z south.
 */

/** The room's outer walls, where its doors are. */
export const BOUNDS: Rect = rect(-18, 18, -14, 14);
/** The walls' inner faces, half a wall's thickness in from the bounds. */
export const WALL_FACE = 0.15;
/** Its ceiling, metres above the top deck. */
export const CEILING = 5;
/** The decks' levels, south (top) to north (bottom). */
export const DECKS = [0, -0.45, -0.9] as const;
/** The step between decks: one intermediate tread, this deep. */
export const TREAD = 0.45;
/** Where its doors are, on the top deck: west and east, 1.1 m from the south wall. */
export const DOORS: readonly Point[] = [
  [BOUNDS.minX, BOUNDS.maxZ - 1.1],
  [BOUNDS.maxX, BOUNDS.maxZ - 1.1],
];

/**
 * The curved edge between deck `i` and the deck below it (to its north),
 * as z at `x`: the top of its step.
 */
export function edge(i: 0 | 1, x: number): number {
  return i === 0
    ? 3 + 0.7 * Math.sin(x / 4.5 + 0.6)
    : -6 + 0.7 * Math.sin(x / 5.2 + 2);
}

/** The deck's height at (x, z), steps and all, before any pool. */
export function deckAt(x: number, z: number): number {
  for (const i of [0, 1] as const) {
    const e = edge(i, x);
    if (z >= e) return DECKS[i];
    if (z >= e - TREAD) return DECKS[i] - (DECKS[i] - DECKS[i + 1]) / 2;
  }
  return DECKS[2];
}

/** Which deck (0, 1 or 2) a point is on, steps counting as the deck below them. */
export function deckIndex(x: number, z: number): 0 | 1 | 2 {
  if (z >= edge(0, x)) return 0;
  if (z >= edge(1, x)) return 1;
  return 2;
}

/** A kidney: an oval drawn in on its south side, `w` by `d` about (cx, cz), turned `turn`. */
export function kidney(
  cx: number,
  cz: number,
  w: number,
  d: number,
  turn = 0,
  segments = 64,
): Point[] {
  const points: Point[] = [];
  const c = Math.cos(turn),
    s = Math.sin(turn);
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const dip = 1 - 0.32 * Math.max(0, Math.sin(a)) ** 3;
    const x = (w / 2) * Math.cos(a);
    const z = (d / 2) * Math.sin(a) * dip;
    points.push([cx + x * c - z * s, cz + x * s + z * c]);
  }
  return points;
}

/** The channel by which the lowest pool runs on through the north wall, x from–to. */
export const CHANNEL = { from: -4, to: 0, end: -46 } as const;

/**
 * The lowest pool: a long kidney whose north side runs on into the
 * channel, out through the north wall and away.
 */
function lowestPool(): Point[] {
  const base = kidney(-2, -10.3, 24, 6);
  // Its north side, from west to east: where the channel leaves it.
  const north = (p: Point) => p[1] < -10.3;
  const out: Point[] = [];
  let spliced = false;
  for (let i = 0; i < base.length; i++) {
    const p = base[i];
    const inChannel = north(p) && p[0] > CHANNEL.from && p[0] < CHANNEL.to;
    if (inChannel) {
      if (!spliced) {
        spliced = true;
        // Where the outline crosses the channel's sides.
        const zAt = (x: number) => {
          for (let k = 0; k < base.length; k++) {
            const a = base[k];
            const b = base[(k + 1) % base.length];
            if (
              north(a) &&
              north(b) &&
              (a[0] - x) * (b[0] - x) <= 0 &&
              a[0] !== b[0]
            )
              return a[1] + ((x - a[0]) / (b[0] - a[0])) * (b[1] - a[1]);
          }
          return -13;
        };
        out.push(
          [CHANNEL.from, zAt(CHANNEL.from)],
          [CHANNEL.from, CHANNEL.end],
          [CHANNEL.to, CHANNEL.end],
          [CHANNEL.to, zAt(CHANNEL.to)],
        );
      }
      continue;
    }
    out.push(p);
  }
  return out;
}

export interface MunicipalPool {
  id: string;
  outline: readonly Point[];
  deck: 0 | 1 | 2;
  depth: number;
  /** Shallow enough to wade into. */
  wade: boolean;
  /** Its name, as its sign gives it. */
  name: string;
}

export const POOLS: readonly MunicipalPool[] = [
  {
    id: 'learner',
    outline: kidney(-5, 8.3, 12, 4.5, -0.05),
    deck: 0,
    depth: 0.6,
    wade: true,
    name: 'LEARNER POOL',
  },
  {
    id: 'main',
    outline: kidney(4, -1.3, 18, 4.5, 0.08),
    deck: 1,
    depth: 1.8,
    wade: false,
    name: 'MAIN POOL',
  },
  {
    id: 'deep',
    outline: lowestPool(),
    deck: 2,
    depth: 2.6,
    wade: false,
    name: 'DIVING POOL',
  },
];

/** Its fat round columns, standing in the water: (x, z, radius). */
export const COLUMNS: readonly (readonly [number, number, number])[] = [
  [8, -1.4, 0.6],
  [-9, -10.3, 0.7],
  [5, -10.6, 0.7],
];

/** The pool at (x, z), if any. */
export function poolAt(x: number, z: number): MunicipalPool | null {
  return POOLS.find((p) => insidePolygon(p.outline, x, z)) ?? null;
}

/** The floor for a walker at (x, z): the deck, or a wadeable pool's floor. */
export function floorAt(x: number, z: number): number {
  const pool = poolAt(x, z);
  const deck = deckAt(x, z);
  return pool?.wade ? DECKS[pool.deck] - pool.depth : deck;
}

/**
 * The walls' inner outline: a rectangle with its northern corners
 * rounded wide and its southern ones (by the doors) only a little.
 */
export function wallOutline(per = 10): Point[] {
  const r = rect(
    BOUNDS.minX + WALL_FACE,
    BOUNDS.maxX - WALL_FACE,
    BOUNDS.minZ + WALL_FACE,
    BOUNDS.maxZ - WALL_FACE,
  );
  const points: Point[] = [];
  const corner = (cx: number, cz: number, radius: number, from: number) => {
    for (let i = 0; i <= per; i++) {
      const a = from + (i / per) * (Math.PI / 2);
      points.push([cx + radius * Math.cos(a), cz + radius * Math.sin(a)]);
    }
  };
  const north = 5,
    south = 0.5;
  corner(r.maxX - north, r.minZ + north, north, -Math.PI / 2);
  corner(r.maxX - south, r.maxZ - south, south, 0);
  corner(r.minX + south, r.maxZ - south, south, Math.PI / 2);
  corner(r.minX + north, r.minZ + north, north, Math.PI);
  return points;
}

/** The furniture and fittings standing on the decks: (x, z) and the footprint each keeps. */
export const LIFEGUARD_CHAIR = { x: -16.2, z: 1, yaw: -Math.PI / 2 } as const;
export const LOST_PROPERTY = { x: 12, z: 12.9 } as const;
export const CHAIRS: readonly (readonly [number, number, number])[] = [
  [9, 9, 0.4],
  [10.2, 9.4, -0.2],
  [-12, -2.5, 1.9],
  [14, -9, -2.6],
  [-15.5, 11.5, 0.9],
];

/** Squares every `step` metres along a line, `thickness` across: where a walker cannot pass. */
function lineSolids(
  line: readonly Point[],
  thickness: number,
  closed: boolean,
  step = 0.25,
): Rect[] {
  const points = closed ? [...line, line[0]] : [...line];
  const solids: Rect[] = [];
  const h = thickness / 2;
  for (let i = 1; i < points.length; i++) {
    const [ax, az] = points[i - 1];
    const [bx, bz] = points[i];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / step));
    for (let k = 0; k <= n; k++) {
      const x = ax + ((bx - ax) * k) / n;
      const z = az + ((bz - az) * k) / n;
      solids.push({ minX: x - h, maxX: x + h, minZ: z - h, maxZ: z + h });
    }
  }
  return solids;
}

/** Everything a walker cannot walk through: the walls, the deep pools' edges, the furniture. */
export function solids(): Rect[] {
  const box = (x: number, z: number, hw: number, hd: number): Rect =>
    rect(x - hw, x + hw, z - hd, z + hd);
  return [
    ...lineSolids(wallOutline(), 0.3, true),
    ...POOLS.filter((p) => !p.wade).flatMap((p) =>
      lineSolids(p.outline, 0.3, true),
    ),
    box(LIFEGUARD_CHAIR.x, LIFEGUARD_CHAIR.z, 0.6, 0.6),
    box(LOST_PROPERTY.x, LOST_PROPERTY.z, 0.6, 0.35),
    ...CHAIRS.map(([x, z]) => box(x, z, 0.3, 0.3)),
  ];
}
