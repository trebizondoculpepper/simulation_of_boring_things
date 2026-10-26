import type { Footprint } from '../../controls/logic/walk-collision';
import type { RoomId } from './dev-room-links';
import { MAIN_CORRIDOR } from './main-corridor';
import { PLANT_DOORWAY } from './plant-rooms';

/**
 * The main plant's rooms off the main corridor (`main-corridor.ts`), and
 * the two chemical stores off the loading bay, as empty shells for now
 * (`AGENTS.md`), each sized by the plant sizing (`doc/plans/plant-sizing.md`):
 * a rectangle of blockwork, its doorways pairs of equipment doors, each
 * joined to the room beyond. Each room's corridor doors are in the middle
 * of its south wall; it runs north from them. Pure: metres, the room's
 * middle at x = z = 0, its floor at y = 0, x east, z south.
 */

export type ShellWall = 'north' | 'east' | 'south' | 'west';

/** A doorway in a shell room: its wall, its middle along it from the room's middle, the room beyond. */
export interface ShellDoor {
  wall: ShellWall;
  /** Along the wall from the room's middle: x for the north and south walls, z for the others. */
  at: number;
  to: RoomId;
  /**
   * What hangs in it: a pair of equipment doors (the default), or a single
   * leaf, the plant room door's doorset (`plant-door.ts`), where a pair
   * would not fit the room beyond (the underwater gallery, 2.5 m tall).
   */
  kind?: 'pair' | 'single';
}

export interface ShellSpec {
  id: RoomId;
  title: string;
  /** Its frontage (east to west) and its depth (north to south), metres. */
  w: number;
  d: number;
  height: number;
  /** A plant space's generated services ceiling, or an office's plain one. */
  ceiling: 'services' | 'plain';
  doors: readonly ShellDoor[];
  /** What it is for, on its title card. */
  note: string;
}

const corridor = (): ShellDoor => ({
  wall: 'south',
  at: 0,
  to: 'main_corridor',
});

/** The rooms, from the plant sizing's room list. */
export const SHELL_ROOMS = {
  boiler_house: {
    id: 'boiler_house',
    title: 'BOILER HOUSE',
    w: 8,
    d: 12.5,
    height: 7,
    ceiling: 'services',
    doors: [corridor()],
    note: 'five gas boilers, the heating headers and pumps, the calorifier',
  },
  loading_bay: {
    id: 'loading_bay',
    title: 'LOADING BAY',
    w: 7.5,
    d: 12,
    height: 7,
    ceiling: 'services',
    // The chemical stores off its side walls, the whole bay between them,
    // so they never share a wall or a drain.
    doors: [
      corridor(),
      { wall: 'east', at: -2, to: 'hypo_store' },
      { wall: 'west', at: -3, to: 'acid_store' },
    ],
    note: 'the tanker stand, and the stores’ fill points',
  },
  hypo_store: {
    id: 'hypo_store',
    title: 'SODIUM HYPOCHLORITE STORE',
    w: 5,
    d: 8,
    height: 7,
    ceiling: 'services',
    doors: [{ wall: 'south', at: 0, to: 'loading_bay' }],
    note: 'three bulk containers on their bunds; never with acid',
  },
  acid_store: {
    id: 'acid_store',
    title: 'ACID STORE',
    // Larger than the sizing's 4 × 4.5 m: its extract, PPE cabinet and
    // signs need wall of their own, clear of the pallet and the shower.
    w: 5,
    d: 5,
    height: 7,
    ceiling: 'services',
    doors: [{ wall: 'south', at: 0, to: 'loading_bay' }],
    note: 'one bulk container on its bund; never with hypochlorite',
  },
  switch_room: {
    id: 'switch_room',
    title: 'ELECTRICAL SWITCH ROOM',
    w: 5,
    d: 8,
    height: 7,
    ceiling: 'services',
    doors: [corridor()],
    note: 'the LV switchboard, the incoming supply, the lighting board, the emergency lighting battery',
  },
  air_plant: {
    id: 'air_plant',
    title: 'AIR HANDLING PLANT',
    // Narrowed to its contents (the owner, 2026-10-24: much of it was
    // wasted): the Olympic's stacks, their gantries and the stair outside
    // them along the west, an aisle, the other halls' units along the east.
    w: 9.5,
    d: 25,
    // Tall enough for the Olympic's units three high, with gantries to
    // their upper two (`air-plant.ts`); its floor as the others'.
    height: 10,
    ceiling: 'services',
    doors: [corridor()],
    note: 'nine air handling units, for every hall',
  },
  control_room: {
    id: 'control_room',
    title: 'CONTROL ROOM',
    w: 5.5,
    d: 8.5,
    height: 7,
    ceiling: 'services',
    doors: [corridor()],
    note: 'the control desk and the mimic boards',
  },
  engineers_office: {
    id: 'engineers_office',
    title: 'ENGINEER’S OFFICE',
    w: 4,
    d: 6,
    height: 7,
    ceiling: 'services',
    // Its east door, a single leaf, into the middle of the Olympic pool's
    // underwater gallery, opposite its windows: the pool loop's gallery
    // makes no three-dimensional sense, so the doorway's joint alone
    // makes the two rooms neighbours.
    doors: [
      corridor(),
      { wall: 'east', at: 0, to: 'pool_02_gallery', kind: 'single' },
    ],
    note: 'the engineer’s desk and two stores cupboards',
  },
} as const satisfies Record<string, ShellSpec>;

