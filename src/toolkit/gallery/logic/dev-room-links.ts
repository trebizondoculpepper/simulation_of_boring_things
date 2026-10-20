import type { Footprint } from '../../controls/logic/walk-collision';

/**
 * How the rooms join. The leisure centre (`facility`) is one connected
 * world of its own. The development rooms are separate rooms, each with a
 * single way out: a spring door back to dev_corridor, the corridor that
 * loops round a square and has a door to every other room
 * (`src/scene/dev-corridor.ts` gives its doors to `ROOMS` in order). The
 * courtyard is walked into from the corridor. Adapted from the
 * Encabulator: its own rooms are replaced by this game's.
 */

/** Rooms copied from the Encabulator's development rooms. */
export type GalleryRoomId =
  | 'dev0'
  | 'dev1'
  | 'dev2'
  | 'dev3'
  | 'dev4'
  | 'dev5'
  | 'dev6'
  | 'dev7'
  | 'dev8'
  | 'dev9'
  | 'dev10'
  | 'dev11'
  | 'dev12'
  | 'dev13'
  | 'dev_corridor';
/** One development room per pool plant room, each showing its equipment. */
export type EquipmentRoomId =
  | 'dev_pumps'
  | 'dev_balance'
  | 'dev_chemicals'
  | 'dev_dosing'
  | 'dev_boiler'
  | 'dev_air'
  | 'dev_electrical'
  | 'dev_control';
export type DevRoomId = GalleryRoomId | EquipmentRoomId;
export type RoomId = DevRoomId | 'facility' | 'dev_courtyard';
export type PortalSide = 'north' | 'south' | 'east' | 'west';
export interface Portal {
  to: RoomId;
  side: PortalSide;
  /** The middle of the patch, on the wall's centre line. */
  x: number;
  z: number;
}

export const EQUIPMENT_ROOMS: readonly EquipmentRoomId[] = [
  'dev_pumps',
  'dev_balance',
  'dev_chemicals',
  'dev_dosing',
  'dev_boiler',
  'dev_air',
  'dev_electrical',
  'dev_control',
];

/** The development rooms, in order. */
export const DEV_ROOMS: readonly DevRoomId[] = [
  'dev0',
  'dev1',
  'dev2',
  'dev3',
  'dev4',
  'dev5',
  'dev6',
  'dev7',
  'dev8',
  'dev9',
  'dev10',
  'dev11',
  'dev12',
  'dev13',
  'dev_corridor',
  ...EQUIPMENT_ROOMS,
];

/** The rooms whose way out is a door to dev_corridor. */
export const CHAIN: readonly RoomId[] = DEV_ROOMS;

/**
 * Every room with a URL of its own, in the order dev_corridor's doors
 * take them (the corridor and courtyard themselves are skipped).
 */
export const ROOMS: readonly RoomId[] = [
  'facility',
  ...DEV_ROOMS,
  // Reached through dev_corridor's courtyard doors, not by a portal.
  'dev_courtyard',
];

/** A room id from a URL, if it names one. */
export function resolveRoomId(id: string | null): RoomId | undefined {
  return ROOMS.includes(id as RoomId) ? (id as RoomId) : undefined;
}

export const DEV_ROOM_NAMES: Record<RoomId, string> = {
  facility: 'LEISURE CENTRE',
  dev0: 'DEV0 · CONTROLS AND DISPLAYS',
  dev1: 'DEV1 · RACKS',
  dev2: 'DEV2 · FIRE SAFETY',
  dev3: 'DEV3 · BUILDING FITTINGS',
  dev4: 'DEV4 · REPAIR WORKSHOP',
  dev5: 'DEV5 · PUTTING THINGS IN THE BIN',
  dev6: 'DEV6 · SETTLING OBJECTS INTO SKIPS',
  dev7: 'DEV7 · MACHINE TONES',
  dev8: 'DEV8 · BRANDS AND LOGOS',
  dev9: 'DEV9 · FIRES',
  dev10: 'DEV10 · PIPEWORK, DUCTING AND RAILINGS',
  dev11: 'DEV11 · POOLROOMS',
  dev12: 'DEV12 · POOL FITTINGS',
  dev13: 'DEV13 · SIGNS AND LABELS',
  dev_corridor: 'DEV CORRIDOR',
  dev_courtyard: 'COURTYARD',
  dev_pumps: 'DEV · PUMPS AND FILTRATION',
  dev_balance: 'DEV · BALANCE TANKS',
  dev_chemicals: 'DEV · CHEMICAL STORE',
  dev_dosing: 'DEV · DOSING',
  dev_boiler: 'DEV · BOILER ROOM',
  dev_air: 'DEV · AIR HANDLING',
  dev_electrical: 'DEV · ELECTRICAL',
  dev_control: 'DEV · CONTROL CENTRE',
};
/** Each room's portal colour, so a portal says where it goes. */
export const DEV_ROOM_COLOURS: Record<RoomId, string> = {
  facility: '#3aa7c9',
  dev0: '#2fb3a5',
  dev1: '#3f7fe0',
  dev2: '#b8433a',
  dev3: '#b6be9d',
  dev4: '#798b91',
  dev5: '#7d9a5c',
  dev6: '#c4a24a',
  dev7: '#4f9bb3',
  dev8: '#c8a227',
  dev9: '#e0602a',
  dev10: '#8a9a9e',
  dev11: '#7fd3dc',
  dev12: '#9fc6cc',
  dev13: '#d6b35a',
  dev_corridor: '#2d9ca0',
  dev_courtyard: '#7fa36a',
  dev_pumps: '#2f6fb0',
  dev_balance: '#4a9bb8',
  dev_chemicals: '#d1a21c',
  dev_dosing: '#8c6bc4',
  dev_boiler: '#c75a2f',
  dev_air: '#6e9f7a',
  dev_electrical: '#d47f1f',
  dev_control: '#5c6f86',
};
/** How thick a room's walls are, metres. */
export const WALL_THICKNESS = 0.3;

