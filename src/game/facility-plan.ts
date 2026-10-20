/**
 * The leisure centre's floor plan: every room as a rectangle on one
 * ground and lower floors, in metres, and the doorways that join them. Plan x runs
 * east, plan z runs south, as in the 3D world.
 *
 * Rooms are independent models in world coordinates. The lower plant sits
 * beneath an upper service room; a stair joins its landing to the corridor.
 */

/** Public rooms are tiled; service rooms are painted blockwork. */
export type Zone = 'public' | 'service';

/** A wall of a room, by the direction it faces away from the room. */
export type Side = 'north' | 'south' | 'east' | 'west';

export interface RoomPlan {
  id: string;
  title: string;
  /** One line under the title saying what the room is for. */
  purpose: string;
  zone: Zone;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** Clear height, floor to ceiling, metres. */
  height: number;
  /** Floor elevation in metres; omitted means ground level. */
  floorY?: number;
  /** The wall the title card hangs on, centred along it. */
  card: Side;
}

export interface DoorPlan {
  /** The two rooms the doorway joins; they must share a wall. */
  rooms: readonly [string, string];
  /** The doorway's centre along the shared wall (x or z), metres. */
  at: number;
  /** Clear opening width, metres. */
  width: number;
  /** A vertical stair link, whose opening is only on the lower wall. */
  stair?: boolean;
}

/** Clear height of every doorway, metres. */
export const DOOR_HEIGHT = 2.1;

/** Wall thickness, metres: each room builds half of a shared wall. */
export const WALL = 0.2;

