import type { Footprint } from '../../controls/logic/walk-collision';
import { MUSEUM_EXHIBITION } from './museum-brand';

/**
 * The pool science museum (mission 107; the owner, 2026-10-28): five
 * exhibit halls in a converted warehouse built round a square with a
 * central courtyard, each hall its own room and scene, joined by open
 * archways knocked through the old brick walls, with no doors. Walking
 * through an archway hands the visitor into the next hall's scene
 * (`door-joins.ts`, `handOver` in `src/main.ts`), as the pool loop's
 * corridors do.
 *
 * The plan, north up (x east, z south):
 *
 * ```
 *   +---------------------------------+---------+
 *   | 3  Warm water            ->     |    4    |
 *   |                                 |  Safe   |
 *   +---------+=======================+  water  |
 *   |    2    |                       |         |
 *   |  Clean  |       courtyard       |    |    |
 *   |  water  |     (open to sky)     |    v    |
 *   |    ^    |                       |         |
 *   |    |    +===============+-------+---------+
 *   |         | 1 Moving water|  5 The whole    |
 *   |         |  <- entrance  |    plant <-     |
 *   +---------+---------------+-----------------+
 *                  street
 * ```
 *
 * A pinwheel: each side of the square is one long hall that runs past
 * its corner, so every turn of the route is an archway in the end wall
 * of one hall, opening into the side of the next, and the visitor turns
 * 90° there. Five halls on four sides: the south (street) side is split
 * into the entrance hall, Museum 1, and the finale, Museum 5, so the
 * route closes its loop: from Museum 5 straight on into Museum 1, back
 * at the entrance where it began.
 *
 * No hall is turned: each hall's own coordinates are the museum's,
 * moved to the hall's middle (`hallOrigin`), so a heading carries
 * unchanged through every archway, the corners too, and the floor's
 * joints and the walls' brick, laid in the museum's coordinates, line up
 * round every turn. Each wall line carries one brick wall `MUSEUM_WALL`
 * thick, centred on it; both halls at an archway build that wall from
 * the same function and the same coordinates, so nothing changes at the
 * hand-over (the perspective-jump fix, `8656cf1`). The square's sizes are
 * constants (`MUSEUM_SQUARE`), provisional: the owner will resize them.
 * Pure; metres; y up from the floor.
 */

export type MuseumHallId =
  | 'museum0'
  | 'museum1'
  | 'museum2'
  | 'museum3'
  | 'museum4'
  | 'museum5';

/** The five exhibit halls, in the visitor's order: the route returns from the last to the first. */
export const MUSEUM_EXHIBITS: readonly MuseumHallId[] = [
  'museum1',
  'museum2',
  'museum3',
  'museum4',
  'museum5',
];

/** Every room of the museum: Hall 0, the welcome, where every visit starts, then the five exhibits. */
export const MUSEUM_HALLS: readonly MuseumHallId[] = [
  'museum0',
  'museum1',
  'museum2',
  'museum3',
  'museum4',
  'museum5',
];

/**
 * The square, provisional (the owner, 2026-10-28: "we can resize them
 * later"): its side, the depth of the ring of halls round the courtyard,
 * where the street side is split between Museum 1 and Museum 5 (x of
 * the wall between them), and the height to the roof deck's underside.
 */
export const MUSEUM_SQUARE = { side: 46, depth: 14, split: 7, h: 9.5 } as const;

/**
 * Hall 0, the welcome (the owner, 2026-10-28): a dry, tiled pastiche of a
 * pool hall, its water painted on the floor, outside the square on the
 * street, in front of Museum 1 and as wide as it, joined to it by one
 * doorway in Museum 1's street wall: its depth and its lower ceiling.
 */
export const MUSEUM_HALL0 = { depth: 14, h: 4.5 } as const;

/** The doorway from Hall 0 into Museum 1: square-headed, tiled room to brick. */
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

const A = MUSEUM_SQUARE.side / 2;
const C = A - MUSEUM_SQUARE.depth;
const S = MUSEUM_SQUARE.split;

