import { DOORS, ROOMS, roomById, sharedWall } from './facility-plan';
import type { RoomPlan, Side } from './facility-plan';
import { BASINS } from './pool-layout';
import { LOWER_Y, STAIRS } from './facility-levels';
import { DOOR_HEIGHT } from './facility-plan';

/**
 * The building's fire safety provision, placed by rule so that it can be
 * checked against the standards it follows (see
 * `doc/research/fire-safety-provision.md`):
 *
 * - escape: Approved Document B volume 2 (travel distances, purpose
 *   group 5, assembly and recreation, and plant rooms);
 * - detection and alarm: BS 5839-1 (detector coverage, manual call
 *   points, sounders and visual alarm devices);
 * - emergency lighting: BS 5266-1 and BS EN 1838 (points of emphasis,
 *   escape routes, open areas, high-risk task areas);
 * - escape signs: BS ISO 3864-1, BS EN ISO 7010 (E001/E002) and BS 5499-4
 *   (where signs go, and their arrows);
 * - portable extinguishers: BS 5306-8 (travel distance, class A rating,
 *   types for the risk).
 *
 * Everything is in plan metres. Wall fittings stand on a wall's inner
 * face facing into their room (`yaw`: 0 faces south, +z, as everywhere);
 * ceiling fittings hang from the ceiling.
 */

// ---- Final exits -----------------------------------------------------------

export interface FinalExit {
  id: string;
  room: string;
  side: Side;
  /** The door's middle along its wall, metres. */
  at: number;
  width: number;
}

/**
 * Doors to the open air. The street entrance is one; the others are fire
 * exit doors, fitted with push bars and kept shut (they are not walked
 * through in the game). Every large plant room on the outside wall has
 * one, as plant rooms are entered for maintenance from the service yard
 * too, set to one side of its wall, clear of the room's title card.
 */
export const FINAL_EXITS: readonly FinalExit[] = [
  { id: 'entrance', room: 'reception', side: 'east', at: 25, width: 3 },
  { id: 'hall-sw', room: 'hall', side: 'south', at: 10, width: 2 },
  { id: 'hall-s', room: 'hall', side: 'south', at: 40, width: 2 },
  { id: 'hall-se', room: 'hall', side: 'south', at: 70, width: 2 },
  { id: 'hall-w', room: 'hall', side: 'west', at: 25, width: 2 },
  { id: 'corridor-w', room: 'corridor', side: 'west', at: -2, width: 1.2 },
  { id: 'corridor-e', room: 'corridor', side: 'east', at: -2, width: 1.2 },
  { id: 'upper-plant', room: 'upper-plant', side: 'north', at: 26, width: 2 },
  { id: 'chemicals', room: 'chemicals', side: 'north', at: 38.6, width: 2 },
  { id: 'boiler', room: 'boiler', side: 'north', at: 51.5, width: 2 },
  { id: 'air', room: 'air-handling', side: 'north', at: 67, width: 2 },
  { id: 'switch', room: 'switch-room', side: 'north', at: 78.4, width: 1.8 },
  { id: 'stores', room: 'stores', side: 'north', at: 86.9, width: 1.2 },
  { id: 'workshop', room: 'workshop', side: 'north', at: 94.9, width: 1.2 },
];

/** A point on a wall's inner face, and the yaw that faces into the room. */
export function onWall(room: RoomPlan, side: Side, at: number, inset = 0.1) {
  switch (side) {
    case 'north':
      return { x: at, z: room.minZ + inset, yaw: 0 };
    case 'south':
      return { x: at, z: room.maxZ - inset, yaw: Math.PI };
    case 'west':
      return { x: room.minX + inset, z: at, yaw: Math.PI / 2 };
    case 'east':
      return { x: room.maxX - inset, z: at, yaw: -Math.PI / 2 };
  }
}

// ---- Rooms, doors and the ways out of them ---------------------------------

export const floorOf = (room: RoomPlan) => room.floorY ?? 0;

/** Rooms that are escape routes: walked through to reach an exit. */
const CIRCULATION = new Set(['corridor', 'lower-corridor']);

const PLANT = new Set([
  'upper-plant',
  'pumps',
  'balance-tank',
  'chemicals',
  'boiler',
  'air-handling',
  'switch-room',
]);
export const isPlantRoom = (id: string) => PLANT.has(id);

