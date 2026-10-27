import type { Footprint } from '../../controls/logic/walk-collision';
import { STEP_UP, surfaceFloorAt } from './stair-run';
import type { Surface } from './stair-run';
import { MAIN_CORRIDOR } from './main-corridor';

/**
 * The control room's prototype (mission 092, stage 0; dev45), to the
 * layout the owner chose (2026-10-27, "E, option C as the owner wants
 * it"), made grand (layout F, then bigger again: the owner wants an extreme,
 * deliberate grandiosity, Bond villain meets Mission Control): one big
 * open space, a flattened heptagon 28 × 22 m, 9 m to its ceiling, a
 * giant ring light over the operator's chair. From a corridor door a
 * switchback stair climbs a whole 8 m storey in its own stair hall and
 * comes up, off centre, through a guarded opening in the floor on the
 * room's left (west), between the desk and the left wall, facing the big
 * wall. In the middle front, a segmented heptagonal operator's desk of
 * the room's shape, smaller, its big side toward the big wall, open at
 * the back for the operator to get in. The back end, behind the line
 * joining the two back side corners, is a raised stage 1.05 m up, a
 * wide flight of six risers in the middle and a guard rail along the
 * rest of its front, holding a long conference table looking over the
 * desk to the big wall. Pure: metres,
 * x east, z south, the ground floor at 0. The room's axis is x = 0, from
 * the big wall's middle (north) to the back corner (south).
 */

/**
 * The two versions of the prototype on one geometry (the owner,
 * 2026-10-27): the Bond villain's lair (dev45) and the starship bridge
 * (dev46). The bridge adds its stations for each pool system and ramps
 * either side up to the stage.
 */
export type Theme = 'lair' | 'bridge';

export interface Point {
  x: number;
  z: number;
}

/** The storey the stair climbs, metres. */
export const STOREY = 8;

/** The room's dimensions, metres. */
export const CONTROL_ROOM = {
  /** The big (front, north) wall's length. */
  front: 24,
  /** From the big wall to the back corner, on the axis. */
  depth: 22,
  /** The big wall's line, z. */
  frontZ: -11,
  /** Floor to ceiling. */
  ceiling: 9,
  /** The walls' thickness. */
  wall: 0.3,
} as const;

/**
 * The room's corners on plan, clockwise from the big wall's west end
 * (the owner's plan): the big wall; its two neighbours angled out to the
 * room's widest; two side walls angled back in; and two back walls
 * meeting in the corner on the axis. Each corner is given as a fraction
 * of the big wall's half-length across and of the depth back from it.
 */
const SHAPE: readonly [number, number][] = [
  [-1, 0],
  [1, 0],
  [1.1667, 0.3],
  [1, 0.6],
  [0, 1],
  [-1, 0.6],
  [-1.1667, 0.3],
];

/** A heptagon of the room's shape: `front` long on its big side at `frontZ`, `depth` deep. */
export function heptagon(front: number, depth: number, frontZ: number) {
  return SHAPE.map(([u, v]) => ({
    x: (u * front) / 2,
    z: frontZ + v * depth,
  }));
}

/** The room's inner face on plan. */
export const roomPolygon = (): Point[] =>
  heptagon(CONTROL_ROOM.front, CONTROL_ROOM.depth, CONTROL_ROOM.frontZ);

/** The wall from corner `i` to the next. */
export const sides = (poly: readonly Point[]) =>
  poly.map((a, i) => [a, poly[(i + 1) % poly.length]] as const);

/** Whether (x, z) is inside a convex polygon wound clockwise on plan (x east, z south). */
export function insidePolygon(poly: readonly Point[], x: number, z: number) {
  return sides(poly).every(
    ([a, b]) => (b.x - a.x) * (z - a.z) - (b.z - a.z) * (x - a.x) >= -1e-9,
  );
}

/** How far (x, z) is from the segment a–b. */
export function distanceToSegment(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const t = Math.max(
    0,
    Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz)),
  );
  return Math.hypot(p.x - (a.x + t * dx), p.z - (a.z + t * dz));
}

/** The inward unit normal of the side a–b of a clockwise polygon. */
export function inward(a: Point, b: Point): Point {
  const len = Math.hypot(b.x - a.x, b.z - a.z);
  return { x: -(b.z - a.z) / len, z: (b.x - a.x) / len };
}

/** A convex clockwise polygon with every side moved `d` inward. */
export function insetPolygon(poly: readonly Point[], d: number): Point[] {
  const lines = sides(poly).map(([a, b]) => {
    const n = inward(a, b);
    return {
      p: { x: a.x + n.x * d, z: a.z + n.z * d },
      dir: { x: b.x - a.x, z: b.z - a.z },
    };
  });
  return lines.map((l, i) => {
    const prev = lines[(i + lines.length - 1) % lines.length];
    // Where the previous side's line meets this one's.
    const det = prev.dir.x * l.dir.z - prev.dir.z * l.dir.x;
    const t =
      ((l.p.x - prev.p.x) * l.dir.z - (l.p.z - prev.p.z) * l.dir.x) / det;
    return { x: prev.p.x + prev.dir.x * t, z: prev.p.z + prev.dir.z * t };
  });
}

/**
 * The operator's desk: the room's shape at `scale`, its big side
 * `frontZ`, `top` deep from its outer edge to the operator's. One
 * segment for each side but the two at the back (corners 3 to 5), left
 * open for the operator to get in.
 */
export const DESK = {
  scale: 0.25,
  frontZ: -5.2,
  /** Its top's depth, outer edge to the operator's edge. */
  top: 1.0,
  /** The sides it has no segment on: its back two, the way in. */
  open: [3, 4] as readonly number[],
} as const;

export function deskOuter(): Point[] {
  const { front, depth } = CONTROL_ROOM;
  return heptagon(front * DESK.scale, depth * DESK.scale, DESK.frontZ);
}

export const deskInner = () => insetPolygon(deskOuter(), DESK.top);

/** The desk's segments, each its side's outer and inner edges (a quadrilateral). */
export function deskSegments() {
  const outer = deskOuter();
  const inner = deskInner();
  const n = outer.length;
  return outer
    .map((_, i) => ({
      side: i,
      outer: [outer[i], outer[(i + 1) % n]] as const,
      inner: [inner[i], inner[(i + 1) % n]] as const,
    }))
    .filter((s) => !DESK.open.includes(s.side));
}

/** A desk segment's sloping top: from its upstand's foot (0.3 of the way in) at 0.9 m to the operator's edge at 0.76 m. */
export const DESK_TOP = { from: 0.3, upstand: 0.9, edge: 0.76 } as const;

/** Segment `side`'s sloping top on plan: its upstand edge left and right, then the operator's edge right and left; and its depth across. */
export function deskTop(side: number) {
  const seg = deskSegments().find((s) => s.side === side)!;
  const at = (p: Point, q: Point) => ({
    x: p.x + (q.x - p.x) * DESK_TOP.from,
    z: p.z + (q.z - p.z) * DESK_TOP.from,
  });
  const u0 = at(seg.outer[0], seg.inner[0]);
  const u1 = at(seg.outer[1], seg.inner[1]);
  const corners: [Point, Point, Point, Point] = [
    u0,
    u1,
    seg.inner[1],
    seg.inner[0],
  ];
  return {
    corners,
    depth: DESK.top * (1 - DESK_TOP.from),
  };
}

/** Where the operator's chair stands: in the desk's well, toward its front. */
export function chairPlace(): Point {
  const inner = deskInner();
  const front = (inner[0].z + inner[1].z) / 2;
  return { x: 0, z: front + 1.6 };
}

// ---------------------------------------------------------------- stair