/** Each hall's wall lines (the middles of its walls), in the museum's plan. */
const BOUNDS: Record<MuseumHallId, Rect> = {
  museum0: { minX: -C, maxX: S, minZ: A, maxZ: A + MUSEUM_HALL0.depth },
  museum1: { minX: -C, maxX: S, minZ: C, maxZ: A },
  museum2: { minX: -A, maxX: -C, minZ: -C, maxZ: A },
  museum3: { minX: -A, maxX: C, minZ: -A, maxZ: -C },
  museum4: { minX: C, maxX: A, minZ: -A, maxZ: C },
  museum5: { minX: S, maxX: A, minZ: C, maxZ: A },
};

/** The courtyard's wall lines. */
export const COURTYARD: Rect = { minX: -C, maxX: C, minZ: -C, maxZ: C };
/** The whole building's outer wall lines. */
export const BUILDING: Rect = { minX: -A, maxX: A, minZ: -A, maxZ: A };

export type Heading = 'north' | 'east' | 'south' | 'west';
/** Which way the route runs through each hall. */
export const HALL_HEADING: Record<MuseumHallId, Heading> = {
  museum0: 'north',
  museum1: 'west',
  museum2: 'north',
  museum3: 'east',
  museum4: 'south',
  museum5: 'west',
};
const UNIT: Record<Heading, readonly [number, number]> = {
  north: [0, -1],
  east: [1, 0],
  south: [0, 1],
  west: [-1, 0],
};

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
  /** Its title, as signed: "Moving water". */
  title: string;
  /** What it is about, in a few words. */
  subject: string;
  /** The one big idea. */
  bigIdea: string;
  /** What the exhibit will show. */
  willShow: string;
  /** What visitors will be able to try. */
  tryIt: readonly string[];
}