/** A way out of a room: a door, a stair's foot, or a final exit. */
export interface RoomExit {
  x: number;
  z: number;
  /** Where it leads: another room, or the open air. */
  to: string;
}

/** Each door's middle, on the line of its wall. */
export function doorPoint(door: (typeof DOORS)[number]) {
  const a = roomById(door.rooms[0]);
  const b = roomById(door.rooms[1]);
  const wall = sharedWall(a, b);
  if (!wall) return null;
  return wall.side === 'north' || wall.side === 'south'
    ? { x: door.at, z: wall.line }
    : { x: wall.line, z: door.at };
}

/**
 * The ways out of a room that count as exits for escape (Approved
 * Document B): its final exits; its doors into an escape route (the
 * protected service corridors); from the pool hall, changing village and
 * reception, which open into one another, their doors to rooms that have
 * final exits; and, on the lower level, the stairs up.
 */
export function roomExits(room: RoomPlan): RoomExit[] {
  const exits: RoomExit[] = [];
  for (const exit of FINAL_EXITS.filter((e) => e.room === room.id)) {
    const p = onWall(room, exit.side, exit.at, 0);
    exits.push({ x: p.x, z: p.z, to: 'outside' });
  }
  const publicRooms = new Set(['hall', 'changing', 'reception']);
  for (const door of DOORS) {
    if (door.stair || !door.rooms.includes(room.id)) continue;
    const other = door.rooms[0] === room.id ? door.rooms[1] : door.rooms[0];
    const p = doorPoint(door);
    if (!p) continue;
    const leadsOut =
      CIRCULATION.has(other) ||
      (publicRooms.has(room.id) && publicRooms.has(other)) ||
      // Rooms off a plant room or office with its own exits.
      !CIRCULATION.has(room.id);
    if (leadsOut) exits.push({ ...p, to: other });
  }
  if (room.id === 'lower-corridor')
    for (const stair of STAIRS)
      exits.push({
        x: stair.minX,
        z: (stair.minZ + stair.maxZ) / 2,
        to: 'corridor',
      });
  return exits;
}

/** Points over a room's floor, a metre apart, clear of the walls and pools. */
export function floorSamples(
  room: RoomPlan,
  step = 1,
): { x: number; z: number }[] {
  const points: { x: number; z: number }[] = [];
  for (let x = room.minX + 0.5; x <= room.maxX - 0.5; x += step)
    for (let z = room.minZ + 0.5; z <= room.maxZ - 0.5; z += step) {
      if (
        room.id === 'hall' &&
        BASINS.some((b) => x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ)
      )
        continue;
      points.push({ x, z });
    }
  return points;
}

/**
 * The largest direct distance from anywhere in a room to its nearest exit.
 * Approved Document B lets a direct distance of two thirds of the travel
 * limit stand for travel where the room's layout is not yet fixed.
 */
export function worstDirectDistance(room: RoomPlan) {
  const exits = roomExits(room);
  let worst = 0;
  for (const p of floorSamples(room)) {
    const nearest = Math.min(
      ...exits.map((e) => Math.hypot(e.x - p.x, e.z - p.z)),
    );
    worst = Math.max(worst, nearest);
  }
  return worst;
}

/**
 * The travel distance limit for a room, Approved Document B volume 2,
 * table 2.1: assembly and recreation, 18 m with one way out, 45 m with a
 * choice; plant rooms within the room, 9 m and 35 m.
 */
export function travelLimit(room: RoomPlan) {
  const ways = roomExits(room).length;
  if (isPlantRoom(room.id)) return ways > 1 ? 35 : 9;
  return ways > 1 ? 45 : 18;
}

// ---- Fittings ---------------------------------------------------------------

export type DetectorKind =
  | 'smoke'
  | 'heat'
  | 'beam-transmitter'
  | 'beam-reflector';
export type FittingKind =
  | DetectorKind
  | 'call-point'
  | 'sounder'
  | 'fire-panel'
  | 'emergency-downlight'
  | 'emergency-bulkhead'
  | 'exit-sign'
  | 'fire-door-sign'
  | 'first-aid-sign'
  | 'extinguisher'
  | 'fire-exit-door';

export type SignArrow = 'up' | 'left' | 'right' | 'up-left' | 'up-right';
export type Extinguisher = 'water' | 'foam' | 'co2';

