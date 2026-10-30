import type { Footprint } from '../../controls/logic/walk-collision';
import { LIFT_DOOR } from './lift-doorway';
import type { LiftPlace } from './lift-doorway';
import { MUSEUM_EXHIBITION } from './museum-brand';
import {
  CORRIDOR,
  HALL_PLACES,
  LAYOUT_CORRIDORS,
  LAYOUT_WALL,
  corridorShape,
  corridorWindows,
  layoutBounds,
  WINDOW_HEAD,
  WINDOW_SILL,
} from './museum-layout';
import type { LayoutCorridor } from './museum-layout';

/**
 * The pool science museum (mission 107; the owner, 2026-10-28): a ring of
 * ten halls round a courtyard, each hall its own room and scene. Since
 * layout C (the owner, 2026-10-30; `museum-layout.ts`, `doc/temp/`) the
 * halls stand apart, staggered along each side of the ring, and each pair
 * of neighbours is joined by an L-shaped corridor of the corridor kit,
 * round the outside of the ring, so no hall can be seen from another.
 * Each hall builds both its corridors; walking across a corridor's
 * hand-over line, at its turn, hands the visitor into the next hall's
 * scene (`handOver` in `src/main.ts`), which builds the same corridor.
 *
 * Hall 0, the welcome, is in the south-west corner: the visit runs north
 * through Hall 1 to Hall 2 in the north-west corner, east through Halls 3
 * and 4 to Hall 5, south through Hall 6 to Hall 7, and west through Halls
 * 8 and 9 back into Hall 0.
 *
 * Each hall keeps its own frame, as its exhibit was built (107-1): its
 * middle at its origin, x east and z south as first built; Halls 3 and 9
 * stand turned a quarter in the museum (long north–south), so their own
 * frame is the museum's turned (`toMuseum`). A hall's "own plan" is its
 * own frame moved to its place: for a hall not turned, the museum's.
 * Halls are found by their number (`hallId`, `hallNumber`), never by
 * coordinates. Pure; metres; y up from the floor.
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
 * The halls' height to the roof deck's underside (the owner, 2026-10-28).
 * Their places and sizes are layout C's (`museum-layout.ts`, the owner,
 * 2026-10-30): standing apart round a ring, joined by L-shaped corridors.
 */
export const MUSEUM_SQUARE = { h: 9.5 } as const;

/** Hall 0's tiled ceiling: as high as every other hall's (the owner, 2026-10-28: "The rooms on both sides should be the same height"). */
export const MUSEUM_HALL0 = { h: MUSEUM_SQUARE.h } as const;

/** Hall 0's doorways' old size (107-1), kept for its signs: the corridors' doorways are the corridor's own section. */
export const MUSEUM_DOOR = { w: 2.4, h: 3.0 } as const;

/** The old brick walls: their thickness, centred on each wall line. */
export const MUSEUM_WALL = LAYOUT_WALL;

/** The archways of the ring as it was (107-1), kept for their headers' proportions. */
export const MUSEUM_ARCH = { w: 3.6, spring: 3.4, rise: 1.8 } as const;
export const ARCH_CROWN = MUSEUM_ARCH.spring + MUSEUM_ARCH.rise;

/** A rectangle in plan. */
export interface Rect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * Each hall's wall lines in its own plan: the museum's plan turned to the
 * hall's own frame (`HallPlace.turn`) about its middle, so a hall turned
 * to stand long north–south keeps the frame its exhibit was built in.
 * For a hall not turned, its own plan is the museum's.
 */
const BOUNDS = Object.fromEntries(
  MUSEUM_HALLS.map((id, n) => {
    const p = HALL_PLACES[n];
    const [w, d] = p.turn % 2 ? [p.d, p.w] : [p.w, p.d];
    return [
      id,
      {
        minX: p.x - w / 2,
        maxX: p.x + w / 2,
        minZ: p.z - d / 2,
        maxZ: p.z + d / 2,
      },
    ];
  }),
) as Record<MuseumHallId, Rect>;

