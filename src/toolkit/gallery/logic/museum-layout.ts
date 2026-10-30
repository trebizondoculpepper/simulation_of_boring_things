import type { Footprint } from '../../controls/logic/walk-collision';

/**
 * The museum's layout C (the owner, 2026-10-30; `doc/temp/README.md`): the
 * ten halls stand apart round a ring, each pair of neighbours joined by an
 * L-shaped corridor with one hard right-angled corner, so no hall can be
 * seen from another. Along each side of the ring the halls alternate
 * between standing out and standing in by `STAGGER`; a corridor runs round
 * the outside of the ring, out of the outside wall of the hall that stands
 * in, round its corner, and into the side wall of the hall that stands
 * out, where it stands proud. Every corridor is the same (a left turn the
 * right turn mirrored).
 *
 * The corridors are big and plain, as an old industrial building's would
 * be (the owner, 2026-10-30: "at least 2 meters wide and a story and a
 * half tall ... square corridors, but with arched portals between the
 * rooms and the corridors ... a hard right angle corner ... a little bit
 * more brutalist"): a square section, `CORRIDOR`, its walls as thick as
 * the halls', entered from each hall through a round-headed archway.
 *
 * Here in the museum's own plan: metres, x east, z south, the origin the
 * middle of the whole; each hall as it stands, its wall lines (the middles
 * of its 0.6 m walls). Halls 3 and 9 stand turned a quarter (`turn`), long
 * north–south. Pure.
 */

/** The halls' walls, centred on their wall lines. */
export const LAYOUT_WALL = 0.6;
/**
 * A corridor's clear section (wide enough for an archway and its piers),
 * and its walls; as tall as the halls it joins, under the same roof deck
 * (the owner, 2026-10-30: "the same height as the rooms that they
 * connect ... the same ceiling style, and the same windows").
 */
export const CORRIDOR = { width: 4.4, height: 9.5, wall: 0.6 } as const;
/** How far a hall stands out from its neighbours along a side of the ring. */
export const STAGGER = 9.5;
/** Between neighbouring halls' outside faces. */
export const HALL_GAP = 5;
/** A corridor's first leg, from the outside face of the hall that stands in to its inside corner. */
export const FIRST_LEG = 4.5;
/** A doorway's middle from the inside corner of its wall: the corridor's outside wall flush with the hall's corner. */
export const DOOR_FROM_CORNER =
  CORRIDOR.width / 2 + CORRIDOR.wall - LAYOUT_WALL;

/** A hall's place: its middle, its size as it stands (x by z), and its quarter turns from its own frame. */
export interface HallPlace {
  /** Its number round the ring. */
  n: number;
  x: number;
  z: number;
  /** Its wall lines' size as it stands: along x, along z. */
  w: number;
  d: number;
  /** Quarter turns about the upright (as Three turns: +1 takes its +x to −z). */
  turn: 0 | 1 | 2 | 3;
  /** The sides of the ring it is on (a corner is on two). */
  sides: Side[];
}

export type Side = 'north' | 'east' | 'south' | 'west';

/**
 * Each hall's size in its own frame (along x, along z), as the exhibits
 * were built (mission 107), and how it stands: Halls 3 and 9, 24 m long,
 * stand turned three quarters, their own +x running south. Hall 2 is
 * grown 5 m south and east, so its archways, near its outside walls' ends,
 * stand clear of its plant's L (`museum-2-layout.ts`); and Hall 7,
 * opposite, the same, so the ring still closes.
 */
const OWN: readonly { w: number; d: number; turn: 0 | 3 }[] = [
  { w: 16, d: 14, turn: 0 },
  { w: 16, d: 21, turn: 0 },
  { w: 21, d: 19, turn: 0 },
  { w: 24, d: 14, turn: 3 },
  { w: 16, d: 14, turn: 0 },
  { w: 16, d: 14, turn: 0 },
  { w: 16, d: 21, turn: 0 },
  { w: 21, d: 19, turn: 0 },
  { w: 16, d: 14, turn: 0 },
  { w: 24, d: 14, turn: 3 },
];

/** The ring's sides, in the visitor's order round them: halls by number. */
const SIDES: Record<Side, readonly number[]> = {
  west: [0, 1, 2],
  north: [2, 3, 4, 5],
  east: [5, 6, 7],
  south: [7, 8, 9, 0],
};

/**
 * Which halls stand out on each side (the owner's layout B kept: Hall 3
 * stands out north and Hall 0, the welcome, onto the street; with ten
 * halls alternating round the ring, Hall 9 then stands in).
 */
