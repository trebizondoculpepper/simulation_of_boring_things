/**
 * The whole plant switched as one, from the Hyperplasc Scenario
 * Simulator in the engineer's office: FULL OFF, FULL ON and SLOW START.
 * (In the fiction the simulator carries its user into another reality,
 * one where the plant is so; to the world it is the same thing.)
 *
 * - FULL OFF: the main incoming switch off, and every room's feeder
 *   breaker open.
 * - FULL ON: every supply, every feeder and every machine's isolator on
 *   at once.
 * - SLOW START: the main switch on, every feeder open, then each room's
 *   feeder closed in turn (`START_ORDER`), `STAGE` seconds apart: the
 *   supplies first, so nothing starts without what it needs, then the
 *   pools' plant, then the rest.
 *
 * Pure.
 */
import { ISOLATORS, UTILITIES } from './services';
import type { IsolatorName, PlantServices, ServiceRoom } from './services';

/** The order SLOW START closes the rooms' feeders in. */
export const START_ORDER: readonly ServiceRoom[] = [
  'switch_room',
  'wet_hall',
  'boiler_house',
  'air_plant',
  'hypo_store',
  'acid_store',
  'plant_pool_02',
  'plant_pool_01',
  'plant_pool_03',
  'plant_pool_04',
  'control_room',
  'engineers_office',
  'loading_bay',
];

/** Seconds between one feeder and the next. */
export const STAGE = 5;

const feedersAll = (plant: PlantServices, on: boolean) =>
  Object.fromEntries(
    Object.keys(plant.feeders).map((room) => [room, on]),
  ) as Record<ServiceRoom, boolean>;

export function fullOff(plant: PlantServices): PlantServices {
  return {
    ...plant,
    sources: { ...plant.sources, power: false },
    feeders: feedersAll(plant, false),
  };
}

export function fullOn(plant: PlantServices): PlantServices {
  return {
    sources: Object.fromEntries(UTILITIES.map((u) => [u, true])) as Record<
      (typeof UTILITIES)[number],
      boolean
    >,
    feeders: feedersAll(plant, true),
    isolators: Object.fromEntries(
      ISOLATORS.map((name) => [name, true]),
    ) as Record<IsolatorName, boolean>,
    // The whole plant on: the switchboard on the mains.
    changeover: 'I',
  };
}

/** SLOW START's beginning: the main switch on, every feeder open. */
export function slowStartBegin(plant: PlantServices): PlantServices {
  return {
    ...plant,
    sources: { ...plant.sources, power: true },
    feeders: feedersAll(plant, false),
  };
}

/**
 * SLOW START `elapsed` seconds in: the feeders due by then closed. Done
 * once the last is.
 */
export function slowStartAt(
  plant: PlantServices,
  elapsed: number,
): { plant: PlantServices; done: boolean } {
  const due = Math.min(START_ORDER.length, Math.floor(elapsed / STAGE) + 1);
  const feeders = { ...plant.feeders };
  for (const room of START_ORDER.slice(0, due)) feeders[room] = true;
  return {
    plant: { ...plant, feeders },
    done: due === START_ORDER.length,
  };
}