export type ShellRoomId = keyof typeof SHELL_ROOMS;

/** The walls' thickness, as the corridor's. */
export const SHELL_WALL = MAIN_CORRIDOR.wall;
/** Each doorway's structural opening: a pair of equipment doors. */
export const SHELL_OPENING = MAIN_CORRIDOR.opening;

/** A doorway's structural opening, by what hangs in it. */
export const shellOpening = (door: { kind?: 'pair' | 'single' }) =>
  door.kind === 'single' ? PLANT_DOORWAY : SHELL_OPENING;

/** A rectangle's walls: each's line, extent, and the way into the room. */
function rectWalls(w: number, d: number) {
  const hw = w / 2;
  const hd = d / 2;
  return {
    north: { line: -hd, half: hw, into: [0, 1] as const, alongX: true },
    south: { line: hd, half: hw, into: [0, -1] as const, alongX: true },
    west: { line: -hw, half: hd, into: [1, 0] as const, alongX: false },
    east: { line: hw, half: hd, into: [-1, 0] as const, alongX: false },
  };
}

/**
 * A doorway's place: its middle on the wall's inner face, on its outer
 * face, the way into the room, and its frame for `door-joins.ts` (on the
 * outer face, +z into the room).
 */
export function shellDoorPlace(
  room: { w: number; d: number },
  door: { wall: ShellWall; at: number },
) {
  const { line, into, alongX } = rectWalls(room.w, room.d)[door.wall];
  const t = SHELL_WALL;
  const inner = alongX ? { x: door.at, z: line } : { x: line, z: door.at };
  const outer = { x: inner.x - into[0] * t, z: inner.z - into[1] * t };
  return {
    inner,
    outer,
    into,
    alongX,
    frame: { ...outer, yaw: Math.atan2(into[0], into[1]) },
  };
}

/** A footprint along a wall, from `a` to `b`, across its thickness. */
function across(
  room: { w: number; d: number },
  wall: ShellWall,
  a: number,
  b: number,
): Footprint {
  const { line, into, alongX } = rectWalls(room.w, room.d)[wall];
  const t = SHELL_WALL;
  const k = alongX ? into[1] : into[0];
  const [p, q] = k > 0 ? [line - t, line] : [line, line + t];
  return alongX
    ? { minX: a, maxX: b, minZ: p, maxZ: q }
    : { minX: p, maxX: q, minZ: a, maxZ: b };
}

/** A doorway's place on its wall, and what hangs in it. */
type ShellDoorway = { wall: ShellWall; at: number; kind?: 'pair' | 'single' };