export const HALL_BRIEFS: Record<MuseumHallId, HallBrief> = {
  museum0: {
    id: 'museum0',
    number: 0,
    title: 'Welcome',
    subject: 'Behind the tiles',
    bigIdea:
      'The simplest thing in the world, diving in, takes a world of engineering to make.',
    willShow:
      'Nothing we take for granted more than a swimming pool: its user interface is the simplest there could be. Dive in, and the water is simply there, clean, clear and warm. Behind the tiles lives a world of pumps, filters, boilers and chemistry, working all day and all night so that it stays that simple.',
    tryIt: [
      'Look for the water in this room. (There is none: it is paint.)',
      'Go through the doorway and find out what is behind the tiles.',
    ],
  },
  museum1: {
    id: 'museum1',
    number: 1,
    title: 'Moving water',
    subject: 'Circulation',
    bigIdea:
      'A pool is never still: a pump pulls every drop of it round the plant and back, again and again, all day and all night.',
    willShow:
      'A working pool that spills over its edge into a balance tank, one pump, its pipes and valves, and gauges that show the flow and the pressure.',
    tryIt: [
      'Close a valve a notch at a time and watch the flow fall as the pressure rises.',
      'Stop the pump and see the water settle back in the pool and the tank.',
      'Time how long the pump takes to turn the whole pool over.',
    ],
  },
  museum2: {
    id: 'museum2',
    number: 2,
    title: 'Clean water',
    subject: 'Filtration and backwash',
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
    title: 'Warm water',
    subject: 'Heating and energy',
    bigIdea:
      'A pool loses most of its heat from its surface, as water evaporates into the air: a cover at night saves more than any boiler can.',
    willShow:
      'A heat source, a heat exchanger that warms the pool water without mixing with it, a pool losing heat to the air, a pool cover, and a meter counting the energy and what it costs.',
    tryIt: [
      'Turn the heating on and watch the pool warm, a fraction of a degree at a time.',
      'Pull the cover over the pool and see how much heat it saves.',
      'Read the meter and work out what a day of heating costs.',
    ],
  },
  museum4: {
    id: 'museum4',
    number: 4,
    title: 'Safe water',
    subject: 'Disinfection and chemistry',
    bigIdea:
      'Chlorine keeps the water safe, but swimmers use it up: the trick is keeping just enough, at the right pH, all day long.',
    willShow:
      'A pool with its chemistry: free and combined chlorine, pH, the pollution swimmers bring, a dosing controller with its sample cell and metering pumps, and a test kit you can use yourself.',
    tryIt: [
      'Test the water with the kit and compare it with the controller.',
      'Send in a crowd of swimmers and watch the chlorine fall and the dosing pumps answer.',
      'Solve the pool problems on the challenge cards, from cloudy water to a smell of chlorine.',
    ],
  },
  museum5: {
    id: 'museum5',
    number: 5,
    title: 'The whole plant',
    subject: 'Control and fault finding',
    bigIdea:
      'Every part you have met works together, and when something goes wrong the plant tells you: if you know how to listen.',
    willShow:
      'The first four exhibits joined into one small working plant, with a mimic of the whole system, an alarm panel and its alarms.',
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
 * The museum's doorways, each from one room on the route to the next:
 * from the welcome into Museum 1, round the ring, and from Museum 5 back
 * into Museum 1, so the visit ends where it began, by the way out.
 */
export const MUSEUM_JOINS: readonly (readonly [MuseumHallId, MuseumHallId])[] =
  [
    ['museum0', 'museum1'],
    ['museum1', 'museum2'],
    ['museum2', 'museum3'],
    ['museum3', 'museum4'],
    ['museum4', 'museum5'],
    ['museum5', 'museum1'],
  ];

/** The room after this one on the route (Museum 5's is Museum 1, closing the loop), and the one before (Museum 1's is the welcome). */
export function nextHall(id: MuseumHallId): MuseumHallId | null {
  return MUSEUM_JOINS.find(([a]) => a === id)?.[1] ?? null;
}
export function previousHall(id: MuseumHallId): MuseumHallId | null {
  // Museum 1 is entered from the welcome first (and from Museum 5 at the end).
  return MUSEUM_JOINS.find(([, b]) => b === id)?.[0] ?? null;
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
  courtSill: 0.9,
  headBelowDeck: 2.2,
} as const;

/** The street wall's middle kept blank, for the hall's title (whole for the short halls on the street). */
const BLANK_HALF = 5;

/**
 * A wall's tall factory windows, on a 4 m grid from the museum's origin:
 * clear glass where the wall looks onto the courtyard (their sills low,
 * to see out), obscured glass where it looks onto the street, none where
 * another hall is beyond; never within a pier's width of the wall's ends,
 * and none in the street wall's middle, kept for the hall's title. The
 * same for a wall whichever hall's scene builds it (the courtyard's far
 * walls are built from it in every hall's scene).
 */
export function wallWindows(id: MuseumHallId, wall: HallWall): MuseumWindow[] {
  const out: MuseumWindow[] = [];
  // The welcome is tiled all round: no windows.
  if (id === 'museum0') return out;
  const half = WINDOW.w / 2;
  const lo = wall.from + MUSEUM_WALL / 2 + 0.8;
  const hi = wall.to - MUSEUM_WALL / 2 - 0.8;
  const mid = (wall.from + wall.to) / 2;
  const shortStreet = id === 'museum1' || id === 'museum5';
  for (let k = Math.ceil((lo + half - 2) / WINDOW.every); ; k++) {
    const u = k * WINDOW.every + 2;
    if (u + half > hi) break;
    if (u - half < lo) continue;
    const kinds = [u - half, u, u + half].map((p) => beyondAt(wall, p));
    if (!kinds.every((b) => b === kinds[0]) || kinds[0] === 'hall') continue;
    if (
      kinds[0] === 'street' &&
      (shortStreet || Math.abs(u - mid) < BLANK_HALF + half)
    )
      continue;
    const head = MUSEUM_SQUARE.h - WINDOW.headBelowDeck;
    out.push({
      u,
      w: WINDOW.w,
      sill: kinds[0] === 'street' ? WINDOW.streetSill : WINDOW.courtSill,
      head,
      kind: kinds[0],
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

/** Two benches on the street side's column line, between the columns, along the hall. */
export function hallBenches(id: MuseumHallId): { x: number; z: number }[] {
  if (id === 'museum0') return [];
  const { width } = hallAxes(id);
  return [hallPoint(id, 3, -width / 4), hallPoint(id, -3, -width / 4)];
}

/** The "coming soon" panel: free-standing on the courtyard side's column line, facing back along the route, the way visitors come. */
export const PANEL = { w: 2.4, h: 2.3 } as const;
export function comingSoonPanel(id: MuseumHallId) {
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
export const PAINTED_POOL = { w: 10, d: 6.5, lanes: 4 } as const;
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