/**
 * The stair (Approved Document K): at most 16 risers to a flight, a
 * riser of at most 220 mm and a going of at least 220 mm for a general
 * access stair; 46 risers of 174 mm, goings of 250 mm, in three flights
 * of 16, 15 and 15, two lanes side by side (a switchback): the first and
 * third flights north up the arrival lane (off centre, on the room's
 * left), the second south up the lane east of it, landings across both
 * lanes at each end.
 */
export const STAIR = {
  risers: [16, 15, 15],
  going: 0.25,
  /** Each flight's clear width, and the landings' depth along the lanes. */
  width: 1.5,
  landing: 1.5,
  /** The wall between the lanes. */
  spine: 0.2,
  /** The stair hall's walls. */
  wall: 0.2,
  /** Where the last flight comes up into the room, z: its top nosing. */
  topZ: -2.6,
  /** The arrival lane's middle, x: off centre, between the desk and the left wall. */
  laneX: -8.2,
  /** The level floor from the door to the first riser. */
  approach: 1.6,
} as const;

export const riserHeight = () =>
  STOREY / STAIR.risers.reduce((a, b) => a + b, 0);

/**
 * The lanes: the arrival lane (first and third flights; `axis`, the
 * stair's own axis) and the second flight's lane (`side`) east of it,
 * under the room's floor toward the desk.
 */
export function lanes() {
  const w = STAIR.width;
  const x = STAIR.laneX;
  const axis = { minX: x - w / 2, maxX: x + w / 2 };
  const side = {
    minX: x + w / 2 + STAIR.spine,
    maxX: x + w / 2 + STAIR.spine + w,
  };
  return { axis, side };
}

/** Both lanes, across. */
const acrossLanes = () => {
  const { axis, side } = lanes();
  return {
    minX: Math.min(axis.minX, side.minX),
    maxX: Math.max(axis.maxX, side.maxX),
  };
};

export interface Flight {
  name: string;
  risers: number;
  /** Its walking surface, a ramp along its nosings' line. */
  surface: Surface & {
    y: { along: 'z'; at0: number; y0: number; at1: number; y1: number };
  };
}

/**
 * The stair's flights and landings. The flights' tops and feet all line
 * up at the lanes' ends: the north landing's south edge at `topZ`, the
 * south landing's north edge a flight's going south of it.
 */
export function stairPlan() {
  const r = riserHeight();
  const { going, landing } = STAIR;
  const { axis, side } = lanes();
  const north = STAIR.topZ;
  // The second and third flights (15 risers, 14 goings) span the lanes'
  // length; the first, one riser more, starts a going further south.
  const length = (STAIR.risers[1] - 1) * going;
  const south = north + length;
  const [n1, n2, n3] = STAIR.risers;
  const heights = [0, n1 * r, (n1 + n2) * r, STOREY];
  const flight = (
    name: string,
    risers: number,
    lane: { minX: number; maxX: number },
    at0: number,
    at1: number,
    y0: number,
    y1: number,
  ): Flight => ({
    name,
    risers,
    surface: {
      name,
      area: {
        ...lane,
        minZ: Math.min(at0, at1),
        maxZ: Math.max(at0, at1),
      },
      y: { along: 'z', at0, y0, at1, y1 },
    },
  });
  const foot = north + (n1 - 1) * going;
  const flights = [
    flight('First flight', n1, axis, foot, north, heights[0], heights[1]),
    flight('Second flight', n2, side, north, south, heights[1], heights[2]),
    flight('Third flight', n3, axis, south, north, heights[2], heights[3]),
  ];
  const across = acrossLanes();
  const landings: Surface[] = [
    {
      name: 'North landing',
      area: { ...across, minZ: north - landing, maxZ: north },
      y: heights[1],
    },
    {
      name: 'South landing',
      area: { ...across, minZ: south, maxZ: south + landing },
      y: heights[2],
    },
  ];
  // The stair hall: round the lanes and landings, and the level approach
  // from its door to the first riser.
  const t = STAIR.wall;
  const hall: Footprint = {
    minX: across.minX - t,
    maxX: across.maxX + t,
    minZ: north - landing - t,
    maxZ: Math.max(foot, south + landing) + STAIR.approach + t,
  };
  // The guarded opening in the room's floor: over the third flight, from
  // its top nosing back to the south landing.
  const opening: Footprint = { ...axis, minZ: north, maxZ: south };
  // The door into the stair hall, in its south wall, in line with the first flight.
  const door = {
    x: STAIR.laneX,
    z: hall.maxZ - t / 2,
    width: 1.0,
    height: 2.1,
  };
  return { flights, landings, hall, opening, door, heights, foot, south };
}

/** The stair's walking surfaces. */
export const stairSurfaces = (): Surface[] => {
  const p = stairPlan();
  return [...p.flights.map((f) => f.surface), ...p.landings];
};

// --------------------------------------------------------- walking

/**
 * The floor under a walker at (x, z), come from height `previous`: the
 * stair's surfaces, the stair hall's ground floor, and the room's floor
 * one storey up, round its opening.
 */
export function protoFloorAt(
  x: number,
  z: number,
  previous: number,
  theme: Theme = 'lair',
  game = false,
) {
  const ramp = theme === 'bridge' ? rampHeightAt(x, z) : null;
  if (game) {
    // The game's bridge has no stair (the owner, 2026-10-27): one storey,
    // its floor whole; the stage and the ramps on it, from that floor.
    const from = Math.max(previous, STOREY);
    const raised = STOREY + platformStepAt(x, z);
    const room = raised <= from + STEP_UP ? raised : STOREY;
    return ramp !== null && ramp <= from + STEP_UP
      ? Math.max(ramp, room)
      : room;
  }
  const stair = Math.max(
    surfaceFloorAt(stairSurfaces(), x, z, previous),
    ramp !== null && ramp <= previous + STEP_UP ? ramp : 0,
  );
  const { opening } = stairPlan();
  const inOpening =
    x > opening.minX &&
    x < opening.maxX &&
    z > opening.minZ + 1e-6 &&
    z < opening.maxZ;
  if (!insidePolygon(roomPolygon(), x, z) || inOpening) return stair;
  // The stage or its step there if within a step, else the main floor.
  const raised = STOREY + platformStepAt(x, z);
  const room = raised <= previous + STEP_UP ? raised : STOREY;
  return room <= previous + STEP_UP ? Math.max(stair, room) : stair;
}

/**
 * The raised stage at the back: behind the line joining the two back
 * side corners, 1.05 m up, six risers of 175 mm in the middle (five
 * treads in front of its edge), handrails both sides of them, a 1.1 m
 * guard rail along the rest of its front (a drop over 600 mm).
 */
export const PLATFORM = {
  height: 1.05,
  risers: 6,
  going: 0.28,
  /** The steps' width, centred on the axis. */
  stepWidth: 4.0,
} as const;

/**
 * The stage's front: a horseshoe (the owner, 2026-10-27, mission 095:
 * "big sweeping curves", after the starship bridge's wooden rail round its
 * command area): an arc through the two back side corners, curving back
 * `sweep` metres in the middle, round the operator's desk and chair.
 */
export const HORSESHOE = { sweep: 1.8 } as const;

export function horseshoe() {
  const corner = roomPolygon()[3];
  const s = HORSESHOE.sweep;
  const R = (corner.x * corner.x + s * s) / (2 * s);
  return { cz: corner.z + s - R, R, half: corner.x, ends: corner.z };
}

/** The stage's front edge at `x`, z: on the horseshoe. */
export function edgeAt(x: number) {
  const h = horseshoe();
  const a = Math.min(Math.abs(x), h.half);
  return h.cz + Math.sqrt(h.R * h.R - a * a);
}

/** The stage's front edge at its ends (the back side corners), z. */
export const platformEdge = () => roomPolygon()[3].z;

