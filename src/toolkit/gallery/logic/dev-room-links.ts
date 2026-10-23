import type { Footprint } from '../../controls/logic/walk-collision';

/**
 * How the rooms join. The development rooms are separate rooms, each with a
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
  | 'dev14'
  | 'dev15'
  | 'dev16'
  | 'dev17'
  | 'dev18'
  | 'dev19'
  | 'dev19b'
  | 'dev19c'
  | 'dev19d'
  | 'dev20'
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
  | 'dev_control'
  | 'dev_ozone';
export type DevRoomId = GalleryRoomId | EquipmentRoomId;
/** The main plant room alone at each trial size, metres a side (`plant-fit-room.ts`). */
export const PLANT_FIT_SIZES = [47, 42, 40, 37] as const;
export type PlantFitRoomId = `plant_fit_${(typeof PLANT_FIT_SIZES)[number]}`;
export const PLANT_FIT_ROOMS: readonly PlantFitRoomId[] = PLANT_FIT_SIZES.map(
  (n) => `plant_fit_${n}` as const,
);
export type RoomId =
  | DevRoomId
  | 'dev_courtyard'
  | 'PR_A'
  | 'CR_A_UP'
  | 'CR_A_ROUND'
  | 'CR_A_ARCH'
  | 'CR_A_STEPS'
  | 'white_corridor_1'
  | 'green_room_1'
  | 'CR_GREEN_STAIR'
  | 'donut_pool_1'
  | 'pool_01'
  | 'pool_02'
  | 'pool_03'
  | 'pool_04'
  | 'pool_02_gallery'
  | 'ceiling_lab'
  | 'corridor_lab'
  | 'main_corridor'
  | 'wet_hall'
  | 'boiler_house'
  | 'loading_bay'
  | 'hypo_store'
  | 'acid_store'
  | 'switch_room'
  | 'air_plant'
  | 'control_room'
  | 'engineers_office'
  | 'plant_room_tiny'
  | 'plant_room_small'
  | 'plant_room_medium'
  | 'plant_room_large'
  | 'plant_pool_01'
  | 'plant_pool_02'
  | 'plant_pool_03'
  | 'plant_pool_04'
  | 'pipes_n_dreams'
  | 'plant_corridor'
  | 'shared_plant_layout'
  | PlantFitRoomId;
export type PortalSide = 'north' | 'south' | 'east' | 'west';
export interface Portal {
  to: RoomId;
  side: PortalSide;
  /** The middle of the patch, on the wall's centre line. */
  x: number;
  z: number;
  /** Its floor, scene units, if not the room's (a plant room below ground). */
  y?: number;
  /** What its sign says, if not the name of the room it leads to. */
  label?: string;
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
  'dev_ozone',
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
  'dev14',
  'dev15',
  'dev16',
  'dev17',
  'dev19',
  'dev_corridor',
  ...EQUIPMENT_ROOMS,
];

/** The rooms whose way out is a door to dev_corridor. */
export const CHAIN: readonly RoomId[] = DEV_ROOMS.filter(
  (id) => id !== 'dev11',
);

/**
 * Every room with a URL of its own, in the order dev_corridor's doors
 * take them (the corridor and courtyard themselves are skipped).
 */