/** A wall's solid pieces along it, split round its doorways, its ends closing the corners. */
export function shellWallPieces(
  room: {
    w: number;
    d: number;
    doors: readonly ShellDoorway[];
  },
  wall: ShellWall,
): [number, number][] {
  const { half } = rectWalls(room.w, room.d)[wall];
  const t = SHELL_WALL;
  const cuts = room.doors
    .filter((d) => d.wall === wall)
    .sort((a, b) => a.at - b.at);
  let start = -half - t;
  const pieces: [number, number][] = [];
  for (const d of cuts) {
    pieces.push([start, d.at - shellOpening(d) / 2]);
    start = d.at + shellOpening(d) / 2;
  }
  pieces.push([start, half + t]);
  return pieces;
}

/** The walls, for walking collision, open at the doorways. */
export function shellSolids(room: {
  w: number;
  d: number;
  doors: readonly ShellDoorway[];
}): Footprint[] {
  return (['north', 'east', 'south', 'west'] as const).flatMap((wall) =>
    shellWallPieces(room, wall).map(([a, b]) => across(room, wall, a, b)),
  );
}

/**
 * A doorway's leaves' place across the wall, and a stop just beyond it
 * (`doorway.ts`).
 */
export function shellDoorway(
  room: { w: number; d: number },
  door: ShellDoorway,
) {
  const leaf = across(
    room,
    door.wall,
    door.at - shellOpening(door) / 2,
    door.at + shellOpening(door) / 2,
  );
  const { into } = shellDoorPlace(room, door);
  const out = 0.3;
  return {
    leaf,
    beyond: {
      minX: leaf.minX - into[0] * out,
      maxX: leaf.maxX - into[0] * out,
      minZ: leaf.minZ - into[1] * out,
      maxZ: leaf.maxZ - into[1] * out,
    },
  };
}

/** Whether (x, z) has gone out through a doorway: past its outer face, within its opening. */
export function throughShellDoor(
  room: { w: number; d: number },
  door: ShellDoorway,
  x: number,
  z: number,
) {
  const { outer, into, alongX } = shellDoorPlace(room, door);
  const beyond = (outer.x - x) * into[0] + (outer.z - z) * into[1];
  const along = alongX ? Math.abs(x - outer.x) : Math.abs(z - outer.z);
  return beyond > 0.05 && along < shellOpening(door) / 2;
}

// ---- The wet hall ----------------------------------------------------------

/**
 * The wet hall, the main plant room: the whole block inside the corridor's
 * ring, its floor half a storey (1.75 m) below the corridor's, so every
 * room's backwash and drainage falls to it. Its two doorways, opposite
 * each other, open at the corridor's level onto steel landings. The east,
 * in the middle of its wall, has a short stair straight down into the
 * hall; the west, at the north end of its wall, by the loading bay's
 * door, is for trolleys: from its landing a ramp at 1:12 runs south
 * down the west wall to a turning landing in the corner and back north,
 * a second flight, to the hall's floor.
 */
export const WET_HALL = {
  /** The block's side, its walls' outer faces: the ring's inside. */
  side: MAIN_CORRIDOR.side - 2 * MAIN_CORRIDOR.width,
  drop: 1.75,
  /** The roof, over the corridor's level, as high as the corridor's. */
  roof: MAIN_CORRIDOR.height,
  landing: { depth: 1.2, width: 2.6 },
  stair: { width: 2, going: 0.25, risers: 9 },
  /** The trolley ramp's lane width, and the west door's place along its wall. */
  ramp: { lane: 1.8, door: -8 },
} as const;

/** Its doors: east, for the stair, and west, for the ramp, opposite; numbered alike with the corridor's. */
export const WET_HALL_DOORS: readonly ShellDoor[] = (
  ['east', 'west'] as const
).map((wall) => ({
  wall,
  at: wall === 'west' ? WET_HALL.ramp.door : 0,
  to: 'main_corridor' as RoomId,
}));

/** The entrance with a stair; the west has the ramp. */
const STAIRED = ['east'] as const;

