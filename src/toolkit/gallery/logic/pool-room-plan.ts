import type { Footprint } from '../../controls/logic/walk-collision';

/**
 * dev11, the poolrooms room: a tiled pool hall in the "poolrooms" style
 * (`doc/research/poolrooms-look.md`), in metres, its floor at y = 0 and
 * its middle at the origin. A shallow wading pool with broad steps at its
 * west end runs north through the middle arch of an arcaded wall into a
 * second pool in a dim back hall. Slim tiled columns stand along the
 * pool's south side, under rooflights.
 */

export const ROOM = { minX: -15, maxX: 15, minZ: -9, maxZ: 9, height: 5 };

/** The pool's floor, and the water's surface, metres. */
export const POOL_FLOOR = -0.9;
// A deck-level pool: the water stands at the edge, spilling over it into
// the overflow grating round the pool (`overflowStrips`).
export const WATER_Y = -0.02;

/**
 * The pool's outline, one polygon, anticlockwise seen from above (x, z):
 * the main pool, the channel north through the arcade, and the back pool.
 */
export const POOL_OUTLINE: readonly (readonly [number, number])[] = [
  [-9, 4.5],
  [7, 4.5],
  [7, -1.5],
  [1, -1.5],
  [1, -4.4],
  [4, -4.4],
  [4, -8.4],
  [-4, -8.4],
  [-4, -4.4],
  [-1, -4.4],
  [-1, -1.5],
  [-9, -1.5],
];

/** The same water as rectangles: main pool, channel, back pool. */
export const POOL_RECTS: readonly Footprint[] = [
  { minX: -9, maxX: 7, minZ: -1.5, maxZ: 4.5 },
  { minX: -1, maxX: 1, minZ: -4.4, maxZ: -1.5 },
  { minX: -4, maxX: 4, minZ: -8.4, maxZ: -4.4 },
];

/** The steps into the main pool at its west end: x from, x to, tread level. */
export const STEPS: readonly (readonly [number, number, number])[] = [
  [-9, -8.5, -0.3],
  [-8.5, -8, -0.6],
];

/** The arcade between the hall and the back hall. */
export const ARCADE = {
  z: -4,
  thickness: 0.4,
  /** Each arch's middle, x. */
  arches: [-10, -5, 0, 5, 10],
  /** Arch opening width and the height its semicircle springs from. */
  width: 2.4,
  spring: 2.0,
};

/** The slim columns along the pool's south side: x, z, side. */
export const COLUMNS: readonly (readonly [number, number])[] = [
  -10, -5, 0, 5, 10,
].map((x) => [x, 6.5] as const);
export const COLUMN_SIDE = 0.6;

/** Rooflights over the pool: middle x, z and size, metres. */
export const ROOFLIGHTS: readonly {
  x: number;
  z: number;
  w: number;
  d: number;
}[] = [-6, -1, 4].map((x) => ({ x, z: 1.5, w: 3.2, d: 2.2 }));

/** The glazed wall on the east side: middle z, width, sill and head. */
export const EAST_GLAZING = { z: 2, width: 8, sill: 1.2, head: 3.7 };

/** Whether (x, z) is over the water. */
export function inPool(x: number, z: number) {
  return POOL_RECTS.some(
    (r) => x > r.minX && x < r.maxX && z > r.minZ && z < r.maxZ,
  );
}

/** The floor's level at (x, z): the deck, a step, or the pool's floor. */
export function poolFloorAt(x: number, z: number) {
  if (!inPool(x, z)) return 0;
  for (const [from, to, level] of STEPS) if (x >= from && x < to) return level;
  return POOL_FLOOR;
}

/**
 * The pool's edges as segments, each from one outline corner to the next;
 * `open` where the steps meet the deck, so the pool can be walked into.
 */
export function poolEdges() {
  return POOL_OUTLINE.map((a, i) => {
    const b = POOL_OUTLINE[(i + 1) % POOL_OUTLINE.length];
    const open = a[0] === -9 && b[0] === -9;
    return { a, b, open };
  });
}

/**
 * What the walker cannot walk through, metres: the pool's side walls
 * (except at the steps), the arcade's piers and the columns.
 */
