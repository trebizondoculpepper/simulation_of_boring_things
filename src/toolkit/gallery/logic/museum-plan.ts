import type { Footprint } from '../../controls/logic/walk-collision';
import { MUSEUM_EXHIBITION } from './museum-brand';

/**
 * The pool science museum (mission 107; the owner, 2026-10-28): a ring of
 * ten halls in a converted warehouse round a courtyard, each hall its
 * own room and scene, joined by open archways knocked through the old
 * brick walls, with no doors. Walking through an archway hands the visitor
 * into the next hall's scene (`door-joins.ts`, `handOver` in
 * `src/main.ts`), as the pool loop's corridors do.
 *
 * The plan (mission 107-1, the owner's layout, 2026-10-28: "the 4x3 room
 * layout, 4 rooms on the long side, 3 on the short", Hall 0 in a corner),
 * north up (x east, z south): four rooms east–west by three north–south,
 * a ring of ten round a courtyard two rooms wide and one deep, the
 * corners counted once:
 *
 * ```
 *   +------+------+------+------+
 *   |  2 ->|  3 ->|  4 ->|  5   |
 *   |  ^   |      |      |  v   |
 *   +------+------+------+------+
 *   |  1   |  courtyard  |  6   |
 *   |  ^   |  (sky only) |  v   |
 *   +------+------+------+------+
 *   |  0   |<- 9  |<- 8  |<- 7  |
 *   |welcome      |      |      |
 *   +------+------+------+------+
 *                street
 * ```
 *
 * Hall 0, the welcome, is in the south-west corner: the visit runs north
 * into Hall 1, Hall 2 the north-west corner, east through Halls 3 and 4,
 * Hall 5 the north-east corner, south to Hall 6, Hall 7 the south-east
 * corner, and west through Halls 8 and 9, back into Hall 0. A side hall's
 * archways are in line, at both its ends; a corner hall's on two adjacent
 * walls, the route turning 90° in it.
 *
 * No hall is turned: each hall's own coordinates are the museum's, moved
 * to the hall's middle (`hallOrigin`), so a heading carries unchanged
 * through every archway, the corners too, and the floor's joints and the
 * walls' brick, laid in the museum's coordinates, line up round every
 * turn. Each wall line carries one brick wall `MUSEUM_WALL` thick,
 * centred on it; both halls at an archway build that wall from the same
 * function and the same coordinates, so nothing changes at the hand-over
 * (the perspective-jump fix, `8656cf1`). The sizes are constants
 * (`MUSEUM_SQUARE`), provisional: the owner will resize them. Halls are
 * found by their number (`hallId`, `hallNumber`), never by coordinates.
 * Pure; metres; y up from the floor.
 */

export type MuseumHallId =
  | 'museum0'
  | 'museum1'
  | 'museum2'
  | 'museum3'
  | 'museum4'
  | 'museum5'
  | 'museum6'
  | 'museum7'
  | 'museum8'
  | 'museum9';

/** Every room of the museum, in the visitor's order round the ring: Hall 0, the welcome, where every visit starts and ends, then the nine exhibit halls. */
export const MUSEUM_HALLS: readonly MuseumHallId[] = [
  'museum0',
  'museum1',
  'museum2',
  'museum3',
  'museum4',
  'museum5',
  'museum6',
  'museum7',
  'museum8',
  'museum9',
];

/** The nine exhibit halls, in the visitor's order: the route returns from the last into Hall 0. */
export const MUSEUM_EXHIBITS: readonly MuseumHallId[] = MUSEUM_HALLS.slice(1);

/** The halls round the ring. */
export const RING_SIZE = MUSEUM_HALLS.length;

/** The finale, the last hall before the welcome (the owner, 2026-10-28: "the whole plant"). */
export const FINALE: MuseumHallId = 'museum9';

/** A hall's number, as signed (Hall 0 to Hall 9). */
export function hallNumber(id: MuseumHallId): number {
  return MUSEUM_HALLS.indexOf(id);
}

/** The hall signed with this number (round the ring, so 10 is Hall 0 again). */
export function hallId(n: number): MuseumHallId {
  return MUSEUM_HALLS[((n % RING_SIZE) + RING_SIZE) % RING_SIZE];
}

/**
 * The building, provisional (the owner, 2026-10-28: "we can resize them
 * later"; question 8 in 107): a grid of rooms `cols` east–west by `rows`
 * north–south, each column `colW[c]` along x and each row `rowD[r]` along
 * z between its wall lines (Hall 0 keeps stage 1's 16 × 14 m), and the
 * height to the roof deck's underside. Non-uniform (the owner, 2026-10-28:
 * "make one room on each side 50% bigger"): column 1 (Halls 3 and 9, the
 * finale) is 24 m wide and the middle row (Halls 1 and 6) 21 m deep.
 */
export const MUSEUM_SQUARE = {
  cols: 4,
  rows: 3,
  colW: [16, 24, 16, 16],
  rowD: [14, 21, 14],
  h: 9.5,
} as const;

/** Hall 0's tiled ceiling: as high as every other hall's (the owner, 2026-10-28: "The rooms on both sides should be the same height"). */
export const MUSEUM_HALL0 = { h: MUSEUM_SQUARE.h } as const;

/** The doorways into Hall 0: square-headed, tiled room to brick. */
export const MUSEUM_DOOR = { w: 2.4, h: 3.0 } as const;

/** The old brick walls: their thickness, centred on each wall line. */
export const MUSEUM_WALL = 0.6;

/** An archway knocked through: its clear width, its springing (where the round head starts), its rise. */
export const MUSEUM_ARCH = { w: 3.6, spring: 3.4, rise: 1.8 } as const;
export const ARCH_CROWN = MUSEUM_ARCH.spring + MUSEUM_ARCH.rise;

