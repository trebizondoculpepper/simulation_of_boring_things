import { distanceToLine, insidePolygon, rect } from './geometry';
import type { Point, Rect } from './geometry';

/**
 * The Slide Atrium, laid out (`doc/design/pool-styles.md`, style 5): the
 * water park with no visitors. A tall tiled atrium, 24 m square and 14 m
 * to its ceiling (small enough for its plant to keep its air warm and dry), its north corners rounded; along its north, west and
 * east walls a U of three galleries, each set back behind and above the
 * one below like a grandstand (a solid tier under each, so that nothing
 * walks beneath a gallery), climbed by three stairs; kidney-shaped splash
 * pools on its ground floor to the south; and its slides, red, yellow and
 * blue, weaving down from the galleries through the atrium. Two can be
 * ridden into the splash pools; one loops back on itself and is closed;
 * one ends in mid-air. Pure; metres, x east, z south, y up.
 */

/** The atrium's walls: its outer bounds, where the doors are. */
export const BOUNDS: Rect = rect(-12, 12, -12, 12);
export const HEIGHT = 14;
/** The north corners' radius; the south corners are nearly square, for the doors. */
const NORTH_RADIUS = 4;
const SOUTH_RADIUS = 0.3;

/** An arc of points about (cx, cz), radius r, from angle a0 to a1. */
function arc(
  cx: number,
  cz: number,
  r: number,
  a0: number,
  a1: number,
  n = 10,
): Point[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    return [cx + r * Math.cos(a), cz + r * Math.sin(a)] as Point;
  });
}

/** The atrium's outline, anticlockwise in (x, z) seen from above with z south. */
export const OUTLINE: readonly Point[] = (() => {
  const { minX, maxX, minZ, maxZ } = BOUNDS;
  const n = NORTH_RADIUS,
    s = SOUTH_RADIUS;
  return [
    ...arc(maxX - n, minZ + n, n, -Math.PI / 2, 0),
    ...arc(maxX - s, maxZ - s, s, 0, Math.PI / 2, 2),
    ...arc(minX + s, maxZ - s, s, Math.PI / 2, Math.PI, 2),
    ...arc(minX + n, minZ + n, n, Math.PI, (3 * Math.PI) / 2),
  ];
})();

/** Where the galleries' arms end, toward the south. */
export const ARMS_END = 3.5;

export interface Tier {
  /** Its floor, metres. */
  y: number;
  /** How far its front stands in from the walls, metres. */
  inset: number;
  /** Its floor's outline. */
  outline: readonly Point[];
  /** Its front edge, from the west wall round to the east: its railing and the face of its tier. */
  front: readonly Point[];
}

/**
 * A gallery: a U along the north, west and east walls, its front `inset`
 * metres in from them, from the north wall to `ARMS_END`.
 */
function tier(y: number, inset: number): Tier {
  const { minX, maxX, minZ } = BOUNDS;
  const n = NORTH_RADIUS;
  const fx0 = minX + inset,
    fx1 = maxX - inset,
    fz = minZ + inset;
  // The front: across the west arm's end, up its face, along the north,
  // down the east arm's face and across its end.
  const front: Point[] = [
    [minX, ARMS_END],
    [fx0, ARMS_END],
    [fx0, fz],
    [fx1, fz],
    [fx1, ARMS_END],
    [maxX, ARMS_END],
  ];

  // Its floor: up the west wall, round the north by its corners, down the
  // east wall to the arm's end, then back along its front.
  const walls: Point[] = [
    [minX, ARMS_END],
    ...arc(minX + n, minZ + n, n, Math.PI, (3 * Math.PI) / 2),
    ...arc(maxX - n, minZ + n, n, -Math.PI / 2, 0),
    [maxX, ARMS_END],
  ];
  return {
    y,
    inset,
    front,
    outline: [...walls, ...[...front].reverse().slice(1, -1)],
  };
}

/** The three galleries, each 5 m above the last and set further back. */
export const TIERS: readonly Tier[] = [tier(4, 6.5), tier(8, 4), tier(12, 1.5)];