/** The whole museum's extent, every hall's wall lines. */
export const BUILDING: Rect = layoutBounds();

/** A direction in a hall's own plan, turned as the hall stands in the museum (Three's turn about y). */
function standing(
  id: MuseumHallId,
  v: readonly [number, number],
): [number, number] {
  const q = HALL_PLACES[hallNumber(id)].turn;
  const a = (q * Math.PI) / 2;
  const c = Math.round(Math.cos(a));
  const s = Math.round(Math.sin(a));
  return [v[0] * c + v[1] * s, -v[0] * s + v[1] * c];
}
/** A direction in the museum, into a hall's own plan. */
function ownDirection(
  id: MuseumHallId,
  v: readonly [number, number],
): [number, number] {
  const q = HALL_PLACES[hallNumber(id)].turn;
  const a = (-q * Math.PI) / 2;
  const c = Math.round(Math.cos(a));
  const s = Math.round(Math.sin(a));
  return [v[0] * c + v[1] * s, -v[0] * s + v[1] * c];
}
/** A point of the museum's plan, in a hall's own plan. */
function ownPoint(id: MuseumHallId, x: number, z: number) {
  const p = HALL_PLACES[hallNumber(id)];
  const [dx, dz] = ownDirection(id, [x - p.x, z - p.z]);
  return { x: p.x + dx, z: p.z + dz };
}

export type Heading = 'north' | 'east' | 'south' | 'west';
const UNIT: Record<Heading, readonly [number, number]> = {
  north: [0, -1],
  east: [1, 0],
  south: [0, 1],
  west: [-1, 0],
};
/**
 * Which way the route ran through each hall as the ring was first built
 * (107-1), in its own frame: its exhibit is laid out along it.
 */
export const HALL_HEADING: Record<MuseumHallId, Heading> = {
  museum0: 'north',
  museum1: 'north',
  museum2: 'east',
  museum3: 'east',
  museum4: 'east',
  museum5: 'south',
  museum6: 'south',
  museum7: 'west',
  museum8: 'west',
  museum9: 'west',
};

/** Across the route, towards the ring's inside as first built (107-1), in each hall's own frame. */
const ACROSS: Record<MuseumHallId, readonly [number, number]> = {
  museum0: [1, 0],
  museum1: [1, 0],
  museum2: [0, 1],
  museum3: [0, 1],
  museum4: [0, 1],
  museum5: [-1, 0],
  museum6: [-1, 0],
  museum7: [0, -1],
  museum8: [0, -1],
  museum9: [0, -1],
};

/** A hall's shape on the ring: the welcome, a side hall (archways in line), or a corner (the route turns 90°). */
export type HallKind = 'welcome' | 'side' | 'corner';
export function hallKind(id: MuseumHallId): HallKind {
  if (id === 'museum0') return 'welcome';
  return HALL_PLACES[hallNumber(id)].sides.length > 1 ? 'corner' : 'side';
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
  const [dx, dz] = standing(id, [x, z]);
  return { x: dx + o.x, z: dz + o.z };
}