/** A rectangle in plan. */
export interface Rect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);
const HALF_W = sum(MUSEUM_SQUARE.colW) / 2;
const HALF_D = sum(MUSEUM_SQUARE.rowD) / 2;
/** The wall lines' x (west to east) and z (north to south). */
const X_LINES = MUSEUM_SQUARE.colW.map(
  (_, c) => -HALF_W + sum(MUSEUM_SQUARE.colW.slice(0, c)),
);
const Z_LINES = MUSEUM_SQUARE.rowD.map(
  (_, r) => -HALF_D + sum(MUSEUM_SQUARE.rowD.slice(0, r)),
);

/** Each hall's cell, column (0 west) and row (0 north), in the visitor's order round the ring. */
const CELLS: readonly (readonly [number, number])[] = [
  [0, 2],
  [0, 1],
  [0, 0],
  [1, 0],
  [2, 0],
  [3, 0],
  [3, 1],
  [3, 2],
  [2, 2],
  [1, 2],
];

const cellRect = (c: number, r: number): Rect => ({
  minX: X_LINES[c],
  maxX: X_LINES[c] + MUSEUM_SQUARE.colW[c],
  minZ: Z_LINES[r],
  maxZ: Z_LINES[r] + MUSEUM_SQUARE.rowD[r],
});

/** Each hall's wall lines (the middles of its walls), in the museum's plan. */
const BOUNDS = Object.fromEntries(
  MUSEUM_HALLS.map((id, n) => [id, cellRect(...CELLS[n])]),
) as Record<MuseumHallId, Rect>;

/** The courtyard's wall lines. */
export const COURTYARD: Rect = {
  minX: -HALF_W + MUSEUM_SQUARE.colW[0],
  maxX: HALF_W - MUSEUM_SQUARE.colW[MUSEUM_SQUARE.cols - 1],
  minZ: -HALF_D + MUSEUM_SQUARE.rowD[0],
  maxZ: HALF_D - MUSEUM_SQUARE.rowD[MUSEUM_SQUARE.rows - 1],
};
/** The whole building's outer wall lines. */
export const BUILDING: Rect = {
  minX: -HALF_W,
  maxX: HALF_W,
  minZ: -HALF_D,
  maxZ: HALF_D,
};

export type Heading = 'north' | 'east' | 'south' | 'west';
const UNIT: Record<Heading, readonly [number, number]> = {
  north: [0, -1],
  east: [1, 0],
  south: [0, 1],
  west: [-1, 0],
};
const headingOf = (dx: number, dz: number): Heading =>
  Math.abs(dx) > Math.abs(dz)
    ? dx > 0
      ? 'east'
      : 'west'
    : dz > 0
      ? 'south'
      : 'north';

/**
 * Which way the route runs through each hall: the way it leaves, towards
 * the next hall (so a corner hall's runs along its way out, Hall 4's east).
 */
export const HALL_HEADING = Object.fromEntries(
  MUSEUM_HALLS.map((id, n) => {
    const [c, r] = CELLS[n];
    const [c2, r2] = CELLS[(n + 1) % RING_SIZE];
    return [id, headingOf(c2 - c, r2 - r)];
  }),
) as Record<MuseumHallId, Heading>;

/** A hall's shape on the ring: the welcome, a side hall (archways in line), or a corner (the route turns 90°). */
export type HallKind = 'welcome' | 'side' | 'corner';
export function hallKind(id: MuseumHallId): HallKind {
  if (id === 'museum0') return 'welcome';
  const n = hallNumber(id);
  const [c0, r0] = CELLS[(n + RING_SIZE - 1) % RING_SIZE];
  const [c2, r2] = CELLS[(n + 1) % RING_SIZE];
  return c0 === c2 || r0 === r2 ? 'side' : 'corner';
}

export function hallBounds(id: MuseumHallId): Rect {
  return BOUNDS[id];
}

/** Inside a hall's walls, in the museum's plan. */
export function hallInterior(id: MuseumHallId): Rect {
  const b = BOUNDS[id];
  const t = MUSEUM_WALL / 2;
  return {
    minX: b.minX + t,
    maxX: b.maxX - t,
    minZ: b.minZ + t,
    maxZ: b.maxZ - t,
  };
}

/** A hall's middle in the museum's plan: its own coordinates' origin. */
export function hallOrigin(id: MuseumHallId): { x: number; z: number } {
  const b = BOUNDS[id];
  return { x: (b.minX + b.maxX) / 2, z: (b.minZ + b.maxZ) / 2 };
}

/** A hall's inside size: width along x, depth along z, height. */
export function hallSize(id: MuseumHallId) {
  const r = hallInterior(id);
  return {
    w: r.maxX - r.minX,
    d: r.maxZ - r.minZ,
    h: id === 'museum0' ? MUSEUM_HALL0.h : MUSEUM_SQUARE.h,
  };
}

/** A hall's point, from its own coordinates to the museum's. */
export function toMuseum(id: MuseumHallId, x: number, z: number) {
  const o = hallOrigin(id);
  return { x: x + o.x, z: z + o.z };
}

/** The hall's axes: along its route, and across it towards the courtyard. */
export function hallAxes(id: MuseumHallId) {
  const [ax, az] = UNIT[HALL_HEADING[id]];
  const o = hallOrigin(id);
  // Across: the perpendicular that points at the courtyard's middle.
  let cx = -az;
  let cz = ax;
  if (cx * -o.x + cz * -o.z < 0) {
    cx = -cx;
    cz = -cz;
  }
  const { w, d } = hallSize(id);
  const length = Math.abs(ax) ? w : d;
  const width = Math.abs(ax) ? d : w;
  return { along: [ax, az] as const, across: [cx, cz] as const, length, width };
}

/** A point in a hall's own coordinates from its distances along the route and across towards the courtyard. */
export function hallPoint(id: MuseumHallId, along: number, across: number) {
  const { along: a, across: c } = hallAxes(id);
  return { x: a[0] * along + c[0] * across, z: a[1] * along + c[1] * across };
}