export function poolRoomSolids(): Footprint[] {
  const half = 0.05;
  const solids: Footprint[] = poolEdges()
    .filter((e) => !e.open)
    .map(({ a, b }) => ({
      minX: Math.min(a[0], b[0]) - half,
      maxX: Math.max(a[0], b[0]) + half,
      minZ: Math.min(a[1], b[1]) - half,
      maxZ: Math.max(a[1], b[1]) + half,
    }));
  const t = ARCADE.thickness / 2;
  let x = ROOM.minX;
  for (const middle of ARCADE.arches) {
    solids.push({
      minX: x,
      maxX: middle - ARCADE.width / 2,
      minZ: ARCADE.z - t,
      maxZ: ARCADE.z + t,
    });
    x = middle + ARCADE.width / 2;
  }
  solids.push({
    minX: x,
    maxX: ROOM.maxX,
    minZ: ARCADE.z - t,
    maxZ: ARCADE.z + t,
  });
  const c = COLUMN_SIDE / 2;
  for (const [cx, cz] of COLUMNS)
    solids.push({ minX: cx - c, maxX: cx + c, minZ: cz - c, maxZ: cz + c });
  return solids;
}

/** Spot lamps set in the ceiling (dev13): two rows over the pool and the deck. */
export const CEILING_LAMPS: readonly (readonly [number, number])[] = [
  -1.5, 7,
].flatMap((z) => [-12, -7.5, -2.5, 2.5, 7.5, 12].map((x) => [x, z] as const));

/** The lectern with the room's LOOK selector and knobs, by the door, metres. */
export const LECTERN = { x: -12.6, z: 4.4 };

/** A rectangle in plan, metres: its middle and size. */
export interface Opening {
  x: number;
  z: number;
  w: number;
  d: number;
}

/**
 * A slab `w` × `d` centred on the origin, less rectangular `openings`, as
 * the rectangles that tile what is left: cut along every opening's edges
 * in x, then each strip along its openings' edges in z.
 */
export function slabPieces(
  w: number,
  d: number,
  openings: readonly Opening[],
): Opening[] {
  const xs = [
    -w / 2,
    w / 2,
    ...openings.flatMap((o) => [o.x - o.w / 2, o.x + o.w / 2]),
  ]
    .filter((x) => x >= -w / 2 && x <= w / 2)
    .sort((a, b) => a - b);
  const pieces: Opening[] = [];
  for (let i = 0; i + 1 < xs.length; i++) {
    const x0 = xs[i],
      x1 = xs[i + 1];
    if (x1 - x0 < 1e-9) continue;
    const mid = (x0 + x1) / 2;
    const cuts = openings
      .filter((o) => Math.abs(o.x - mid) < o.w / 2)
      .map((o) => [o.z - o.d / 2, o.z + o.d / 2] as const)
      .sort((a, b) => a[0] - b[0]);
    let z = -d / 2;
    for (const [z0, z1] of [...cuts, [d / 2, d / 2] as const]) {
      if (z0 - z > 1e-9)
        pieces.push({ x: mid, z: (z + z0) / 2, w: x1 - x0, d: z0 - z });
      z = Math.max(z, z1);
    }
  }
  return pieces;
}

/** The overflow grating's width across, metres. */
export const OVERFLOW_WIDTH = 0.245;

/**
 * The deck-level overflow: a strip of grating along the outside of every
 * edge of the pool, each lengthened at the pool's outside corners so that
 * the corners are covered too.
 */