export interface Fitting {
  kind: FittingKind;
  room: string;
  x: number;
  /** Height of its mounting point above datum (ceiling, or wall height). */
  y: number;
  z: number;
  /** For wall fittings, the way it faces; ceiling fittings hang down. */
  yaw: number;
  mount: 'ceiling' | 'wall';
  /** Escape sign: its arrow (BS 5499-4) and whether it says FIRE EXIT. */
  arrow?: SignArrow;
  finalExit?: boolean;
  /** Extinguisher: its kind. Fire exit door: its width. */
  extinguisher?: Extinguisher;
  width?: number;
  /** On a freestanding stand rather than a wall. */
  stand?: boolean;
}

/**
 * Detector coverage radii, BS 5839-1 clause 22: no point in a protected
 * area more than 7.5 m from a point smoke detector or 5.3 m from a point
 * heat detector (flat ceilings), and the ceiling heights up to which they
 * may be used (10.5 m and 7.5 m for general use).
 */
export const COVERAGE = { smoke: 7.5, heat: 5.3 } as const;
export const MAX_POINT_HEIGHT = { smoke: 10.5, heat: 7.5 } as const;
/** Optical beam detectors: within 7.5 m of the beam either side, 15 m apart. */
export const BEAM_HALF_WIDTH = 7.5;

/**
 * Heat detectors where steam, dust or fumes would set off smoke
 * detectors: the changing village and its showers, the staff kitchenette,
 * the boiler room, the corrosive chemical store and the humid pool plant
 * rooms.
 */
const HEAT_ROOMS = new Set([
  'changing',
  'staff',
  'boiler',
  'chemicals',
  'pumps',
  'balance-tank',
]);

export function detectorKind(
  room: RoomPlan,
): 'smoke' | 'heat' | 'beam-transmitter' {
  if (room.height > MAX_POINT_HEIGHT.smoke) return 'beam-transmitter';
  return HEAT_ROOMS.has(room.id) ? 'heat' : 'smoke';
}

/**
 * A grid of points over a room so that no point of it is further than `r`
 * from one of them: cells of a × b with half their diagonal at most r.
 */
export function coverageGrid(room: RoomPlan, r: number) {
  const w = room.maxX - room.minX;
  const d = room.maxZ - room.minZ;
  const rows = Math.max(1, Math.ceil(d / (r * Math.SQRT2)));
  const b = d / rows;
  const aMax = 2 * Math.sqrt(r * r - (b / 2) * (b / 2));
  const cols = Math.max(1, Math.ceil(w / aMax));
  const a = w / cols;
  const points: { x: number; z: number }[] = [];
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < rows; j++)
      points.push({
        x: room.minX + a * (i + 0.5),
        z: room.minZ + b * (j + 0.5),
      });
  return points;
}

function detectors(room: RoomPlan): Fitting[] {
  const kind = detectorKind(room);
  const ceiling = floorOf(room) + room.height;
  if (kind === 'beam-transmitter') {
    // Beams across the room's length, 0.6 m under the roof.
    const d = room.maxZ - room.minZ;
    const beams = Math.ceil(d / (2 * BEAM_HALF_WIDTH));
    const out: Fitting[] = [];
    for (let i = 0; i < beams; i++) {
      const z = room.minZ + (d / beams) * (i + 0.5);
      const west = onWall(room, 'west', z);
      const east = onWall(room, 'east', z);
      const y = ceiling - 0.6;
      out.push(
        { kind: 'beam-transmitter', room: room.id, ...west, y, mount: 'wall' },
        { kind: 'beam-reflector', room: room.id, ...east, y, mount: 'wall' },
      );
    }
    return out;
  }
  return coverageGrid(room, COVERAGE[kind]).map((p) => ({
    kind,
    room: room.id,
    ...p,
    y: ceiling,
    yaw: 0,
    mount: 'ceiling' as const,
  }));
}