export interface Stair {
  /** Its footprint, and its floor at its south end (`y0`) and north end (`y1`). */
  rect: Rect;
  y0: number;
  y1: number;
  /**
   * The clear way to its foot, at least a metre wide: beside it to its
   * foot, and across in front of its foot (for the flights on the arms).
   */
  approach: readonly Rect[];
}

/**
 * The stairs: up the middle to the first gallery, then up the west arm
 * to the second and the east arm to the third, each flight against the
 * face of the gallery it climbs to, its way up beside it.
 */
export const STAIRS: readonly Stair[] = [
  {
    rect: rect(-1.5, 1.5, -5.5, 1.5),
    y0: 0,
    y1: 4,
    approach: [rect(-1.5, 1.5, 1.5, 3)],
  },
  {
    rect: rect(-8, -6.7, -8, 2),
    y0: 4,
    y1: 8,
    approach: [rect(-6.7, -5.5, -8, 3.5), rect(-8, -5.5, 2, 3.5)],
  },
  {
    rect: rect(9.2, 10.5, -10.5, 2),
    y0: 8,
    y1: 12,
    approach: [rect(8, 9.2, -10.5, 3.5), rect(8, 10.5, 2, 3.5)],
  },
];

/** A stair's floor at z. */
export const stairFloor = (s: Stair, z: number) =>
  s.y0 + ((s.y1 - s.y0) * (s.rect.maxZ - z)) / (s.rect.maxZ - s.rect.minZ);

/** A kidney: an oval with one side drawn in, `w` by `d` about (cx, cz), turned `turn`. */
export function kidneyOutline(
  cx: number,
  cz: number,
  w: number,
  d: number,
  turn = 0,
  n = 40,
): Point[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const dip = 1 - 0.32 * Math.max(0, Math.sin(a)) ** 3;
    const x = (w / 2) * Math.cos(a);
    const z = (d / 2) * Math.sin(a) * dip;
    const c = Math.cos(turn),
      s = Math.sin(turn);
    return [cx + x * c - z * s, cz + x * s + z * c] as Point;
  });
}

/** The splash pools, on the ground floor to the south: wadeable, so a rider can climb out. */
export const POOLS = [
  { outline: kidneyOutline(-4.6, 7.2, 6, 4.2, 0.25), depth: 0.9 },
  { outline: kidneyOutline(4.6, 6.4, 5.4, 4, -0.4), depth: 0.9 },
] as const;

export type SlideColour = 'red' | 'yellow' | 'blue';

export interface Slide {
  id: string;
  colour: SlideColour;
  /** Its path, from its mouth down, through points (x, y, z). */
  path: readonly (readonly [number, number, number])[];
  /** It can be ridden from its mouth. */
  rideable: boolean;
  /** It loops back to its own mouth. */
  closed?: boolean;
}

export const SLIDES: readonly Slide[] = [
  {
    // From the top gallery's north-west, coiling down the west of the
    // atrium into the west splash pool.
    id: 'red',
    colour: 'red',
    rideable: true,
    path: [
      [-6, 12.6, -11.2],
      [-6, 12.2, -9.6],
      [-3, 11, -7],
      [-6.5, 9.6, -3],
      [-4, 8.4, 1],
      [0, 7.4, -1.5],
      [-3, 6.3, -5],
      [-5, 5.2, -1],
      [-2, 4.2, 2.5],
      [-5, 3, 3.4],
      [-6, 1.6, 5.8],
      [-4.8, 0.6, 7],
      [-4.4, 0.1, 7.4],
    ],
  },
  {
    // From the middle gallery's north-east, under and across the red,
    // into the east splash pool.
    id: 'yellow',
    colour: 'yellow',
    rideable: true,
    path: [
      [5.5, 8.6, -9.5],
      [5.5, 8.2, -7],
      [2.5, 7.4, -4],
      [-1.5, 6.6, -2.5],
      [-2.5, 5.6, 1],
      [1.5, 4.6, 2],
      [4.8, 3.6, 0],
      [5, 2.4, 3.6],
      [4, 1.2, 5.4],
      [4.6, 0.1, 6.2],
    ],
  },
  {
    // From the top gallery's north-east, out over the atrium and round
    // again up to its own mouth: it goes nowhere. Closed.
    id: 'blue',
    colour: 'blue',
    rideable: false,
    closed: true,
    path: [
      [6.5, 12.6, -11.2],
      [6.5, 12.2, -9],
      [3.5, 11, -5.5],
      [6.5, 10, -1.5],
      [9, 10.8, -5],
      [8.5, 12, -9],
      [7.5, 12.6, -10.8],
    ],
  },
  {
    // From the middle gallery's west arm, out into the atrium, ending in
    // mid-air with nothing under it.
    id: 'short',
    colour: 'blue',
    rideable: false,
    path: [
      [-8.7, 8.6, -3],
      [-6, 8.1, -3.6],
      [-3, 7.3, -5.2],
      [0, 6.6, -3],
      [1.5, 6.2, 0],
    ],
  },
];

