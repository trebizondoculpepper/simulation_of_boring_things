import type { Footprint } from '../../controls/logic/walk-collision';

/**
 * The main corridor: a square ring of plant corridor at plant-floor level,
 * round the wet hall, the main plant room, which fills the block in its
 * middle, half a storey down (`shell-rooms.ts`). It is as tall as the
 * plant rooms (two storeys) and under the same generated services
 * ceiling. Every other room of the plant opens off its outside walls,
 * each through a pair of equipment doors in the middle of its frontage;
 * the wet hall's two pairs are in its east and west inside walls. Pure:
 * metres, the ring's north-west outside corner at the origin, x east, z
 * south; the floor at y = 0.
 */

export const MAIN_CORRIDOR = {
  /** Clear width: equipment on trolleys passes, and turns into the doors. */
  width: 4,
  /** The ring's outside side, wall to wall. */
  side: 28,
  /** As tall as the plant rooms: two storeys of 3.5 m. */
  height: 7,
  wall: 0.2,
  /** The equipment doors' structural opening (`equipment-doors.ts`). */
  opening: 1.8 + 2 * 0.06,
} as const;

/**
 * Its walls: the four outside walls, and the four inside walls round the
 * wet hall's block, each named by the side of the ring it bounds.
 */
export type CorridorWall =
  | 'north'
  | 'east'
  | 'south'
  | 'west'
  | 'inner-north'
  | 'inner-east'
  | 'inner-south'
  | 'inner-west';

export const CORRIDOR_WALLS: readonly CorridorWall[] = [
  'north',
  'east',
  'south',
  'west',
  'inner-north',
  'inner-east',
  'inner-south',
  'inner-west',
];

/** A doorway in one of the corridor's walls: which wall, and its middle along it. */
export interface CorridorDoor {
  wall: CorridorWall;
  /** Along the wall: x for the north and south walls, z for the west and east. */
  at: number;
  /** The room beyond. */
  to: string;
}

const C = MAIN_CORRIDOR;

/**
 * The doors, each in the middle of its room's frontage, the rooms packed
 * along each outside wall from its north or west end with a 0.2 m party
 * wall between them: north, the Olympic pool's plant room (22 m) and the
 * engineer's office (4 m); east, the air handling plant (17.5 m) and the
 * control room (5.5 m); south, the lounge pool's plant room (12 m), the
 * boiler house (8 m) and the electrical switch room (5 m); west, the
 * loading bay (7.5 m), and the footbath's (5 m) and the jacuzzi's (8 m)
 * plant rooms. The wet hall has two pairs, opposite each other: east, in
 * the middle of its wall, for its stair; west, at the north end of its
 * wall by the loading bay's, for its trolley ramp; in that order.
 */
export const CORRIDOR_DOORS: readonly CorridorDoor[] = [
  { wall: 'north', at: 11.2, to: 'plant_pool_02' },
  { wall: 'north', at: 24.6, to: 'engineers_office' },
  { wall: 'east', at: 9, to: 'air_plant' },
  { wall: 'east', at: 20.9, to: 'control_room' },
  { wall: 'south', at: 6.2, to: 'plant_pool_01' },
  { wall: 'south', at: 16.6, to: 'boiler_house' },
  { wall: 'south', at: 23.5, to: 'switch_room' },
  { wall: 'west', at: 4, to: 'loading_bay' },
  { wall: 'west', at: 10.5, to: 'plant_pool_04' },
  { wall: 'west', at: 17.5, to: 'plant_pool_03' },
  // The wet hall's stair entrance, in the middle of its east wall.
  { wall: 'inner-east', at: 14, to: 'wet_hall' },
  // The west pair at the north end of its wall, by the loading bay's: the
  // wet hall's trolley ramp is inside it.
  { wall: 'inner-west', at: 6, to: 'wet_hall' },
];

/**
 * Where each wall stands: its line (z for walls running east-west, x for
 * those running north-south), the extent it runs along (the wall itself
 * running a thickness further at each end, to close the corners), and
 * the way from it into the corridor. Each wall's thickness lies behind
 * its line, outside the corridor's floor.
 */
export function corridorWalls(): Record<
  CorridorWall,
  {
    line: number;
    from: number;
    to: number;
    into: readonly [number, number];
    alongX: boolean;
  }