/** Wall positions along a room's walls every `step` metres, clear of doors. */
function wallSpots(room: RoomPlan, step: number, y: number) {
  const holes = (side: Side) => {
    const list: { from: number; to: number }[] = [];
    for (const door of DOORS) {
      if (!door.rooms.includes(room.id) || door.stair) continue;
      const other = roomById(
        door.rooms[0] === room.id ? door.rooms[1] : door.rooms[0],
      );
      const wall = sharedWall(room, other);
      if (wall?.side === side)
        list.push({
          from: door.at - door.width / 2 - 0.4,
          to: door.at + door.width / 2 + 0.4,
        });
    }
    // The wall beside a stair flight is out of reach, on both levels.
    if (
      side === 'north' &&
      (room.id === 'corridor' || room.id === 'lower-corridor')
    )
      for (const stair of STAIRS)
        list.push({ from: stair.minX - 0.5, to: stair.maxX + 0.5 });
    for (const exit of FINAL_EXITS)
      if (exit.room === room.id && exit.side === side)
        list.push({
          from: exit.at - exit.width / 2 - 0.4,
          to: exit.at + exit.width / 2 + 0.4,
        });
    return list;
  };
  const spots: { x: number; z: number; yaw: number; y: number }[] = [];
  for (const side of ['north', 'south', 'east', 'west'] as const) {
    const along = side === 'north' || side === 'south';
    const from = along ? room.minX : room.minZ;
    const to = along ? room.maxX : room.maxZ;
    const blocked = holes(side);
    for (let t = from + 0.6; t <= to - 0.6; t += step)
      if (!blocked.some((h) => t > h.from && t < h.to))
        spots.push({ ...onWall(room, side, t), y });
  }
  return spots;
}

/**
 * In the pool hall, whose deck is too far from its walls, freestanding
 * stands on the deck between the pools, 4 m apart, facing south.
 */
function standSpots(room: RoomPlan, y: number) {
  if (room.id !== 'hall') return [];
  return floorSamples(room, 4)
    .filter(
      (p) =>
        !BASINS.some(
          (b) =>
            p.x > b.minX - 1.5 &&
            p.x < b.maxX + 1.5 &&
            p.z > b.minZ - 1.5 &&
            p.z < b.maxZ + 1.5,
        ),
    )
    .map((p) => ({ ...p, yaw: 0, y, stand: true }));
}

/**
 * Greedily choose wall spots so that every floor sample in the room is
 * within `reach` of a chosen spot (or of one of `existing`).
 */
function coverFromWalls(
  room: RoomPlan,
  reach: number,
  y: number,
  existing: readonly { x: number; z: number }[],
) {
  const candidates = [...wallSpots(room, 2, y), ...standSpots(room, y)];
  const chosen: {
    x: number;
    z: number;
    yaw: number;
    y: number;
    stand?: boolean;
  }[] = [];
  let open = floorSamples(room, 2).filter(
    (p) => !existing.some((e) => Math.hypot(e.x - p.x, e.z - p.z) <= reach),
  );
  while (open.length && candidates.length) {
    let best = candidates[0];
    let bestCount = -1;
    for (const c of candidates) {
      const n = open.filter(
        (p) => Math.hypot(c.x - p.x, c.z - p.z) <= reach,
      ).length;
      if (n > bestCount) {
        best = c;
        bestCount = n;
      }
    }
    if (bestCount <= 0) break;
    chosen.push(best);
    open = open.filter((p) => Math.hypot(best.x - p.x, best.z - p.z) > reach);
  }
  return chosen;
}

/** Final exits, each a fire exit door drawn shut in its wall. */
function exitDoors(): Fitting[] {
  return FINAL_EXITS.filter((e) => e.id !== 'entrance').map((e) => {
    const room = roomById(e.room);
    return {
      kind: 'fire-exit-door' as const,
      room: e.room,
      ...onWall(room, e.side, e.at, 0.1),
      y: floorOf(room),
      mount: 'wall' as const,
      width: e.width,
    };
  });
}

/** Where a call point, fire point or luminaire goes beside a door: on its wall, 0.5 m off its frame. */
function besideDoor(
  room: RoomPlan,
  side: Side,
  at: number,
  width: number,
  y: number,
) {
  const along = side === 'north' || side === 'south';
  const span = along ? [room.minX, room.maxX] : [room.minZ, room.maxZ];
  let t = at + width / 2 + 0.5;
  if (t > span[1] - 0.4) t = at - width / 2 - 0.5;
  return { ...onWall(room, side, t), y };
}

/** Every door's place in each of its rooms' walls. */
function doorSides() {
  const out: {
    room: RoomPlan;
    side: Side;
    at: number;
    width: number;
    other: string;
  }[] = [];
  for (const door of DOORS) {
    if (door.stair) continue;
    for (const [id, otherId] of [
      door.rooms,
      [door.rooms[1], door.rooms[0]],
    ] as const) {
      const room = roomById(id);
      const wall = sharedWall(room, roomById(otherId));
      if (wall)
        out.push({
          room,
          side: wall.side,
          at: door.at,
          width: door.width,
          other: otherId,
        });
    }
  }
  return out;
}

