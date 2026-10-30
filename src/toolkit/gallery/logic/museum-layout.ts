import { CORRIDOR_WIDTH } from '../../components/architectural/logic/corridor-path';
import type {
  CorridorPiece,
  Heading,
} from '../../components/architectural/logic/corridor-path';

/**
 * The museum's layout C (the owner, 2026-10-30; `doc/temp/README.md`): the
 * ten halls stand apart round a ring, each pair of neighbours joined by an
 * L-shaped corridor of the corridor kit, one turn between two straights,
 * so no hall can be seen from another. Along each side of the ring the
 * halls alternate between standing out and standing in by `STAGGER`; a
 * corridor runs round the outside of the ring, out of the outside wall of
 * the hall that stands in, round its bend, and into the side wall of the
 * hall that stands out, where it stands proud. Every corridor is the same
 * (a left turn the right turn mirrored).
 *
 * Here in the museum's own plan: metres, x east, z south, the origin the
 * middle of the whole; each hall as it stands, its wall lines (the middles
 * of its 0.6 m walls). Halls 3 and 9 stand turned a quarter (`turn`), long
 * north–south. Pure.
 */

/** The halls' walls, centred on their wall lines. */
export const LAYOUT_WALL = 0.6;
/** How far a hall stands out from its neighbours along a side of the ring. */
export const STAGGER = 5;
/** Between neighbouring halls' outside faces. */
export const HALL_GAP = 3;
/** A corridor's first straight, from the outside face of the hall that stands in to its turn. */
export const FIRST_LEG = 1.8;
/** A doorway's middle from the inside corner of its wall. */
export const DOOR_FROM_CORNER = 1.8;

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
  sides: ('north' | 'east' | 'south' | 'west')[];
}

type Side = 'north' | 'east' | 'south' | 'west';

/**
 * Each hall's size in its own frame (along x, along z), as the exhibits
 * were built (mission 107), and how it stands: Halls 3 and 9, 24 m long,
 * stand turned three quarters, their own +x running south.
 */
