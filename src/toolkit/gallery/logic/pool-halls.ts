import type { Footprint } from '../../controls/logic/walk-collision';
import { PLANT_DOORWAY, PLANT_SILL } from './plant-rooms';
import type { PlantRoomSize } from './plant-rooms';

/**
 * The version-one pool halls, each a ticket of its own, each an entirely
 * new room with no doors yet (they are joined by corridors later):
 *
 * - POOL-01, the lounge pool: a leisure pool with a sitting ledge and
 *   steps in at the shallow end;
 * - POOL-02, the Olympic pool: 50 m × 25 m, ten lanes, 2 m deep;
 * - POOL-03, the jacuzzi: a round hot tub for eight with a seat round it;
 * - POOL-04, the footbath: a walk-through channel across a passage, wall
 *   to wall, that everyone wades on the way to the pools, so feet are
 *   washed and disinfected first.
 *
 * Each is a fairly basic, recognisable example of what it is, of the
 * right size and function, with the pool rooms' look: a tiled hall coved
 * where every wall meets another and where the walls meet the deck, an
 * occasional column, and plenty of deck round the water (this is not a
 * swimming game). The pools are deck-level, their water at the deck,
 * spilling into gutters under gratings. The figures here are what the plant is sized from
 * (`src/game/plant-sizing/pools.config.ts`). Pure: metres, the hall's
 * middle at the origin, the deck at y = 0, x east and z south.
 */

export type PoolHallId = 'pool_01' | 'pool_02' | 'pool_03' | 'pool_04';

/** A rectangular basin, its floor falling evenly from west to east. */
export interface RectBasin {
  shape: 'rect';
  name: string;
  x: number;
  z: number;
  w: number;
  d: number;
  /** Depth of water at the west end and at the east end. */
  shallow: number;
  deep: number;
  /** A sitting ledge along the north wall: its width, and its depth under water. */
  ledge?: { width: number; below: number; from: number; to: number };
  /** Steps in at the west end, in the south-west corner. */
  steps?: { width: number; count: number; going: number };
  /** Racing lanes across the width (lane lines, ropes, blocks at the west). */
  lanes?: number;
  /**
   * Wall to wall across the hall, west to east, as a footbath across a
   * passage is, its gutters only at its north and south edges.
   */
  spans?: boolean;
}

/** A round basin with a seat round its wall, as a hot tub has. */
export interface RoundBasin {
  shape: 'round';
  name: string;
  x: number;
  z: number;
  r: number;
  depth: number;
  seat: { width: number; below: number };
}

/**
 * A free-form basin: its outline a smooth closed curve through `points`,
 * its floor flat at `depth`; shelves to lounge on, round patches of the
 * floor raised to `below` the water; and islands, rounds of deck standing
 * in the water, each with its own gutter round its edge.
 */
export interface FreeBasin {
  shape: 'free';
  name: string;
  points: readonly (readonly [number, number])[];
  depth: number;
  shelves: readonly { x: number; z: number; r: number; below: number }[];
  islands: readonly { x: number; z: number; r: number }[];
  /** Wells: round holes sunk deep below the floor, to `depth` under the water. */
  wells?: readonly { x: number; z: number; r: number; depth: number }[];
}

export type Basin = RectBasin | RoundBasin | FreeBasin;

type Point = readonly [number, number];

/**
 * A free basin's outline: its points joined by a closed Catmull–Rom
 * curve, sampled `perSpan` times between each pair.
 */