export const ROOMS: readonly RoomPlan[] = [
  // Public side, entered from the street through reception.
  {
    id: 'reception',
    title: 'Reception',
    purpose: 'Entrance foyer, front desk and turnstiles',
    zone: 'public',
    minX: 96,
    maxX: 112,
    minZ: 15,
    maxZ: 35,
    height: 4,
    card: 'north',
  },
  {
    id: 'changing',
    title: 'Changing Village',
    purpose: 'Cubicles, lockers, showers and toilets',
    zone: 'public',
    minX: 80,
    maxX: 96,
    minZ: 10,
    maxZ: 40,
    height: 3,
    card: 'south',
  },
  {
    id: 'hall',
    title: 'Main Pool Hall',
    purpose: '50 m competition pool, learner pool, spa pool and rapids ride',
    zone: 'public',
    minX: 0,
    maxX: 80,
    minZ: 0,
    maxZ: 50,
    height: 12,
    card: 'south',
  },
  {
    id: 'first-aid',
    title: 'First Aid Room',
    purpose: 'Treatment couch, first aid stores and defibrillator',
    zone: 'public',
    minX: 80,
    maxX: 86,
    minZ: 0,
    maxZ: 10,
    height: 2.7,
    card: 'east',
  },
  // Back of house, behind the staff doors.
  {
    id: 'corridor',
    title: 'Service Corridor',
    purpose: 'Staff and maintenance access to the plant rooms',
    zone: 'service',
    minX: 0,
    maxX: 96,
    minZ: -4,
    maxZ: 0,
    height: 3,
    card: 'west',
  },
  {
    id: 'janitorial',
    title: 'Janitorial Store',
    purpose: 'Cleaning machines, cleaning chemicals and the cleaners’ sink',
    zone: 'service',
    minX: 86,
    maxX: 91,
    minZ: 0,
    maxZ: 10,
    height: 2.7,
    card: 'south',
  },
  {
    id: 'staff',
    title: 'Staff Room',
    purpose: 'Lifeguards’ rest room, lockers and kitchenette',
    zone: 'service',
    minX: 91,
    maxX: 96,
    minZ: 0,
    maxZ: 10,
    height: 2.7,
    card: 'south',
  },
  {
    id: 'upper-plant',
    title: 'Upper Plant Room',
    purpose: 'Upper service level above the water treatment plant',
    zone: 'service',
    minX: 0,
    maxX: 32,
    minZ: -20,
    maxZ: -4,
    height: 3,
    card: 'north',
  },
  {
    id: 'pumps',
    title: 'Pump and Filtration Room',
    purpose: 'Circulation pumps, sand filters and their valves',
    zone: 'service',
    minX: 0,
    maxX: 20,
    minZ: -20,
    maxZ: -4,
    height: 2.7,
    floorY: -3,
    card: 'north',
  },
  {
    id: 'balance-tank',
    title: 'Balance Tank Room',
    purpose: 'Balance tanks, overflow returns and make-up water',
    zone: 'service',
    minX: 20,
    maxX: 32,
    minZ: -20,
    maxZ: -4,
    height: 2.7,
    floorY: -3,
    card: 'north',
  },
  {
    id: 'lower-landing',
    title: 'Lower Plant Landing',
    purpose: 'Access to the lower water treatment rooms',
    zone: 'service',
    minX: 20,
    maxX: 32,
    minZ: -4,
    maxZ: 0,
    height: 2.7,
    floorY: -3,
    card: 'south',
  },
  {
    id: 'chemicals',
    title: 'Chemical Store',
    purpose: 'Hypochlorite and acid, bunded and kept apart',
    zone: 'service',
    minX: 32,
    maxX: 40,
    minZ: -20,
    maxZ: -4,
    height: 4.5,
    card: 'north',
  },
  {
    id: 'boiler',
    title: 'Boiler Room',
    purpose: 'Boilers, pool heat exchangers and heating pumps',
    zone: 'service',
    minX: 40,
    maxX: 54,
    minZ: -20,
    maxZ: -4,
    height: 4.5,
    card: 'north',
  },
  {
    id: 'air-handling',
    title: 'Air Handling Plant',
    purpose: 'Pool hall air handling, dehumidification and heat recovery',
    zone: 'service',
    minX: 54,
    maxX: 70,
    minZ: -20,
    maxZ: -4,
    height: 4.5,
    card: 'north',
  },
  {
    id: 'switch-room',
    title: 'Electrical Switch Room',
    purpose: 'Incoming supply, main switchboard and motor control centre',
    zone: 'service',
    minX: 70,
    maxX: 80,
    minZ: -20,
    maxZ: -4,
    height: 4.5,
    card: 'north',
  },
  {
    id: 'office',
    title: 'Duty Manager’s Office',
    purpose: 'Building management system, plant logbooks and test kits',
    zone: 'service',
    minX: 80,
    maxX: 88,
    minZ: -12,
    maxZ: -4,
    height: 2.7,
    card: 'north',
  },
  {
    id: 'stores',
    title: 'Stores',
    purpose: 'Spare parts, filter media and consumables',
    zone: 'service',
    minX: 80,
    maxX: 88,
    minZ: -20,
    maxZ: -12,
    height: 2.7,
    card: 'north',
  },
  {
    id: 'workshop',
    title: 'Maintenance Workshop',
    purpose: 'Workbench, tools and repairs',
    zone: 'service',
    minX: 88,
    maxX: 96,
    minZ: -20,
    maxZ: -12,
    height: 3,
    card: 'north',
  },
  {
    id: 'control-centre',
    title: 'Plant Control Centre',
    purpose: 'Pool and building systems, alarms and operating records',
    zone: 'service',
    minX: 88,
    maxX: 96,
    minZ: -12,
    maxZ: -4,
    height: 3,
    card: 'west',
  },
  {
    id: 'engineer-office',
    title: 'Engineer’s Office',
    purpose: 'Plant drawings, maintenance planning and technical desk',
    zone: 'service',
    minX: 96,
    maxX: 104,
    minZ: -12,
    maxZ: -4,
    height: 3,
    card: 'north',
  },
];

