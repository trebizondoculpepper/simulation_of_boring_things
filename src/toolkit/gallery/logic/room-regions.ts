import { STOREY } from '../../../game/plant/network/common';
import type { Footprint } from '../../controls/logic/walk-collision';

/**
 * A room's reserved regions (`doc/prompts/done/017-room-sizer-gantries-placement.md`):
 * boxes of the room that machines, or runs of pipe and conduit, must keep
 * out of. The second of the room's four layers (sizer, regions, placement,
 * plumber): the room sizer gives the room, this reserves its doorways'
 * approaches and, in a room of two storeys or more, an observation gantry
 * along one wall with a straight stair up to it against the same wall (the
 * owner, 2026-10-23); placement fits the machines round them, and the
 * plumber routes round them. No run may pass above a stair or a gantry's
 * walkway. Pure: metres, the room's middle at x = z = 0, its floor at
 * y = 0, north −z.
 */

export type Vec3 = readonly [number, number, number];
export type Side = 'north' | 'east' | 'south' | 'west';

export interface Region {
  name: string;
  kind: 'walkway' | 'gantry' | 'stair' | 'access' | 'door';
  /** An axis-aligned box, metres. */
  min: Vec3;
  max: Vec3;
  /** What it keeps out: machines standing in it, and runs passing through it. */
  forbids: { machines: boolean; runs: boolean };
}

/** A room as the regions need it: its inside, wall face to wall face, and its doors. */
export interface RegionRoom {
  /** Width (x) and depth (z) inside the walls, and height to the soffit, metres. */
  w: number;
  d: number;
  h: number;
  doors: readonly RoomDoor[];
}

export interface RoomDoor {
  side: Side;
  /** Its middle, along its wall: x on the north and south, z on the east and west. */
  at: number;
  /** Its clear width and height, metres. */
  width: number;
  height: number;
}

/** Headroom over a walkway, metres: no run lower than this over a way people walk. */
export const WALK_HEADROOM = 2.1;
/** How far in front of a doorway is kept clear, metres. */
export const DOOR_APPROACH = 1.5;

/**
 * The gantry and its stair. The gantry is the corridors' width; the stair
 * is a fixed industrial stair after BS EN ISO 14122-3 (a pitch between 30°
 * and 38° preferred: here 190 mm risers on 250 mm goings, about 37°), its
 * guard rails 1.1 m high.
 */
export const GANTRY = {
  width: 1.2,
  /** The deck and its steel under it, metres. */
  deck: 0.3,
  rail: 1.1,
} as const;
export const STAIR = {
  width: 1.0,
  rise: 0.19,
  going: 0.25,
  /** The clear landing at its foot, metres along the stair. */
  foot: 1.2,
} as const;

/** The level of a room's upper storey, metres: the gantry's deck. */
export const UPPER_FLOOR = STOREY;

export interface Gantry {
  wall: Side;
  /** The deck's walking surface, metres over the floor. */
  y: number;
  /** The stair: its foot and its head, along its wall (x or z), and its width off the wall. */
  stair: { from: number; to: number; risers: number };
  /** The gantry's deck along its wall, from the stair's head to the room's end. */
  deck: { from: number; to: number };
  /** Which way along the wall the stair climbs: +1 or −1. */
  climbs: 1 | -1;
}

export interface RegionOptions {
  /** Whether to put in a gantry: by the room's height (`auto`, two storeys or more), always, or never. */
  gantry?: 'auto' | 'always' | 'never';
  /** The wall the gantry and its stair go on; by default the longest wall without a door. */
  gantryWall?: Side;
}

export interface RoomRegions {
  regions: Region[];
  gantry: Gantry | null;
  problems: string[];
}

const isX = (side: Side) => side === 'north' || side === 'south';