/**
 * The trolley ramp, down the west wall: its top landing in the north-west
 * corner, inside the west door; its first flight south along the wall;
 * the turning landing across the south-west corner; its second flight
 * back north, in the lane beside the first, to the floor. Heights at each
 * end of each flight; footprints in the hall's frame.
 */
export function wetHallRamp() {
  const R = wetHallRoom().w / 2;
  const lane = WET_HALL.ramp.lane;
  const door = WET_HALL.ramp.door;
  const x0 = -R;
  const x1 = -R + lane;
  const x2 = -R + 2 * lane;
  const landingEnd = door + SHELL_OPENING / 2 + 0.1;
  const turnStart = R - lane;
  // The drop shared between the flights by their lengths, so both are 1:12.
  const first = turnStart - landingEnd;
  // The second flight as long as the 1:12 needs, the first being what
  // the wall allows.
  const second = Math.max(6, WET_HALL.drop * 12 - first);
  const drop = WET_HALL.drop;
  const mid = -drop * (first / (first + second));
  return {
    top: { minX: x0, maxX: x1, minZ: -R, maxZ: landingEnd, y: 0 },
    first: {
      minX: x0,
      maxX: x1,
      z0: landingEnd,
      z1: turnStart,
      y0: 0,
      y1: mid,
    },
    turn: { minX: x0, maxX: x2, minZ: turnStart, maxZ: R, y: mid },
    second: {
      minX: x1,
      maxX: x2,
      z0: turnStart,
      z1: turnStart - second,
      y0: mid,
      y1: -drop,
    },
    gradient: drop / (first + second),
  };
}

/** The ramp's surface under (x, z), if it is on it. */
function rampAt(x: number, z: number): number | null {
  const r = wetHallRamp();
  const inside = (f: { minX: number; maxX: number }, a: number, b: number) =>
    x >= f.minX && x <= f.maxX && z >= Math.min(a, b) && z <= Math.max(a, b);
  if (inside(r.top, r.top.minZ, r.top.maxZ)) return r.top.y;
  if (inside(r.turn, r.turn.minZ, r.turn.maxZ)) return r.turn.y;
  for (const f of [r.first, r.second])
    if (inside(f, f.z0, f.z1))
      return f.y0 + ((z - f.z0) / (f.z1 - f.z0)) * (f.y1 - f.y0);
  return null;
}

/** The wet hall as a room: its inside (the block less its walls), and its doors. */
export const wetHallRoom = () => ({
  w: WET_HALL.side - 2 * SHELL_WALL,
  d: WET_HALL.side - 2 * SHELL_WALL,
  doors: WET_HALL_DOORS,
});

/** Turned so that `wall` is north: each side's landing and stair are alike. */
function asNorth(wall: ShellWall, x: number, z: number) {
  switch (wall) {
    case 'north':
      return { x, z };
    case 'south':
      return { x: -x, z: -z };
    case 'east':
      return { x: z, z: -x };
    case 'west':
      return { x: -z, z: x };
  }
}

/** The north entrance's landing and stair, from the inside face of its wall. */
function northEntrance() {
  const inside = -wetHallRoom().d / 2;
  const L = WET_HALL.landing;
  const S = WET_HALL.stair;
  const top = inside + L.depth;
  return {
    landing: { minX: -L.width / 2, maxX: L.width / 2, minZ: inside, maxZ: top },
    stair: {
      minX: -S.width / 2,
      maxX: S.width / 2,
      top,
      bottom: top + (S.risers - 1) * S.going,
    },
    riser: WET_HALL.drop / S.risers,
  };
}