export const DOORS: readonly DoorPlan[] = [
  { rooms: ['reception', 'changing'], at: 25, width: 2 },
  { rooms: ['changing', 'hall'], at: 25, width: 2.4 },
  { rooms: ['hall', 'first-aid'], at: 5, width: 1.2 },
  // Staff doors from the pool hall into the service corridor.
  { rooms: ['hall', 'corridor'], at: 10, width: 1.2 },
  { rooms: ['hall', 'corridor'], at: 60, width: 1.2 },
  { rooms: ['first-aid', 'corridor'], at: 83, width: 1.2 },
  { rooms: ['janitorial', 'corridor'], at: 88.5, width: 1.2 },
  { rooms: ['staff', 'corridor'], at: 93.5, width: 1 },
  // Plant rooms off the north side of the corridor; plant gets double doors.
  { rooms: ['upper-plant', 'corridor'], at: 10, width: 2.4 },
  { rooms: ['balance-tank', 'lower-landing'], at: 26, width: 1.8 },
  { rooms: ['chemicals', 'boiler'], at: -12, width: 1.8 },
  { rooms: ['boiler', 'corridor'], at: 47, width: 2.4 },
  { rooms: ['air-handling', 'corridor'], at: 62, width: 2.4 },
  { rooms: ['switch-room', 'corridor'], at: 75, width: 1.8 },
  { rooms: ['office', 'corridor'], at: 84, width: 1 },
  { rooms: ['control-centre', 'corridor'], at: 92, width: 1.8 },
  { rooms: ['control-centre', 'engineer-office'], at: -8, width: 1.2 },
  { rooms: ['control-centre', 'workshop'], at: 92, width: 1.2 },
  // Internal plant connections.
  { rooms: ['pumps', 'balance-tank'], at: -12, width: 1.8 },
  { rooms: ['lower-landing', 'corridor'], at: -3.2, width: 1.4, stair: true },
  { rooms: ['workshop', 'stores'], at: -16, width: 1.2 },
];

/** Where a new player arrives: inside reception, facing its title card. */
export const START = { room: 'reception', x: 108, z: 25, yaw: -Math.PI / 2 };

export function roomById(id: string, rooms = ROOMS): RoomPlan {
  const room = rooms.find((r) => r.id === id);
  if (!room) throw new Error(`No room "${id}" in the plan.`);
  return room;
}

/** The room containing a plan point, if any. */
export function roomAt(x: number, z: number, rooms = ROOMS, floorY = 0) {
  return (
    rooms
      .filter((r) => x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ)
      .sort(
        (a, b) =>
          Math.abs((a.floorY ?? 0) - floorY) -
          Math.abs((b.floorY ?? 0) - floorY),
      )[0] ?? null
  );
}

/**
 * The wall two rooms share: which side of `a` it is, the fixed coordinate
 * it lies on, and the stretch along it that both rooms span. Null when the
 * rooms do not touch along a length of wall.
 */
export function sharedWall(a: RoomPlan, b: RoomPlan) {
  if ((a.floorY ?? 0) !== (b.floorY ?? 0)) return null;
  const spanZ = {
    from: Math.max(a.minZ, b.minZ),
    to: Math.min(a.maxZ, b.maxZ),
  };
  const spanX = {
    from: Math.max(a.minX, b.minX),
    to: Math.min(a.maxX, b.maxX),
  };
  if (spanZ.to > spanZ.from) {
    if (a.maxX === b.minX)
      return { side: 'east' as Side, line: a.maxX, ...spanZ };
    if (a.minX === b.maxX)
      return { side: 'west' as Side, line: a.minX, ...spanZ };
  }
  if (spanX.to > spanX.from) {
    if (a.maxZ === b.minZ)
      return { side: 'south' as Side, line: a.maxZ, ...spanX };
    if (a.minZ === b.maxZ)
      return { side: 'north' as Side, line: a.minZ, ...spanX };
  }
  return null;
}

/** An opening in one wall of a room, as a stretch along that wall. */
export interface Opening {
  from: number;
  to: number;
}