/** What each hall will be, and what its signs say while it is empty. */
export interface HallBrief {
  id: MuseumHallId;
  number: number;
  /** Its title, as signed: "Warm water". */
  title: string;
  /** What it is about, in a few words. */
  subject: string;
  /** Whether the owner has given it a theme yet (Halls 5 to 8 wait for theirs). */
  themed: boolean;
  /** The one big idea. */
  bigIdea: string;
  /** What the exhibit will show. */
  willShow: string;
  /** What visitors will be able to try. */
  tryIt: readonly string[];
}

/** A hall still waiting for its theme (the owner, 2026-10-28: Halls 5 to 8). */
const waiting = (n: number): HallBrief => ({
  id: hallId(n),
  number: n,
  title: 'Coming soon',
  subject: 'Its theme is still to be chosen',
  themed: false,
  bigIdea:
    'Every hall of the museum teaches one idea about how a swimming pool works.',
  willShow:
    'This hall is waiting for its exhibit. Its theme is still being chosen: carry on round the ring to the next hall.',
  tryIt: [
    'Carry on round the ring: the route goes on through the next archway.',
  ],
});

export const HALL_BRIEFS: Record<MuseumHallId, HallBrief> = {
  museum0: {
    id: 'museum0',
    number: 0,
    title: 'Welcome',
    subject: 'Behind the tiles',
    themed: true,
    bigIdea:
      'The simplest thing in the world, diving in, takes a world of engineering to make.',
    willShow:
      'Nothing we take for granted more than a swimming pool: its user interface is the simplest there could be. Dive in, and the water is simply there, clean, clear and warm. Behind the tiles lives a world of pumps, filters, boilers and chemistry, working all day and all night so that it stays that simple.',
    tryIt: [
      'Look for the water in this room. (There is none: it is paint.)',
      'Follow the arrows north through the doorway and find out what is behind the tiles.',
    ],
  },
  museum1: {
    id: 'museum1',
    number: 1,
    title: 'Warm water',
    subject: 'Heating, energy and a first pump',
    themed: true,
    bigIdea:
      'To warm a pool we must move its water: a pump carries it through a heat exchanger, where a boiler’s heat passes into it without the two waters ever mixing.',
    willShow:
      'A real gas boiler and a heat exchanger connected to an ideal pool, with one pump to move the water, and the thermometers that show the heat going in.',
    tryIt: [
      'Turn the heating on and watch the pool warm, a fraction of a degree at a time.',
      'Stop the pump and see the heat stop reaching the pool.',
      'Change the setpoint and watch the boiler answer.',
    ],
  },
  museum2: {
    id: 'museum2',
    number: 2,
    title: 'Clean water',
    subject: 'Filtration and backwash',
    themed: true,
    bigIdea:
      'A bed of sand catches the dirt the swimmers bring in, and once it is full we wash it out by running the water backwards.',
    willShow:
      'The ideal pool plant from the development rooms (dev51) will be installed here: a sand filter, its pressure gauges, the five valves that turn it round, and a sight glass to watch the dirt come out.',
    tryIt: [
      'Watch the gauges across the filter creep apart as the sand fills with dirt.',
      'Set the five valves for a backwash and watch the sight glass run brown, then clear.',
      'Rinse the bed and put the filter back to work.',
    ],
  },
  museum3: {
    id: 'museum3',
    number: 3,
    title: 'Safe water',
    subject: 'Automatic disinfection',
    themed: true,
    bigIdea:
      'Chlorine keeps the water safe, but swimmers use it up: a controller measures it all day long and doses just enough, at the right pH.',
    willShow:
      'A pool with its chemistry: free and combined chlorine, pH, the pollution swimmers bring, and a dosing controller with its sample cell and metering pumps.',
    tryIt: [
      'Send in a crowd of swimmers and watch the chlorine fall and the dosing pumps answer.',
      'Change the controller’s setpoints and see the water follow.',
      'Read the controller and the gauges, and say whether the water is safe.',
    ],
  },
  museum4: {
    id: 'museum4',
    number: 4,
    title: 'The chemistry of pools',
    subject: 'A hands-on chemistry lab',
    themed: true,
    bigIdea:
      'Every chemical added to a pool changes its water: the art is in the balance.',
    willShow:
      'A set of ideal tanks, a dosing station with buttons to add chemicals of your choice, and a readout in a simulated swimming pool of the chemistry your choices produced.',
    tryIt: [
      'Add chemicals with the dosing station’s buttons and read what they did to the pool.',
      'Make the water safe, clear and comfortable, then try to upset it.',
      'Reset it at the end and try again.',
    ],
  },
  museum5: waiting(5),
  museum6: waiting(6),
  museum7: waiting(7),
  museum8: waiting(8),
  museum9: {
    id: 'museum9',
    number: 9,
    title: 'The whole plant',
    subject: 'Control and fault finding',
    themed: true,
    bigIdea:
      'Every part you have met works together, and when something goes wrong the plant tells you: if you know how to listen.',
    willShow:
      'A working model of an entire swimming pool, all of its major components put together, with a mimic of the whole system, an alarm panel and its alarms.',
    tryIt: [
      'Press the fault button to cause a random fault somewhere in the plant.',
      'Read the alarms and the mimic, and track down what has gone wrong.',
      'Put it right, reset the alarms, and try another.',
    ],
  },
};

/** The hall's name on the dev panel and in the room readout. */
export function hallName(id: MuseumHallId) {
  const b = HALL_BRIEFS[id];
  return `${id.toUpperCase()} · ${MUSEUM_EXHIBITION.name.toUpperCase()} · ${b.number} ${b.title.toUpperCase()}`;
}