export function freeOutline(b: FreeBasin, perSpan = 12): Point[] {
  const p = b.points;
  const n = p.length;
  const out: Point[] = [];
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [
      p[(i + n - 1) % n],
      p[i],
      p[(i + 1) % n],
      p[(i + 2) % n],
    ];
    for (let k = 0; k < perSpan; k++) {
      const t = k / perSpan;
      const t2 = t * t;
      const t3 = t2 * t;
      const at = (j: 0 | 1) =>
        0.5 *
        (2 * p1[j] +
          (-p0[j] + p2[j]) * t +
          (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 +
          (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3);
      out.push([at(0), at(1)]);
    }
  }
  return out;
}

/** A closed outline's area, m² (positive either way round). */
export function outlineArea(points: readonly Point[]): number {
  let a = 0;
  for (let i = 0; i < points.length; i++) {
    const [x0, z0] = points[i];
    const [x1, z1] = points[(i + 1) % points.length];
    a += x0 * z1 - x1 * z0;
  }
  return Math.abs(a) / 2;
}

/** Whether (x, z) is inside a closed outline. */
export function insideOutline(points: readonly Point[], x: number, z: number) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, zi] = points[i];
    const [xj, zj] = points[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi)
      inside = !inside;
  }
  return inside;
}

/**
 * The outline moved `by` metres outward (inward if negative), each point
 * along its own normal: for a gutter round a smooth outline.
 */
export function offsetOutline(points: readonly Point[], by: number): Point[] {
  const n = points.length;
  // Which way round it runs decides which side is out.
  let turn = 0;
  for (let i = 0; i < n; i++) {
    const [x0, z0] = points[i];
    const [x1, z1] = points[(i + 1) % n];
    turn += x0 * z1 - x1 * z0;
  }
  const side = turn > 0 ? 1 : -1;
  return points.map(([x, z], i) => {
    const [ax, az] = points[(i + n - 1) % n];
    const [bx, bz] = points[(i + 1) % n];
    const tx = bx - ax;
    const tz = bz - az;
    const len = Math.hypot(tx, tz) || 1;
    // The normal to the right of travel, out for an anticlockwise run.
    return [x + (side * tz * by) / len, z - (side * tx * by) / len] as const;
  });
}

export interface PoolHallSpec {
  id: PoolHallId;
  ticket: string;
  title: string;
  w: number;
  d: number;
  h: number;
  /**
   * A roof sloping up from the north wall to the south, across the short
   * side: its height at the north wall and its pitch, degrees. `h` is then
   * its height at the south wall, the highest. Without it the roof is flat
   * at `h`.
   */
  roof?: { low: number; pitch: number };
  /** Tiles up to here; bare board-marked concrete above, if lower than `h`. */
  tileTop: number;
  /** The tiles' colour and size. */
  tile: { colour: string; size: number };
  /** The gutter round each basin: its width and depth. */
  gutter: { width: number; depth: number };
  basins: readonly Basin[];
  /**
   * Square skylights in the roof, each its middle and size: placed so the
   * sun (`SUN`) through them lands in the water.
   */
  skylights: readonly { x: number; z: number; size: number }[];
  /**
   * Windows high in the east wall, where the sun comes from: their sill
   * and head, their middles along the wall, and their width.
   */
  highWindows?: {
    from: number;
    to: number;
    at: readonly number[];
    width: number;
  };
  /**
   * Freestanding tiled arches across the hall along z at `x`, from `z0` to
   * `z1`, `thick` through: two piers and a round arch springing from
   * `spring` between them, the water and the deck running under it.
   */
  arches?: readonly {
    x: number;
    z0: number;
    z1: number;
    spring: number;
    thick: number;
  }[];
  /**
   * An underwater viewing gallery: a corridor of the game's standard
   * section (1.2 m by 2.5 m) under the deck along the first basin's north
   * wall, the length of the hall, its floor `floor` below the deck, round
   * windows `every` metres through the pool's wall into the water.
   */
  gallery?: { floor: number; every: number; r: number };
  /** Round tiled columns, deck (or pool floor) to roof. */
  columns: readonly { x: number; z: number; r: number }[];
  /**
   * The middle, along x, of its two doorways, one in the north wall and
   * one in the south, each the corridors' section (`pool-loop.ts`).
   */
  doorX?: number;
  /**
   * The door to its own plant room, in its west wall (`plant-rooms.ts`):
   * the doorway's middle along the wall, and the plant room's size.
   */
  plantDoor?: { wall: 'west' | 'east'; z: number; size: PlantRoomSize };
  /** Where the walker starts, and facing. */
  start: { x: number; z: number; yaw: number };
}