/** The openings in each side of a room. */
export function openingsOf(
  room: RoomPlan,
  rooms = ROOMS,
  doors = DOORS,
): Record<Side, Opening[]> {
  const result: Record<Side, Opening[]> = {
    north: [],
    south: [],
    east: [],
    west: [],
  };
  for (const door of doors) {
    if (!door.rooms.includes(room.id)) continue;
    const otherId = door.rooms[0] === room.id ? door.rooms[1] : door.rooms[0];
    const other = roomById(otherId, rooms);
    const wall = door.stair
      ? room.id === 'lower-landing'
        ? {
            side: 'east' as Side,
            line: room.maxX,
            from: room.minZ,
            to: room.maxZ,
          }
        : null
      : sharedWall(room, other);
    if (!wall && door.stair) continue;
    if (!wall)
      throw new Error(`${door.rooms.join(' and ')} do not share a wall.`);
    result[wall.side].push({
      from: door.at - door.width / 2,
      to: door.at + door.width / 2,
    });
  }
  // Street entrance is an opening to the exterior, not another room.
  if (room.id === 'reception') result.east.push({ from: 23.5, to: 26.5 });
  for (const side of Object.values(result))
    side.sort((p, q) => p.from - q.from);
  return result;
}

/** A wall's extent along its length: x for north and south walls, z for east and west. */
export function sideSpan(room: RoomPlan, side: Side) {
  return side === 'north' || side === 'south'
    ? { from: room.minX, to: room.maxX }
    : { from: room.minZ, to: room.maxZ };
}

/** The solid stretches of a wall, between its openings. */
export function wallRuns(span: Opening, openings: readonly Opening[]) {
  const runs: Opening[] = [];
  let from = span.from;
  for (const hole of openings) {
    if (hole.from > from) runs.push({ from, to: hole.from });
    from = Math.max(from, hole.to);
  }
  if (span.to > from) runs.push({ from, to: span.to });
  return runs;
}

/** A solid footprint on the floor plan, metres. */
export interface PlanFootprint {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * The footprint of a run of wall: each room builds the half of the wall
 * on its own side of the line, so a shared wall is two halves back to
 * back.
 */
export function runFootprint(
  room: RoomPlan,
  side: Side,
  run: Opening,
): PlanFootprint {
  const half = WALL / 2;
  switch (side) {
    case 'north':
      return {
        minX: run.from,
        maxX: run.to,
        minZ: room.minZ,
        maxZ: room.minZ + half,
      };
    case 'south':
      return {
        minX: run.from,
        maxX: run.to,
        minZ: room.maxZ - half,
        maxZ: room.maxZ,
      };
    case 'west':
      return {
        minX: room.minX,
        maxX: room.minX + half,
        minZ: run.from,
        maxZ: run.to,
      };
    case 'east':
      return {
        minX: room.maxX - half,
        maxX: room.maxX,
        minZ: run.from,
        maxZ: run.to,
      };
  }
}

/** Every wall footprint in the building, for walking collision. */
export function wallFootprints(rooms = ROOMS, doors = DOORS, floorY?: number) {
  const footprints: PlanFootprint[] = [];
  for (const room of rooms) {
    if (floorY !== undefined && (room.floorY ?? 0) !== floorY) continue;
    const openings = openingsOf(room, rooms, doors);
    for (const side of ['north', 'south', 'east', 'west'] as const)
      for (const run of wallRuns(sideSpan(room, side), openings[side]))
        footprints.push(runFootprint(room, side, run));
  }
  return footprints;
}

/** The rooms that can be walked to from `from` through doorways. */
export function reachable(from: string, doors = DOORS) {
  const seen = new Set([from]);
  const queue = [from];
  while (queue.length) {
    const here = queue.shift() as string;
    for (const door of doors) {
      if (!door.rooms.includes(here)) continue;
      const next = door.rooms[0] === here ? door.rooms[1] : door.rooms[0];
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
}