/** The floor under the walker: a landing at 0, a tread of a stair, or the hall's floor below. */
export function wetHallFloorAt(x: number, z: number) {
  const { landing, stair, riser } = northEntrance();
  const R = wetHallRoom().w / 2;
  // In the west doorway, through the wall: level with the ramp's top.
  if (x <= -R && Math.abs(z - WET_HALL.ramp.door) <= SHELL_OPENING / 2 + 0.3)
    return 0;
  const ramp = rampAt(x, z);
  if (ramp !== null) return ramp;
  for (const wall of STAIRED) {
    const p = asNorth(wall, x, z);
    // In the doorway, through the wall: level with its landing.
    if (p.z <= landing.minZ && Math.abs(p.x) <= SHELL_OPENING / 2 + 0.3)
      return 0;
    if (
      p.x >= landing.minX &&
      p.x <= landing.maxX &&
      p.z >= landing.minZ &&
      p.z <= landing.maxZ
    )
      return 0;
    if (
      p.x >= stair.minX &&
      p.x <= stair.maxX &&
      p.z > stair.top &&
      p.z <= stair.bottom
    ) {
      const down = Math.ceil((p.z - stair.top) / WET_HALL.stair.going);
      return -Math.min(WET_HALL.stair.risers, down) * riser;
    }
  }
  return -WET_HALL.drop;
}

/** Turned back from the north entrance's frame to `wall`'s. */
function fromNorth(wall: ShellWall, f: Footprint): Footprint {
  const corners = [
    [f.minX, f.minZ],
    [f.maxX, f.maxZ],
  ].map(([x, z]) => {
    switch (wall) {
      case 'north':
        return { x, z };
      case 'south':
        return { x: -x, z: -z };
      case 'east':
        return { x: -z, z: x };
      case 'west':
        return { x: z, z: -x };
    }
  });
  return {
    minX: Math.min(corners[0].x, corners[1].x),
    maxX: Math.max(corners[0].x, corners[1].x),
    minZ: Math.min(corners[0].z, corners[1].z),
    maxZ: Math.max(corners[0].z, corners[1].z),
  };
}

/**
 * Each entrance's guard rails, as footprints: round the landing's open
 * edges either side of its stair, and down the stair's sides but for its
 * last 0.6 m, low enough to step off. They stop a walker on the hall's
 * floor walking in under a landing, too.
 */
export function wetHallRails(): Footprint[] {
  const { landing, stair } = northEntrance();
  const r = 0.05;
  const north: Footprint[] = [
    {
      minX: landing.minX - r,
      maxX: landing.minX,
      minZ: landing.minZ,
      maxZ: landing.maxZ + r,
    },
    {
      minX: landing.maxX,
      maxX: landing.maxX + r,
      minZ: landing.minZ,
      maxZ: landing.maxZ + r,
    },
    {
      minX: landing.minX,
      maxX: stair.minX,
      minZ: landing.maxZ,
      maxZ: landing.maxZ + r,
    },
    {
      minX: stair.maxX,
      maxX: landing.maxX,
      minZ: landing.maxZ,
      maxZ: landing.maxZ + r,
    },
    {
      minX: stair.minX - r,
      maxX: stair.minX,
      minZ: stair.top,
      maxZ: stair.bottom - 0.6,
    },
    {
      minX: stair.maxX,
      maxX: stair.maxX + r,
      minZ: stair.top,
      maxZ: stair.bottom - 0.6,
    },
  ];
  return [
    ...STAIRED.flatMap((wall) => north.map((f) => fromNorth(wall, f))),
    ...wetHallRampRails(),
  ];
}

/** The ramp's two open-side guard runs, shared by collision and rendering. */
export function wetHallRampRails(): Footprint[] {
  const r = 0.05;
  const ramp = wetHallRamp();
  const R = wetHallRoom().w / 2;
  const rampRails: Footprint[] = [
    {
      minX: ramp.first.maxX,
      maxX: ramp.first.maxX + r,
      minZ: -R,
      maxZ: ramp.first.z1,
    },
    {
      minX: ramp.second.maxX,
      maxX: ramp.second.maxX + r,
      minZ: ramp.second.z1 + 1.5,
      maxZ: R,
    },
  ];
  return rampRails;
}

/** Each entrance's landing and stair, turned to its wall, for the view. */
export function wetHallEntrances() {
  const n = northEntrance();
  return STAIRED.map((wall) => ({
    wall,
    landing: fromNorth(wall, n.landing),
    stair: n.stair,
    riser: n.riser,
  }));
}