/** The horseshoe from `x0` to `x1`, as points every `step` metres or so. */
export function horseshoePoints(x0: number, x1: number, step = 0.4): Point[] {
  const n = Math.max(1, Math.ceil(Math.abs(x1 - x0) / step));
  return Array.from({ length: n + 1 }, (_, k) => {
    const x = x0 + ((x1 - x0) * k) / n;
    return { x, z: edgeAt(x) };
  });
}

/** How high the room's floor is at (x, z) over its main floor: on the platform, on a step, or not. */
export function platformStepAt(x: number, z: number) {
  const edge = edgeAt(x);
  if (z >= edge) return PLATFORM.height;
  const { risers, going, stepWidth, height } = PLATFORM;
  if (Math.abs(x) > stepWidth / 2) return 0;
  const treads = risers - 1;
  const k = Math.ceil((z - (edge - treads * going)) / going);
  if (k < 1) return 0;
  return (k * height) / risers;
}

/** Thin boxes along the horseshoe from `x0` to `x1`, `T` thick, `back` metres in front of it. */
function alongHorseshoe(x0: number, x1: number, T: number, back = 0) {
  const pts = horseshoePoints(x0, x1, 0.3);
  return pts.slice(1).map((b, i) => {
    const a = pts[i];
    return {
      minX: Math.min(a.x, b.x),
      maxX: Math.max(a.x, b.x),
      minZ: Math.min(a.z, b.z) - back - T,
      maxZ: Math.max(a.z, b.z) - back,
    };
  });
}

/** The rail along the platform's front, either side of its steps. */
export function platformRail(theme: Theme = 'lair'): Footprint[] {
  const room = roomPolygon();
  const half = PLATFORM.stepWidth / 2;
  const T = 0.05;
  const treads = PLATFORM.risers - 1;
  const { top, end, depth, open } = RAMP;
  // The bridge's front: open where each ramp's top landing meets it.
  const front: [number, number][] =
    theme === 'bridge'
      ? [
          [room[5].x, -top],
          [-end, -half],
          [half, end],
          [top, room[3].x],
        ]
      : [
          [room[5].x, -half],
          [half, room[3].x],
        ];
  const ramps: Footprint[] =
    theme === 'bridge'
      ? [-1, 1].flatMap((s) => [
          // Each ramp's open side, where it is high enough to fall from,
          // following the horseshoe; and its top landing's inner end.
          ...alongHorseshoe(s * open, s * end, T, depth),
          {
            minX: s > 0 ? end - T : -end,
            maxX: s > 0 ? end : -end + T,
            minZ: edgeAt(end) - depth,
            maxZ: edgeAt(end),
          },
        ])
      : [];
  return [
    ...front.flatMap(([a, b]) => alongHorseshoe(a, b, T)),
    ...ramps,
    // The steps' handrails, each side.
    ...[-half - T, half].map((x) => ({
      minX: x,
      maxX: x + T,
      minZ: edgeAt(half) - treads * PLATFORM.going,
      maxZ: edgeAt(half),
    })),
  ];
}

/**
 * The bridge's ramps, either side of the stage's steps (the owner,
 * 2026-10-27), curving round the horseshoe (mission 095): each a band
 * `depth` deep in front of the stage's edge, rising inward from `low`
 * (metres from the axis) to `top`, then a level landing to `end` beside
 * the steps, from which one steps onto the stage; guarded on its open
 * side from `open` inward, where it is high enough to fall from; walked
 * onto from the main floor at its low outer end. At about 1:7 it is
 * steeper than Approved Document M's 1:12, for the look (a question for
 * the owner).
 */
export const RAMP = {
  low: 11.0,
  top: 4.0,
  end: 2.8,
  depth: 1.2,
  open: 9.0,
} as const;

/** The bridge's ramps' floor at (x, z), over the ground, if (x, z) is on one. */
export function rampHeightAt(x: number, z: number): number | null {
  const { low, top, end, depth } = RAMP;
  const a = Math.abs(x);
  if (a < end || a > low) return null;
  const edge = edgeAt(x);
  if (z < edge - depth || z > edge) return null;
  const rise = a >= top ? (low - a) / (low - top) : 1;
  return STOREY + rise * PLATFORM.height;
}

/**
 * The lair's conference table on the platform, and its chairs, five a
 * side. The bridge has none (the owner, 2026-10-27: "get rid of the
 * conference table and chairs and just ... have displays on the back
 * wall"): its stage is open floor, its back walls' displays
 * `backWallScreenPlaces`.
 */
export const CONFERENCE = { w: 5.0, d: 1.5, z: 6.3 } as const;

export const conferenceTable = (): Footprint => ({
  minX: -CONFERENCE.w / 2,
  maxX: CONFERENCE.w / 2,
  minZ: CONFERENCE.z - CONFERENCE.d / 2,
  maxZ: CONFERENCE.z + CONFERENCE.d / 2,
});

/**
 * The conference table's chairs, each facing the table (a chair's yaw 0
 * faces south, +z): five along each long side, tucked in a little, and
 * one at each end facing along it (the owner, 2026-10-27).
 */
export const conferenceChairs = () => [
  ...[-2, -1, 0, 1, 2].flatMap((x) => [
    { x, z: CONFERENCE.z - CONFERENCE.d / 2 - 0.28, yaw: 0 },
    { x, z: CONFERENCE.z + CONFERENCE.d / 2 + 0.28, yaw: Math.PI },
  ]),
  { x: -CONFERENCE.w / 2 - 0.34, z: CONFERENCE.z, yaw: Math.PI / 2 },
  { x: CONFERENCE.w / 2 + 0.34, z: CONFERENCE.z, yaw: -Math.PI / 2 },
];

/** Boxes along the segment a–b, `depth` thick on its `side` (+1 inward of a clockwise polygon), in pieces at most `piece` long. */
export function bandAlong(
  a: Point,
  b: Point,
  depth: number,
  piece = 0.4,
  offset = 0,
): Footprint[] {
  const n = inward(a, b);
  const len = Math.hypot(b.x - a.x, b.z - a.z);
  const count = Math.max(1, Math.ceil(len / piece));
  const out: Footprint[] = [];
  for (let k = 0; k < count; k++) {
    const t0 = k / count;
    const t1 = (k + 1) / count;
    const pts = [t0, t1].flatMap((t) => {
      const px = a.x + (b.x - a.x) * t;
      const pz = a.z + (b.z - a.z) * t;
      return [offset, offset + depth].map((s) => ({
        x: px + n.x * s,
        z: pz + n.z * s,
      }));
    });
    out.push({
      minX: Math.min(...pts.map((p) => p.x)),
      maxX: Math.max(...pts.map((p) => p.x)),
      minZ: Math.min(...pts.map((p) => p.z)),
      maxZ: Math.max(...pts.map((p) => p.z)),
    });
  }
  return out;
}

/** How deep each wall's placeholder stands out from it, metres (`PLACEHOLDERS`). */
export const placeholderDepth = (side: number) =>
  PLACEHOLDERS.filter((p) => p.side === side).reduce(
    (d, p) => Math.max(d, p.depth),
    0,
  );

/**
 * The placeholders for the consoles round the walls, by side (0 the big
 * wall, then clockwise), as the owner's plan has them: where each era's
 * console will go, so the owner can judge proportions. Each is `width`
 * along its wall from its middle (`at`, metres along from the side's
 * start), `height` tall from `bottom` (over the floor it stands on: the
 * platform's, on the back walls) and `depth` deep.
 */