const OWN: readonly { w: number; d: number; turn: 0 | 3 }[] = [
  { w: 16, d: 14, turn: 0 },
  { w: 16, d: 21, turn: 0 },
  // Hall 2 grown 3 m south and east, so its doorways, near its outside
  // walls' ends, stand clear of its plant's L (`museum-2-layout.ts`); and
  // Hall 7, opposite, the same, so the ring still closes.
  { w: 19, d: 17, turn: 0 },
  { w: 24, d: 14, turn: 3 },
  { w: 16, d: 14, turn: 0 },
  { w: 16, d: 14, turn: 0 },
  { w: 16, d: 21, turn: 0 },
  { w: 19, d: 17, turn: 0 },
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

/**
 * A corridor between hall `a` and the next, `b`: its doorways, the kit's
 * pieces laid from `a`'s doorway (out of its wall's outside face) to `b`'s,
 * and the line across it, at its turn, where the visitor is handed from
 * one hall's scene to the other's.
 */
export interface LayoutCorridor {
  a: number;
  b: number;
  doorA: LayoutDoor;
  doorB: LayoutDoor;
  /** Laid from `a`'s outside face: where it starts and its heading. */
  start: { x: number; z: number; heading: Heading };
  pieces: CorridorPiece[];
  /** The hand-over: the middle of the line across the corridor where its turn leads into the straight towards `b`, and that straight's direction. */
  handOver: { x: number; z: number; towardB: readonly [number, number] };
}

const HEADING_OF: Record<Side, Heading> = {
  east: 0,
  north: 1,
  west: 2,
  south: 3,
};
const UNIT: Record<Side, readonly [number, number]> = {
  east: [1, 0],
  north: [0, -1],
  west: [-1, 0],
  south: [0, 1],
};
const OPPOSITE: Record<Side, Side> = {
  east: 'west',
  west: 'east',
  north: 'south',
  south: 'north',
};

/** The side of the ring two neighbours share (the one both are on). */
function sharedSide(a: number, b: number): Side {
  return (Object.keys(SIDES) as Side[]).find(
    (s) => SIDES[s].includes(a) && SIDES[s].includes(b),
  )!;
}

function layCorridors(): LayoutCorridor[] {
  const t = LAYOUT_WALL / 2;
  const half = CORRIDOR_WIDTH / 2;
  return HALL_PLACES.map((pa) => {
    const pb = HALL_PLACES[(pa.n + 1) % HALL_PLACES.length];
    const side = sharedSide(pa.n, pb.n);
    const out = UNIT[side];
    // Which stands out: the one whose outside face is further out.
    const ra = placeRect(pa);
    const rb = placeRect(pb);
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
    // towards the other.
    const innFace = {
      x: out[0] > 0 ? ri.maxX + t : out[0] < 0 ? ri.minX - t : 0,
      z: out[1] > 0 ? ri.maxZ + t : out[1] < 0 ? ri.minZ - t : 0,
    };
    const innU =
      along[0] !== 0
        ? along[0] > 0
          ? ri.maxX - t - DOOR_FROM_CORNER
          : ri.minX + t + DOOR_FROM_CORNER
        : along[1] > 0
          ? ri.maxZ - t - DOOR_FROM_CORNER
          : ri.minZ + t + DOOR_FROM_CORNER;
    // Out to the turn's middle, then along into the proud hall's side wall.
    const reach = FIRST_LEG + half;
    const corner =
      out[0] !== 0
        ? { x: innFace.x + out[0] * reach, z: innU }
        : { x: innU, z: innFace.z + out[1] * reach };
    const proudWall: Side =
      along[0] > 0
        ? 'west'
        : along[0] < 0
          ? 'east'
          : along[1] > 0
            ? 'north'
            : 'south';
    const proudFace =
      proudWall === 'west'
        ? ro.minX - t
        : proudWall === 'east'
          ? ro.maxX + t
          : proudWall === 'north'
            ? ro.minZ - t
            : ro.maxZ + t;
    const second =
      out[0] !== 0
        ? Math.abs(proudFace - corner.z) - half
        : Math.abs(proudFace - corner.x) - half;
    const innDoor: LayoutDoor = { n: inn.n, side, u: innU };
    const proudDoor: LayoutDoor = {
      n: prou.n,
      side: proudWall,
      u: out[0] !== 0 ? corner.x : corner.z,
    };
    const alongSide: Side =
      along[0] > 0
        ? 'east'
        : along[0] < 0
          ? 'west'
          : along[1] > 0
            ? 'south'
            : 'north';
    // From the hall standing in: out, turn along, into the proud hall.
    const outHeading = HEADING_OF[side];
    const alongHeading = HEADING_OF[alongSide];
    const left = (outHeading + 1) % 4 === alongHeading;
    const fromInn = {
      start:
        out[0] !== 0
          ? { x: innFace.x, z: innU, heading: outHeading }
          : { x: innU, z: innFace.z, heading: outHeading },
      pieces: [
        { kind: 'straight', length: FIRST_LEG },
        { kind: left ? 'left' : 'right' },
        { kind: 'straight', length: second },
      ] as CorridorPiece[],
    };
    // The turn's exit towards the proud hall, and back towards the other.
    const towardProud = UNIT[alongSide];
    const exit = {
      x: corner.x + towardProud[0] * half,
      z: corner.z + towardProud[1] * half,
    };
    const aIsInn = inn.n === pa.n;
    const laid = aIsInn
      ? fromInn
      : {
          start: {
            x:
              proudFace * Math.abs(towardProud[0]) +
              corner.x * (1 - Math.abs(towardProud[0])),
            z:
              proudFace * Math.abs(towardProud[1]) +
              corner.z * (1 - Math.abs(towardProud[1])),
            heading: HEADING_OF[OPPOSITE[alongSide]],
          },
          pieces: [
            { kind: 'straight', length: second },
            { kind: left ? 'right' : 'left' },
            { kind: 'straight', length: FIRST_LEG },
          ] as CorridorPiece[],
        };
    // The hand-over: where the turn meets the long straight, towards b.
    const towardB = aIsInn
      ? towardProud
      : ([-towardProud[0], -towardProud[1]] as const);
    // The same line whichever way the corridor is laid.
    const handOver = { ...exit, towardB };
    return {
      a: pa.n,
      b: pb.n,
      doorA: aIsInn ? innDoor : proudDoor,
      doorB: aIsInn ? proudDoor : innDoor,
      start: laid.start,
      pieces: laid.pieces,
      handOver,
    };
  });
}

export const LAYOUT_CORRIDORS: readonly LayoutCorridor[] = layCorridors();

/** The corridors at hall `n`: the one from the hall before, and the one on. */
export function corridorsAt(n: number) {
  const k = LAYOUT_CORRIDORS.length;
  return {
    back: LAYOUT_CORRIDORS[(n - 1 + k) % k],
    on: LAYOUT_CORRIDORS[n],
  };
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
export const blindL = (first: number, second: number, w = CORRIDOR_WIDTH) =>
  first * second > w * w;

/** Which sides of a hall face out of the ring (its street walls) as it stands. */
export function outsideSides(n: number): Side[] {
  return HALL_PLACES[n].sides;
}

/** Which sides of a hall face into the ring. */
export function insideSides(n: number): Side[] {
  return HALL_PLACES[n].sides.map((s) => OPPOSITE[s]);
}