/** The final exit nearest a point on the same floor, by direct distance. */
function nearestFinalExit(x: number, z: number, floorY: number) {
  let best: { x: number; z: number } | null = null;
  let bestD = Infinity;
  for (const e of FINAL_EXITS) {
    const room = roomById(e.room);
    if (floorOf(room) !== floorY) continue;
    const p = onWall(room, e.side, e.at, 0);
    const d = Math.hypot(p.x - x, p.z - z);
    if (d < bestD) {
      best = p;
      bestD = d;
    }
  }
  return best;
}

/**
 * An escape sign's arrow, for someone reading a wall sign that faces
 * `yaw`, toward an exit at x = tx along the corridor. The reader faces
 * the other way; their right hand points along (cos yaw, 0, −sin yaw).
 * BS 5499-4: a horizontal arrow for along the corridor, a diagonal up
 * arrow for up a stair.
 */
export function arrowToward(
  yaw: number,
  x: number,
  tx: number,
  stair = false,
): SignArrow {
  const goRight = (tx - x) * Math.cos(yaw) > 0;
  if (stair) return goRight ? 'up-right' : 'up-left';
  return goRight ? 'right' : 'left';
}

const SIGN_Y = DOOR_HEIGHT + 0.25;

/** The whole provision, room by room. */
export function planFireSafety(): Fitting[] {
  const fittings: Fitting[] = [];
  const add = (f: Fitting) => fittings.push(f);

  // Detection (BS 5839-1): every room, by the right kind of detector.
  for (const room of ROOMS) for (const f of detectors(room)) add(f);

  // Fire exit doors, each with its exit sign above it, an emergency light
  // beside the sign, a call point by its latch and a fire point by it.
  for (const door of exitDoors()) add(door);
  for (const exit of FINAL_EXITS) {
    const room = roomById(exit.room);
    const y0 = floorOf(room);
    const over = onWall(room, exit.side, exit.at, 0.06);
    add({
      kind: 'exit-sign',
      room: room.id,
      ...over,
      y: y0 + (exit.id === 'entrance' ? 3.2 : SIGN_Y),
      mount: 'wall',
      arrow: 'up',
      finalExit: true,
    });
    const light = besideDoor(room, exit.side, exit.at, exit.width, y0 + SIGN_Y);
    add({ kind: 'emergency-bulkhead', room: room.id, ...light, mount: 'wall' });
    add({
      kind: 'call-point',
      room: room.id,
      ...besideDoor(room, exit.side, exit.at, exit.width, y0 + 1.4),
      mount: 'wall',
    });
  }

  // Each door: an emergency light within 2 m on each side of it (BS 5266-1
  // points of emphasis), an exit sign over it on the side of the room it
  // is a way out of, and FIRE DOOR KEEP SHUT on its service side.
  for (const { room, side, at, width, other } of doorSides()) {
    const y0 = floorOf(room);
    const over = onWall(room, side, at, 0.06);
    add({
      kind: 'emergency-bulkhead',
      room: room.id,
      ...besideDoor(room, side, at, width, y0 + SIGN_Y),
      mount: 'wall',
    });
    if (
      roomExits(room).some((e) => e.to === other) &&
      !CIRCULATION.has(room.id)
    )
      add({
        kind: 'exit-sign',
        room: room.id,
        ...over,
        y: y0 + SIGN_Y,
        mount: 'wall',
        arrow: 'up',
      });
    if (room.zone === 'service' || roomById(other).zone === 'service') {
      const plate = { ...over, y: y0 + 1.6 };
      const offset = width / 2 + 0.35;
      const along = side === 'north' || side === 'south';
      add({
        kind: 'fire-door-sign',
        room: room.id,
        ...plate,
        x: along ? at + offset : plate.x,
        z: along ? plate.z : at + offset,
        mount: 'wall',
      });
    }
    if (other === 'first-aid')
      add({
        kind: 'first-aid-sign',
        room: room.id,
        ...over,
        y: y0 + SIGN_Y + 0.35,
        mount: 'wall',
      });
  }

  // Corridors: emergency downlights along the centre line at most 10 m
  // apart, directional escape signs on the walls every 12 m pointing to
  // the nearest final exit (downstairs, to the nearest stair up).
  for (const id of ['corridor', 'lower-corridor']) {
    const room = roomById(id);
    const y0 = floorOf(room);
    const zMid = (room.minZ + room.maxZ) / 2;
    const n = Math.ceil((room.maxX - room.minX) / 10);
    for (let i = 0; i < n; i++) {
      const x = room.minX + ((room.maxX - room.minX) / n) * (i + 0.5);
      add({
        kind: 'emergency-downlight',
        room: id,
        x,
        y: y0 + room.height,
        z: zMid + 0.6,
        yaw: 0,
        mount: 'ceiling',
      });
    }
    const spots = wallSpots(room, 12, y0 + SIGN_Y).filter(
      (s) => s.yaw === Math.PI,
    );
    for (const s of spots) {
      if (id === 'lower-corridor') {
        const stair = STAIRS.reduce((a, b) =>
          Math.abs(a.minX - s.x) < Math.abs(b.minX - s.x) ? a : b,
        );
        add({
          kind: 'exit-sign',
          room: id,
          ...s,
          mount: 'wall',
          arrow: arrowToward(
            s.yaw,
            s.x,
            stair.minX,
            Math.abs(stair.minX - s.x) < 4,
          ),
        });
      } else {
        const exit = nearestFinalExit(s.x, s.z, 0);
        if (exit)
          add({
            kind: 'exit-sign',
            room: id,
            ...s,
            mount: 'wall',
            arrow: arrowToward(s.yaw, s.x, exit.x),
          });
      }
    }
  }

  // Stairs: a luminaire over the top of each flight and at its foot, and a
  // call point and fire point at the foot, the lower level's storey exits.
  for (const stair of STAIRS) {
    const z = (stair.minZ + stair.maxZ) / 2;
    const corridor = roomById('corridor');
    const lower = roomById('lower-corridor');
    add({
      kind: 'emergency-downlight',
      room: 'corridor',
      x: (stair.minX + stair.maxX) / 2,
      y: corridor.height,
      z: z + 0.2,
      yaw: 0,
      mount: 'ceiling',
    });
    add({
      kind: 'emergency-downlight',
      room: 'lower-corridor',
      x: stair.minX - 1,
      y: LOWER_Y + lower.height,
      z: z + 0.4,
      yaw: 0,
      mount: 'ceiling',
    });
    const north = onWall(lower, 'north', stair.minX - 1.2);
    add({
      kind: 'call-point',
      room: 'lower-corridor',
      ...north,
      y: LOWER_Y + 1.4,
      mount: 'wall',
    });
    add({
      kind: 'exit-sign',
      room: 'lower-corridor',
      ...onWall(lower, 'north', stair.minX - 0.6, 0.06),
      y: LOWER_Y + SIGN_Y,
      mount: 'wall',
      arrow: 'up-right',
    });
  }

  // Open areas over 60 m² (anti-panic) and high-risk plant rooms: a grid
  // of emergency downlights, 10 m apart (8 m in plant rooms).
  for (const room of ROOMS) {
    if (CIRCULATION.has(room.id)) continue;
    const area = (room.maxX - room.minX) * (room.maxZ - room.minZ);
    if (area <= 60 && !isPlantRoom(room.id)) continue;
    for (const p of coverageGrid(room, isPlantRoom(room.id) ? 5.6 : 7))
      add({
        kind: 'emergency-downlight',
        room: room.id,
        ...p,
        y: floorOf(room) + room.height,
        yaw: 0,
        mount: 'ceiling',
      });
  }

  // Manual call points: no one more than 45 m travel (30 m direct) from
  // one; sounders and visual alarm devices in every room, one per 400 m².
  for (const room of ROOMS) {
    const have = fittings.filter(
      (f) => f.room === room.id && f.kind === 'call-point',
    );
    for (const s of coverFromWalls(room, 30, floorOf(room) + 1.4, have))
      add({ kind: 'call-point', room: room.id, ...s, mount: 'wall' });
    const area = (room.maxX - room.minX) * (room.maxZ - room.minZ);
    const count = Math.max(1, Math.ceil(area / 400));
    const spots = wallSpots(
      room,
      1,
      floorOf(room) + Math.min(2.6, room.height - 0.3),
    );
    for (let i = 0; i < count; i++)
      add({
        kind: 'sounder',
        room: room.id,
        ...spots[Math.floor(((i + 0.5) / count) * spots.length)],
        mount: 'wall',
      });
  }

  // The fire alarm control panel, by the entrance the fire service uses.
  const reception = roomById('reception');
  add({
    kind: 'fire-panel',
    room: 'reception',
    ...onWall(reception, 'east', 21),
    y: 1.5,
    mount: 'wall',
  });

  // Extinguishers (BS 5306-8): fire points with a water or foam
  // extinguisher and a CO₂ one wherever there is electrical equipment, so
  // that no one travels more than 30 m (20 m direct) to one. Electrical
  // rooms get CO₂ only; the chemical store water only.
  for (const room of ROOMS) {
    const have = fittings.filter(
      (f) => f.room === room.id && f.kind === 'extinguisher',
    );
    const reach = 20;
    const points = coverFromWalls(room, reach, floorOf(room) + 0.1, have);
    for (const p of points)
      for (const [i, kind] of extinguishersFor(room).entries())
        add({
          kind: 'extinguisher',
          room: room.id,
          ...shift(p, i * 0.45),
          mount: 'wall',
          extinguisher: kind,
        });
  }
  // BS 5306-8: a floor's class A rating at least 0.065 × its area (and
  // 26A): make up any shortfall with more 13A foam extinguishers at the
  // fire points of the floor's largest rooms.
  for (const floor of [0, LOWER_Y]) {
    const here = ROOMS.filter((r) => floorOf(r) === floor);
    const area = here.reduce(
      (n, r) => n + (r.maxX - r.minX) * (r.maxZ - r.minZ),
      0,
    );
    const points = fittings.filter(
      (f) => f.kind === 'extinguisher' && here.some((r) => r.id === f.room),
    );
    let rating = points.reduce(
      (n, f) => n + CLASS_A_RATING[f.extinguisher ?? 'co2'],
      0,
    );
    const need = Math.max(26, 0.065 * area);
    const hosts = points
      .filter((f) => f.extinguisher !== 'co2' && f.room !== 'chemicals')
      .sort((a, b) => {
        const size = (f: Fitting) => {
          const r = roomById(f.room);
          return (r.maxX - r.minX) * (r.maxZ - r.minZ);
        };
        return size(b) - size(a);
      });
    for (let i = 0; rating < need && hosts.length; i++) {
      const host = hosts[i % hosts.length];
      const round = Math.floor(i / hosts.length) + 1;
      add({ ...host, ...shift(host, -0.45 * round), extinguisher: 'foam' });
      rating += CLASS_A_RATING.foam;
    }
  }

  // BS 5266-1: an emergency light within 2 m of every call point and
  // fire point. Add one over any that has none.
  const lights = () =>
    fittings.filter(
      (f) =>
        f.kind === 'emergency-bulkhead' || f.kind === 'emergency-downlight',
    );
  for (const f of [...fittings])
    if (f.kind === 'call-point' || f.kind === 'extinguisher') {
      const lit = lights().some(
        (l) =>
          l.room === f.room && Math.hypot(l.x - f.x, l.z - f.z) <= EMPHASIS,
      );
      if (!lit) {
        const room = roomById(f.room);
        add({
          kind: 'emergency-bulkhead',
          room: f.room,
          x: f.x,
          z: f.z,
          yaw: f.yaw,
          y: floorOf(room) + Math.min(SIGN_Y, room.height - 0.3),
          mount: 'wall',
        });
      }
    }
  return fittings;
}

/**
 * BS 5266-1 points of emphasis: an emergency light within 2 m
 * (horizontally) of each exit door, call point, fire point and stair.
 */
export const EMPHASIS = 2;

/** The extinguishers at a fire point in a room, for its risks. */
export function extinguishersFor(room: RoomPlan): Extinguisher[] {
  if (room.id === 'switch-room' || room.id === 'control-centre') return ['co2'];
  if (room.id === 'chemicals') return ['water'];
  if (room.zone === 'public') return ['water', 'co2'];
  return ['foam', 'co2'];
}

/** Move a wall spot along its wall. */
function shift(p: { x: number; z: number; yaw: number; y: number }, d: number) {
  const along = Math.abs(Math.sin(p.yaw)) < 0.5;
  return along ? { ...p, x: p.x + d } : { ...p, z: p.z + d };
}

/**
 * Class A ratings of the extinguishers (BS EN 3): a 9 l water or 6 l foam
 * extinguisher is typically 13A; CO₂ has no class A rating.
 */
export const CLASS_A_RATING: Record<Extinguisher, number> = {
  water: 13,
  foam: 13,
  co2: 0,
};