export const PLACEHOLDERS: readonly {
  side: number;
  label: string;
  note: string;
  era: '1980s' | '1990s' | '2010s';
  at: number;
  width: number;
  bottom: number;
  height: number;
  depth: number;
}[] = [
  {
    side: 0,
    label: '2010s LED PROCESS WALL',
    note: 'the main display: LED-matrix panels, the process animated',
    era: '2010s',
    at: 12,
    width: 20,
    bottom: 1.5,
    height: 5.5,
    depth: 0.15,
  },
  {
    side: 1,
    label: '1980s MIMIC · POOLS',
    note: 'mimic panel, 30 mm devices, moving-coil meters',
    era: '1980s',
    at: 3.45,
    width: 5.6,
    bottom: 0,
    height: 2.6,
    depth: 0.5,
  },
  {
    side: 2,
    label: '1990s LCD CONSOLES',
    note: 'segment and character LCD panels',
    era: '1990s',
    at: 3.45,
    width: 5.6,
    bottom: 0,
    height: 1.25,
    depth: 0.7,
  },
  {
    side: 3,
    label: '2010s TRENDS + CCTV',
    note: 'flat screens: trends, the CCTV quad',
    era: '2010s',
    at: 7.4,
    width: 11,
    bottom: 1.2,
    height: 2.6,
    depth: 0.15,
  },
  {
    side: 4,
    label: '1980s MIMIC · AIR + ANNUNCIATOR',
    note: 'mimic panel, alarm annunciator windows',
    era: '1980s',
    at: 7.5,
    width: 11,
    bottom: 0,
    height: 2.6,
    depth: 0.5,
  },
  {
    side: 5,
    label: '1990s OT-216 TERMINALS',
    note: 'compact terminals and their control boxes, on the wall',
    era: '1990s',
    at: 3.45,
    width: 5.6,
    bottom: 1.0,
    height: 0.9,
    depth: 0.3,
  },
  {
    side: 6,
    label: '1980s MIMIC · HEATING',
    note: 'mimic panel, 30 mm devices, moving-coil meters',
    era: '1980s',
    at: 3.45,
    width: 5.6,
    bottom: 0,
    height: 2.6,
    depth: 0.5,
  },
];

/** The floor a wall's placeholder stands on, over the main floor: the platform's on the back walls. */
export const placeholderFloor = (side: number) =>
  side === 3 || side === 4 ? PLATFORM.height : 0;

/** A placeholder's footprint corners, on plan. */
export function placeholderCorners(p: (typeof PLACEHOLDERS)[number]) {
  const [a, b] = sides(roomPolygon())[p.side];
  const len = Math.hypot(b.x - a.x, b.z - a.z);
  const u = { x: (b.x - a.x) / len, z: (b.z - a.z) / len };
  const n = inward(a, b);
  const s0 = p.at - p.width / 2;
  const s1 = p.at + p.width / 2;
  const at = (s: number, d: number) => ({
    x: a.x + u.x * s + n.x * d,
    z: a.z + u.z * s + n.z * d,
  });
  return [at(s0, 0), at(s1, 0), at(s1, p.depth), at(s0, p.depth)];
}

/** The guard round the floor's opening: its sides and back, open at its north end (the stair's mouth). */
export function openingGuard(): Footprint[] {
  const { opening } = stairPlan();
  const T = 0.05;
  return [
    { ...opening, minX: opening.minX - T, maxX: opening.minX },
    { ...opening, minX: opening.maxX, maxX: opening.maxX + T },
    {
      minX: opening.minX - T,
      maxX: opening.maxX + T,
      minZ: opening.maxZ,
      maxZ: opening.maxZ + T,
    },
  ];
}

/**
 * Where the bridge is entered from the corridor (the owner, 2026-10-27:
 * the 8 m stair abandoned, "going down it the walker's head clips through
 * the room above"; an elevator to come on the west wall, prototyped in a
 * dev room later): for now the corridor's control room doorway, a pair of
 * the standard equipment doors (`MAIN_CORRIDOR.opening` wide, its head
 * 2.52 m), set flush into the bridge's west wall (side 5) where the
 * owner's view from (−9.2, −2.7), looking west, meets it, on the bridge's
 * floor; the rest of that stretch of wall kept clear for the elevator.
 */
export const ENTRY = { side: 5, at: 3.71 } as const;

/** The bridge's doorway in its west wall: its middle on the wall's inner face, the way into the room, along the wall, and its size. */
export function bridgeDoor() {
  const [a, b] = sides(roomPolygon())[ENTRY.side];
  const len = Math.hypot(b.x - a.x, b.z - a.z);
  const u = { x: (b.x - a.x) / len, z: (b.z - a.z) / len };
  const n = inward(a, b);
  return {
    x: a.x + u.x * ENTRY.at,
    z: a.z + u.z * ENTRY.at,
    into: n,
    along: u,
    width: MAIN_CORRIDOR.opening,
    height: 2.52,
  };
}

/** The bridge's doorway's geometry for the room's runner: its faces, its frame, its leaves' and beyond's footprints, and whether a walker has gone out through it. */
export function bridgeDoorway() {
  const d = bridgeDoor();
  const t = 0.2;
  const half = d.width / 2;
  const inner = { x: d.x, z: d.z };
  const outer = { x: d.x - d.into.x * t, z: d.z - d.into.z * t };
  const box = (back: number, front: number): Footprint => {
    const pts = [-1, 1].flatMap((s) =>
      [back, front].map((k) => ({
        x: d.x + d.along.x * half * s + d.into.x * k,
        z: d.z + d.along.z * half * s + d.into.z * k,
      })),
    );
    return {
      minX: Math.min(...pts.map((p) => p.x)),
      maxX: Math.max(...pts.map((p) => p.x)),
      minZ: Math.min(...pts.map((p) => p.z)),
      maxZ: Math.max(...pts.map((p) => p.z)),
    };
  };
  return {
    inner,
    outer,
    into: d.into,
    frame: { ...outer, yaw: Math.atan2(d.into.x, d.into.z) },
    leaf: box(-t, 0),
    beyond: box(-t - 0.3, -t),
    /** The doorway's footprint while the corridor is seen through it, metres. */
    opening: box(-t - 2, 0.4),
    /** Whether (x, z) has gone out past its outer face, within its opening. */
    through(x: number, z: number) {
      const out = (outer.x - x) * d.into.x + (outer.z - z) * d.into.z;
      const along = (x - outer.x) * d.along.x + (z - outer.z) * d.along.z;
      return out > 0.05 && Math.abs(along) < half;
    },
  };
}

/** The wall pieces either side of the doorway along its side: [from, to] distances along it. */
export function entryWallPieces(): [number, number][] {
  const [a, b] = sides(roomPolygon())[ENTRY.side];
  const len = Math.hypot(b.x - a.x, b.z - a.z);
  const half = MAIN_CORRIDOR.opening / 2;
  return [
    [0, ENTRY.at - half],
    [ENTRY.at + half, len],
  ];
}

/** Where the walker arrives on the bridge: just inside the doorway, facing into the room. */
export function bridgeArrival() {
  const d = bridgeDoor();
  return {
    x: d.x + d.into.x * 0.8,
    z: d.z + d.into.z * 0.8,
    // The walker's yaw: its view (sin yaw, −cos yaw) into the room.
    yaw: Math.atan2(d.into.x, -d.into.z),
  };
}

/** The stair hall's walls, round its lanes, landings and approach. */
export function hallWalls(): Footprint[] {
  const { hall } = stairPlan();
  const t = STAIR.wall;
  return [
    { ...hall, maxX: hall.minX + t },
    { ...hall, minX: hall.maxX - t },
    { ...hall, maxZ: hall.minZ + t },
    { ...hall, minZ: hall.maxZ - t },
  ];
}

/** The wall between the lanes, the length of the flights. */
export function spine(): Footprint {
  const { axis, side } = lanes();
  const p = stairPlan();
  const [a, b] = axis.minX < side.minX ? [axis, side] : [side, axis];
  return { minX: a.maxX, maxX: b.minX, minZ: STAIR.topZ, maxZ: p.south };
}

/**
 * What stops a walker standing at height `y`. In the stair hall (below
 * the room): its walls and the spine; on the ground, also the space
 * under the second flight and the north landing, closed off; on the
 * south landing, its guard over the approach. In the room: its walls
 * with their consoles, the desk, and the guard round the opening.
 */