const OUT: Record<Side, ReadonlySet<number>> = {
  west: new Set([1]),
  north: new Set([3, 5]),
  east: new Set([6]),
  south: new Set([8, 0]),
};

/** The halls placed (plan y up while laying out, then turned to z south). */
function layHalls(): HallPlace[] {
  const g = HALL_GAP + LAYOUT_WALL;
  const size = OWN.map((o) => (o.turn % 2 ? { w: o.d, d: o.w } : o));
  // Rects as [x0, y0, x1, y1], y north.
  const r: [number, number, number, number][] = [];
  const outOn = (side: Side, n: number) => (OUT[side].has(n) ? 0 : STAGGER);
  // West side, south to north.
  let y = outOn('south', 0);
  for (const n of SIDES.west) {
    const x0 = outOn('west', n);
    r[n] = [x0, y, x0 + size[n].w, y + size[n].d];
    y += size[n].d + g;
  }
  const yn = r[2][3] + outOn('north', 2);
  let x = r[2][2] + g;
  for (const n of [3, 4, 5]) {
    const top = yn - outOn('north', n);
    r[n] = [x, top - size[n].d, x + size[n].w, top];
    x += size[n].w + g;
  }
  const xe = r[5][2] + outOn('east', 5);
  let yy = r[5][1] - g;
  for (const n of [6, 7]) {
    const east = xe - outOn('east', n);
    r[n] = [east - size[n].w, yy - size[n].d, east, yy];
    yy -= size[n].d + g;
  }
  x = r[7][0] - g;
  for (const n of [8, 9]) {
    const south = outOn('south', n);
    r[n] = [x - size[n].w, south, x, south + size[n].d];
    x -= size[n].w + g;
  }
  const minX = Math.min(...r.map((q) => q[0]));
  const maxX = Math.max(...r.map((q) => q[2]));
  const minY = Math.min(...r.map((q) => q[1]));
  const maxY = Math.max(...r.map((q) => q[3]));
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return r.map((q, n) => ({
    n,
    x: (q[0] + q[2]) / 2 - cx,
    z: -((q[1] + q[3]) / 2 - cy),
    w: q[2] - q[0],
    d: q[3] - q[1],
    turn: OWN[n].turn,
    sides: (Object.keys(SIDES) as Side[]).filter((s) => SIDES[s].includes(n)),
  }));
}

export const HALL_PLACES: readonly HallPlace[] = layHalls();

/** A hall's rectangle as it stands, wall lines, in the museum's plan. */
export function placeRect(p: HallPlace) {
  return {
    minX: p.x - p.w / 2,
    maxX: p.x + p.w / 2,
    minZ: p.z - p.d / 2,
    maxZ: p.z + p.d / 2,
  };
}

/** A doorway: its hall, the wall it is in, and its middle along that wall (museum x or z). */
export interface LayoutDoor {
  n: number;
  side: Side;
  u: number;
}

type P = { x: number; z: number };

/**
 * A corridor between hall `a` and the next, `b`: its doorways; its path,
 * the middle of its floor from `a`'s doorway (on its wall's outside face)
 * to its corner and on to `b`'s; and the line across it where the visitor
 * is handed from one hall's scene to the other's: where its corner meets
 * the leg towards the hall standing out, the same line whichever way it is
 * walked.
 */
export interface LayoutCorridor {
  a: number;
  b: number;
  doorA: LayoutDoor;
  doorB: LayoutDoor;
  path: readonly [P, P, P];
  /** Which of the path's two legs runs along the ring's side (its walls looking out and in), the other leaving a hall square to it. */
  along: 0 | 1;
  /** The hand-over's middle, and the way across it towards `b`. */
  handOver: { x: number; z: number; towardB: readonly [number, number] };
}

const UNIT: Record<Side, readonly [number, number]> = {
  east: [1, 0],
  north: [0, -1],
  west: [-1, 0],
  south: [0, 1],
};

/** The side of the ring two neighbours share (the one both are on). */
function sharedSide(a: number, b: number): Side {
  return (Object.keys(SIDES) as Side[]).find(
    (s) => SIDES[s].includes(a) && SIDES[s].includes(b),
  )!;
}