export const ROOMS: readonly RoomId[] = [
  ...DEV_ROOMS,
  // Reached through dev_corridor's courtyard doors, not by a portal.
  'dev_courtyard',
  // Reached through dev16, not from the corridor: its security office.
  'dev18',
  // By its URL only: Dev19 plumbed by Codex's rules, and the best of a
  // scored search, to compare.
  'dev19b',
  'dev19c',
  'dev19d',
  // By its URL only: experimental sources.
  'dev20',
  // The single playable pool room.
  'PR_A',
  'CR_A_UP',
  'CR_A_ROUND',
  // South of PR_A: an arched corridor, and the stepped room it opens into.
  'CR_A_ARCH',
  'CR_A_STEPS',
  // North out of CR_A_ROUND: a short white corridor.
  'white_corridor_1',
  'green_room_1',
  'CR_GREEN_STAIR',
  // A white room with a ring-shaped pool round a column; no doors yet.
  'donut_pool_1',
  // The version-one pool halls, each its own ticket; no doors yet.
  'pool_01',
  'pool_02',
  'pool_03',
  'pool_04',
  // The Olympic pool's underwater viewing gallery, under its north deck.
  'pool_02_gallery',
  // A bare room under the procedural services ceiling, for trying seeds.
  'ceiling_lab',
  // The corridor kit: straights and turns, laid out as one run.
  'corridor_lab',
  // The per-attraction plant rooms' shells, in each size.
  // The ring of plant corridor round the wet hall, every plant room off it.
  'main_corridor',
  // The main plant's rooms off it, empty shells for now.
  'wet_hall',
  'boiler_house',
  'loading_bay',
  'hypo_store',
  'acid_store',
  'switch_room',
  'air_plant',
  'control_room',
  'engineers_office',
  'plant_room_tiny',
  'plant_room_small',
  'plant_room_medium',
  'plant_room_large',
  // Each pool hall's own plant room, through its plant room door.
  'plant_pool_01',
  'plant_pool_02',
  'plant_pool_03',
  'plant_pool_04',
  // Every kind of pipe and duct the game knows, on stands.
  'pipes_n_dreams',
  // The plant rooms' main corridor: the dev corridor again, taller, for
  // the pipes and ducts overhead. Its doors open into nothing yet.
  'plant_corridor',
  'shared_plant_layout',
  // The main plant room alone, at each size being compared.
  ...PLANT_FIT_ROOMS,
];

/** A room id from a URL, if it names one. */
export function resolveRoomId(id: string | null): RoomId | undefined {
  return ROOMS.includes(id as RoomId) ? (id as RoomId) : undefined;
}