export function protoSolids(
  y: number,
  theme: Theme = 'lair',
  game = false,
): Footprint[] {
  const p = stairPlan();
  const { side: under } = lanes();
  if (!game && y < STOREY - 0.5) {
    const out = [...hallWalls(), spine()];
    if (y < STEP_UP)
      out.push({
        ...under,
        minZ: STAIR.topZ - STAIR.landing,
        maxZ: p.south,
      });
    else
      out.push({
        minX: p.hall.minX,
        maxX: p.hall.maxX,
        minZ: p.south + STAIR.landing,
        maxZ: p.south + STAIR.landing + 0.05,
      });
    return out;
  }
  const room = roomPolygon();
  // The game's walls carry nothing on the floor (its panels hang flat on
  // them); the prototypes' stand their placeholders out from them.
  const walls = sides(room).flatMap(([a, b], i) => {
    const depth = CONTROL_ROOM.wall + (game ? 0 : placeholderDepth(i));
    if (!game || i !== ENTRY.side) return bandAlong(a, b, depth, 0.3, -0.3);
    // The game's west wall, open at its doorway.
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const at = (d: number) => ({
      x: a.x + ((b.x - a.x) * d) / len,
      z: a.z + ((b.z - a.z) * d) / len,
    });
    return entryWallPieces().flatMap(([p, q]) =>
      bandAlong(at(p), at(q), depth, 0.3, -0.3),
    );
  });
  // Each desk segment as drawn: its angled quadrilateral, not boxes round it.
  const desk = deskSegments().flatMap((s) =>
    polygonCells([s.outer[0], s.outer[1], s.inner[1], s.inner[0]]),
  );
  const bridge = theme === 'bridge';
  return [
    ...walls,
    ...desk,
    ...(game ? [] : openingGuard()),
    ...platformRail(theme),
    ...(bridge ? [] : [conferenceTable()]),
    ...(bridge ? stationSolids() : []),
    ...(bridge ? chairSolids() : []),
    ...(bridge
      ? cornerFillets().flatMap((c) => polygonCells(circle(c, c.r)))
      : []),
    ...(bridge && y >= STOREY + PLATFORM.height - 0.3
      ? rearStationPlaces().flatMap((r) => polygonCells(r.corners))
      : []),
  ];
}

/**
 * A convex polygon's footprint as thin boxes, one a row `cell` deep, each
 * spanning the polygon's width at its row's middle: within half a cell of
 * the polygon's own outline, for walking collision (the owner, 2026-10-27:
 * boxes round angled desks blocked the walkways between them).
 */
export function polygonCells(poly: readonly Point[], cell = 0.08): Footprint[] {
  const zs = poly.map((p) => p.z);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  const out: Footprint[] = [];
  for (let z0 = minZ; z0 < maxZ - 1e-9; z0 += cell) {
    const z1 = Math.min(maxZ, z0 + cell);
    const zc = (z0 + z1) / 2;
    const xs: number[] = [];
    sides(poly).forEach(([a, b]) => {
      if ((a.z - zc) * (b.z - zc) > 0 || a.z === b.z) return;
      xs.push(a.x + ((zc - a.z) / (b.z - a.z)) * (b.x - a.x));
    });
    if (xs.length < 2) continue;
    out.push({
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minZ: z0,
      maxZ: z1,
    });
  }
  return out;
}

/** A circle as a polygon of `n` sides. */
export function circle(c: Point, r: number, n = 16): Point[] {
  return Array.from({ length: n }, (_, k) => ({
    x: c.x + r * Math.cos((k / n) * Math.PI * 2),
    z: c.z + r * Math.sin((k / n) * Math.PI * 2),
  }));
}

/**
 * The bridge's rounded corners: a fillet in each, tangent to both walls,
 * standing no more than `CORNER_FILLET` out from its corner (a fixed
 * radius in the room's wide, obtuse corners made great columns, one
 * across the east ramp's foot).
 */
export const CORNER_FILLET = 0.9;
export function cornerFillets() {
  const room = roomPolygon();
  return room.map((p, i) => {
    const prev = room[(i + room.length - 1) % room.length];
    const next = room[(i + 1) % room.length];
    const unit = (q: Point) => {
      const l = Math.hypot(q.x, q.z);
      return { x: q.x / l, z: q.z / l };
    };
    const u = unit({ x: prev.x - p.x, z: prev.z - p.z });
    const v = unit({ x: next.x - p.x, z: next.z - p.z });
    const bis = unit({ x: u.x + v.x, z: u.z + v.z });
    const half =
      Math.acos(Math.max(-1, Math.min(1, u.x * v.x + u.z * v.z))) / 2;
    const r = CORNER_FILLET / (1 / Math.sin(half) + 1);
    const d = r / Math.sin(half);
    return { x: p.x + bis.x * d, z: p.z + bis.z * d, r };
  });
}

/** The bridge's chairs' places: the operator's and those beside it, and each station's. */
export function chairPlaces(): { x: number; z: number; r: number }[] {
  const c = chairPlace();
  return [
    { x: c.x, z: c.z, r: 0.42 },
    { x: c.x - 1.5, z: c.z + 0.5, r: 0.34 },
    { x: c.x + 1.5, z: c.z + 0.5, r: 0.34 },
    ...stationPlaces().map((st) => ({
      x: st.x - Math.sin(st.yaw) * 0.9,
      z: st.z + Math.cos(st.yaw) * 0.9,
      r: 0.28,
    })),
  ];
}

/** What the chairs stop a walker with: their seats' footprints. */
export const chairSolids = (): Footprint[] =>
  chairPlaces().map((c) => ({
    minX: c.x - c.r,
    maxX: c.x + c.r,
    minZ: c.z - c.r,
    maxZ: c.z + c.r,
  }));

/** Where the walker starts: in the stair hall, inside its door, facing the stair. */
export function protoStart() {
  const { door } = stairPlan();
  return { x: door.x, z: door.z - 0.8, yaw: 0 };
}

/** The plan's bounds, for the room's frame and its noclip. */
export function protoBounds(): Footprint {
  const room = roomPolygon();
  const { hall } = stairPlan();
  const t = CONTROL_ROOM.wall;
  return {
    minX: Math.min(...room.map((p) => p.x)) - t,
    maxX: Math.max(...room.map((p) => p.x)) + t,
    minZ: Math.min(...room.map((p) => p.z)) - t,
    maxZ: Math.max(hall.maxZ, ...room.map((p) => p.z + t)),
  };
}

/**
 * The ring light (the owner, 2026-10-27, after the war room in Dr.
 * Strangelove): a giant circular luminaire `diameter` across, hung on
 * rods from the ceiling `height` over the floor, centred on the
 * operator's chair, lighting the desk in a pool. Set decoration.
 */
export const RING_LIGHT = { diameter: 8, height: 3.4, hangers: 8 } as const;

export const ringLightCentre = () => chairPlace();

/**
 * The operator stations, one per major pool system (the owner,
 * 2026-10-27: "operator stations for each of the major swimming pool
 * systems", flat sloping touch panels after a starship's bridge, a style
 * cue only): in a shallow arc round the front of the desk, centred on
 * the operator's chair, each turned a little toward the middle but all
 * facing the big wall. Placeholders: no touch controls or sounds yet.
 */
export const STATIONS = [
  'FLOW NAVIGATOR',
  'DISINFECTION TACTICAL',
  'BOILER HELMSMAN',
  'LIFE SUPPORT OFFICER',
  'CHIEF ELECTRICAL ENGINEER',
  'SECURITY CHIEF',
] as const;

/**
 * The bridge's officers (the owner, 2026-10-27, mission 095): each
 * station a parody officer's, its nameplate the role and its duty. The
 * forward six round the desk; the command chairs at the desk (the duty
 * manager's in the middle at Central Control, the assistant duty
 * manager's at its right, the bather welfare counsellor's at its left);
 * the rear four along the aft walls on the stage.
 */