/**
 * The museum's doorways, each from one room on the route to the next,
 * round the ring: from the welcome into Hall 1, on round to Hall 9, and
 * from Hall 9 back into the welcome, so the visit ends where it began,
 * by the way out.
 */
export const MUSEUM_JOINS: readonly (readonly [MuseumHallId, MuseumHallId])[] =
  MUSEUM_HALLS.map((id, n) => [id, hallId(n + 1)] as const);

/** The room after this one on the route (Hall 9's is the welcome, closing the ring), and the one before (the welcome's is Hall 13). */
export function nextHall(id: MuseumHallId): MuseumHallId {
  return hallId(hallNumber(id) + 1);
}
export function previousHall(id: MuseumHallId): MuseumHallId {
  return hallId(hallNumber(id) - 1);
}

export function isMuseumHall(id: string): id is MuseumHallId {
  return (MUSEUM_HALLS as readonly string[]).includes(id);
}

/** A wall line between two rectangles that share an edge: its axis, its line, and the stretch they share. */
function sharedEdge(a: Rect, b: Rect) {
  const eps = 1e-9;
  const zs = [Math.max(a.minZ, b.minZ), Math.min(a.maxZ, b.maxZ)] as const;
  const xs = [Math.max(a.minX, b.minX), Math.min(a.maxX, b.maxX)] as const;
  if (Math.abs(a.maxX - b.minX) < eps && zs[1] > zs[0])
    return { axis: 'z' as const, line: a.maxX, from: zs[0], to: zs[1] };
  if (Math.abs(a.minX - b.maxX) < eps && zs[1] > zs[0])
    return { axis: 'z' as const, line: a.minX, from: zs[0], to: zs[1] };
  if (Math.abs(a.maxZ - b.minZ) < eps && xs[1] > xs[0])
    return { axis: 'x' as const, line: a.maxZ, from: xs[0], to: xs[1] };
  if (Math.abs(a.minZ - b.maxZ) < eps && xs[1] > xs[0])
    return { axis: 'x' as const, line: a.minZ, from: xs[0], to: xs[1] };
  return null;
}

/** One of a hall's archways: the hall beyond, and where it is. */
export interface MuseumArch {
  to: MuseumHallId;
  /** Whether it is the way on along the route (else the way back). */
  onward: boolean;
  /** A round-headed archway knocked through, or Hall 0's square-headed doorway. */
  kind: 'arch' | 'door';
  /** Its clear width and its height to the crown (or head). */
  w: number;
  top: number;
  /** Its wall runs along x or along z. */
  axis: 'x' | 'z';
  /** Its middle, in the museum's plan, on the wall line. */
  at: { x: number; z: number };
  /** Into this hall: a unit vector. */
  into: readonly [number, number];
  /** As `door-joins.ts` has it, in the hall's own coordinates: its middle on the wall line, +z into this hall. */
  frame: { x: number; z: number; yaw: number };
}

/** A hall's archways, each in the middle of the wall it shares with the room beyond: on along the route first, then back. */
export function hallArches(id: MuseumHallId): MuseumArch[] {
  const o = hallOrigin(id);
  const mine = BOUNDS[id];
  const ways = [
    ...MUSEUM_JOINS.filter(([a]) => a === id).map(([, b]) => ({
      to: b,
      onward: true,
    })),
    ...MUSEUM_JOINS.filter(([, b]) => b === id).map(([a]) => ({
      to: a,
      onward: false,
    })),
  ];
  return ways.map(({ to, onward }) => {
    const door = id === 'museum0' || to === 'museum0';
    const e = sharedEdge(mine, BOUNDS[to]);
    if (!e) throw new Error(`${id} and ${to} share no wall`);
    const mid = (e.from + e.to) / 2;
    const at = e.axis === 'z' ? { x: e.line, z: mid } : { x: mid, z: e.line };
    const into: readonly [number, number] =
      e.axis === 'z'
        ? [Math.sign(o.x - e.line), 0]
        : [0, Math.sign(o.z - e.line)];
    return {
      to,
      onward,
      kind: door ? ('door' as const) : ('arch' as const),
      w: door ? MUSEUM_DOOR.w : MUSEUM_ARCH.w,
      top: door ? MUSEUM_DOOR.h : ARCH_CROWN,
      axis: e.axis,
      at,
      into,
      frame: {
        x: at.x - o.x,
        z: at.z - o.z,
        yaw: Math.atan2(into[0], into[1]),
      },
    };
  });
}

/** What lies beyond a stretch of a hall's wall. */
export type Beyond = 'street' | 'courtyard' | 'hall';

const inside = (r: Rect, x: number, z: number) =>
  x > r.minX && x < r.maxX && z > r.minZ && z < r.maxZ;

/** One of a hall's four walls, in the museum's plan. */
export interface HallWall {
  side: Heading;
  axis: 'x' | 'z';
  line: number;
  /** The wall line's ends (the hall's corners). */
  from: number;
  to: number;
  /** Out of the hall. */
  out: readonly [number, number];
}

export function hallWalls(id: MuseumHallId): HallWall[] {
  const b = BOUNDS[id];
  return [
    {
      side: 'north',
      axis: 'x',
      line: b.minZ,
      from: b.minX,
      to: b.maxX,
      out: [0, -1],
    },
    {
      side: 'south',
      axis: 'x',
      line: b.maxZ,
      from: b.minX,
      to: b.maxX,
      out: [0, 1],
    },
    {
      side: 'west',
      axis: 'z',
      line: b.minX,
      from: b.minZ,
      to: b.maxZ,
      out: [-1, 0],
    },
    {
      side: 'east',
      axis: 'z',
      line: b.maxX,
      from: b.minZ,
      to: b.maxZ,
      out: [1, 0],
    },
  ];
}