> {
  const S = C.side;
  const w = C.width;
  return {
    north: { line: 0, from: 0, to: S, into: [0, 1], alongX: true },
    south: { line: S, from: 0, to: S, into: [0, -1], alongX: true },
    west: { line: 0, from: 0, to: S, into: [1, 0], alongX: false },
    east: { line: S, from: 0, to: S, into: [-1, 0], alongX: false },
    'inner-north': { line: w, from: w, to: S - w, into: [0, -1], alongX: true },
    'inner-south': {
      line: S - w,
      from: w,
      to: S - w,
      into: [0, 1],
      alongX: true,
    },
    'inner-west': { line: w, from: w, to: S - w, into: [-1, 0], alongX: false },
    'inner-east': {
      line: S - w,
      from: w,
      to: S - w,
      into: [1, 0],
      alongX: false,
    },
  };
}

/** Whether (x, z) is on the corridor's floor. */
export function inCorridor(x: number, z: number) {
  const S = C.side;
  const w = C.width;
  const inRing = x >= 0 && x <= S && z >= 0 && z <= S;
  const inBlock = x > w && x < S - w && z > w && z < S - w;
  return inRing && !inBlock;
}

/** A door's middle on the wall's corridor face, and the way into the corridor. */
export function doorPlace(d: CorridorDoor) {
  const { line, into, alongX } = corridorWalls()[d.wall];
  return alongX ? { x: d.at, z: line, into } : { x: line, z: d.at, into };
}

/** A footprint along a wall, from `a` to `b`, across its thickness behind its line. */
function behind(wall: CorridorWall, a: number, b: number): Footprint {
  const { line, into, alongX } = corridorWalls()[wall];
  const t = C.wall;
  const k = alongX ? into[1] : into[0];
  const [p, q] = k > 0 ? [line - t, line] : [line, line + t];
  return alongX
    ? { minX: a, maxX: b, minZ: p, maxZ: q }
    : { minX: p, maxX: q, minZ: a, maxZ: b };
}

/** Each wall's solid pieces, from end to end, split round its doorways. */
export function wallPieces(wall: CorridorWall): [number, number][] {
  const { from, to } = corridorWalls()[wall];
  const t = C.wall;
  const half = C.opening / 2;
  const doors = CORRIDOR_DOORS.filter((d) => d.wall === wall)
    .map((d) => d.at)
    .sort((a, b) => a - b);
  let start = from - t;
  const pieces: [number, number][] = [];
  for (const at of doors) {
    pieces.push([start, at - half]);
    start = at + half;
  }
  pieces.push([start, to + t]);
  return pieces;
}

/**
 * The walls as footprints for walking collision, each split round its
 * doorways (which the room closes while their doors are shut).
 */
export function corridorSolids(): Footprint[] {
  return CORRIDOR_WALLS.flatMap((wall) =>
    wallPieces(wall).map(([a, b]) => behind(wall, a, b)),
  );
}

/** A shut pair of doors across a doorway, as a footprint. */
export function corridorDoorBlock(d: CorridorDoor): Footprint {
  const half = C.opening / 2;
  return behind(d.wall, d.at - half, d.at + half);
}

/** The heading into the corridor through a door's frame (`door-joins.ts`): +z into the corridor. */
export const corridorYaw = (d: CorridorDoor) => {
  const { into } = doorPlace(d);
  return Math.atan2(into[0], into[1]);
};

/**
 * The ring's four quadrants, each with its own dado colour so a walker
 * knows where they are: clockwise from the north-west, green (the
 * corridor's first colour), pink, blue and grey.
 */
export const CORRIDOR_QUADRANTS = {
  'north-west': '#6d7a6f',
  'north-east': '#b5838d',
  'south-east': '#5b7897',
  'south-west': '#76797b',
} as const;
export type CorridorQuadrant = keyof typeof CORRIDOR_QUADRANTS;

/** Which quadrant a point of the ring is in, split at its middle. */
export function corridorQuadrant(x: number, z: number): CorridorQuadrant {
  const half = C.side / 2;
  return `${z < half ? 'north' : 'south'}-${x < half ? 'west' : 'east'}`;
}

/**
 * A wall's dado from `a` to `b` along it, cut where it crosses the ring's
 * middle, each piece with its quadrant.
 */
export function dadoPieces(
  wall: CorridorWall,
  a: number,
  b: number,
): { a: number; b: number; quadrant: CorridorQuadrant }[] {
  const { line, alongX } = corridorWalls()[wall];
  const half = C.side / 2;
  const cuts =
    a < half && half < b
      ? [
          [a, half],
          [half, b],
        ]
      : [[a, b]];
  return cuts.map(([p, q]) => {
    const mid = (p + q) / 2;
    return {
      a: p,
      b: q,
      quadrant: alongX
        ? corridorQuadrant(mid, line)
        : corridorQuadrant(line, mid),
    };
  });
}