export const DUTIES: Record<string, string> = {
  'FLOW NAVIGATOR': 'CIRCULATION AND FILTRATION',
  'DISINFECTION TACTICAL': 'DOSING AND DISINFECTION',
  'BOILER HELMSMAN': 'GAS AND BOILERS',
  'LIFE SUPPORT OFFICER': 'AIR HANDLING',
  'CHIEF ELECTRICAL ENGINEER': 'POWER AND LIGHTING',
  'SECURITY CHIEF': 'DOORS, CCTV, FIRE AND GAS',
  'THE DUTY MANAGER': 'CENTRAL CONTROL',
  'THE ASSISTANT DUTY MANAGER': 'BATHERS AND OPENING',
  'THE BATHER WELFARE COUNSELLOR': 'WARMTH AND COMFORT',
  'WATER SCIENCE OFFICER': 'READINGS AND TRENDS',
  'DRAINAGE OFFICER': 'BACKWASH AND DRAINAGE',
  'LOADING BAY CHIEF': 'DELIVERIES AND THE DOCK',
  'OPERATIONS OFFICER': 'CHEMICAL STOCKS',
};

/** The rear stations, along the aft walls on the stage: their side, and where along it (a share). */
export const REAR_STATIONS = [
  { role: 'WATER SCIENCE OFFICER', side: 4, at: 0.45, panel: 'CR-CP3' },
  { role: 'DRAINAGE OFFICER', side: 4, at: 0.6, panel: 'WH-T2' },
  { role: 'LOADING BAY CHIEF', side: 3, at: 0.4, panel: 'LB-CAB1' },
  { role: 'OPERATIONS OFFICER', side: 3, at: 0.55, panel: 'WH-CP1' },
] as const;

/** A rear station's console: standing height, its top sloping up to the wall. */
export const REAR_CONSOLE = {
  w: 2.0,
  d: 0.7,
  low: 0.95,
  high: 1.2,
  /** Its middle's distance out from the wall. */
  out: 0.45,
} as const;

/** Each rear station's console: its middle, its operator's way (facing the wall), its corners. */
export function rearStationPlaces() {
  const room = roomPolygon();
  return REAR_STATIONS.map((r) => {
    const [a, b] = sides(room)[r.side];
    const n = inward(a, b);
    const u = { x: b.x - a.x, z: b.z - a.z };
    const len = Math.hypot(u.x, u.z);
    const ux = u.x / len;
    const uz = u.z / len;
    const x = a.x + u.x * r.at + n.x * REAR_CONSOLE.out;
    const z = a.z + u.z * r.at + n.z * REAR_CONSOLE.out;
    const { w, d } = REAR_CONSOLE;
    const at = (s: number, t: number): Point => ({
      x: x + (ux * s * w) / 2 + (n.x * t * d) / 2,
      z: z + (uz * s * w) / 2 + (n.z * t * d) / 2,
    });
    return {
      ...r,
      x,
      z,
      /** The way out from the wall, into the room: where its operator stands. */
      n,
      corners: [at(-1, -1), at(1, -1), at(1, 1), at(-1, 1)] as [
        Point,
        Point,
        Point,
        Point,
      ],
    };
  });
}

export const STATION = {
  /** Its width and depth on plan. */
  w: 1.8,
  d: 0.9,
  /** The arc's radius from the chair, and each station's bearing from north, degrees. */
  radius: 6.2,
  bearings: [-64, -39, -14, 14, 39, 64],
  /** Its top: the operator's edge, and the far edge. */
  low: 0.76,
  high: 1.0,
} as const;

export interface StationPlace {
  system: (typeof STATIONS)[number];
  x: number;
  z: number;
  /** The way its operator looks (`(sin yaw, -cos yaw)`): 0 is north, to the big wall. */
  yaw: number;
  /** Its corners on plan: the operator's edge right to left, then the far edge left to right. */
  corners: [Point, Point, Point, Point];
}

export function stationPlaces(): StationPlace[] {
  const c = chairPlace();
  return STATIONS.map((system, i) => {
    const phi = (STATION.bearings[i] * Math.PI) / 180;
    const x = c.x + STATION.radius * Math.sin(phi);
    const z = c.z - STATION.radius * Math.cos(phi);
    const yaw = -phi / 3;
    const f = { x: Math.sin(yaw), z: -Math.cos(yaw) };
    const r = { x: Math.cos(yaw), z: Math.sin(yaw) };
    const at = (s: number, t: number) => ({
      x: x + (r.x * s * STATION.w) / 2 + (f.x * t * STATION.d) / 2,
      z: z + (r.z * s * STATION.w) / 2 + (f.z * t * STATION.d) / 2,
    });
    return {
      system,
      x,
      z,
      yaw,
      corners: [at(1, -1), at(-1, -1), at(-1, 1), at(1, 1)],
    };
  });
}

/** What a station stops a walker with: its footprint, in short boxes. */
export const stationSolids = (): Footprint[] =>
  stationPlaces().flatMap((s) => polygonCells(s.corners));

/** A touch panel's place on the bridge: its middle, its turn about y, its tilt back from upright, and how far it is scaled. */
export interface PanelPlace {
  code: string;
  x: number;
  y: number;
  z: number;
  /** Its face's turn about y (as Three turns an object): its +z the way it faces. */
  yaw: number;
  /** Tilted back from upright, radians (π/2 lies flat, face up). */
  tilt: number;
  /** Its glass's largest width and height here, metres. */
  fit: { w: number; h: number };
}

/**
 * The bridge's wired panels (mission 095), by the spec codes of
 * `bridge-bindings.ts`: one on each system station's sloping top, facing
 * its operator; Central Control on the operator's desk, its front
 * segment's sloping top; and the control room's own boards and the
 * chemical distribution's on the front walls, at eye height.
 */
export const STATION_PANELS: Record<(typeof STATIONS)[number], string> = {
  'FLOW NAVIGATOR': 'PL2-CP1',
  'DISINFECTION TACTICAL': 'PL2-CP2',
  'BOILER HELMSMAN': 'CR-MP2',
  'LIFE SUPPORT OFFICER': 'CR-MP3',
  'CHIEF ELECTRICAL ENGINEER': 'SR-IS3',
  'SECURITY CHIEF': 'CR-CP6',
};
export const WALL_PANELS: readonly { code: string; side: number }[] = [
  { code: 'CR-MP1', side: 1 },
  { code: 'CR-CP2', side: 6 },
];
/** The command chairs' panels on the desk: the assistant duty manager's at the right (east), the counsellor's at the left. */
export const DESK_PANELS: readonly { code: string; side: number }[] = [
  { code: 'ADM-01', side: 1 },
  { code: 'BWC-01', side: 6 },
];