/** What is beyond a wall at a point along it. */
export function beyondAt(wall: HallWall, u: number): Beyond {
  const x = wall.axis === 'x' ? u : wall.line + wall.out[0];
  const z = wall.axis === 'x' ? wall.line + wall.out[1] : u;
  if (MUSEUM_HALLS.some((h) => inside(BOUNDS[h], x, z))) return 'hall';
  if (inside(COURTYARD, x, z)) return 'courtyard';
  if (!inside(BUILDING, x, z)) return 'street';
  return 'hall';
}

/** A window: its middle along its wall (in the museum's coordinate along it), its width, sill and head; obscured on the street, clear on the courtyard. */
export interface MuseumWindow {
  u: number;
  w: number;
  sill: number;
  head: number;
  kind: 'street' | 'courtyard';
}

export const WINDOW = {
  w: 2.4,
  every: 4,
  streetSill: 3.2,
  courtSill: 2.6,
  headBelowDeck: 2.2,
} as const;

/** A hall's title on its street wall, as gallery vinyl: kept clear of windows. */
export const HALL_TITLE = { w: 6.0, h: 2.0, y: 3.6 } as const;

/**
 * A wall's tall factory windows. Onto the courtyard: clear glass, high
 * (clerestories, showing only the sky), on a 4 m grid from the museum's origin, never within a
 * pier's width of the wall's ends. Onto the street: obscured glass, high,
 * one either side of the wall's middle (kept for the hall's title), as
 * near the ends as the piers allow; none on Hall 9's street wall, kept
 * whole for the finale's closing words. None where another hall is
 * beyond, and none in Hall 0, tiled all round. The same for a wall
 * whichever hall's scene builds it (the courtyard's far walls and the
 * empty halls are built from it in every hall's scene).
 */
export function wallWindows(id: MuseumHallId, wall: HallWall): MuseumWindow[] {
  const out: MuseumWindow[] = [];
  if (id === 'museum0') return out;
  const half = WINDOW.w / 2;
  const lo = wall.from + MUSEUM_WALL / 2 + 0.8;
  const hi = wall.to - MUSEUM_WALL / 2 - 0.8;
  const mid = (wall.from + wall.to) / 2;
  const head = MUSEUM_SQUARE.h - WINDOW.headBelowDeck;
  const kindAt = (u: number) => {
    const kinds = [u - half, u, u + half].map((p) => beyondAt(wall, p));
    return kinds.every((b) => b === kinds[0]) ? kinds[0] : 'hall';
  };
  if (beyondAt(wall, mid) === 'street') {
    if (id === FINALE) return out;
    for (const s of [-1, 1]) {
      const u = mid + s * (hi - mid - half - 0.3);
      if (Math.abs(u - mid) - half < HALL_TITLE.w / 2 + 0.15) continue;
      if (kindAt(u) !== 'street') continue;
      out.push({
        u,
        w: WINDOW.w,
        sill: WINDOW.streetSill,
        head,
        kind: 'street',
      });
    }
    return out;
  }
  for (let k = Math.ceil((lo + half - 2) / WINDOW.every); ; k++) {
    const u = k * WINDOW.every + 2;
    if (u + half > hi) break;
    if (u - half < lo) continue;
    if (kindAt(u) !== 'courtyard') continue;
    out.push({
      u,
      w: WINDOW.w,
      sill: WINDOW.courtSill,
      head,
      kind: 'courtyard',
    });
  }
  return out;
}

/** A hall's street wall, if it has one: where its title (or the exhibition's) goes. */
export function streetWall(id: MuseumHallId): HallWall | null {
  return (
    hallWalls(id).find((w) => beyondAt(w, (w.from + w.to) / 2) === 'street') ??
    null
  );
}

/**
 * The hall's walls in plan, for walking, in its own coordinates: each of
 * its four walls, open at its archways; and, at each archway whose hall
 * beyond is not being seen through it, a stop at the wall's middle line,
 * so the visitor waits there until it is (and is handed over as soon as
 * it is crossed). Then its columns, benches and panel.
 */
export function hallSolids(
  id: MuseumHallId,
  seen: Partial<Record<MuseumHallId, boolean>> = {},
): Footprint[] {
  const o = hallOrigin(id);
  const t = MUSEUM_WALL / 2;
  const out: Footprint[] = [];
  const arches = hallArches(id);
  const box = (
    axis: 'x' | 'z',
    line: number,
    a: number,
    b: number,
    n0: number,
    n1: number,
  ): Footprint =>
    axis === 'x'
      ? {
          minX: a - o.x,
          maxX: b - o.x,
          minZ: line + n0 - o.z,
          maxZ: line + n1 - o.z,
        }
      : {
          minX: line + n0 - o.x,
          maxX: line + n1 - o.x,
          minZ: a - o.z,
          maxZ: b - o.z,
        };
  for (const wall of hallWalls(id)) {
    const cuts = arches
      .filter(
        (a) =>
          a.axis === wall.axis &&
          (wall.axis === 'x' ? a.at.z : a.at.x) === wall.line,
      )
      .map((a) => ({ arch: a, u: wall.axis === 'x' ? a.at.x : a.at.z }))
      .sort((p, q) => p.u - q.u);
    let start = wall.from - t;
    for (const c of cuts) {
      const half = c.arch.w / 2;
      out.push(box(wall.axis, wall.line, start, c.u - half, -t, t));
      start = c.u + half;
      if (!seen[c.arch.to]) {
        // The stop: the far half of the wall's thickness, beyond its middle.
        const away = wall.axis === 'x' ? -c.arch.into[1] : -c.arch.into[0];
        out.push(
          box(
            wall.axis,
            wall.line,
            c.u - half,
            c.u + half,
            away < 0 ? -0.4 : 0,
            away < 0 ? 0 : 0.4,
          ),
        );
      }
    }
    out.push(box(wall.axis, wall.line, start, wall.to + t, -t, t));
  }
  for (const c of hallColumns(id))
    out.push({
      minX: c.x - COLUMN_FOOT,
      maxX: c.x + COLUMN_FOOT,
      minZ: c.z - COLUMN_FOOT,
      maxZ: c.z + COLUMN_FOOT,
    });
  for (const b of hallBenches(id)) {
    const along = Math.abs(hallAxes(id).along[0]) ? 'x' : 'z';
    const hw = BENCH.w / 2;
    const hl = BENCH.l / 2;
    out.push(
      along === 'x'
        ? { minX: b.x - hl, maxX: b.x + hl, minZ: b.z - hw, maxZ: b.z + hw }
        : { minX: b.x - hw, maxX: b.x + hw, minZ: b.z - hl, maxZ: b.z + hl },
    );
  }
  if (id === 'museum0') {
    const l = hall0Ladder();
    out.push({
      minX: l.x - 0.4,
      maxX: l.x + 0.4,
      minZ: l.z - 0.15,
      maxZ: l.z + 0.75,
    });
  }
  const p = comingSoonPanel(id);
  if (!p) return out;
  const across = Math.abs(Math.sin(p.yaw)) > 0.5;
  const pw = PANEL.w / 2 + 0.1;
  out.push(
    across
      ? { minX: p.x - 0.35, maxX: p.x + 0.35, minZ: p.z - pw, maxZ: p.z + pw }
      : { minX: p.x - pw, maxX: p.x + pw, minZ: p.z - 0.35, maxZ: p.z + 0.35 },
  );
  return out;
}

