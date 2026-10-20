import { distanceToLine, insidePolygon, insideRect, rect } from './geometry';
import type { Point, Rect } from './geometry';

/**
 * The White Room's plan (`doc/design/pool-styles.md`, style 4): a tall
 * white room whose north corners curve away so that no corner shows; a
 * straight stair climbing the west wall, landing above landing, to a high
 * platform on a white tower, its diving board out over a deep round pool
 * whose bottom cannot be seen; and on the ground floor a drinking fountain
 * and one chair, each alone in a bay. Pure; metres, x east, z south.
 */

/** The room's outer walls: its doors are on the straight west and east walls near the south. */
export const BOUNDS: Rect = rect(-15, 15, -15, 15);
export const CEILING = 14;

/** The walls' line: north corners curving away on a 6 m radius, south ones barely turned. */
export const OUTLINE: readonly Point[] = (() => {
  const points: Point[] = [];
  const arc = (cx: number, cz: number, r: number, from: number, n: number) => {
    for (let i = 0; i <= n; i++) {
      const a = from + (i / n) * (Math.PI / 2);
      points.push([cx + r * Math.cos(a), cz + r * Math.sin(a)]);
    }
  };
  const b = BOUNDS;
  arc(b.maxX - 6, b.minZ + 6, 6, -Math.PI / 2, 16);
  arc(b.maxX - 0.5, b.maxZ - 0.5, 0.5, 0, 3);
  arc(b.minX + 0.5, b.maxZ - 0.5, 0.5, Math.PI / 2, 3);
  arc(b.minX + 6, b.minZ + 6, 6, Math.PI, 16);
  return points;
})();

/** The stair's band along the west wall, its foot to the south, its head to the north. */
export const STAIR = { minX: -14.5, maxX: -12.5, foot: 13, head: -9 } as const;

/** The stair's flights and landings, from its foot north: each `from`–`to` in z, rising `y0`–`y1`. */
export const STAIR_RUNS: readonly {
  from: number;
  to: number;
  y0: number;
  y1: number;
}[] = [
  { from: 13, to: 7, y0: 0, y1: 3.6 },
  { from: 7, to: 5, y0: 3.6, y1: 3.6 },
  { from: 5, to: -1, y0: 3.6, y1: 7.2 },
  { from: -1, to: -3, y0: 7.2, y1: 7.2 },
  { from: -3, to: -9, y0: 7.2, y1: 10.8 },
];

/** A step's rise and going, metres. */
export const RISER = 0.18;
export const GOING = 0.3;

/** The high platform, and the white tower it stands on. */
export const PLATFORM_Y = 10.8;
export const PLATFORM: readonly Rect[] = [
  rect(-14.5, -5, -10.5, -9),
  rect(-12.5, -5, -9, -7),
];
export const TOWER: Rect = rect(-12.5, -5, -10.5, -7);

/** The pool: round, deep beyond seeing. */
/**
 * The diving pool: as deep as a real one for a 10 m board (5 m), no
 * deeper, since its plant must heat it; the haze hides its bottom.
 */
export const POOL = { x: 0, z: -6, r: 5, depth: 5 } as const;

/** The diving board: out from the platform's edge over the pool. */
export const BOARD = {
  from: -5,
  to: -1.4,
  z: -8.75,
  width: 0.5,
  y: PLATFORM_Y + 0.12,
} as const;

/** The ground floor's two bays, each holding one thing, each a curved screen open to the room. */
export const BAYS: readonly {
  id: 'fountain' | 'chair';
  x: number;
  z: number;
  /** Which way it opens, radians about the vertical (0 toward −z). */
  facing: number;
  radius: number;
}[] = [
  { id: 'fountain', x: 12.4, z: 3, facing: -Math.PI / 2, radius: 2.2 },
  { id: 'chair', x: 5, z: 12.4, facing: 0, radius: 2.2 },
];