function layCorridors(): LayoutCorridor[] {
  const t = LAYOUT_WALL / 2;
  const half = CORRIDOR.width / 2;
  return HALL_PLACES.map((pa) => {
    const pb = HALL_PLACES[(pa.n + 1) % HALL_PLACES.length];
    const side = sharedSide(pa.n, pb.n);
    const out = UNIT[side];
    const ra = placeRect(pa);
    const rb = placeRect(pb);
    // Which stands out: the one whose outside face is further out.
    const face = (r: ReturnType<typeof placeRect>) =>
      side === 'east'
        ? r.maxX
        : side === 'west'
          ? -r.minX
          : side === 'south'
            ? r.maxZ
            : -r.minZ;
    const [inn, prou] = face(ra) < face(rb) ? [pa, pb] : [pb, pa];
    const ri = placeRect(inn);
    const ro = placeRect(prou);
    // Along the side, from the hall standing in towards the one standing out.
    const along: readonly [number, number] =
      out[0] === 0
        ? [Math.sign(prou.x - inn.x), 0]
        : [0, Math.sign(prou.z - inn.z)];
    // The hall standing in: its doorway in its outside wall, near its end
    // towards the other; on the wall's outside face.
    const innU =
      along[0] !== 0
        ? along[0] > 0
          ? ri.maxX - t - DOOR_FROM_CORNER
          : ri.minX + t + DOOR_FROM_CORNER
        : along[1] > 0
          ? ri.maxZ - t - DOOR_FROM_CORNER
          : ri.minZ + t + DOOR_FROM_CORNER;
    const innFaceLine =
      out[0] > 0
        ? ri.maxX + t
        : out[0] < 0
          ? ri.minX - t
          : out[1] > 0
            ? ri.maxZ + t
            : ri.minZ - t;
    const innDoorP: P =
      out[0] !== 0 ? { x: innFaceLine, z: innU } : { x: innU, z: innFaceLine };
    // Out to the corner's middle, then along into the proud hall's side wall.
    const reach = FIRST_LEG + half;
    const corner: P = {
      x: innDoorP.x + out[0] * reach,
      z: innDoorP.z + out[1] * reach,
    };
    const proudWall: Side =
      along[0] > 0
        ? 'west'
        : along[0] < 0
          ? 'east'
          : along[1] > 0
            ? 'north'
            : 'south';
    const proudFaceLine =
      proudWall === 'west'
        ? ro.minX - t
        : proudWall === 'east'
          ? ro.maxX + t
          : proudWall === 'north'
            ? ro.minZ - t
            : ro.maxZ + t;
    const proudDoorP: P =
      along[0] !== 0
        ? { x: proudFaceLine, z: corner.z }
        : { x: corner.x, z: proudFaceLine };
    const innDoor: LayoutDoor = { n: inn.n, side, u: innU };
    const proudDoor: LayoutDoor = {
      n: prou.n,
      side: proudWall,
      u: along[0] !== 0 ? corner.z : corner.x,
    };
    // The hand-over: the corner's side towards the proud hall.
    const exit = {
      x: corner.x + along[0] * half,
      z: corner.z + along[1] * half,
    };
    const aIsInn = inn.n === pa.n;
    const towardB: readonly [number, number] = aIsInn
      ? along
      : [-along[0] + 0, -along[1] + 0];
    return {
      a: pa.n,
      b: pb.n,
      doorA: aIsInn ? innDoor : proudDoor,
      doorB: aIsInn ? proudDoor : innDoor,
      path: aIsInn
        ? [innDoorP, corner, proudDoorP]
        : [proudDoorP, corner, innDoorP],
      along: aIsInn ? 1 : 0,
      handOver: { ...exit, towardB },
    };
  });
}

export const LAYOUT_CORRIDORS: readonly LayoutCorridor[] = layCorridors();

/** The lengths of an L path's two legs, inside corner to each mouth (the corner's square shared). */
export function innerLegs(path: readonly [P, P, P]) {
  const half = CORRIDOR.width / 2;
  const l = (p: P, q: P) => Math.hypot(q.x - p.x, q.z - p.z);
  return [l(path[0], path[1]) - half, l(path[1], path[2]) - half] as const;
}

/**
 * An L-shaped corridor's walls, as footprints: each side's two runs, met
 * square at the corner (the outside side's runs out to the corner's outer
 * point, the inside side's to its inner one); the mouths open. And its
 * floor, its two legs as rectangles, the corner in the first. In whatever
 * plan the path is given in.
 */