/** Half a cast-iron column's base, for walking round it. */
export const COLUMN_FOOT = 0.22;

/** An archway's distance along its hall's route, from the hall's middle. */
function archAlong(id: MuseumHallId, a: MuseumArch) {
  const { along } = hallAxes(id);
  return a.frame.x * along[0] + a.frame.z * along[1];
}

/**
 * The warehouse's cast-iron columns, in two rows along the hall under its
 * two steel beams, a quarter of its width either side of its middle,
 * every 6 m, kept 3 m from its end walls and clear of the way in from an
 * archway in its side: the line along the hall's middle stays clear.
 * In the hall's own coordinates.
 */
export function hallColumns(id: MuseumHallId): { x: number; z: number }[] {
  if (id === 'museum0') return [];
  const { length, width } = hallAxes(id);
  const sideArches = hallArches(id).filter((a) => {
    const { across } = hallAxes(id);
    return Math.abs(a.into[0] * across[0] + a.into[1] * across[1]) > 0.5;
  });
  const out: { x: number; z: number }[] = [];
  for (let k = -5; k <= 5; k++) {
    const s = k * 6;
    if (Math.abs(s) > length / 2 - 3) continue;
    if (sideArches.some((a) => Math.abs(archAlong(id, a) - s) < 3)) continue;
    out.push(hallPoint(id, s, -width / 4), hallPoint(id, s, width / 4));
  }
  return out;
}

/** A gallery bench: its width and its length (along the hall). */
export const BENCH = { w: 0.5, l: 2.0, h: 0.45 } as const;

/**
 * The halls whose exhibits are built (107-0's hook; each by its
 * sub-prompt): their floor is the exhibit's, so they have no benches and
 * no "coming soon" panel.
 */
export const EXHIBIT_HALLS: ReadonlySet<MuseumHallId> = new Set([
  'museum1',
  'museum2',
  'museum5',
  'museum7',
  'museum8',
]);

/** A hall's room code, the first part of its exhibit's tags: M1, M2 … (107-0: the hall's number, not its room id). */
export const hallRoomCode = (id: MuseumHallId) => `M${hallNumber(id)}`;

/** Two benches on the street side's column line, between the columns, along the hall. */
export function hallBenches(id: MuseumHallId): { x: number; z: number }[] {
  if (id === 'museum0' || EXHIBIT_HALLS.has(id)) return [];
  const { width } = hallAxes(id);
  return [hallPoint(id, 3, -width / 4), hallPoint(id, -3, -width / 4)];
}

/** The "coming soon" panel: free-standing on the courtyard side's column line, facing back along the route, the way visitors come. */
export const PANEL = { w: 2.4, h: 2.3 } as const;
export function comingSoonPanel(id: MuseumHallId) {
  if (EXHIBIT_HALLS.has(id)) return null;
  const { width, along } = hallAxes(id);
  if (id === 'museum0') {
    // The welcome panel, by the doorway, facing back into the room.
    const p = hallPoint(id, hallAxes(id).length / 2 - 2.2, width / 2 - 3.2);
    return { ...p, yaw: Math.atan2(-along[0], -along[1]) };
  }
  const p = hallPoint(id, -3, width / 4);
  // Its face (+z of its group) towards the way the visitor comes.
  return { ...p, yaw: Math.atan2(-along[0], -along[1]) };
}

/**
 * Hall 0's painted pool, in its own coordinates: a rectangle of paint in
 * the middle of its floor, the deck round it; and its fake ladder, at the
 * painted edge nearest the doorway, its rails coming down to stop at the
 * floor. The paint is walked over; the ladder is not.
 */
export const PAINTED_POOL = { w: 9.4, d: 6.5, lanes: 4 } as const;
export function hall0Ladder() {
  return { x: 2.4, z: -PAINTED_POOL.d / 2, yaw: 0 };
}

/** Signed distance of a point in front of an archway (into its hall), and along it from its middle. */
function archLocal(a: MuseumArch, p: { x: number; z: number }) {
  const dx = p.x - a.frame.x;
  const dz = p.z - a.frame.z;
  return {
    ahead: dx * a.into[0] + dz * a.into[1],
    side: dx * a.into[1] - dz * a.into[0],
  };
}

/**
 * The hall the visitor has just walked into, going from `was` to `now`
 * (the hall's own coordinates) across one of its archways' middle lines,
 * within its width: the hand-over.
 */