/** A bay's curved screen: an arc behind its thing, open toward `facing`. */
export function bayScreen(bay: (typeof BAYS)[number], segments = 16): Point[] {
  const points: Point[] = [];
  // Behind it, away from where it faces: the arc spans the back half.
  const back = Math.atan2(-Math.sin(bay.facing), Math.cos(bay.facing));
  for (let i = 0; i <= segments; i++) {
    const a = back - Math.PI * 0.6 + (i / segments) * Math.PI * 1.2;
    points.push([
      bay.x + bay.radius * Math.sin(a),
      bay.z + bay.radius * Math.cos(a),
    ]);
  }
  return points;
}

/** The stair's height at z, if z is on it. */
export function stairY(z: number): number | null {
  for (const run of STAIR_RUNS)
    if (z <= run.from && z >= run.to)
      return (
        run.y0 + ((run.from - z) / (run.from - run.to)) * (run.y1 - run.y0)
      );
  return null;
}

const onStair = (x: number, z: number) =>
  x >= STAIR.minX && x <= STAIR.maxX && z <= STAIR.foot && z >= STAIR.head;

export const insideRoom = (x: number, z: number) =>
  insidePolygon(OUTLINE, x, z);

export const inPool = (x: number, z: number) =>
  Math.hypot(x - POOL.x, z - POOL.z) <= POOL.r;

/**
 * The floor under a walker at (x, z) who stood at `y`: of the ground,
 * the stair and the platform, whichever there is nearest in height.
 */
export function floorAt(x: number, z: number, y: number): number {
  const candidates: number[] = [];
  const high = PLATFORM.some((p) => insideRect(p, x, z));
  // The stair is solid down to the ground, and the tower under the
  // platform is walled: there is no ground floor under either.
  if (insideRoom(x, z) && !onStair(x, z) && !high) candidates.push(0);
  if (onStair(x, z)) candidates.push(stairY(z)!);
  if (high) candidates.push(PLATFORM_Y);
  if (!candidates.length) return y;
  return candidates.reduce((best, c) =>
    Math.abs(c - y) < Math.abs(best - y) ? c : best,
  );
}

/** Small squares along a line, `thickness` across, for walking against. */
function along(line: readonly Point[], thickness = 0.3, step = 0.2): Rect[] {
  const solids: Rect[] = [];
  const h = thickness / 2;
  for (let i = 1; i < line.length; i++) {
    const [ax, az] = line[i - 1];
    const [bx, bz] = line[i];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / step));
    for (let k = 0; k <= n; k++) {
      const x = ax + ((bx - ax) * k) / n;
      const z = az + ((bz - az) * k) / n;
      solids.push({ minX: x - h, maxX: x + h, minZ: z - h, maxZ: z + h });
    }
  }
  return solids;
}

/** The pool's edge as a line, closed. */
export const POOL_EDGE: readonly Point[] = Array.from(
  { length: 49 },
  (_, i) => {
    const a = (i / 48) * Math.PI * 2;
    return [
      POOL.x + POOL.r * Math.cos(a),
      POOL.z + POOL.r * Math.sin(a),
    ] as Point;
  },
);

/**
 * What the walker walks against: the walls; the pool's edge; the stair's
 * open side, which is also the face of the solid stair below it; the
 * tower's walls, which are also the platform's edges (its west side open
 * to the stair's head); and the bays' screens.
 */
export function solids(): Rect[] {
  const t = TOWER;
  return [
    ...along([...OUTLINE, OUTLINE[0]], 0.4),
    ...along(POOL_EDGE),
    ...along([
      [STAIR.maxX, STAIR.foot],
      [STAIR.maxX, -9],
    ]),
    ...along([
      [t.minX, t.maxZ],
      [t.maxX, t.maxZ],
      [t.maxX, t.minZ],
      [STAIR.minX, t.minZ],
    ]),
    ...BAYS.flatMap((bay) => along(bayScreen(bay))),
  ];
}

/** Whether (x, z) is clear of everything solid, with a walker's girth. */
export function clear(x: number, z: number, girth = 0.25): boolean {
  return !solids().some(
    (s) =>
      x > s.minX - girth &&
      x < s.maxX + girth &&
      z > s.minZ - girth &&
      z < s.maxZ + girth,
  );
}

/** How far (x, z) is from a bay's screen. */
export const fromScreen = (bay: (typeof BAYS)[number], x: number, z: number) =>
  distanceToLine(bayScreen(bay), x, z);