/** The splash pool at (x, z), if any. */
export const poolAt = (x: number, z: number) =>
  POOLS.find((p) => insidePolygon(p.outline, x, z)) ?? null;

/**
 * The floor under a walker at (x, z) who stood at `previous`: of the
 * ground (or a splash pool's floor), the galleries and the stairs under
 * that point, the one nearest the height they stood at.
 */
export function floorAt(x: number, z: number, previous: number): number {
  // A stair is a solid flight: on it, its own floor, whatever is round it.
  for (const s of STAIRS)
    if (
      x >= s.rect.minX &&
      x <= s.rect.maxX &&
      z >= s.rect.minZ &&
      z <= s.rect.maxZ
    )
      return stairFloor(s, z);
  const floors: number[] = [];
  if (insidePolygon(OUTLINE, x, z))
    floors.push(poolAt(x, z) ? -poolAt(x, z)!.depth : 0);
  for (const t of TIERS) if (insidePolygon(t.outline, x, z)) floors.push(t.y);
  if (!floors.length) return previous;
  return floors.reduce((a, b) =>
    Math.abs(b - previous) < Math.abs(a - previous) ? b : a,
  );
}

/**
 * Where each gallery's front is open at the top of a stair (`from`–`to`
 * in x, at its front's z).
 */
export const TOP_GAPS: readonly { tier: number; from: number; to: number }[] = [
  { tier: 0, from: STAIRS[0].rect.minX, to: STAIRS[0].rect.maxX },
  { tier: 1, from: STAIRS[1].rect.minX, to: STAIRS[1].rect.maxX },
  { tier: 2, from: STAIRS[2].rect.minX, to: STAIRS[2].rect.maxX },
];

/** A gallery's front as runs of railing: broken where a stair comes up through it. */
export function frontRuns(index: number): Point[][] {
  const t = TIERS[index];
  const gap = TOP_GAPS.find((g) => g.tier === index)!;
  const fz = BOUNDS.minZ + t.inset;
  const runs: Point[][] = [[]];
  // Sampled every 0.25 m, so a gap can be cut cleanly.
  for (let i = 1; i < t.front.length; i++) {
    const [ax, az] = t.front[i - 1];
    const [bx, bz] = t.front[i];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 0.25));
    for (let k = i === 1 ? 0 : 1; k <= n; k++) {
      const x = ax + ((bx - ax) * k) / n;
      const z = az + ((bz - az) * k) / n;
      const open =
        Math.abs(z - fz) < 0.05 && x > gap.from - 0.05 && x < gap.to + 0.05;
      if (open) {
        if (runs.at(-1)!.length) runs.push([]);
      } else runs.at(-1)!.push([x, z]);
    }
  }
  return runs.filter((r) => r.length > 1);
}

/** The edge between a gallery's floor and the void, for the solids. */
export function frontSolidPoints(): Point[][] {
  return TIERS.flatMap((_, i) => frontRuns(i));
}

/** How far (x, z) is from a slide's line in plan. */
export const fromSlide = (slide: Slide, x: number, z: number) =>
  distanceToLine(
    slide.path.map(([px, , pz]) => [px, pz] as Point),
    x,
    z,
  );
