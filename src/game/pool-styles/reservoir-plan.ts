import { insideRect, rect } from './geometry';
import type { Rect } from './geometry';

/**
 * The Reservoir (`doc/design/pool-styles.md`, style 3), laid out: a vast
 * dark hall flooded wall to wall, a forest of huge round columns rising
 * out of black water into the dark, crossed by a timber boardwalk that
 * doglegs between them from the landing at the west door to the landing
 * at the east. The parody is a municipal reservoir pretending to be a
 * pool: lane ropes strung across it, depth marks on its columns (0.5 m,
 * 1.0 m, 2.0 m), and a lifeguard's high chair far too tall for anyone.
 * Pure; metres, x east, z south, the water's surface just below y = 0.
 */

/** The hall's walls, and its ceiling, lost in the dark. */
export const BOUNDS = rect(-16, 16, -13, 13);
export const CEILING = 12;
/** How deep the water is, to the hall's floor. */
export const DEPTH = 2;

/** Where the doors are: on the west and east walls, 1.1 m from the south end. */
export const DOOR_Z = BOUNDS.maxZ - 1.1;

/** The tiled landings at the doors, at floor level. */
export const LANDINGS: readonly Rect[] = [
  rect(-16, -12, 9, 13),
  rect(12, 16, 9, 13),
];

/** The boardwalk's width, metres. */
export const WALK_WIDTH = 2;
/** The boardwalk's centre line: out from the west landing, north into the hall, east, and back. */
export const WALK_LINE: readonly (readonly [number, number])[] = [
  [-12, 11],
  [-9, 11],
  [-9, -1],
  [-2, -1],
  [-2, 4],
  [5, 4],
  [5, -3],
  [9, -3],
  [9, 11],
  [12, 11],
];

/** The boardwalk, as rectangles, one a leg of its line. */
export const BOARDWALK: readonly Rect[] = WALK_LINE.slice(1).map(
  ([bx, bz], i) => {
    const [ax, az] = WALK_LINE[i];
    const h = WALK_WIDTH / 2;
    return rect(
      Math.min(ax, bx) - h,
      Math.max(ax, bx) + h,
      Math.min(az, bz) - h,
      Math.max(az, bz) + h,
    );
  },
);

/** Whether a walker can stand at (x, z): on a landing or the boardwalk. */
export function walkable(x: number, z: number): boolean {
  return (
    LANDINGS.some((r) => insideRect(r, x, z)) ||
    BOARDWALK.some((r) => insideRect(r, x, z))
  );
}

export interface Column {
  x: number;
  z: number;
  r: number;
  /** Its radius at the top as a share of its foot's: some taper. */
  top: number;
  brick: boolean;
}

/** The lifeguard's chair, standing in the water: where, and how high its seat is. */
export const LIFEGUARD_CHAIR = { x: 1.5, z: -8, seat: 9 } as const;

/** How far a column keeps from the boardwalk and landings, metres. */
const CLEAR = 0.6;

const clearOfWalk = (x: number, z: number, r: number) =>
  [...LANDINGS, ...BOARDWALK].every(
    (w) =>
      x + r + CLEAR < w.minX ||
      x - r - CLEAR > w.maxX ||
      z + r + CLEAR < w.minZ ||
      z - r - CLEAR > w.maxZ,
  );

/**
 * The columns: on a loose grid, each nudged from its place and sized by
 * a hash of where it is, so the forest looks grown rather than drawn;
 * none on the boardwalk's way.
 */
export const COLUMNS: readonly Column[] = (() => {
  const list: Column[] = [];
  let k = 0;
  for (let gz = -10; gz <= 10; gz += 4.5)
    for (let gx = -13; gx <= 13; gx += 4.5) {
      k++;
      const h = Math.sin(k * 12.9898) * 43758.5453;
      const f = h - Math.floor(h);
      const g = (f * 7.31) % 1;
      const x = gx + (f - 0.5) * 1.6;
      const z = gz + (g - 0.5) * 1.6;
      const r = 0.8 + f * 0.5;
      if (
        x - r < BOUNDS.minX + 1 ||
        x + r > BOUNDS.maxX - 1 ||
        z - r < BOUNDS.minZ + 1 ||
        z + r > BOUNDS.maxZ - 1
      )
        continue;
      if (!clearOfWalk(x, z, r)) continue;
      // A clearing round the lifeguard's chair.
      if (Math.hypot(x - LIFEGUARD_CHAIR.x, z - LIFEGUARD_CHAIR.z) < r + 1.8)
        continue;
      list.push({ x, z, r, top: g > 0.55 ? 0.7 : 1, brick: f > 0.4 });
    }
  return list;
})();

/** The lane ropes, floating across the water from wall to wall at these z. */
export const LANE_ROPES: readonly number[] = [-10.5, -5.5];

/** Depth marks painted on three columns, nearest the boardwalk first. */
/**
 * Its depth marks: deep for a pool, but no deeper than its water is, and
 * no deeper than its plant could heat (a pool of 200 m would need a
 * power station).
 */
export const DEPTH_MARKS: readonly string[] = ['0.5 m', '1.0 m', '2.0 m'];

/** The columns that carry the depth marks: those nearest the boardwalk's line, in order along it. */
export function markedColumns(): Column[] {
  const near = (c: Column) =>
    Math.min(
      ...BOARDWALK.map((w) =>
        Math.hypot(
          Math.max(w.minX - c.x, 0, c.x - w.maxX),
          Math.max(w.minZ - c.z, 0, c.z - w.maxZ),
        ),
      ),
    );
  return [...COLUMNS]
    .sort((a, b) => near(a) - near(b))
    .slice(0, DEPTH_MARKS.length)
    .sort((a, b) => a.x - b.x);
}

/** The slit windows high in the walls: which wall, where along it, from and to in height. */
export const SLITS: readonly {
  side: 'north' | 'west' | 'east';
  at: number;
}[] = [
  { side: 'north', at: -11 },
  { side: 'north', at: -4 },
  { side: 'north', at: 3 },
  { side: 'north', at: 10 },
  { side: 'west', at: -5 },
  { side: 'east', at: -8 },
];
export const SLIT = { bottom: 6, top: 10.5, width: 0.3 } as const;

/**
 * Where the walker cannot go: everywhere off the landings and the
 * boardwalk, as strips merged along each row of a fine grid.
 */
export function waterSolids(cell = 0.5): Rect[] {
  const solids: Rect[] = [];
  for (let z = BOUNDS.minZ; z < BOUNDS.maxZ; z += cell) {
    let start: number | null = null;
    for (let x = BOUNDS.minX; x <= BOUNDS.maxX; x += cell) {
      const wet = x < BOUNDS.maxX && !walkable(x + cell / 2, z + cell / 2);
      if (wet && start === null) start = x;
      if (!wet && start !== null) {
        solids.push(rect(start, x, z, z + cell));
        start = null;
      }
    }
  }
  return solids;
}
