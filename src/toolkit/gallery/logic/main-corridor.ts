import type { Footprint } from '../../controls/logic/walk-collision';

/**
 * The main corridor: an L-shaped plant corridor at plant-floor level, as
 * tall as the plant rooms (two storeys) and under the same generated
 * services ceiling. The wet hall, the main plant room, lies in the
 * inside of the L, its doors in the corridor's inner walls; each pool
 * hall's plant room opens off its outer walls, through that room's
 * equipment doors (`plant-rooms.ts`), the order not mattering. Pure:
 * metres, the outside corner of the L at the origin, one leg running
 * east (+x), the other south (+z); the floor at y = 0.
 */

export const MAIN_CORRIDOR = {
  /** Clear width: equipment on trolleys passes, and turns into the doors. */
  width: 4,
  /** Each leg's length, from the outside corner. */
  leg: 24,
  /** As tall as the plant rooms: two storeys of 3.5 m. */
  height: 7,
  wall: 0.2,
  /** The equipment doors' structural opening (`equipment-doors.ts`). */
  opening: 1.8 + 2 * 0.06,
} as const;

export type CorridorWall = 'north' | 'west' | 'south' | 'east';

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
 * The doors: the four plant rooms off the outer walls (the north wall of
 * the east leg, the west wall of the south leg), and the wet hall's two
 * pairs in the inner walls, one in each leg.
 */
export const CORRIDOR_DOORS: readonly CorridorDoor[] = [
  { wall: 'north', at: 9, to: 'plant_pool_01' },
  { wall: 'north', at: 17, to: 'plant_pool_02' },
  { wall: 'west', at: 9, to: 'plant_pool_03' },
  { wall: 'west', at: 17, to: 'plant_pool_04' },
  { wall: 'south', at: 13, to: 'wet_hall' },
  { wall: 'east', at: 13, to: 'wet_hall' },
];

/**
 * Where each wall stands: its line (z for north and south, x for west and
 * east) and the extent it runs along. The inner walls stop at the inner
 * corner.
 */
export function corridorWalls() {
  const w = C.width;
  const L = C.leg;
  return {
    north: { line: 0, from: 0, to: L },
    west: { line: 0, from: 0, to: L },
    south: { line: w, from: w, to: L },
    east: { line: w, from: w, to: L },
  } as const;
}

/** Whether (x, z) is on the corridor's floor. */
export function inCorridor(x: number, z: number) {
  const w = C.width;
  const L = C.leg;
  return (
    (x >= 0 && x <= L && z >= 0 && z <= w) ||
    (x >= 0 && x <= w && z >= 0 && z <= L)
  );
}

/** A door's middle on the wall's face, and the way into the corridor. */
export function doorPlace(d: CorridorDoor) {
  const walls = corridorWalls();
  const line = walls[d.wall].line;
  switch (d.wall) {
    case 'north':
      return { x: d.at, z: line, into: [0, 1] as const };
    case 'south':
      return { x: d.at, z: line, into: [0, -1] as const };
    case 'west':
      return { x: line, z: d.at, into: [1, 0] as const };
    case 'east':
      return { x: line, z: d.at, into: [-1, 0] as const };
  }
}

/**
 * The walls as footprints for walking collision, each split round its
 * doorways (which the room closes while their doors are shut), and the
 * two legs' end walls.
 */
export function corridorSolids(): Footprint[] {
  const t = C.wall;
  const w = C.width;
  const L = C.leg;
  const half = C.opening / 2;
  const walls = corridorWalls();
  const out: Footprint[] = [];
  for (const wall of ['north', 'south', 'west', 'east'] as const) {
    const { line, from, to } = walls[wall];
    const doors = CORRIDOR_DOORS.filter((d) => d.wall === wall)
      .map((d) => d.at)
      .sort((a, b) => a - b);
    let start = from - (wall === 'north' || wall === 'west' ? t : 0);
    const pieces: [number, number][] = [];
    for (const at of doors) {
      pieces.push([start, at - half]);
      start = at + half;
    }
    pieces.push([start, to + t]);
    // The outer walls are outside the floor; the inner, outside it too.
    const behind =
      wall === 'north' || wall === 'west' ? [line - t, line] : [line, line + t];
    for (const [a, b] of pieces)
      out.push(
        wall === 'north' || wall === 'south'
          ? { minX: a, maxX: b, minZ: behind[0], maxZ: behind[1] }
          : { minX: behind[0], maxX: behind[1], minZ: a, maxZ: b },
      );
  }
  // The legs' ends.
  out.push({ minX: L, maxX: L + t, minZ: -t, maxZ: w + t });
  out.push({ minX: -t, maxX: w + t, minZ: L, maxZ: L + t });
  return out;
}

/** A shut pair of doors across a doorway, as a footprint. */
export function corridorDoorBlock(d: CorridorDoor): Footprint {
  const p = doorPlace(d);
  const half = C.opening / 2;
  const t = C.wall;
  return d.wall === 'north' || d.wall === 'south'
    ? {
        minX: p.x - half,
        maxX: p.x + half,
        minZ: d.wall === 'north' ? p.z - t : p.z,
        maxZ: d.wall === 'north' ? p.z : p.z + t,
      }
    : {
        minX: d.wall === 'west' ? p.x - t : p.x,
        maxX: d.wall === 'west' ? p.x : p.x + t,
        minZ: p.z - half,
        maxZ: p.z + half,
      };
}