export function corridorShape(path: readonly [P, P, P]) {
  const [a, c, b] = path;
  const unit = (p: P, q: P) => {
    const dx = q.x - p.x;
    const dz = q.z - p.z;
    const L = Math.hypot(dx, dz);
    return [dx / L, dz / L] as const;
  };
  const u1 = unit(a, c);
  const u2 = unit(c, b);
  // Left of each leg's direction (x east, z south: left of +x is −z).
  const n1 = [u1[1], -u1[0]] as const;
  const n2 = [u2[1], -u2[0]] as const;
  const eps = 1e-9;
  const box = (p: P, q: P, thick: number): Footprint => {
    const alongX = Math.abs(p.z - q.z) < eps;
    return {
      minX: Math.min(p.x, q.x) - (alongX ? 0 : thick / 2),
      maxX: Math.max(p.x, q.x) + (alongX ? 0 : thick / 2),
      minZ: Math.min(p.z, q.z) - (alongX ? thick / 2 : 0),
      maxZ: Math.max(p.z, q.z) + (alongX ? thick / 2 : 0),
    };
  };
  const half = CORRIDOR.width / 2;
  const mid = half + CORRIDOR.wall / 2;
  const ext = CORRIDOR.wall / 2;
  const walls: Footprint[] = [];
  for (const s of [1, -1]) {
    const d = s * mid;
    const p0 = { x: a.x + n1[0] * d, z: a.z + n1[1] * d };
    // The corner's point on this side: where the two runs' lines meet.
    const pc = {
      x: c.x + (n1[0] + n2[0]) * d,
      z: c.z + (n1[1] + n2[1]) * d,
    };
    const p1 = { x: b.x + n2[0] * d, z: b.z + n2[1] * d };
    // Each run carried on half a wall past that point, so they meet square.
    walls.push(
      box(p0, { x: pc.x + u1[0] * ext, z: pc.z + u1[1] * ext }, CORRIDOR.wall),
      box({ x: pc.x - u2[0] * ext, z: pc.z - u2[1] * ext }, p1, CORRIDOR.wall),
    );
  }
  const floor = [
    box(a, { x: c.x + u1[0] * half, z: c.z + u1[1] * half }, CORRIDOR.width),
    box({ x: c.x + u2[0] * half, z: c.z + u2[1] * half }, b, CORRIDOR.width),
  ];
  return { walls, floor };
}

/**
 * Every window's sill and head, the halls' and the corridors' alike, m:
 * far above head height (the owner, 2026-10-30: "the windows in the
 * corridors need to be the same height as the windows in the halls.
 * Everything needs to be far above head height"), so nothing beyond them
 * is ever seen, only the sky.
 */
export const WINDOW_SILL = 4.2;
export const WINDOW_HEAD = 7.3;

/** A corridor's windows, as the halls': their width, sill and head, m, and the least pier between and beside them. */
export const CORRIDOR_WINDOW = {
  w: 2.4,
  sill: WINDOW_SILL,
  head: WINDOW_HEAD,
  pier: 1.0,
} as const;

/**
 * A corridor's windows (the owner, 2026-10-30: "windows in the corridors
 * on the sides that face towards the outside or towards the inside, but
 * never on the sides that are ... orthogonal"): along the leg that runs
 * along the ring's side (`along`), in both its walls, one looking out of
 * the building and one into the courtyard, evenly between the corner and
 * the mouth, a pier clear of each. Each: its middle on the wall's inside
 * face, and the way into the corridor from it.
 */
export function corridorWindows(
  path: readonly [P, P, P],
  along: 0 | 1,
): { x: number; z: number; into: readonly [number, number] }[] {
  const [from, to] = along === 0 ? [path[1], path[0]] : [path[1], path[2]];
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const L = Math.hypot(dx, dz);
  const u = [dx / L, dz / L] as const;
  const half = CORRIDOR.width / 2;
  const { w, pier } = CORRIDOR_WINDOW;
  // From the corner's square to the mouth, a pier clear of each end.
  const start = half + pier;
  const room = L - start - pier;
  const n = Math.max(0, Math.floor((room + pier) / (w + pier)));
  if (!n) return [];
  const used = n * w + (n - 1) * pier;
  const out: { x: number; z: number; into: readonly [number, number] }[] = [];
  for (let k = 0; k < n; k++) {
    const s = start + (room - used) / 2 + w / 2 + k * (w + pier);
    for (const side of [1, -1]) {
      const nx = -u[1] * side;
      const nz = u[0] * side;
      out.push({
        x: from.x + u[0] * s + nx * half,
        z: from.z + u[1] * s + nz * half,
        into: [-nx + 0, -nz + 0],
      });
    }
  }
  return out;
}

/** A hall's whole extent, every hall's wall lines. */
export function layoutBounds() {
  const rs = HALL_PLACES.map(placeRect);
  return {
    minX: Math.min(...rs.map((r) => r.minX)),
    maxX: Math.max(...rs.map((r) => r.maxX)),
    minZ: Math.min(...rs.map((r) => r.minZ)),
    maxZ: Math.max(...rs.map((r) => r.maxZ)),
  };
}

/** Between the inside legs of an L of width `w`, no straight line passes through both of its mouths (the owner's rule: no hall seen from another). */
export const blindL = (first: number, second: number, w = CORRIDOR.width) =>
  first * second > w * w;