/**
 * Toward the sun, the same in every hall: 33 degrees up, a little south
 * of east. It is never seen, only its light through skylights and high
 * windows, hard, casting shadows and pools of light into the water.
 */
export const SUN = (() => {
  const v = [0.81, 0.545, 0.217];
  const n = Math.hypot(...v);
  return { x: v[0] / n, y: v[1] / n, z: v[2] / n };
})();

/** Where light through the roof at (x, z), `drop` metres above, lands. */
export function sunLands(x: number, z: number, drop: number) {
  return { x: x - (SUN.x / SUN.y) * drop, z: z - (SUN.z / SUN.y) * drop };
}

/** The water's level: a hair below the deck, as the gutters draw it off. */
export const WATER_Y = -0.015;
export const WALL = 0.2;

export const POOL_HALLS: Record<PoolHallId, PoolHallSpec> = {
  pool_01: {
    id: 'pool_01',
    ticket: 'POOL-01',
    title: 'Lounge pool',
    w: 28,
    d: 20,
    h: 7,
    tileTop: 4,
    tile: { colour: '#f3f5f1', size: 0.125 },
    gutter: { width: 0.25, depth: 0.2 },
    basins: [
      {
        // The wackiest of the four: shallow, warm, its outline wandering
        // in lobes and fingers round a pinched waist; two islands standing
        // in it, the larger carrying a column; and two shelves to lie on,
        // a hand's depth and a forearm's under the water.
        shape: 'free',
        name: 'Lounge pool',
        points: [
          [-9.5, -1],
          [-8.5, -4],
          [-6, -5],
          [-4, -3.4],
          [-2.5, -5.2],
          [0.5, -5.5],
          [2, -3.6],
          [4, -5],
          [7, -5.2],
          [9.3, -3],
          [8.4, -0.5],
          [9.5, 2],
          [8, 4.8],
          [5, 4.4],
          [3, 2.2],
          [1.4, 1.6],
          [0, 3],
          [-1.5, 5.3],
          [-4.5, 5.5],
          [-6, 3.2],
          [-8.5, 4],
          [-9.8, 2],
        ],
        depth: 0.9,
        shelves: [
          { x: -3, z: 3.9, r: 1.3, below: 0.3 },
          { x: 7, z: 2.6, r: 1.2, below: 0.45 },
        ],
        islands: [
          { x: 5.4, z: -2, r: 1.3 },
          { x: -6.4, z: -1.4, r: 0.8 },
        ],
        // A deep, dark well in the shallow floor, 2.4 m down.
        wells: [{ x: -2.6, z: -1.2, r: 1.1, depth: 2.4 }],
      },
    ],
    // One on the island, two standing straight up out of the water, and
    // four in the deck round the pool.
    arches: [{ x: 1.8, z0: -6.6, z1: 4.2, spring: 1.6, thick: 0.7 }],
    columns: [
      { x: 5.4, z: -2, r: 0.45 },
      { x: -5, z: 1.4, r: 0.35 },
      { x: 4.5, z: 1.8, r: 0.35 },
      { x: -12, z: -7.5, r: 0.45 },
      { x: 12, z: -7.5, r: 0.45 },
      { x: -12, z: 7.5, r: 0.45 },
      { x: 12, z: 7.5, r: 0.45 },
    ],
    // Three over the pool's north side: the sun lands across its water.
    skylights: [2.5, 7.5, 12.4].map((x) => ({ x, z: 2.5, size: 2.2 })),
    // Its plant room, the medium, through the east wall.
    plantDoor: { wall: 'east', z: -4.07, size: 'medium' },
    start: { x: -13, z: 3, yaw: 1.45 },
  },
  pool_02: {
    id: 'pool_02',
    ticket: 'POOL-02',
    title: 'Olympic pool',
    w: 66,
    d: 40,
    // Its roof slopes at 20 degrees across the short side, from 9 m over
    // the north deck to more than 23 m over the south: a great tilted lid,
    // its high south wall toward the sun.
    h: 9 + 40 * Math.tan((20 * Math.PI) / 180),
    roof: { low: 9, pitch: 20 },
    tileTop: 4,
    tile: { colour: '#f3f5f1', size: 0.125 },
    gutter: { width: 0.3, depth: 0.25 },
    basins: [
      {
        shape: 'rect',
        name: 'Olympic pool',
        x: 0,
        z: 0,
        w: 50,
        d: 25,
        shallow: 2,
        deep: 2,
        lanes: 10,
      },
    ],
    // A row down each long side, carrying the roof's span.
    // The underwater viewing gallery along the north side: a corridor
    // with a round window every 4 m into the water.
    gallery: { floor: -2.85, every: 4, r: 0.45 },
    columns: [-22, -11, 0, 11, 22].flatMap((x) => [
      { x, z: -16.5, r: 0.55 },
      { x, z: 16.5, r: 0.55 },
    ]),
    // A row down the middle, and high windows in the east wall: the
    // morning sun across the lanes.
    skylights: [2, 11, 20, 29].map((x) => ({ x, z: 5, size: 3.5 })),
    highWindows: { from: 8, to: 10.5, at: [-15, -7.5, 0, 7.5, 15], width: 4 },
    // Its doors stand clear of the rows of columns.
    doorX: 5.5,
    // Its plant room, the large, through the west wall by the south deck.
    plantDoor: { wall: 'west', z: 15.5, size: 'large' },
    start: { x: -31, z: 18.5, yaw: Math.PI / 3 },
  },
  pool_03: {
    id: 'pool_03',
    ticket: 'POOL-03',
    title: 'Jacuzzi',
    w: 10,
    d: 8,
    h: 9,
    tileTop: 3,
    tile: { colour: '#cfe1e5', size: 0.05 },
    gutter: { width: 0.2, depth: 0.15 },
    // The raised, working plinth jacuzzi is placed by the room view.
    basins: [],
    columns: [
      { x: -3.3, z: -2.4, r: 0.3 },
      { x: 3.3, z: -2.4, r: 0.3 },
    ],
    skylights: [],
    // Its plant room, a small one, through the east wall.
    plantDoor: { wall: 'east', z: -1.23, size: 'small' },
    start: { x: -4.2, z: 3.2, yaw: Math.PI / 4 },
  },
  pool_04: {
    id: 'pool_04',
    ticket: 'POOL-04',
    title: 'Footbath',
    w: 4,
    d: 9,
    h: 3,
    tileTop: 3,
    tile: { colour: '#f3f5f1', size: 0.125 },
    gutter: { width: 0.12, depth: 0.08 },
    basins: [
      {
        // Across the passage, 1.5 m to wade, 0.15 m deep.
        shape: 'rect',
        name: 'Footbath',
        x: 0,
        z: 0,
        w: 4,
        d: 1.5,
        shallow: 0.15,
        deep: 0.15,
        spans: true,
      },
    ],
    columns: [],
    // Too narrow for the sun through its roof to reach the floor: a
    // window in the east wall instead, its light across the channel.
    skylights: [],
    highWindows: { from: 1.8, to: 2.6, at: [0.6], width: 1.4 },
    // Its plant room, the small, through the west wall north of the channel.
    plantDoor: { wall: 'west', z: -2.38, size: 'tiny' },
    start: { x: 0, z: 3.8, yaw: 0 },
  },
};