export function crossedInto(
  id: MuseumHallId,
  was: { x: number; z: number },
  now: { x: number; z: number },
): MuseumHallId | null {
  for (const a of hallArches(id)) {
    const p = archLocal(a, was);
    const q = archLocal(a, now);
    if (Math.abs(q.side) >= a.w / 2) continue;
    if (p.ahead >= 0 && q.ahead < 0) return a.to;
  }
  return null;
}

/**
 * The archway to see through, of a hall's two (`door-joins.ts` draws one
 * room beyond at a time): the one the visitor is in or about to cross,
 * whichever way they face, so the hand-over is ready; or else the one
 * most nearly ahead. Each archway not seen through shows a plain
 * stand-in of the hall beyond. `yaw` as the controls have it (forward is
 * (sin yaw, −cos yaw)). `current` is kept unless the other is clearly
 * better, so the choice does not flicker.
 */
export function archToSee(
  id: MuseumHallId,
  pose: { x: number; z: number; yaw: number },
  current: MuseumHallId | null = null,
): MuseumHallId | null {
  const arches = hallArches(id);
  const near = arches.find((a) => {
    const l = archLocal(a, pose);
    return (
      Math.abs(l.ahead) < MUSEUM_WALL / 2 + 0.9 &&
      Math.abs(l.side) < a.w / 2 + 0.5
    );
  });
  if (near) return near.to;
  const fx = Math.sin(pose.yaw);
  const fz = -Math.cos(pose.yaw);
  const off = (a: MuseumArch) => {
    const dx = a.frame.x - pose.x;
    const dz = a.frame.z - pose.z;
    const len = Math.hypot(dx, dz) || 1;
    return Math.acos(Math.max(-1, Math.min(1, (dx * fx + dz * fz) / len)));
  };
  let best = arches[0];
  for (const a of arches) if (off(a) < off(best)) best = a;
  const kept = arches.find((a) => a.to === current);
  if (kept && kept !== best && off(kept) < off(best) + 0.35) return kept.to;
  return best.to;
}

/** Facing along a unit vector, as the controls have yaw. */
const yawOf = (v: readonly [number, number]) => Math.atan2(v[0], -v[1]);

/** Where a visitor stands on arriving through an archway from `from` (not seen through): just inside it, facing into the hall. */
export function arrivalFrom(
  id: MuseumHallId,
  from: string | null,
): { x: number; z: number; yaw: number } {
  const arch = hallArches(id).find((a) => a.to === from);
  if (!arch) return startOf(id);
  return {
    x: arch.frame.x + arch.into[0] * 1.5,
    z: arch.frame.z + arch.into[1] * 1.5,
    yaw: yawOf(arch.into),
  };
}

/** Where a visitor starts in a hall reached by its link: in the first, facing the title wall on the street; elsewhere, inside the archway from the hall before. */
export function startOf(id: MuseumHallId): {
  x: number;
  z: number;
  yaw: number;
} {
  if (id === 'museum0') {
    // At the painted pool's edge by the ladder, looking across it at the title wall.
    const l = hall0Ladder();
    return { x: l.x - 1.6, z: l.z - 1.4, yaw: Math.PI };
  }
  return arrivalFrom(id, previousHall(id));
}

/**
 * How many doorways apart two halls are round the ring, the shorter way.
 */
export function ringDistance(a: MuseumHallId, b: MuseumHallId): number {
  const d = (hallNumber(b) - hallNumber(a) + RING_SIZE) % RING_SIZE;
  return Math.min(d, RING_SIZE - d);
}

/** A hall's two neighbours on the ring: the hall before it and the hall after it. */
export function ringNeighbours(id: MuseumHallId): [MuseumHallId, MuseumHallId] {
  return [previousHall(id), nextHall(id)];
}

/**
 * How much of a hall is drawn, seen from the hall the visitor is in (the
 * owner, 2026-10-28: "The halls adjacent to the one we are in should be
 * rendered, but anything more distant should be rendered as a completely
 * empty space"): the visitor's own hall and its neighbours on the ring in
 * full (dressing, signs and exhibit); every hall further away as its empty
 * component only, at its true place.
 */
export type HallDetail = 'full' | 'empty';
export function hallDetail(
  visitor: MuseumHallId,
  id: MuseumHallId,
): HallDetail {
  return ringDistance(visitor, id) <= 1 ? 'full' : 'empty';
}

/** The halls drawn in full and those drawn empty, from the hall the visitor is in. */
export function detailSets(visitor: MuseumHallId) {
  const full = MUSEUM_HALLS.filter((h) => hallDetail(visitor, h) === 'full');
  const empty = MUSEUM_HALLS.filter((h) => hallDetail(visitor, h) === 'empty');
  return { full, empty };
}

/**
 * Which of the visitor's two neighbours a further hall lies beyond, round
 * the ring the shorter way (the hall opposite, as far either way, counts
 * as onward): `onward` beyond the next hall, `back` beyond the one before.
 * The scene of the visitor's hall shows each side's empty halls through
 * that neighbour's archway, and stops drawing them (keeping only their
 * depth) while the neighbour itself is drawn through it.
 */
export function ringSide(
  visitor: MuseumHallId,
  id: MuseumHallId,
): 'onward' | 'back' | null {
  if (id === visitor) return null;
  const d = (hallNumber(id) - hallNumber(visitor) + RING_SIZE) % RING_SIZE;
  return d <= RING_SIZE - d ? 'onward' : 'back';
}

/** An empty hall: its kind, its walls' lines and its archways, for the empty component (`views/museum-empty-hall.ts`). */
export function emptyHallShape(id: MuseumHallId) {
  return {
    id,
    kind: hallKind(id),
    bounds: hallBounds(id),
    h: hallSize(id).h,
    arches: hallArches(id),
    walls: hallWalls(id).map((wall) => ({
      wall,
      windows: wallWindows(id, wall),
    })),
  };
}

