/**
 * The leisure centre's lighting, by zone: each zone a way of the lighting
 * distribution board in the switch room (DB-L1), which is fed from the
 * main switchboard's DB-LIGHTING way. A zone is lit while the whole
 * site's supply is on, the switch room has its feeder, DB-LIGHTING is on,
 * DB-L1's main switch is, and the zone's own breaker is; otherwise its
 * electric lights are out. Only daylight is left, in the two halls with
 * skylights and windows, and the emergency lighting (`world.ts`).
 *
 * DB-L1 is a 400 V TP&N board (the owner, 2026-10-25): each way a 230 V
 * circuit on one of its three phases, protected by a 10 A Type B RCBO,
 * 30 mA, as BS 7671 wants in a pool building's wet areas (Section 702,
 * and cables buried in its walls). A way's RCBO trips on earth leakage
 * at 30 mA: moisture in its fittings, which builds in a pool hall whose
 * air is humid enough to condense in them, and dries out slowly once the
 * air is drier again. Tripped, it shows its trip flag and stays off;
 * switched back on while the leakage persists, it trips again. Its TEST
 * button, with the board live, trips it, as its monthly test does.
 *
 * Pure.
 */
import type { PlantServices } from './services';
import { switchboardLive } from './changeover';

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
    rooms: ['plant_pool_02', 'tank_hall'],
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

/**
 * The lighting's switches: DB-LIGHTING on the main switchboard, DB-L1's
 * main switch, and each way's RCBO (`zones`: closed), with its trip flag
 * and the earth leakage on its circuit.
 */
export interface LightingState {
  supply: boolean;
  /** DB-L1's main switch-disconnector. */
  main: boolean;
  zones: Record<LightingZoneId, boolean>;
  /** Each RCBO's trip flag: tripped, not switched off, until switched on again. */
  tripped: Record<LightingZoneId, boolean>;
  /** Each circuit's earth leakage, mA. */
  leakage: Record<LightingZoneId, number>;
}

const eachZone = <T>(v: T) =>
  Object.fromEntries(LIGHTING_ZONE_IDS.map((z) => [z, v])) as Record<
    LightingZoneId,
    T
  >;

export const newLighting = (): LightingState => ({
  supply: true,
  main: true,
  zones: eachZone(true),
  tripped: eachZone(false),
  leakage: eachZone(0),
});

/** Each way's RCBO: its rating, its trip current and its type. */
export const RCBO = { amps: 10, tripMa: 30, curve: 'B' } as const;
/** A way's phase, L1 to L3, in turn down the board. */
export const wayPhase = (way: number) => `L${((way - 1) % 3) + 1}`;

/**
 * Moisture in a hall's fittings: above `condense` % RH it builds the
 * circuit's leakage by `rate` mA a second per % over; below, it dries out
 * with a time constant of `dry` seconds. At 85 % its RCBO trips in about
 * two hours.
 */
export const MOISTURE = { condense: 75, rate: 4.2e-4, dry: 3 * 3600 } as const;

/** A switch on DB-L1: its main switch, or a way's RCBO switched by hand, or its TEST pressed. */
export type LightingBoardAction =
  | { act: 'main'; on: boolean }
  | { act: 'way'; zone: LightingZoneId; on: boolean }
  | { act: 'test'; zone: LightingZoneId };

export function actOnLightingBoard(
  l: LightingState,
  a: LightingBoardAction,
  live: boolean,
): LightingState {
  if (a.act === 'main') return l.main === a.on ? l : { ...l, main: a.on };
  if (a.act === 'way')
    return {
      ...l,
      zones: { ...l.zones, [a.zone]: a.on },
      // Switched off and on again, its trip flag resets.
      tripped: { ...l.tripped, [a.zone]: false },
    };
  // TEST: with the board live and the RCBO on, it trips.
  return live && l.zones[a.zone]
    ? {
        ...l,
        zones: { ...l.zones, [a.zone]: false },
        tripped: { ...l.tripped, [a.zone]: true },
      }
    : l;
}

/**
 * The lighting `dt` seconds on: each circuit's leakage from its hall's
 * humidity (`rh`, % where it has one), and each live RCBO tripping on it.
 */
export function stepLighting(
  l: LightingState,
  rh: Partial<Record<LightingZoneId, number>>,
  live: boolean,
  dt: number,
): LightingState {
  if (!(dt > 0)) return l;
  let changed = false;
  const leakage = { ...l.leakage };
  const zones = { ...l.zones };
  const tripped = { ...l.tripped };
  for (const z of LIGHTING_ZONE_IDS) {
    const air = rh[z];
    const was = l.leakage[z] ?? 0;
    const next =
      air !== undefined && air > MOISTURE.condense
        ? was + MOISTURE.rate * (air - MOISTURE.condense) * dt
        : was * Math.exp(-dt / MOISTURE.dry);
    if (next !== was) {
      leakage[z] = next < 1e-3 ? 0 : next;
      changed = true;
    }
    if (live && zones[z] && leakage[z] >= RCBO.tripMa) {
      zones[z] = false;
      tripped[z] = true;
      changed = true;
    }
  }
  return changed ? { ...l, leakage, zones, tripped } : l;
}

/** The zone a room is in, if it is in the leisure centre. */
export function zoneOfRoom(room: string): LightingZoneId | undefined {
  return LIGHTING_ZONE_IDS.find((z) =>
    (LIGHTING_ZONES[z].rooms as readonly string[]).includes(room),
  );
}

/** Whether DB-L1 itself has a supply. */
export const lightingBoardLive = (plant: PlantServices, l: LightingState) =>
  switchboardLive(plant) && plant.feeders.switch_room && l.supply;

/** Whether DB-L1's ways are live: its supply, and its main switch on. */
export const lightingWaysLive = (plant: PlantServices, l: LightingState) =>
  lightingBoardLive(plant, l) && (l.main ?? true);

/** Whether a zone's electric lights are on. */
export const zoneLit = (
  plant: PlantServices,
  l: LightingState,
  zone: LightingZoneId,
) => lightingWaysLive(plant, l) && l.zones[zone];