/** The underside of the roof at `z`: flat at `h`, or rising to the south. */
export function roofAt(s: PoolHallSpec, z: number): number {
  if (!s.roof) return s.h;
  const t = Math.tan((s.roof.pitch * Math.PI) / 180);
  return s.roof.low + (Math.min(s.d / 2, Math.max(-s.d / 2, z)) + s.d / 2) * t;
}

/** The hall's air, m³: its floor by its mean height. */
export const hallVolume = (s: PoolHallSpec) =>
  s.w * s.d * ((roofAt(s, -s.d / 2) + roofAt(s, s.d / 2)) / 2);

/** A rectangular basin's water depth at `x`. */
export function rectDepth(b: RectBasin, x: number): number {
  const t = (x - (b.x - b.w / 2)) / b.w;
  return b.shallow + (b.deep - b.shallow) * Math.min(1, Math.max(0, t));
}

/**
 * The floor in a basin at (x, z), or null outside it: the pool's floor,
 * or a ledge, step or seat standing above it.
 */
export function basinFloorAt(b: Basin, x: number, z: number): number | null {
  if (b.shape === 'free') {
    if (!insideOutline(freeOutline(b), x, z)) return null;
    if (b.islands.some((i) => Math.hypot(x - i.x, z - i.z) < i.r)) return null;
    const well = b.wells?.find((w) => Math.hypot(x - w.x, z - w.z) < w.r);
    if (well) return WATER_Y - well.depth;
    const shelf = b.shelves.find((h) => Math.hypot(x - h.x, z - h.z) < h.r);
    return WATER_Y - (shelf ? shelf.below : b.depth);
  }
  if (b.shape === 'round') {
    const r = Math.hypot(x - b.x, z - b.z);
    if (r >= b.r) return null;
    return WATER_Y - (r > b.r - b.seat.width ? b.seat.below : b.depth);
  }
  const minX = b.x - b.w / 2;
  const minZ = b.z - b.d / 2;
  const maxZ = b.z + b.d / 2;
  if (x <= minX || x >= minX + b.w || z <= minZ || z >= maxZ) return null;
  let y = WATER_Y - rectDepth(b, x);
  if (b.ledge && z < minZ + b.ledge.width) {
    const lx = x - b.x;
    if (lx > b.ledge.from && lx < b.ledge.to)
      y = Math.max(y, WATER_Y - b.ledge.below);
  }
  if (b.steps && z > maxZ - b.steps.width) {
    const k = Math.floor((x - minX) / b.steps.going);
    if (k < b.steps.count) y = Math.max(y, stepTop(b, k));
  }
  return y;
}