/**
 * A room's way out, in scene units (`metre` per metre): since the dev
 * rooms were wired to dev_corridor's doors (`doc/prompts/009`), every room
 * has a single way out, a spring door back to the corridor, which leads
 * round the loop to every other: on its west wall near its south end
 * (dev3 on its north wall, clear of the doors already there). The
 * corridor and the courtyard have doors of their own instead, and the
 * leisure centre none.
 */
export function devPortals(
  id: RoomId,
  bounds: Footprint,
  metre: number,
): Portal[] {
  if (!CHAIN.includes(id) || id === 'dev_corridor') return [];
  const to: RoomId = 'dev_corridor';
  // In dev3, in the north wall's corner, clear of the doors shown there.
  if (id === 'dev3')
    return [
      { to, side: 'north', x: bounds.maxX - 1.4 * metre, z: bounds.minZ },
    ];
  return [{ to, side: 'west', x: bounds.minX, z: bounds.maxZ - 1.1 * metre }];
}

export interface WallPiece extends Footprint {
  bottom: number;
  top: number;
}

/** A room's four walls, solid, `height` tall, on its bounds' edges. */
export function devWalls(
  bounds: Footprint,
  metre: number,
  height: number,
): WallPiece[] {
  const t = (WALL_THICKNESS * metre) / 2;
  const wall = (piece: Footprint): WallPiece => ({
    ...piece,
    bottom: 0,
    top: height,
  });
  return [
    wall({
      minX: bounds.minX - t,
      maxX: bounds.maxX + t,
      minZ: bounds.minZ - t,
      maxZ: bounds.minZ + t,
    }),
    wall({
      minX: bounds.minX - t,
      maxX: bounds.maxX + t,
      minZ: bounds.maxZ - t,
      maxZ: bounds.maxZ + t,
    }),
    wall({
      minX: bounds.minX - t,
      maxX: bounds.minX + t,
      minZ: bounds.minZ - t,
      maxZ: bounds.maxZ + t,
    }),
    wall({
      minX: bounds.maxX - t,
      maxX: bounds.maxX + t,
      minZ: bounds.minZ - t,
      maxZ: bounds.maxZ + t,
    }),
  ];
}

/**
 * `walls` (from `devWalls`) with a doorway cut through for each of
 * `doors`, the width of a spring door's opening (`width`, scene units),
 * full height: for a room that cuts real openings for its doors rather
 * than drawing them into a solid wall.
 */
export function cutDoorways(
  walls: readonly WallPiece[],
  doors: readonly Portal[],
  width: number,
): WallPiece[] {
  let pieces = [...walls];
  for (const door of doors) {
    const across = door.side === 'east' || door.side === 'west';
    const next: WallPiece[] = [];
    for (const piece of pieces) {
      const hit = across
        ? door.x >= piece.minX &&
          door.x <= piece.maxX &&
          door.z > piece.minZ &&
          door.z < piece.maxZ
        : door.z >= piece.minZ &&
          door.z <= piece.maxZ &&
          door.x > piece.minX &&
          door.x < piece.maxX;
      if (!hit) {
        next.push(piece);
        continue;
      }
      const at = across ? door.z : door.x;
      const lo = across ? piece.minZ : piece.minX;
      const hi = across ? piece.maxZ : piece.maxX;
      for (const [a, b] of [
        [lo, at - width / 2],
        [at + width / 2, hi],
      ])
        if (b > a)
          next.push(
            across
              ? { ...piece, minZ: a, maxZ: b }
              : { ...piece, minX: a, maxX: b },
          );
    }
    pieces = next;
  }
  return pieces;
}

/** Travel is handled by the app, without reloading the browser. */
export function enterDevRoom(to: RoomId, from: RoomId, through = false) {
  // `through`: walked through a doorway the room beyond was seen through,
  // so the app hands over without a break (`src/main.ts`).
  window.dispatchEvent(
    new CustomEvent('dev-room', {
      detail: through ? { to, from, through } : { to, from },
    }),
  );
}
