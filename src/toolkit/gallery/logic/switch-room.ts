import { ROOM_SERVICES } from '../../../game/plant/services';
import type { ServiceRoom } from '../../../game/plant/services';

/**
 * Which rooms each of the main switchboard's outgoing ways feeds
 * (`electrical-switchgear.ts`, `createMainSwitchboard`), by the way's
 * name: switched off, or tripped, those rooms' feeders are off in the
 * world (`world.ts`, `plant/feeder`), and they lose their power. The
 * lighting, emergency lighting battery and BMS UPS ways feed no plant
 * room; the switch room itself is the supply. Pure.
 */
export const SWITCHBOARD_FEEDS: Readonly<
  Record<string, readonly ServiceRoom[]>
> = {
  'MCC-1': ['wet_hall'],
  'DB-OLYMPIC': ['plant_pool_02'],
  'DB-LOUNGE': ['plant_pool_01'],
  'DB-SPAS': ['plant_pool_03', 'plant_pool_04'],
  'DB-BOILERS': ['boiler_house'],
  'DB-AIR PLANT': ['air_plant'],
  'DB-SMALL POWER': [
    'hypo_store',
    'acid_store',
    'loading_bay',
    'control_room',
    'engineers_office',
  ],
};

/** A way's name, as its legend begins: "DB-OLYMPIC 160 A" is DB-OLYMPIC. */
export const wayName = (legend: string) => legend.replace(/ \d+ A$/, '');

/** Every room the switchboard feeds, but the switch room, which is the supply. */
export const FED_ROOMS = (Object.keys(ROOM_SERVICES) as ServiceRoom[]).filter(
  (r) => r !== 'switch_room',
);

/**
 * The main incoming switch: the whole site's supply
 * (`plant.sources.power`), between the supply company's cut-out and the
 * main switchboard. The Encabulator's incoming supply isolator, after the
 * Square D HU365 (`incoming-isolator.ts`): its steel box, 1.28 m high,
 * on two unistrut posts from the floor, the supply rising into its foot
 * in trunking; its footprint, posts to handle, metres; the top of its
 * box, where the outgoing trunking leaves for the cable ladder.
 */
export const MAIN_SWITCH = {
  w: 0.76,
  d: 0.45,
  h: 2.3,
  top: 1.45 + 1.276 / 2,
} as const;

/** The lighting distribution board, DB-L1, metres: wall-mounted. */
export const LIGHTING_BOARD = { w: 0.72, h: 1.0, d: 0.14 } as const;