/** The top of step `k` (0 the highest) in a basin's steps. */
export function stepTop(b: RectBasin, k: number): number {
  const count = b.steps?.count ?? 1;
  const rise = rectDepth(b, b.x - b.w / 2) / (count + 1);
  return -(k + 1) * rise;
}

/** The floor under the walker: a basin's, a bench's top, else the deck. */
export function hallFloorAt(s: PoolHallSpec, x: number, z: number): number {
  // On the sill of the plant room door, over the cove.
  if (
    s.plantDoor &&
    (s.plantDoor.wall === 'west' ? x < -s.w / 2 + 0.3 : x > s.w / 2 - 0.3) &&
    Math.abs(z - s.plantDoor.z) < PLANT_DOORWAY / 2
  )
    return PLANT_SILL;
  if (s.id === 'pool_03') {
    // All three tiers run west into the wall, so no rear stair is left.
    // Each tier widens only on the front and the two sides.
    if (x >= -s.w / 2 - 0.15) {
      for (const [half, height] of [
        [1.6, 0.9],
        [1.8, 0.6],
        [2, 0.3],
      ])
        if (x <= -2.7 + half && Math.abs(z) <= half) return height;
    }
  }
  for (const b of s.basins) {
    const y = basinFloorAt(b, x, z);
    if (y !== null) return y;
  }
  return 0;
}