export function bridgePanelPlaces(): PanelPlace[] {
  const slope = Math.atan2(STATION.high - STATION.low, STATION.d);
  const stations = stationPlaces().map((st): PanelPlace => ({
    code: STATION_PANELS[st.system],
    x: st.x,
    y: STOREY + (STATION.low + STATION.high) / 2 + 0.012,
    z: st.z,
    yaw: -st.yaw,
    tilt: Math.PI / 2 - slope,
    fit: { w: STATION.w - 0.1, h: STATION.d - 0.06 },
  }));
  // Central Control on the desk's front segment, between its upstand and
  // the operator's edge (its top 0.9 m high there, 0.76 at the edge).
  const lerp = (p: Point, q: Point, t: number) => ({
    x: p.x + (q.x - p.x) * t,
    z: p.z + (q.z - p.z) * t,
  });
  const onDesk = (side: number, code: string): PanelPlace => {
    // Flush in its own segment's sloping top: centred, its edges parallel
    // to the segment's front, at its slope, inside its narrower (inner)
    // edge, never across into its neighbour (the owner, 2026-10-27).
    const top = deskTop(side);
    const [u0, u1, q1, q0] = top.corners;
    const n = inward(u0, u1);
    const centre = lerp(lerp(u0, u1, 0.5), lerp(q0, q1, 0.5), 0.5);
    const inner = Math.hypot(q1.x - q0.x, q1.z - q0.z);
    const dep = top.depth;
    return {
      code,
      x: centre.x,
      y: STOREY + (DESK_TOP.upstand + DESK_TOP.edge) / 2 + 0.014,
      z: centre.z,
      // Facing its operator: the segment's inward normal.
      yaw: Math.atan2(n.x, n.z),
      tilt: Math.PI / 2 - Math.atan2(DESK_TOP.upstand - DESK_TOP.edge, dep),
      fit: { w: inner - 0.12, h: dep - 0.06 },
    };
  };
  const central = onDesk(0, 'CC-01');
  const room = roomPolygon();
  const walls = WALL_PANELS.map(({ code, side }): PanelPlace => {
    const [a, b] = sides(room)[side];
    const n = inward(a, b);
    return {
      code,
      x: (a.x + b.x) / 2 + n.x * 0.06,
      y: STOREY + 1.75,
      z: (a.z + b.z) / 2 + n.z * 0.06,
      yaw: Math.atan2(n.x, n.z),
      tilt: 0,
      fit: { w: 3.2, h: 1.9 },
    };
  });
  const desk = DESK_PANELS.map((p) => onDesk(p.side, p.code));
  const rear = rearStationPlaces().map((r): PanelPlace => {
    const slope = Math.atan2(
      REAR_CONSOLE.high - REAR_CONSOLE.low,
      REAR_CONSOLE.d,
    );
    return {
      code: r.panel,
      x: r.x,
      y:
        STOREY +
        PLATFORM.height +
        (REAR_CONSOLE.low + REAR_CONSOLE.high) / 2 +
        0.012,
      z: r.z,
      // Facing its operator, out from the wall.
      yaw: Math.atan2(r.n.x, r.n.z),
      tilt: Math.PI / 2 - slope,
      fit: { w: REAR_CONSOLE.w - 0.1, h: REAR_CONSOLE.d - 0.06 },
    };
  });
  return [...stations, central, ...desk, ...walls, ...rear];
}

/** The bridge's main viewscreen on the big wall: its middle, facing the room, and its glass. */
export function viewscreenPlace() {
  const screen = PLACEHOLDERS.find((p) => p.side === 0)!;
  const height = CONTROL_ROOM.ceiling - 1.2;
  return {
    x: 0,
    y: STOREY + 0.5 + height / 2,
    z: CONTROL_ROOM.frontZ + screen.depth + 0.03,
    size: { w: screen.width * 0.94, h: height * 0.84 },
  };
}

/**
 * Each officer's plaque (the owner, 2026-10-27: small, fitted to the
 * desk, readable where its officer stands): its role, its middle, and its
 * face's turn (+z outward, toward its officer). A station's in its front
 * edge under the operator's side of its top; a rear station's in its
 * front edge; the command chairs' in the desk's operator's edge before
 * each (the assistant duty manager's on the duty manager's right, east;
 * the counsellor's on the left, west).
 */
export function plaquePlaces() {
  const out: { role: string; x: number; y: number; z: number; yaw: number }[] =
    [];
  for (const st of stationPlaces()) {
    const [a, b] = st.corners;
    const back = { x: -Math.sin(st.yaw), z: Math.cos(st.yaw) };
    out.push({
      role: st.system,
      x: (a.x + b.x) / 2 + back.x * 0.004,
      y: STOREY + STATION.low - 0.04,
      z: (a.z + b.z) / 2 + back.z * 0.004,
      yaw: -st.yaw,
    });
  }
  for (const r of rearStationPlaces()) {
    const [, , c, d] = r.corners;
    out.push({
      role: r.role,
      x: (c.x + d.x) / 2 + r.n.x * 0.004,
      y: STOREY + PLATFORM.height + REAR_CONSOLE.low - 0.04,
      z: (c.z + d.z) / 2 + r.n.z * 0.004,
      yaw: Math.atan2(r.n.x, r.n.z),
    });
  }
  for (const [side, role] of [
    [0, 'THE DUTY MANAGER'],
    [1, 'THE ASSISTANT DUTY MANAGER'],
    [6, 'THE BATHER WELFARE COUNSELLOR'],
  ] as const) {
    const [u0, u1, q1, q0] = deskTop(side).corners;
    const n = inward(u0, u1);
    out.push({
      role,
      x: (q0.x + q1.x) / 2 + n.x * 0.004,
      y: STOREY + DESK_TOP.edge - 0.03,
      z: (q0.z + q1.z) / 2 + n.z * 0.004,
      yaw: Math.atan2(n.x, n.z),
    });
  }
  return out;
}

/**
 * The bridge's schematic screens (mission 095; the owner, 2026-10-27: the
 * stations' schematics, turning through their designs, on the stations'
 * screens and the desk's upstands): where each goes, its middle, its turn
 * and tilt as `PanelPlace`'s, its glass, and the station whose browser it
 * shows (`station-schematics.ts`).
 */
export interface SchematicScreenPlace {
  station: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  tilt: number;
  size: { w: number; h: number };
}

/** Each desk segment's upstand screens' station: Central Control's in front, the others round it. */
export const DESK_SCREEN_STATIONS: Record<number, string> = {
  0: 'CENTRAL CONTROL',
  1: 'WATER SCIENCE OFFICER',
  2: 'FLOW NAVIGATOR',
  5: 'SECURITY CHIEF',
  6: 'MAIN VIEWSCREEN',
};

/** The desk's upstand, its raked face: from its foot (0.3 of the way in, 0.9 m) back to its head (0.18 in, 1.45 m). */
export const DESK_UPSTAND = {
  foot: 0.3,
  head: 0.18,
  low: 0.9,
  high: 1.45,
} as const;

/** How many screens a desk segment's upstand holds: one for about every 1.4 m. */
export const upstandScreens = (len: number) =>
  Math.max(1, Math.round(len / 1.4));

/** The screens in the desk's upstands, as the room draws their openings (u 0.18–0.82 of each share, v 0.2–0.85 up the face). */
export function deskScreenPlaces(): SchematicScreenPlace[] {
  const out: SchematicScreenPlace[] = [];
  const lerp = (p: Point, q: Point, t: number): Point => ({
    x: p.x + (q.x - p.x) * t,
    z: p.z + (q.z - p.z) * t,
  });
  const { foot, head, low, high } = DESK_UPSTAND;
  for (const s of deskSegments()) {
    const [P0, P1] = s.outer;
    const [Q0, Q1] = s.inner;
    const U0 = lerp(P0, Q0, foot);
    const U1 = lerp(P1, Q1, foot);
    const R0 = lerp(P0, Q0, head);
    const R1 = lerp(P1, Q1, head);
    const n = inward(P0, P1);
    const len = Math.hypot(P1.x - P0.x, P1.z - P0.z);
    const screens = upstandScreens(len);
    // The face leans back by the run from its foot to its head.
    const run = Math.hypot(U0.x - R0.x, U0.z - R0.z);
    const rise = high - low;
    const slant = Math.hypot(run, rise);
    const edge = Math.min(
      Math.hypot(U1.x - U0.x, U1.z - U0.z),
      Math.hypot(R1.x - R0.x, R1.z - R0.z),
    );
    for (let k = 0; k < screens; k++) {
      const u = (k + 0.5) / screens;
      const v = 0.525;
      const p = lerp(lerp(U0, U1, u), lerp(R0, R1, u), v);
      out.push({
        station: DESK_SCREEN_STATIONS[s.side] ?? 'MAIN VIEWSCREEN',
        x: p.x,
        y: STOREY + low + rise * v,
        z: p.z,
        yaw: Math.atan2(n.x, n.z),
        tilt: Math.atan2(run, rise),
        size: { w: (edge / screens) * 0.64 - 0.03, h: slant * 0.65 - 0.03 },
      });
    }
  }
  return out;
}

