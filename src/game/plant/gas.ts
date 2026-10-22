import {
  CHLORINE,
  OZONE,
  accept,
  misdeliver,
  newGasState,
  reset,
  stepGas,
} from '../../toolkit/components/general-safety/logic/gas-detection';
import type {
  GasParams,
  GasState,
} from '../../toolkit/components/general-safety/logic/gas-detection';
import { serviceAvailable } from './services';
import type { PlantServices, ServiceRoom } from './services';

/**
 * The building's toxic gas detection, as the world holds it: each room
 * with a gas to watch for, its air and detector
 * (`general-safety/logic/gas-detection.ts`), and the leak, if any, giving
 * off gas there. The chemical stores watch for chlorine; the plant rooms
 * with an ozone generator, for ozone. A room's extract fan runs on its
 * power and air supplies. Pure.
 */

export const GAS_ZONES = {
  hypo_store: CHLORINE,
  acid_store: CHLORINE,
  plant_pool_01: OZONE,
  plant_pool_02: OZONE,
} as const satisfies Partial<Record<ServiceRoom, GasParams>>;
export type GasZoneId = keyof typeof GAS_ZONES;
export const GAS_ZONE_IDS = Object.keys(GAS_ZONES) as GasZoneId[];

export interface GasZoneState {
  state: GasState;
  /** A steady leak there, g/h. */
  leak: number;
}
export type GasZones = Record<GasZoneId, GasZoneState>;

export const newGasZones = (): GasZones =>
  Object.fromEntries(
    GAS_ZONE_IDS.map((id) => [id, { state: newGasState(), leak: 0 }]),
  ) as GasZones;

/** Whether a zone's extract fan has its supplies. */
export const extractRunning = (plant: PlantServices, id: GasZoneId) =>
  serviceAvailable(plant, id, 'power') && serviceAvailable(plant, id, 'air');

/** Every zone `dt` seconds on. */
export function stepGasZones(
  zones: GasZones,
  plant: PlantServices,
  dt: number,
): GasZones {
  let changed = false;
  const next = { ...zones };
  for (const id of GAS_ZONE_IDS) {
    const z = zones[id];
    // A clear room with no leak stays as it is.
    if (!z.leak && !z.state.conc && !z.state.pending && !z.state.reading)
      continue;
    next[id] = {
      ...z,
      state: stepGas(
        GAS_ZONES[id],
        z.state,
        { leak: z.leak, fan: extractRunning(plant, id) },
        dt,
      ),
    };
    changed = true;
  }
  return changed ? next : zones;
}

/** What can be done to a zone. */
export type GasZoneAction = 'misdeliver' | 'accept' | 'reset';

export function actOnGasZone(
  zones: GasZones,
  id: GasZoneId,
  act: GasZoneAction,
): GasZones {
  const z = zones[id];
  const state =
    act === 'misdeliver'
      ? misdeliver(z.state)
      : act === 'accept'
        ? accept(z.state)
        : reset(GAS_ZONES[id], z.state);
  return state === z.state ? zones : { ...zones, [id]: { ...z, state } };
}

/** The leak in a zone set to `gramsPerHour`. */
export const setGasLeak = (
  zones: GasZones,
  id: GasZoneId,
  gramsPerHour: number,
): GasZones =>
  zones[id].leak === gramsPerHour
    ? zones
    : { ...zones, [id]: { ...zones[id], leak: gramsPerHour } };

/** Whether any zone of a gas is in alarm: A1, and A2. */
export function gasAlarmsOf(zones: GasZones, gas: GasParams) {
  const of = GAS_ZONE_IDS.filter((id) => GAS_ZONES[id] === gas).map(
    (id) => zones[id].state,
  );
  return {
    a1: of.some((s) => s.a1),
    a2: of.some((s) => s.a2),
  };
}