export const DEV_ROOM_NAMES: Record<RoomId, string> = {
  PR_A: 'PR_A · POOLROOMS',
  CR_A_UP: 'CR_A_UP · DRY STAIR PASSAGE',
  CR_A_ROUND: 'CR_A_ROUND · PINK CIRCULAR ROOM',
  CR_A_ARCH: 'CR_A_ARCH · ARCHED CORRIDOR',
  CR_A_STEPS: 'CR_A_STEPS · STEPPED ROOM',
  white_corridor_1: 'WHITE_CORRIDOR_1 · WHITE CORRIDOR',
  green_room_1: 'GREEN_ROOM_1 · GREEN SKYLIGHT ROOM',
  CR_GREEN_STAIR: 'CR_GREEN_STAIR · DIAMOND STAIR CORRIDOR',
  donut_pool_1: 'DONUT_POOL_1 · RING POOL',
  pool_01: 'POOL-01 · LOUNGE POOL',
  pool_02: 'POOL-02 · OLYMPIC POOL',
  pool_03: 'POOL-03 · JACUZZI',
  pool_04: 'POOL-04 · FOOTBATH',
  pool_02_gallery: 'POOL-02 · UNDERWATER GALLERY',
  ceiling_lab: 'CEILING_LAB · SERVICES CEILING',
  corridor_lab: 'CORRIDOR_LAB · CORRIDOR KIT',
  main_corridor: 'MAIN CORRIDOR',
  wet_hall: 'WET HALL · MAIN PLANT ROOM',
  boiler_house: 'BOILER HOUSE',
  loading_bay: 'LOADING BAY',
  hypo_store: 'SODIUM HYPOCHLORITE STORE',
  acid_store: 'ACID STORE',
  switch_room: 'ELECTRICAL SWITCH ROOM',
  air_plant: 'AIR HANDLING PLANT',
  control_room: 'CONTROL ROOM',
  engineers_office: 'ENGINEER’S OFFICE',
  plant_room_tiny: 'PLANT ROOM · TINY · 5 × 5 M',
  plant_room_small: 'PLANT ROOM · SMALL · 8 × 8 M',
  plant_room_medium: 'PLANT ROOM · MEDIUM · 12 × 12 M',
  plant_room_large: 'PLANT ROOM · LARGE · 22 × 22 M',
  plant_pool_01: 'PLANT ROOM 1 – LOUNGE POOL',
  plant_pool_02: 'PLANT ROOM 2 – OLYMPIC POOL',
  plant_pool_03: 'PLANT ROOM 3 – JACUZZI',
  plant_pool_04: 'PLANT ROOM 4 – FOOTBATH',
  pipes_n_dreams: "PIPES'N DREAMS · PIPING AND DUCTING",
  plant_corridor: 'PLANT CORRIDOR',
  shared_plant_layout: 'SHARED PLANT LAYOUT',
  plant_fit_47: 'MAIN PLANT ROOM · 47 M',
  plant_fit_42: 'MAIN PLANT ROOM · 42 M',
  plant_fit_40: 'MAIN PLANT ROOM · 40 M',
  plant_fit_37: 'MAIN PLANT ROOM · 37 M',
  dev0: 'DEV0 · CONTROLS AND DISPLAYS',
  dev1: 'DEV1 · RACKS',
  dev2: 'DEV2 · SAFETY SYSTEMS',
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
  dev14: 'DEV14 · REMOTE BUTTON',
  dev15: 'DEV15 · REMOTE LAMP',
  dev16: 'DEV16 · WATER PROTOTYPE',
  dev17: 'DEV17 · POOL EDGES',
  dev18: 'DEV18 · SECURITY OFFICE',
  dev19: 'DEV19 · PORT GRAPH TRIAL',
  dev19b: "DEV19B · CODEX'S PLUMBING",
  dev19c: 'DEV19C · SCORED AND SEARCHED',
  dev19d: 'DEV19D · THREE FILTERS',
  dev20: 'DEV20 · SOURCES AND SINKS',
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
  dev_ozone: 'DEV · OZONE',
};
/** Each room's portal colour, so a portal says where it goes. */
export const DEV_ROOM_COLOURS: Record<RoomId, string> = {
  PR_A: '#2f9fc4',
  CR_A_UP: '#dfe7e5',
  CR_A_ROUND: '#eab2bd',
  CR_A_ARCH: '#dfe7e5',
  CR_A_STEPS: '#dfe7e5',
  white_corridor_1: '#f3f5f1',
  green_room_1: '#174e42',
  CR_GREEN_STAIR: '#bdd9cc',
  donut_pool_1: '#f3f5f1',
  pool_01: '#f3f5f1',
  pool_02: '#f3f5f1',
  pool_03: '#cfe1e5',
  pool_04: '#f3f5f1',
  pool_02_gallery: '#2fa3ad',
  ceiling_lab: '#8a8f93',
  corridor_lab: '#f3f5f1',
  main_corridor: '#6d7a6f',
  wet_hall: '#6d7a6f',
  boiler_house: '#6d7a6f',
  loading_bay: '#6d7a6f',
  hypo_store: '#6d7a6f',
  acid_store: '#6d7a6f',
  switch_room: '#6d7a6f',
  air_plant: '#6d7a6f',
  control_room: '#6d7a6f',
  engineers_office: '#6d7a6f',
  plant_room_tiny: '#6d7a6f',
  plant_room_small: '#6d7a6f',
  plant_room_medium: '#6d7a6f',
  plant_room_large: '#6d7a6f',
  plant_pool_01: '#6d7a6f',
  plant_pool_02: '#6d7a6f',
  plant_pool_03: '#6d7a6f',
  plant_pool_04: '#6d7a6f',
  pipes_n_dreams: '#8f3a22',
  plant_corridor: '#8a8f93',
  shared_plant_layout: '#8a8f93',
  plant_fit_47: '#8a8f93',
  plant_fit_42: '#8a8f93',
  plant_fit_40: '#8a8f93',
  plant_fit_37: '#8a8f93',
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
  dev14: '#5aa36b',
  dev15: '#c98a3a',
  dev16: '#3ab0c9',
  dev17: '#7fb2c4',
  dev18: '#8f8a6a',
  dev19: '#73a79b',
  dev19b: '#7b9fb3',
  dev19c: '#8aa37b',
  dev19d: '#a3917b',
  dev20: '#9b8fb0',
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
  dev_ozone: '#4b5fc1',
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
  if (id === 'PR_A') return [];
  // The security office opens off dev16, whose camera it watches: its one
  // door is back into dev16, where dev16's is to the corridor.
  // The plant corridor's doors open into nothing yet.
  if (id === 'plant_corridor' || PLANT_FIT_ROOMS.includes(id as PlantFitRoomId))
    return [];
  if (id === 'dev18')
    return [
      {
        to: 'dev16',
        side: 'west',
        x: bounds.minX,
        z: bounds.maxZ - 1.1 * metre,
      },
    ];
  if (id === 'dev16')
    return [
      {
        to: 'dev_corridor',
        side: 'west',
        x: bounds.minX,
        z: bounds.maxZ - 1.1 * metre,
      },
      {
        to: 'dev18',
        side: 'east',
        x: bounds.maxX,
        z: bounds.maxZ - 1.1 * metre,
      },
    ];
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
