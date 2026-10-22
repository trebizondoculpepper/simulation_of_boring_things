/**
 * The leisure centre's lighting, by zone: each zone a way of the lighting
 * distribution board in the switch room (DB-L1), which is fed from the
 * main switchboard's DB-LIGHTING way. A zone is lit while the whole
 * site's supply is on, the switch room has its feeder, DB-LIGHTING is on
 * and the zone's own breaker is; otherwise its electric lights are out.
 * Only daylight is left, in the two halls with skylights and windows.
 *
 * Pure.
 */
import type { PlantServices } from './services';

export interface LightingZone {
  /** Its way on DB-L1, from 1. */
  way: number;
  name: string;
  /** The rooms it lights, by the game's room ids. */
  rooms: readonly string[];
  /** Whether daylight comes in (skylights or windows), so it is never quite dark by day. */
  daylight: boolean;
}

export const LIGHTING_ZONES = {
  corridors: {
    way: 1,
    name: 'CORRIDORS',
    rooms: ['main_corridor', 'pool_02_gallery'],
    daylight: false,
  },
  lounge: {
    way: 2,
    name: 'LOUNGE POOL HALL',
    rooms: ['pool_01'],
    daylight: true,
  },
  olympic: {
    way: 3,
    name: 'OLYMPIC POOL HALL',
    rooms: ['pool_02'],
    daylight: true,
  },
  jacuzzi: {
    way: 4,
    name: 'JACUZZI ROOM',
    rooms: ['pool_03'],
    daylight: false,
  },
  footbath: {
    way: 5,
    name: 'FOOTBATH PASSAGE',
    rooms: ['pool_04'],
    daylight: false,
  },
  plant_pool_01: {
    way: 6,
    name: 'LOUNGE PLANT ROOM',
    rooms: ['plant_pool_01'],
    daylight: false,
  },
  plant_pool_02: {
    way: 7,
    name: 'OLYMPIC PLANT ROOM',
    rooms: ['plant_pool_02'],
    daylight: false,
  },
  plant_pool_03: {
    way: 8,
    name: 'JACUZZI PLANT ROOM',
    rooms: ['plant_pool_03'],
    daylight: false,
  },
  plant_pool_04: {
    way: 9,
    name: 'FOOTBATH PLANT ROOM',
    rooms: ['plant_pool_04'],
    daylight: false,
  },
  wet_hall: { way: 10, name: 'WET HALL', rooms: ['wet_hall'], daylight: false },
  boiler_house: {
    way: 11,
    name: 'BOILER HOUSE',
    rooms: ['boiler_house'],
    daylight: false,
  },
  air_plant: {
    way: 12,
    name: 'AIR HANDLING PLANT',
    rooms: ['air_plant'],
    daylight: false,
  },
  switch_room: {
    way: 13,
    name: 'SWITCH ROOM',
    rooms: ['switch_room'],
    daylight: false,
  },
  control_room: {
    way: 14,
    name: 'CONTROL ROOM',
    rooms: ['control_room'],
    daylight: false,
  },
  engineers_office: {
    way: 15,
    name: 'ENGINEER’S OFFICE',
    rooms: ['engineers_office'],
    daylight: false,
  },
  hypo_store: {
    way: 16,
    name: 'HYPOCHLORITE STORE',
    rooms: ['hypo_store'],
    daylight: false,
  },
  acid_store: {
    way: 17,
    name: 'ACID STORE',
    rooms: ['acid_store'],
    daylight: false,
  },
  loading_bay: {
    way: 18,
    name: 'LOADING BAY',
    rooms: ['loading_bay'],
    daylight: false,
  },
} as const satisfies Record<string, LightingZone>;

export type LightingZoneId = keyof typeof LIGHTING_ZONES;
export const LIGHTING_ZONE_IDS = Object.keys(
  LIGHTING_ZONES,
) as LightingZoneId[];

/** DB-L1's ways: 24, the zones on the first 18, the rest spare. */
export const LIGHTING_BOARD_WAYS = 24;

/** The lighting's switches: DB-LIGHTING on the main switchboard, and each zone's breaker. */
export interface LightingState {
  supply: boolean;
  zones: Record<LightingZoneId, boolean>;
}

export const newLighting = (): LightingState => ({
  supply: true,
  zones: Object.fromEntries(LIGHTING_ZONE_IDS.map((z) => [z, true])) as Record<
    LightingZoneId,
    boolean
  >,
});

/** The zone a room is in, if it is in the leisure centre. */
export function zoneOfRoom(room: string): LightingZoneId | undefined {
  return LIGHTING_ZONE_IDS.find((z) =>
    (LIGHTING_ZONES[z].rooms as readonly string[]).includes(room),
  );
}

/** Whether DB-L1 itself has a supply. */
export const lightingBoardLive = (plant: PlantServices, l: LightingState) =>
  plant.sources.power && plant.feeders.switch_room && l.supply;

/** Whether a zone's electric lights are on. */
export const zoneLit = (
  plant: PlantServices,
  l: LightingState,
  zone: LightingZoneId,
) => lightingBoardLive(plant, l) && l.zones[zone];