export function overflowStrips(width = OVERFLOW_WIDTH): Opening[] {
  const n = POOL_OUTLINE.length;
  let twice = 0;
  POOL_OUTLINE.forEach(([x0, z0], i) => {
    const [x1, z1] = POOL_OUTLINE[(i + 1) % n];
    twice += x0 * z1 - x1 * z0;
  });
  /** Whether the outline turns outward (a convex corner) at vertex i. */
  const convex = (i: number) => {
    const [ax, az] = POOL_OUTLINE[(i + n - 1) % n];
    const [bx, bz] = POOL_OUTLINE[i];
    const [cx, cz] = POOL_OUTLINE[(i + 1) % n];
    const turn = (bx - ax) * (cz - bz) - (bz - az) * (cx - bx);
    return Math.sign(turn) === Math.sign(twice);
  };
  return POOL_OUTLINE.map(([x0, z0], i) => {
    const [x1, z1] = POOL_OUTLINE[(i + 1) % n];
    const alongX = z0 === z1;
    const mx = (x0 + x1) / 2,
      mz = (z0 + z1) / 2;
    // The strip lies on the side away from the water.
    const out = alongX
      ? inPool(mx, mz + 0.01)
        ? -1
        : 1
      : inPool(mx + 0.01, mz)
        ? -1
        : 1;
    const grow0 = convex(i) ? width : 0;
    const grow1 = convex((i + 1) % n) ? width : 0;
    if (alongX) {
      const lo = Math.min(x0, x1) - (x0 < x1 ? grow0 : grow1);
      const hi = Math.max(x0, x1) + (x0 < x1 ? grow1 : grow0);
      return {
        x: (lo + hi) / 2,
        z: mz + (out * width) / 2,
        w: hi - lo,
        d: width,
      };
    }
    return {
      x: mx + (out * width) / 2,
      z: (z0 + z1) / 2,
      w: width,
      d: Math.abs(z1 - z0),
    };
  });
}

/** Main drains in the pool floor, in pairs at least 2 m apart: x, z. */
export const MAIN_DRAINS: readonly (readonly [number, number])[] = [
  [-2.5, 1.5],
  [0.5, 1.5],
  [-1.5, -6.4],
  [1.5, -6.4],
];

/** Floor inlets spread over the pool floor (vertical flow): x, z. */
export const FLOOR_INLETS: readonly (readonly [number, number])[] = [
  ...[-6.5, -4, -1, 2, 4.5].flatMap((x) =>
    [-0.3, 3.3].map((z) => [x, z] as const),
  ),
  ...[-2.5, 2.5].flatMap((x) => [-5.2, -7.6].map((z) => [x, z] as const)),
];

/** Deck gullies in the surround, to waste: x, z. */
export const DECK_GULLIES: readonly (readonly [number, number])[] = [
  ...[-7.5, -2.5, 2.5, 7.5].map((x) => [x, 5.5] as const),
  [-6, -2.8],
  [4.5, -2.8],
  [-7, -6.5],
  [7, -6.5],
];

/**
 * Fittings in the pool's walls: where, which way their face looks (a
 * unit x, z), and how far below the water line their middle is.
 */
export interface WallFitting {
  kind: 'light' | 'vacuum' | 'inlet';
  x: number;
  z: number;
  facing: readonly [number, number];
  depth: number;
}
export const WALL_FITTINGS: readonly WallFitting[] = [
  ...[-5.5, -1.5, 2.5].map((x): WallFitting => ({
    kind: 'light',
    x,
    z: 4.5,
    facing: [0, -1],
    depth: 0.5,
  })),
  ...[-5.5, 4.5].map((x): WallFitting => ({
    kind: 'light',
    x,
    z: -1.5,
    facing: [0, 1],
    depth: 0.5,
  })),
  { kind: 'vacuum', x: 7, z: 1.5, facing: [-1, 0], depth: 0.3 },
  { kind: 'vacuum', x: 0, z: -8.4, facing: [0, 1], depth: 0.3 },
  { kind: 'inlet', x: -4, z: -6.4, facing: [1, 0], depth: 0.35 },
  { kind: 'inlet', x: 4, z: -6.4, facing: [-1, 0], depth: 0.35 },
];

/**
 * The pool's outline moved `by` metres outward (its edges square, so each
 * corner moves along both its edges' outward normals): with the overflow
 * grating's width, the edge of the deck's tiling.
 */
export function offsetOutline(by: number): [number, number][] {
  const n = POOL_OUTLINE.length;
  const normal = (i: number) => {
    const [x0, z0] = POOL_OUTLINE[i];
    const [x1, z1] = POOL_OUTLINE[(i + 1) % n];
    const mx = (x0 + x1) / 2,
      mz = (z0 + z1) / 2;
    if (z0 === z1) return [0, inPool(mx, mz + 0.01) ? -1 : 1] as const;
    return [inPool(mx + 0.01, mz) ? -1 : 1, 0] as const;
  };
  return POOL_OUTLINE.map(([x, z], i) => {
    const a = normal((i + n - 1) % n),
      b = normal(i);
    return [x + by * (a[0] + b[0]), z + by * (a[1] + b[1])];
  });
}