/** The hall's axes: along its route, and across it towards the courtyard. */
export function hallAxes(id: MuseumHallId) {
  const [ax, az] = UNIT[HALL_HEADING[id]];
  const [cx, cz] = ACROSS[id];
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
  /** Whether the owner has given it a theme (all ten have, 2026-10-29). */
  themed: boolean;
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
  museum5: {
    id: 'museum5',
    number: 5,
    title: 'A Day in the Life',
    subject: 'A poolman’s duties through the decades',
    themed: true,
    bigIdea:
      'For a hundred years the day has run the same way; the tools changed, the skimmer basket did not.',
    willShow:
      'Photographs of a poolman’s morning, midday and night, decade by decade from the 1920s to today, and a skimmer to empty.',
    tryIt: [
      'Walk the photographs from the 1920s to today.',
      'Empty the skimmer into the skip.',
    ],
  },
  museum6: {
    id: 'museum6',
    number: 6,
    title: 'Grundflow’s Amazing World of Pumps',
    subject: 'We Keep Water Moving',
    themed: true,
    bigIdea:
      'A swimming pool needs pumps of every size, from a few drops a minute to an Olympic pool’s worth an afternoon.',
    willShow:
      'Pumps of every size round a 1,000-litre tank, from a peristaltic dosing pump to a multi-kilowatt giant.',
    tryIt: [
      'Press a pump’s button and see how long it takes to fill the tank.',
      'Press RESET to empty it and try another.',
    ],
  },
  museum7: {
    id: 'museum7',
    number: 7,
    title: 'Grout: The Unsung Hero of the Aquatics World',
    subject: 'Grout through the ages',
    themed: true,
    bigIdea:
      'Perhaps no substance is more important to a swimming pool than grout.',
    willShow:
      'A reverent gallery of grout specimens, from the earliest cement grouts to modern epoxies, each with its plaque.',
    tryIt: ['Read the plaques.', 'There is nothing to reset. Grout endures.'],
  },
  museum8: {
    id: 'museum8',
    number: 8,
    title: 'Never again: putting safety first',
    subject: 'The chlorination disaster that nearly was',
    themed: true,
    bigIdea:
      'Every safety rule in a plant room was written because something once went wrong.',
    willShow:
      'The story of a chlorination incident, chapter by chapter, in photographs, clippings and the lessons learnt.',
    tryIt: ['Walk the chapters round the walls.', 'Press HEAR WHAT HAPPENED.'],
  },
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

/** One of a hall's doorways, into the corridor to the hall beyond. */
export interface MuseumArch {
  to: MuseumHallId;
  /** Whether it is the way on along the route (else the way back). */
  onward: boolean;
  /** A square-headed doorway, the corridor's own section (a round-headed archway no more: layout C). */
  kind: 'arch' | 'door';
  /** Its clear width and its height to its head. */
  w: number;
  top: number;
  /** Its wall runs along x or along z (the hall's own plan). */
  axis: 'x' | 'z';
  /** Its middle, in the hall's own plan, on the wall line. */
  at: { x: number; z: number };
  /** Into this hall: a unit vector. */
  into: readonly [number, number];
  /** As `door-joins.ts` has it, in the hall's own coordinates: its middle on the wall line, +z into this hall. */
  frame: { x: number; z: number; yaw: number };
}

/** A hall's doorway to a corridor, from the layout's doorway (in the museum), in its own plan. */
function doorOf(
  id: MuseumHallId,
  c: LayoutCorridor,
  onward: boolean,
): MuseumArch {
  const n = hallNumber(id);
  const d = c.a === n && onward ? c.doorA : c.doorB;
  const p = HALL_PLACES[n];
  const out = UNIT[d.side];
  // Its middle on the wall line, in the museum, then in the hall's own plan.
  const half = (d.side === 'east' || d.side === 'west' ? p.w : p.d) / 2;
  const mx = d.side === 'east' || d.side === 'west' ? p.x + out[0] * half : d.u;
  const mz =
    d.side === 'north' || d.side === 'south' ? p.z + out[1] * half : d.u;
  const at = ownPoint(id, mx, mz);
  const [ox, oz] = ownDirection(id, out);
  // (+ 0: no negative zero.)
  const into: readonly [number, number] = [-ox + 0, -oz + 0];
  const o = hallOrigin(id);
  return {
    to: hallId(onward ? c.b : c.a),
    onward,
    kind: 'arch',
    w: MUSEUM_ARCH.w,
    top: ARCH_CROWN,
    axis: ox === 0 ? 'x' : 'z',
    at,
    into,
    frame: {
      x: at.x - o.x,
      z: at.z - o.z,
      yaw: Math.atan2(into[0], into[1]),
    },
  };
}

/** A hall's doorways: the way on first, then the way back. */
export function hallArches(id: MuseumHallId): MuseumArch[] {
  const n = hallNumber(id);
  const k = LAYOUT_CORRIDORS.length;
  return [
    doorOf(id, LAYOUT_CORRIDORS[n], true),
    doorOf(id, LAYOUT_CORRIDORS[(n - 1 + k) % k], false),
  ];
}

/**
 * A hall's corridor to a neighbour, in the hall's own coordinates: its
 * path (the middle of its floor from this hall's doorway, on its wall's
 * outside face, to its corner and on to the other hall's), its walls and
 * floor (`corridorShape`), and its hand-over, the line across it at its
 * corner where the visitor passes to the other hall's scene: its middle
 * and the way across it towards the other hall. Both halls build the same
 * corridor, so nothing moves at the hand-over.
 */
export interface HallCorridor {
  to: MuseumHallId;
  onward: boolean;
  path: readonly [
    { x: number; z: number },
    { x: number; z: number },
    { x: number; z: number },
  ];
  walls: Footprint[];
  floor: Footprint[];
  /** Its windows, along the leg that runs along the ring (`corridorWindows`). */
  windows: { x: number; z: number; into: readonly [number, number] }[];
  handOver: { x: number; z: number; toward: readonly [number, number] };
  /** As `door-joins.ts` has it: the hand-over's middle, +z into this hall's side of it. */
  frame: { x: number; z: number; yaw: number };
}

export function hallCorridors(id: MuseumHallId): HallCorridor[] {
  const n = hallNumber(id);
  const k = LAYOUT_CORRIDORS.length;
  const o = hallOrigin(id);
  return [
    { c: LAYOUT_CORRIDORS[n], onward: true },
    { c: LAYOUT_CORRIDORS[(n - 1 + k) % k], onward: false },
  ].map(({ c, onward }) => {
    const local = (q: { x: number; z: number }) => {
      const p = ownPoint(id, q.x, q.z);
      return { x: p.x - o.x, z: p.z - o.z };
    };
    const [a, m, b] = c.path.map(local);
    const path = (onward ? [a, m, b] : [b, m, a]) as HallCorridor['path'];
    const { walls, floor } = corridorShape(path);
    const windows = corridorWindows(
      path,
      (onward ? c.along : 1 - c.along) as 0 | 1,
    );
    const ho = local(c.handOver);
    const tb = ownDirection(id, c.handOver.towardB);
    const toward: readonly [number, number] = onward
      ? tb
      : [-tb[0] + 0, -tb[1] + 0];
    const into: readonly [number, number] = [-toward[0], -toward[1]];
    return {
      to: hallId(onward ? c.b : c.a),
      onward,
      path,
      walls,
      floor,
      windows,
      handOver: { ...ho, toward },
      frame: { ...ho, yaw: Math.atan2(into[0], into[1]) },
    };
  });
}

/** What lies beyond a stretch of a hall's wall. */
export type Beyond = 'street' | 'courtyard' | 'hall';

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
  /** What it faces: the street round the ring's outside, the courtyard in its middle, or a neighbour along it. */
  facing: Beyond;
}