/** A forward station's upper screen: on a short stalk at its top's far edge, leaning back. */
export const STATION_SCREEN = {
  w: 1.0,
  h: 0.52,
  stalk: 0.08,
  lean: 0.35,
  behind: 0.06,
} as const;

/**
 * The bridge's wall fins (the vertical joints between its wall panels,
 * one every 2.4 m or so): `w` wide, standing `depth` out from the wall's
 * face.
 */
export const BRIDGE_FIN = { w: 0.06, depth: 0.04 } as const;

/**
 * How far a screen hung on the bridge's walls stands off the wall, to the
 * back of its body: 10 mm clear of the fins (the owner, 2026-10-27: the
 * back walls' displays cut into them). A schematic surface's body is 20 mm
 * deep, in front of its holder's origin.
 */
export const WALL_SCREEN_OFF = BRIDGE_FIN.depth + 0.01;

/** A rear station's screen on the aft wall over its console. */
export const REAR_SCREEN = { w: 1.7, h: 0.92, middle: 1.75 } as const;

/** The forward stations' upper screens and the rear stations' wall screens. */
export function stationScreenPlaces(): SchematicScreenPlace[] {
  const { w, h, stalk, lean, behind } = STATION_SCREEN;
  const forward = stationPlaces().map((st): SchematicScreenPlace => {
    const [, , c, d] = st.corners;
    const f = { x: Math.sin(st.yaw), z: -Math.cos(st.yaw) };
    const mid = { x: (c.x + d.x) / 2, z: (c.z + d.z) / 2 };
    const out = behind + (h / 2) * Math.sin(lean);
    return {
      station: st.system,
      x: mid.x + f.x * out,
      y: STOREY + STATION.high + stalk + (h / 2) * Math.cos(lean),
      z: mid.z + f.z * out,
      yaw: -st.yaw,
      tilt: lean,
      size: { w, h },
    };
  });
  const rear = rearStationPlaces().map((r): SchematicScreenPlace => ({
    station: r.role,
    // On the wall behind its console, clear of the wall's fins.
    x: r.x - r.n.x * (REAR_CONSOLE.out - WALL_SCREEN_OFF),
    y: STOREY + PLATFORM.height + REAR_SCREEN.middle,
    z: r.z - r.n.z * (REAR_CONSOLE.out - WALL_SCREEN_OFF),
    yaw: Math.atan2(r.n.x, r.n.z),
    tilt: 0,
    size: { w: REAR_SCREEN.w, h: REAR_SCREEN.h },
  }));
  return [...forward, ...rear];
}

/**
 * The displays on the bridge's back walls (the owner, 2026-10-27: "get
 * rid of the conference table and chairs and just ... have displays on
 * the back wall"), on the two aft walls over the stage (sides 3 and 4):
 * a large screen high on each, over the light strip's hood, and on each
 * a screen at eye height either side of its rear stations, in the
 * stretches they leave free. Each turns through its designs: a
 * station's (`station-schematics.ts`) or hydrodynamic overviews by id
 * (`schematic-overviews.ts`). `at` is metres along its wall from its
 * start (side 3 from the east side corner to the back corner, side 4
 * from the back corner west), `middle` its middle over the stage.
 */
export const BACK_WALL_SCREENS: readonly {
  title: string;
  side: 3 | 4;
  at: number | 'middle';
  middle: number;
  w: number;
  h: number;
  /** A station's designs, or overviews by id. */
  show: { station: string } | { overviews: readonly string[] };
}[] = [
  {
    title: 'SITE STATUS',
    side: 4,
    at: 'middle',
    middle: 4.4,
    w: 4.8,
    h: 2.6,
    show: { station: 'CENTRAL CONTROL' },
  },
  {
    title: 'THE WHOLE PLANT',
    side: 3,
    at: 'middle',
    middle: 4.4,
    w: 4.8,
    h: 2.6,
    show: { station: 'MAIN VIEWSCREEN' },
  },
  {
    title: 'MAIN POOLS',
    side: 4,
    at: 2.95,
    middle: 1.75,
    w: 3.0,
    h: 1.5,
    show: { overviews: ['olympic', 'lounge'] },
  },
  {
    title: 'SMALL POOLS',
    side: 3,
    at: -2.95,
    middle: 1.75,
    w: 3.0,
    h: 1.5,
    show: { overviews: ['jacuzzi', 'footbath'] },
  },
  {
    title: 'HEAT AND GAS',
    side: 4,
    at: -2.65,
    middle: 1.75,
    w: 3.0,
    h: 1.5,
    show: { overviews: ['heating', 'gas'] },
  },
  {
    title: 'AIR AND POWER',
    side: 3,
    at: 2.65,
    middle: 1.75,
    w: 3.0,
    h: 1.5,
    show: { overviews: ['air', 'power'] },
  },
];

/** The back walls' displays placed: each one's middle `WALL_SCREEN_OFF` out from its wall, facing the room, and its stretch along the wall (metres from its start). */
export function backWallScreenPlaces() {
  const room = roomPolygon();
  return BACK_WALL_SCREENS.map((s) => {
    const [a, b] = sides(room)[s.side];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const n = inward(a, b);
    // A negative `at` counts back from the wall's end.
    const at = s.at === 'middle' ? len / 2 : s.at < 0 ? len + s.at : s.at;
    const t = at / len;
    return {
      ...s,
      x: a.x + (b.x - a.x) * t + n.x * WALL_SCREEN_OFF,
      y: STOREY + PLATFORM.height + s.middle,
      z: a.z + (b.z - a.z) * t + n.z * WALL_SCREEN_OFF,
      yaw: Math.atan2(n.x, n.z),
      tilt: 0,
      size: { w: s.w, h: s.h },
      along: [at - s.w / 2, at + s.w / 2] as [number, number],
    };
  });
}

/**
 * The east wall kept clear for a doorway (the owner, 2026-10-27: "I'll
 * use the east door to open into a Star Trek style captain's ready room.
 * That'll be a future change though. So reserve the east panel that
 * doesn't have anything on it for a doorway in future"): the east side
 * wall (side 2), between its corners' fillets, and `depth` metres of
 * floor before it. Nothing is to be placed there: no panels, screens,
 * stations or chairs. The door and the room are not built yet
 * (`TODO.md`).
 */
export const READY_ROOM_RESERVE = { side: 2, depth: 1.5 } as const;

/** The reserved east wall: its ends, the way into the room, and the stretch along it kept clear (metres from its start, inside the fillets). */
export function readyRoomReserve() {
  const [a, b] = sides(roomPolygon())[READY_ROOM_RESERVE.side];
  const len = Math.hypot(b.x - a.x, b.z - a.z);
  return {
    a,
    b,
    n: inward(a, b),
    along: [CORNER_FILLET, len - CORNER_FILLET] as [number, number],
  };
}

/** Whether (x, z) is on the reserved east wall's stretch, within its `depth` of floor before it. */
export function inReadyRoomReserve(x: number, z: number) {
  const { a, b, n, along } = readyRoomReserve();
  const len = Math.hypot(b.x - a.x, b.z - a.z);
  const s = ((x - a.x) * (b.x - a.x) + (z - a.z) * (b.z - a.z)) / len;
  const d = (x - a.x) * n.x + (z - a.z) * n.z;
  return (
    s >= along[0] &&
    s <= along[1] &&
    d >= -CONTROL_ROOM.wall &&
    d <= READY_ROOM_RESERVE.depth
  );
}