/** The room's reserved regions, and its gantry if it has one. */
export function reserveRegions(
  room: RegionRoom,
  { gantry = 'auto', gantryWall }: RegionOptions = {},
): RoomRegions {
  const hw = room.w / 2;
  const hd = room.d / 2;
  const regions: Region[] = [];
  const problems: string[] = [];

  // Each doorway's approach: nothing stands in it, nothing runs low over it.
  for (const door of room.doors) {
    const half = door.width / 2 + 0.3;
    const top = Math.max(WALK_HEADROOM, door.height + 0.2);
    const [min, max]: [Vec3, Vec3] =
      door.side === 'west'
        ? [
            [-hw, 0, door.at - half],
            [-hw + DOOR_APPROACH, top, door.at + half],
          ]
        : door.side === 'east'
          ? [
              [hw - DOOR_APPROACH, 0, door.at - half],
              [hw, top, door.at + half],
            ]
          : door.side === 'north'
            ? [
                [door.at - half, 0, -hd],
                [door.at + half, top, -hd + DOOR_APPROACH],
              ]
            : [
                [door.at - half, 0, hd - DOOR_APPROACH],
                [door.at + half, top, hd],
              ];
    regions.push({
      name: `Approach to the ${door.side} door`,
      kind: 'door',
      min,
      max,
      forbids: { machines: true, runs: true },
    });
  }

  const wanted =
    gantry === 'always' || (gantry === 'auto' && room.h >= 2 * STOREY);
  if (!wanted) return { regions, gantry: null, problems };
  if (room.h < UPPER_FLOOR + 2.2) {
    problems.push(
      `a gantry at ${UPPER_FLOOR} m needs the room ${UPPER_FLOOR + 2.2} m tall, not ${room.h} m`,
    );
    return { regions, gantry: null, problems };
  }

  // The gantry's wall: the longest without a door, by preference south,
  // north, east, west; the stair's foot at the end nearer the doors.
  const sides: Side[] = ['south', 'north', 'east', 'west'];
  const length = (s: Side) => (isX(s) ? room.w : room.d);
  const doorless = sides.filter(
    (s) => !room.doors.some((door) => door.side === s),
  );
  const wall =
    gantryWall ??
    [...(doorless.length ? doorless : sides)].sort(
      (a, b) => length(b) - length(a),
    )[0];
  const half = length(wall) / 2;
  const risers = Math.ceil(UPPER_FLOOR / STAIR.rise);
  const run = (risers - 1) * STAIR.going;
  // Where along this wall the doors are nearest: the wall's end at that side.
  const doorEnd = (() => {
    let sum = 0;
    for (const door of room.doors) {
      if (door.side === wall) continue;
      if (isX(wall))
        sum += door.side === 'west' ? -1 : door.side === 'east' ? 1 : door.at;
      else
        sum += door.side === 'north' ? -1 : door.side === 'south' ? 1 : door.at;
    }
    return sum > 0 ? 1 : -1;
  })();
  const climbs = (-doorEnd || 1) as 1 | -1;
  // The stair's foot, clear of the door approach at that end.
  const footEnd = doorEnd * half;
  const from = footEnd - doorEnd * (DOOR_APPROACH + 0.1);
  const to = from + climbs * run;
  const deckTo = -footEnd;
  if ((deckTo - to) * climbs < GANTRY.width) {
    problems.push(
      `the ${wall} wall, ${length(wall)} m, is too short for a stair of ${run.toFixed(2)} m and a gantry`,
    );
    return { regions, gantry: null, problems };
  }
  const g: Gantry = {
    wall,
    y: UPPER_FLOOR,
    stair: { from, to, risers },
    deck: { from: to, to: deckTo },
    climbs,
  };

  /** A box against the wall, between `a` and `b` along it, `depth` off it, from `y0` to `y1`. */
  const against = (
    a: number,
    b: number,
    depth: number,
    y0: number,
    y1: number,
  ): [Vec3, Vec3] => {
    const [lo, hi] = [Math.min(a, b), Math.max(a, b)];
    switch (wall) {
      case 'south':
        return [
          [lo, y0, hd - depth],
          [hi, y1, hd],
        ];
      case 'north':
        return [
          [lo, y0, -hd],
          [hi, y1, -hd + depth],
        ];
      case 'east':
        return [
          [hw - depth, y0, lo],
          [hw, y1, hi],
        ];
      case 'west':
        return [
          [-hw, y0, lo],
          [-hw + depth, y1, hi],
        ];
    }
  };
  const [sMin, sMax] = against(from, to, STAIR.width, 0, room.h);
  regions.push({
    name: 'Stair to the gantry, and the space over it',
    kind: 'stair',
    min: sMin,
    max: sMax,
    forbids: { machines: true, runs: true },
  });
  const [fMin, fMax] = against(
    from,
    from - climbs * STAIR.foot,
    STAIR.width + 0.2,
    0,
    WALK_HEADROOM,
  );
  regions.push({
    name: "The stair's foot",
    kind: 'walkway',
    min: fMin,
    max: fMax,
    forbids: { machines: true, runs: true },
  });
  const [gMin, gMax] = against(
    to,
    deckTo,
    GANTRY.width,
    UPPER_FLOOR - GANTRY.deck,
    room.h,
  );
  regions.push({
    name: 'Observation gantry, and the space over it',
    kind: 'gantry',
    min: gMin,
    max: gMax,
    forbids: { machines: true, runs: true },
  });
  return { regions, gantry: g, problems };
}

/** Whether two boxes overlap (touching is not overlapping). */
export function boxesOverlap(
  a: { min: Vec3; max: Vec3 },
  b: { min: Vec3; max: Vec3 },
) {
  for (let k = 0; k < 3; k++)
    if (a.max[k] <= b.min[k] + 1e-9 || b.max[k] <= a.min[k] + 1e-9)
      return false;
  return true;
}