/**
 * What each of a hall's walls was built facing (107-1), in its own frame:
 * the street, the courtyard or a neighbour. The halls now stand apart
 * (layout C), so this only places their windows, titles and signs, kept
 * as their exhibits were built (a turned hall's street wall is its own
 * still, whichever way it stands).
 */
const FACING: Record<MuseumHallId, Record<Heading, Beyond>> = {
  museum0: { north: 'hall', south: 'street', west: 'street', east: 'hall' },
  museum1: { north: 'hall', south: 'hall', west: 'street', east: 'courtyard' },
  museum2: { north: 'street', south: 'hall', west: 'street', east: 'hall' },
  museum3: { north: 'street', south: 'courtyard', west: 'hall', east: 'hall' },
  museum4: { north: 'street', south: 'courtyard', west: 'hall', east: 'hall' },
  museum5: { north: 'street', south: 'hall', west: 'hall', east: 'street' },
  museum6: { north: 'hall', south: 'hall', west: 'courtyard', east: 'street' },
  museum7: { north: 'hall', south: 'street', west: 'hall', east: 'street' },
  museum8: { north: 'courtyard', south: 'street', west: 'hall', east: 'hall' },
  museum9: { north: 'courtyard', south: 'street', west: 'hall', east: 'hall' },
};