/** The hall's walls, and what stands on its deck, for walking collision. */
export function hallSolids(s: PoolHallSpec): Footprint[] {
  const hx = s.w / 2;
  const hz = s.d / 2;
  const t = WALL;
  // The north and south walls, either side of their doorways.
  const door = s.doorX ?? 0;
  const gap = CORRIDOR_SECTION.width / 2;
  const solids: Footprint[] = [
    ...[
      [-hz - t, -hz],
      [hz, hz + t],
    ].flatMap(([minZ, maxZ]) => [
      { minX: -hx - t, maxX: door - gap, minZ, maxZ },
      { minX: door + gap, maxX: hx + t, minZ, maxZ },
    ]),
    // The east and west walls, either side of any plant room door.
    ...(
      [
        ['west', -hx - t, -hx],
        ['east', hx, hx + t],
      ] as const
    ).flatMap(([wall, minX, maxX]) =>
      s.plantDoor?.wall === wall
        ? [
            { minX, maxX, minZ: -hz, maxZ: s.plantDoor.z - PLANT_DOORWAY / 2 },
            { minX, maxX, minZ: s.plantDoor.z + PLANT_DOORWAY / 2, maxZ: hz },
          ]
        : [{ minX, maxX, minZ: -hz, maxZ: hz }],
    ),
  ];
  // Each arch's two piers.
  for (const a of s.arches ?? []) {
    const { left, right } = archSpan(a);
    for (const [z0, z1] of [
      [a.z0, left],
      [right, a.z1],
    ])
      solids.push({
        minX: a.x - a.thick / 2,
        maxX: a.x + a.thick / 2,
        minZ: z0,
        maxZ: z1,
      });
  }
  // Each column as a stack of slices, each as wide as its circle there.
  for (const c of s.columns)
    for (let i = 0; i < 6; i++) {
      const z0 = -c.r + (2 * c.r * i) / 6;
      const z1 = z0 + (2 * c.r) / 6;
      const near = z0 < 0 && z1 > 0 ? 0 : Math.min(Math.abs(z0), Math.abs(z1));
      const half = Math.sqrt(c.r * c.r - near * near);
      solids.push({
        minX: c.x - half,
        maxX: c.x + half,
        minZ: c.z + z0,
        maxZ: c.z + z1,
      });
    }
  for (const b of s.basins)
    if (b.shape === 'rect' && b.lanes)
      for (const block of startingBlocks(b, s.gutter.width))
        solids.push({
          minX: block.x - 0.3,
          maxX: block.x + 0.3,
          minZ: block.z - 0.27,
          maxZ: block.z + 0.27,
        });
  return solids;
}

/** Where an arch's opening starts and ends along z: its piers are 1 m each. */
export function archSpan(a: { z0: number; z1: number }) {
  return { left: a.z0 + 1, right: a.z1 - 1 };
}

/** The corridor's width, height and walls' thickness (`components/architectural/views/corridor.ts`). */
export const CORRIDOR_SECTION = { width: 1.2, height: 2.5, wall: 0.2 } as const;

/**
 * Where a hall's underwater gallery runs: along its first basin's north
 * wall, behind a wall as thick as the gutter, from the hall's west wall
 * to its east; its windows, centred on the water's depth, along the pool.
 */
export function galleryPlan(s: PoolHallSpec) {
  const g = s.gallery;
  const b = s.basins[0];
  if (!g || b.shape !== 'rect') return null;
  const poolWall = b.z - b.d / 2;
  const thick = s.gutter.width;
  const z = poolWall - thick - CORRIDOR_SECTION.width / 2;
  const count = Math.floor((b.w - g.every) / g.every) + 1;
  const first = b.x - ((count - 1) * g.every) / 2;
  const windows = Array.from({ length: count }, (_, k) => first + k * g.every);
  // The windows' middles halfway down the water, as seen standing.
  const y = WATER_Y - Math.min(b.shallow, b.deep) / 2;
  return {
    x0: -s.w / 2,
    x1: s.w / 2,
    z,
    floor: g.floor,
    thick,
    windows,
    windowY: y,
    r: g.r,
  };
}