/** Whether a straight run from `a` to `b`, of outside radius `r`, passes through a region that forbids runs. */
export function runEntersRegion(
  a: Vec3,
  b: Vec3,
  r: number,
  regions: readonly Region[],
): Region | null {
  for (const region of regions) {
    if (!region.forbids.runs) continue;
    let t0 = 0;
    let t1 = 1;
    let inside = true;
    for (let k = 0; k < 3 && inside; k++) {
      const lo = region.min[k] - r;
      const hi = region.max[k] + r;
      const d = b[k] - a[k];
      if (Math.abs(d) < 1e-12) {
        if (a[k] <= lo || a[k] >= hi) inside = false;
        continue;
      }
      let u = (lo - a[k]) / d;
      let v = (hi - a[k]) / d;
      if (u > v) [u, v] = [v, u];
      t0 = Math.max(t0, u);
      t1 = Math.min(t1, v);
      if (t0 >= t1) inside = false;
    }
    if (inside) return region;
  }
  return null;
}

// ---- Walking: the stair and the gantry ---------------------------------------------

/** A point's place along and off a gantry's wall: `s` along it, `off` from its face. */
function onWall(room: RegionRoom, wall: Side, x: number, z: number) {
  const hw = room.w / 2;
  const hd = room.d / 2;
  switch (wall) {
    case 'south':
      return { s: x, off: hd - z };
    case 'north':
      return { s: x, off: z + hd };
    case 'east':
      return { s: z, off: hw - x };
    case 'west':
      return { s: z, off: x + hw };
  }
}

const between = (v: number, a: number, b: number) =>
  v >= Math.min(a, b) && v <= Math.max(a, b);

/**
 * The floor under a walker at (x, z), metres: the stair's treads, the
 * gantry's deck while the walker is up on it (by `previous`, the height
 * they were at), else the room's floor.
 */
export function regionFloorAt(
  room: RegionRoom,
  gantry: Gantry | null,
  x: number,
  z: number,
  previous: number,
): number {
  if (!gantry) return 0;
  const { s, off } = onWall(room, gantry.wall, x, z);
  const { from, to, risers } = gantry.stair;
  if (off <= STAIR.width && between(s, from, to)) {
    // A tread's height, rising with the stair.
    const along = Math.abs(s - from);
    const step = Math.min(risers - 1, Math.floor(along / STAIR.going) + 1);
    return Math.min(gantry.y, step * STAIR.rise);
  }
  if (
    off <= GANTRY.width &&
    between(s, gantry.deck.from, gantry.deck.to) &&
    previous > gantry.y - 1
  )
    return gantry.y;
  return 0;
}

/**
 * What a walker at height `y` may not walk through, as footprints: on the
 * floor, the stair's open side and its high end (it is climbed from its
 * foot); up on the stair or the gantry, their guard rails. Metres.
 */
export function regionSolids(
  room: RegionRoom,
  gantry: Gantry | null,
  y: number,
): Footprint[] {
  if (!gantry) return [];
  const t = 0.05;
  const { from, to } = gantry.stair;
  const piece = (a: number, b: number, off0: number, off1: number) => {
    const hw = room.w / 2;
    const hd = room.d / 2;
    const [lo, hi] = [Math.min(a, b), Math.max(a, b)];
    switch (gantry.wall) {
      case 'south':
        return { minX: lo, maxX: hi, minZ: hd - off1, maxZ: hd - off0 };
      case 'north':
        return { minX: lo, maxX: hi, minZ: -hd + off0, maxZ: -hd + off1 };
      case 'east':
        return { minX: hw - off1, maxX: hw - off0, minZ: lo, maxZ: hi };
      case 'west':
        return { minX: -hw + off0, maxX: -hw + off1, minZ: lo, maxZ: hi };
    }
  };
  const c = gantry.climbs;
  // The stair's open side, but its lowest tread, which is walked onto.
  const stairSide = piece(
    from + c * STAIR.going,
    to,
    STAIR.width,
    STAIR.width + t,
  );
  if (y < 0.5) {
    // On the floor: the stair's side, and its high end under the gantry.
    return [stairSide, piece(to - c * t, to, 0, STAIR.width + t)];
  }
  return [
    stairSide,
    // The gantry's guard rail along its open edge, and across its far end
    // past the stair's width (the stair arrives along the wall).
    piece(gantry.deck.from, gantry.deck.to, GANTRY.width, GANTRY.width + t),
    piece(to, to + c * t, STAIR.width + t, GANTRY.width + t),
  ];
}

/** The point `s` along a wall and `off` out from its face, as (x, z). */
export function fromWall(
  room: Pick<RegionRoom, 'w' | 'd'>,
  wall: Side,
  s: number,
  off: number,
): [number, number] {
  const hw = room.w / 2;
  const hd = room.d / 2;
  switch (wall) {
    case 'south':
      return [s, hd - off];
    case 'north':
      return [s, -hd + off];
    case 'east':
      return [hw - off, s];
    case 'west':
      return [-hw + off, s];
  }
}