export function hallWalls(id: MuseumHallId): HallWall[] {
  const b = BOUNDS[id];
  const walls: Omit<HallWall, 'facing'>[] = [
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
  return walls.map((w) => ({ ...w, facing: FACING[id][w.side] }));
}

/** What is beyond a wall (anywhere along it: the halls stand apart). */
export function beyondAt(wall: HallWall, u?: number): Beyond {
  void u;
  return wall.facing;
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
  // All far above head height, the corridors' alike (`WINDOW_SILL`).
  streetSill: WINDOW_SILL,
  courtSill: WINDOW_SILL,
  headBelowDeck: MUSEUM_SQUARE.h - WINDOW_HEAD,
} as const;

/** A hall's title on its street wall, as gallery vinyl: kept clear of windows. */
export const HALL_TITLE = { w: 6.0, h: 2.0, y: 3.6 } as const;

/**
 * Which way a hall's wall looks as the hall stands in layout C: out of the
 * ring (the street round the building), into it (the courtyard), or along
 * the ring towards a neighbour.
 */
export function wallOutlook(
  id: MuseumHallId,
  wall: HallWall,
): 'outside' | 'inside' | 'along' {
  const p = HALL_PLACES[hallNumber(id)];
  const [x, z] = standing(id, wall.out);
  const side = (Object.keys(UNIT) as Heading[]).find(
    (h) => UNIT[h][0] === x && UNIT[h][1] === z,
  )!;
  if (p.sides.includes(side)) return 'outside';
  if (p.sides.some((s) => UNIT[s][0] === -x && UNIT[s][1] === -z))
    return 'inside';
  return 'along';
}

/** Whether a corridor's doorway is in this wall. */
const doorIn = (id: MuseumHallId, wall: HallWall) =>
  hallArches(id).some(
    (a) =>
      a.axis === wall.axis &&
      Math.abs((wall.axis === 'x' ? a.at.z : a.at.x) - wall.line) < 1e-9,
  );

/**
 * A wall's tall factory windows (the owner, 2026-10-30: "the windows
 * shouldn't be in the same wall as the corridor ... facing the outside of
 * the building or facing the imaginary courtyard"): only in a wall that
 * looks out of the ring or into it (`wallOutlook`) and has no corridor's
 * doorway; obscured glass out of the ring, clear onto the courtyard (the
 * sky), high. On the hall's title wall (its street wall as built), one
 * either side of the title, as near the ends as the piers allow; on any
 * other, on a 4 m grid from the museum's origin, never within a pier's
 * width of the wall's ends. None on Hall 9's title wall, kept whole for
 * the finale's closing words; none in Hall 0, tiled all round, nor in
 * the black boxes.
 */
export function wallWindows(id: MuseumHallId, wall: HallWall): MuseumWindow[] {
  const out: MuseumWindow[] = [];
  if (id === 'museum0' || isBlackBox(id)) return out;
  const outlook = wallOutlook(id, wall);
  if (outlook === 'along' || doorIn(id, wall)) return out;
  const kind = outlook === 'outside' ? 'street' : 'courtyard';
  const sill = kind === 'street' ? WINDOW.streetSill : WINDOW.courtSill;
  const half = WINDOW.w / 2;
  const lo = wall.from + MUSEUM_WALL / 2 + 0.8;
  const hi = wall.to - MUSEUM_WALL / 2 - 0.8;
  const mid = (wall.from + wall.to) / 2;
  const head = MUSEUM_SQUARE.h - WINDOW.headBelowDeck;
  if (beyondAt(wall) === 'street') {
    if (id === FINALE) return out;
    for (const s of [-1, 1]) {
      const u = mid + s * (hi - mid - half - 0.3);
      if (Math.abs(u - mid) - half < HALL_TITLE.w / 2 + 0.15) continue;
      out.push({ u, w: WINDOW.w, sill, head, kind });
    }
    return out;
  }
  for (let k = Math.ceil((lo + half - 2) / WINDOW.every); ; k++) {
    const u = k * WINDOW.every + 2;
    if (u + half > hi) break;
    if (u - half < lo) continue;
    out.push({ u, w: WINDOW.w, sill, head, kind });
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
 * its four walls, open at its doorways; its corridors' walls, and a stop
 * across each corridor at its hand-over while the hall beyond is not yet
 * seen. Then its columns, benches and panel.
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
      .map((a) => ({
        arch: a as MuseumArch | null,
        w: a.w,
        u: wall.axis === 'x' ? a.at.x : a.at.z,
      }));
    // The lift landing's opening: its doors and stops are the landing's.
    const lift = hallLiftOpening(id);
    if (lift && lift.wall.side === wall.side)
      cuts.push({ arch: null, w: lift.w, u: lift.u });
    cuts.sort((p, q) => p.u - q.u);
    let start = wall.from - t;
    for (const c of cuts) {
      const half = c.w / 2;
      out.push(box(wall.axis, wall.line, start, c.u - half, -t, t));
      start = c.u + half;
    }
    out.push(box(wall.axis, wall.line, start, wall.to + t, -t, t));
  }
  // Its corridors' walls; and across each, at its hand-over, a stop while
  // the hall beyond is not yet seen, so the visitor waits there until it is.
  for (const c of hallCorridors(id)) {
    out.push(...c.walls);
    if (seen[c.to]) continue;
    const { x, z, toward } = c.handOver;
    const half = CORRIDOR.width / 2 + 0.3;
    const a = { x: x + toward[0] * 0.05, z: z + toward[1] * 0.05 };
    const b = { x: x + toward[0] * 0.45, z: z + toward[1] * 0.45 };
    const across = [-toward[1], toward[0]];
    out.push({
      minX: Math.min(a.x, b.x) - Math.abs(across[0]) * half,
      maxX: Math.max(a.x, b.x) + Math.abs(across[0]) * half,
      minZ: Math.min(a.z, b.z) - Math.abs(across[1]) * half,
      maxZ: Math.max(a.z, b.z) + Math.abs(across[1]) * half,
    });
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
  if (id === 'museum0' || isBlackBox(id)) return [];
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
  'museum3',
  'museum4',
  'museum5',
  'museum6',
  'museum7',
  'museum8',
  'museum9',
]);

/**
 * The black boxes (the owner, 2026-10-29: "just have two black rooms with
 * no windows ... very simple black rooms"): Hall 7, grout, and Hall 8,
 * Never again. The same walls and archways as every hall, so the ring
 * still joins up, but no windows, no columns, no services ceiling and no
 * fire safety kit: walls, floor and roof deck plain matt black, lit only
 * by the exhibit's own lamps.
 */
export const BLACK_BOX_HALLS: ReadonlySet<MuseumHallId> = new Set([
  'museum7',
  'museum8',
]);
export function isBlackBox(id: MuseumHallId): boolean {
  return BLACK_BOX_HALLS.has(id);
}

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
/** A point from a corridor's hand-over: how far past it towards the hall beyond, and how far to one side. */
function handOverLocal(c: HallCorridor, p: { x: number; z: number }) {
  const dx = p.x - c.handOver.x;
  const dz = p.z - c.handOver.z;
  const [tx, tz] = c.handOver.toward;
  return { ahead: dx * tx + dz * tz, side: dx * tz - dz * tx };
}

/**
 * The hall the visitor has just walked into, going from `was` to `now`
 * (the hall's own coordinates) across a corridor's hand-over line, at its
 * turn, within its width.
 */
export function crossedInto(
  id: MuseumHallId,
  was: { x: number; z: number },
  now: { x: number; z: number },
): MuseumHallId | null {
  for (const c of hallCorridors(id)) {
    const p = handOverLocal(c, was);
    const q = handOverLocal(c, now);
    if (Math.abs(q.side) >= CORRIDOR.width / 2 + 0.2) continue;
    if (p.ahead < 0 && q.ahead >= 0) return c.to;
  }
  return null;
}

/**
 * The hall to see through a corridor (`door-joins.ts` draws one room
 * beyond at a time): the one whose corridor the visitor is in or whose
 * doorway is nearest, so it is ready before its doorway comes into view
 * round the turn. `yaw` is kept for the old signature; no hall is seen
 * from another hall, only along a corridor.
 */
export function archToSee(
  id: MuseumHallId,
  pose: { x: number; z: number; yaw: number },
  current: MuseumHallId | null = null,
): MuseumHallId | null {
  const corridors = hallCorridors(id);
  const doors = hallArches(id);
  const dist = (to: MuseumHallId) => {
    const c = corridors.find((k) => k.to === to)!;
    const a = doors.find((k) => k.to === to)!;
    return Math.min(
      Math.hypot(pose.x - c.handOver.x, pose.z - c.handOver.z),
      Math.hypot(pose.x - a.frame.x, pose.z - a.frame.z),
    );
  };
  const [first, second] = corridors.map((c) => c.to);
  const best = dist(first) <= dist(second) ? first : second;
  const other = best === first ? second : first;
  // Kept unless the other is clearly nearer, so the choice does not flicker.
  if (current === other && dist(other) < dist(best) + 1) return current;
  return best;
}

/** Where a visitor stands on arriving through a corridor from `from` (by a link, not walked): just inside its doorway, facing into the hall. */
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

/** Facing along a unit vector, as the controls have yaw. */
const yawOf = (v: readonly [number, number]) => Math.atan2(v[0], -v[1]);

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
 * The freight lift's floor-4 landing (mission 108): on Hall 0's north
 * wall, with the fire exit (the owner, 2026-10-30, layout C: it was on the
 * west wall, now the doorway into Hall 1's), 4 m west of the wall's
 * middle, where its place is kept clear (`LIFT_RESERVED` in
 * `museum-safety.ts`), its frame's opening knocked through the wall,
 * square-headed. In the museum's plan: the wall, the opening's middle
 * along it (`u`), its width and head; null for every other hall.
 */
export function hallLiftOpening(id: MuseumHallId) {
  if (id !== 'museum0') return null;
  const wall = hallWalls(id).find((w) => w.side === 'north')!;
  return {
    wall,
    u: (wall.from + wall.to) / 2 - 4.0,
    w: LIFT_DOOR.clear + 2 * LIFT_DOOR.frame,
    top: LIFT_DOOR.height + LIFT_DOOR.frame,
  };
}

/** The lift landing's place in the hall's own coordinates (`lift-doorway.ts`): on the wall's inside face, facing into the hall. */
export function hallLiftPlace(id: MuseumHallId): LiftPlace | null {
  const lift = hallLiftOpening(id);
  if (!lift) return null;
  const o = hallOrigin(id);
  const { wall } = lift;
  const n = wall.axis === 'x' ? wall.out[1] : wall.out[0];
  const face = wall.line - n * (MUSEUM_WALL / 2);
  // Into the hall: against the wall's way out.
  const into = wall.axis === 'x' ? [0, -n] : [-n, 0];
  return wall.axis === 'x'
    ? { x: lift.u - o.x, z: face - o.z, yaw: Math.atan2(into[0], into[1]) }
    : { x: face - o.x, z: lift.u - o.z, yaw: Math.atan2(into[0], into[1]) };
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
    const lift = hallLiftOpening(id);
    if (lift && lift.wall.side === wall.side && y < lift.top)
      gaps.push([lift.u - lift.w / 2, lift.u + lift.w / 2]);
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