/**
 * The door from a gallery to the engineer's office (`shell-rooms.ts`): in
 * the middle of its length, in its north wall, opposite the windows; a
 * single leaf, the plant room door's doorset, its opening to the floor.
 * `line` is the wall's face in the gallery, `wall` its thickness behind
 * it. Its frame for `door-joins.ts` is on that face, +z into the gallery,
 * at the gallery's floor: there it meets the office's frame, on its east
 * wall's outer face, so the two rooms share the one wall. `leaf` is the
 * leaf's place across the wall, `beyond` a stop just past it
 * (`doorway.ts`); `pieces` are the north wall's runs either side of it.
 */
export function galleryOfficeDoor(g: {
  x0: number;
  x1: number;
  z: number;
  floor: number;
}) {
  const x = (g.x0 + g.x1) / 2;
  const line = g.z - CORRIDOR_SECTION.width / 2;
  const wall = CORRIDOR_SECTION.wall;
  const half = PLANT_DOORWAY / 2;
  const leaf: Footprint = {
    minX: x - half,
    maxX: x + half,
    minZ: line - wall,
    maxZ: line,
  };
  return {
    x,
    line,
    wall,
    opening: PLANT_DOORWAY,
    // On its sill, over the corridor's fillet, as a plant room door is.
    frame: { x, z: line, y: g.floor + PLANT_SILL, yaw: 0 },
    leaf,
    beyond: { ...leaf, minZ: leaf.minZ - 0.3, maxZ: leaf.maxZ - 0.3 },
    pieces: [
      [g.x0, x - half],
      [x + half, g.x1],
    ] as [number, number][],
  };
}

/** Whether (x, z) has gone out of the gallery through its office door: past the wall, within the opening. */
export function throughGalleryOfficeDoor(
  door: ReturnType<typeof galleryOfficeDoor>,
  x: number,
  z: number,
) {
  return (
    z < door.line - door.wall - 0.05 && Math.abs(x - door.x) < door.opening / 2
  );
}

/** Each lane's middle across a racing basin, north to south. */
export function laneMiddles(b: RectBasin): number[] {
  const lanes = b.lanes ?? 0;
  const width = b.d / lanes;
  return Array.from(
    { length: lanes },
    (_, k) => b.z - b.d / 2 + (k + 0.5) * width,
  );
}

/** The starting blocks: one a lane at the west end, behind the gutter. */
export function startingBlocks(b: RectBasin, gutter: number) {
  const x = b.x - b.w / 2 - gutter - 0.3;
  return laneMiddles(b).map((z) => ({ x, z }));
}

/** A basin's water, m³: its floor's fall, less ledges, steps and seats. */
export function basinVolume(b: Basin): number {
  if (b.shape === 'free') {
    const wells = (b.wells ?? []).reduce(
      (v, w) => v + Math.PI * w.r * w.r * (w.depth - b.depth),
      0,
    );
    return b.shelves.reduce(
      (v, h) => v - Math.PI * h.r * h.r * (b.depth - h.below),
      basinArea(b) * b.depth + wells,
    );
  }
  if (b.shape === 'round') {
    const inner = b.r - b.seat.width;
    return (
      Math.PI * b.r * b.r * b.depth -
      Math.PI * (b.r * b.r - inner * inner) * (b.depth - b.seat.below)
    );
  }
  let v = b.w * b.d * ((b.shallow + b.deep) / 2);
  if (b.ledge) {
    const mid = b.x + (b.ledge.from + b.ledge.to) / 2;
    v -=
      (b.ledge.to - b.ledge.from) *
      b.ledge.width *
      (rectDepth(b, mid) - b.ledge.below);
  }
  if (b.steps)
    for (let k = 0; k < b.steps.count; k++)
      v -=
        b.steps.going *
        b.steps.width *
        (rectDepth(b, b.x - b.w / 2) + stepTop(b, k));
  return v;
}

/** A basin's water surface, m². */
export const basinArea = (b: Basin) =>
  b.shape === 'round'
    ? Math.PI * b.r * b.r
    : b.shape === 'free'
      ? b.islands.reduce(
          (a, i) => a - Math.PI * i.r * i.r,
          outlineArea(freeOutline(b)),
        )
      : b.w * b.d;