/** Whether two halls share a wall line (an archway's wall), and which. */
export function sharedWall(a: MuseumHallId, b: MuseumHallId) {
  return sharedEdge(BOUNDS[a], BOUNDS[b]);
}

/**
 * How a hall's scene draws one of its two neighbours (the owner,
 * 2026-10-28: "only the rooms adjacent to the room we're in render";
 * anything further seen down the ring is the empty model): `under`, the
 * neighbour's own room drawn through its archway on the canvas underneath
 * (`door-joins.ts`), its empty hall and those beyond it standing aside;
 * `full`, a full copy of the neighbour built into this scene at its true
 * place, so both neighbours are full even when both archways are in view
 * (a corner hall) or the one looked away from is seen; `empty`, its empty
 * hall, when this scene is itself drawn under the visitor's hall
 * (`peekFrom`) and so the neighbour is two halls from the visitor.
 */
export type NeighbourDraw = 'under' | 'full' | 'empty';
export function neighbourDraw(
  id: MuseumHallId,
  neighbour: MuseumHallId,
  state: {
    seen?: Partial<Record<MuseumHallId, boolean>>;
    peekFrom?: MuseumHallId | null;
  } = {},
): NeighbourDraw {
  if (!ringNeighbours(id).includes(neighbour))
    throw new Error(`${neighbour} is not next to ${id}`);
  if (state.seen?.[neighbour]) return 'under';
  if (state.peekFrom) return 'empty';
  return 'full';
}

/**
 * What the visitor in `visitor`, its archway to `looking` drawn through,
 * sees of every hall: its own and the two neighbours in full (one drawn
 * under, the other copied into the visitor's scene), every other hall
 * as its empty model, from whichever scene draws it. The empty model is
 * kept, never dropped, so looking down a side the halls go on.
 */
export function ringView(
  visitor: MuseumHallId,
  looking: MuseumHallId,
): Record<MuseumHallId, HallDetail> {
  const out = {} as Record<MuseumHallId, HallDetail>;
  for (const h of MUSEUM_HALLS) out[h] = 'empty';
  out[visitor] = 'full';
  for (const n of ringNeighbours(visitor)) {
    const here = neighbourDraw(visitor, n, { seen: { [looking]: true } });
    if (here === 'full' || here === 'under') out[n] = 'full';
  }
  // The room drawn under: its far neighbour as its scene draws it.
  for (const n of ringNeighbours(looking))
    if (
      n !== visitor &&
      neighbourDraw(looking, n, { peekFrom: visitor }) !== 'empty'
    )
      out[n] = 'full';
  return out;
}

/**
 * Hall 0's tiled trim (the owner, 2026-10-28: "make the welcome hall look
 * like a pool room with a tiled floor and wall"): the runs along the
 * inside face of each of its walls from height `y` up `h`, in the museum's plan,
 * broken where a doorway or window crosses that height (a band, or the
 * cove at the deck, `y` 0, broken by the doorways).
 */
export function insideFaceRuns(
  id: MuseumHallId,
  y: number,
  h = 0,
): { wall: HallWall; from: number; to: number }[] {
  const t = MUSEUM_WALL / 2;
  const out: { wall: HallWall; from: number; to: number }[] = [];
  for (const wall of hallWalls(id)) {
    const gaps: [number, number][] = [];
    for (const a of hallArches(id))
      if (
        a.axis === wall.axis &&
        Math.abs((wall.axis === 'x' ? a.at.z : a.at.x) - wall.line) < 1e-9 &&
        y < a.top
      ) {
        const u = wall.axis === 'x' ? a.at.x : a.at.z;
        gaps.push([u - a.w / 2, u + a.w / 2]);
      }
    for (const w of wallWindows(id, wall))
      if (y + h >= w.sill && y <= w.head)
        gaps.push([w.u - w.w / 2, w.u + w.w / 2]);
    gaps.sort((p, q) => p[0] - q[0]);
    let at = wall.from + t;
    for (const [a, b] of gaps) {
      if (a > at) out.push({ wall, from: at, to: a });
      at = Math.max(at, b);
    }
    if (wall.to - t > at) out.push({ wall, from: at, to: wall.to - t });
  }
  return out;
}

/** Hall 0's two bands of coloured tiles round its walls: their foot and depth, metres. */
export const HALL0_BANDS = [
  { y: 1.2, h: 0.15, colour: '#1f6f8b' },
  { y: 1.4, h: 0.05, colour: '#5fb3c4' },
  { y: 6.4, h: 0.3, colour: '#1f6f8b' },
] as const;

/**
 * How far a neighbour's full copy has faded in, 0 to 1 (the owner,
 * 2026-10-28: the change from the empty model to the full room "fades in
 * as you cross the threshold ... fully rendered when you have walked 1 m
 * into the room, but it fades out as you walk back to the threshold"):
 * the walker's depth into hall `id` past its archway from its other
 * neighbour, the one just left, over 1 m. At that archway's middle line
 * the hall beyond `id` is still as the hall left behind sees it (empty);
 * 1 m in, it is full. In the hall's own coordinates, as `archToSee`.
 * Stepped to twentieths, so a copy is touched only when the change shows.
 */
export const FADE_DEPTH = 1;
export function neighbourFade(
  id: MuseumHallId,
  neighbour: MuseumHallId,
  pose: { x: number; z: number },
): number {
  const other = ringNeighbours(id).find((n) => n !== neighbour);
  const arch = hallArches(id).find((a) => a.to === other);
  if (!arch) return 1;
  const depth =
    (pose.x - arch.frame.x) * arch.into[0] +
    (pose.z - arch.frame.z) * arch.into[1];
  return Math.round(Math.min(1, Math.max(0, depth / FADE_DEPTH)) * 20) / 20;
}
