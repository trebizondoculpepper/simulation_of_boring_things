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
