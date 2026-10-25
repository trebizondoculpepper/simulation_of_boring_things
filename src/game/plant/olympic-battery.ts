import { BIG_FILTER, VALVES, faceFlows } from './five-valve-filter';
import type { FiveValveFlows, ValveName } from './five-valve-filter';
import { installedValveByCommandId } from './installed-valves';
import { circulating } from './pools';
import type { PoolsState } from './pools';
import type { PlantServices } from './services';
import type { MotorsState } from './motor-starters';

/**
 * The Olympic plant room's filter battery as its valves stand in the world
 * (`world.installedValves`): five 3 m filters on their five-valve faces
 * (V1 inlet, V2 outlet, V3 backwash in, V4 backwash out, V5 rinse; tags
 * `PL2-F<n>-V<k>`), fed by the pump pair. Each valve is commanded on its
 * own, from either of its panels (the local and the control room's, bound
 * to the same state: the owner, 2026-10-23), so the faces' flows follow
 * from the valves alone (`faceFlows`), with no controller between.
 *
 * The battery is the Olympic's circulation (prompt 035): what it returns
 * through the filters' outlets reaches the pool through the contact tank
 * and the UV (their four valves all open, or none does), and what its
 * backwash and rinse valves send to waste leaves the balance tank. Each
 * filter's bed keeps its dirt in the world (`OlympicBatteryState`),
 * fouling in service and washing out in a backwash.
 *
 * What the room's flowmeters read: each filter's outlet riser, between its
 * underdrain and its backwash-in and outlet valves, signed out of the
 * filter (+ in service, − in a backwash; a rinse goes to waste below it),
 * and the pumps' common discharge. Pure; flows in m³/h.
 */

export const FILTERS = 5;

/**
 * The pump pair's discharge head at the battery, m: what gives the
 * Olympic its design circulation (620 m³/h) through five filters in
 * service, mid-season.
 */
export const OLYMPIC_HEAD = 12.9;

/**
 * The dirt in the pool's water, g/m³: a working pool's, so a bed in
 * service doubles its resistance in about a day and a half and wants a
 * backwash every few days (Dev26's filter has a dirty pool's, to see it in
 * minutes).
 */
export const OLYMPIC_WATER_DIRT = 1;

/** Each filter's bed: the dirt it holds, kg. */
export interface OlympicBatteryState {
  dirt: number[];
}

/** Mid-season: each bed with the dirt Dev26's filter starts with. */
export const newOlympicBattery = (): OlympicBatteryState => ({
  dirt: Array.from({ length: FILTERS }, () => 1.6 * BIG_FILTER.dirtRef),
});

/** The valves between the battery and the pool: the contact tank's in and out, the UV's in and out. */
const RETURN = ['PL2-T2-IV1', 'PL2-T2-IV2', 'PL2-UV1-IV1', 'PL2-UV1-IV2'];
/** Each pump's suction and discharge valves: pump A's, pump B's. */
const PUMP_PATHS = [
  ['PL2-P1-IV1', 'PL2-P1-IV3'],
  ['PL2-P1-IV2', 'PL2-P1-IV4'],
] as const;

/** Whether a valve stands open in the world, by its tag (its normal state if the world has not moved it). */
function opener(installedValves: Readonly<Record<string, boolean>>) {
  return (tag: string) => {
    const v = installedValveByCommandId(tag);
    if (!v) return false;
    return installedValves[v.assetId] ?? v.normal === 'open';
  };
}

/**
 * What the pumps' drain passes, m³/h, open: a DN100 drain at the pumps'
 * head. It goes with the backwash to the wet hall's holding tank.
 */
export const PUMP_DRAIN_FLOW = 150;

export interface BatteryFlows {
  /** The pumps' drain to waste, m³/h. */
  drain: number;
  /** Whether the pumps run with a way through one of them: its suction and discharge valves open. */
  pumping: boolean;
  /** Whether the way on to the pool is open: the contact tank's and the UV's valves. */
  returning: boolean;
  filters: (FiveValveFlows & { riser: number })[];
  /** Through the pumps' common discharge. */
  discharge: number;
  /** On to the pool, through the filters' outlets. */
  toPool: number;
  /** To waste, by the backwash-out and rinse valves. */
  toWaste: number;
}

let cache: { key: string; flows: BatteryFlows } | null = null;

/**
 * The battery's flows: from its valves, its beds' dirt, and whether the
 * pumps run (`running`: the room powered, an isolator on, not tripped).
 * Worked out again only when one of them changes (the dirt by a tenth of
 * a kilogram), since the world steps ten times a second.
 */
export function olympicBatteryFlows(
  installedValves: Readonly<Record<string, boolean>>,
  battery: OlympicBatteryState = newOlympicBattery(),
  running = true,
): BatteryFlows {
  const open = opener(installedValves);
  const pumping = running && PUMP_PATHS.some((path) => path.every(open));
  const returning = RETURN.every(open);
  const openings = Array.from(
    { length: FILTERS },
    (_, i) =>
      Object.fromEntries(
        VALVES.map((v, k) => [
          v,
          // With the way on shut, nothing leaves by the outlets.
          (v !== 'v2' || returning) && open(`PL2-F${i + 1}-V${k + 1}`) ? 1 : 0,
        ]),
      ) as Record<ValveName, number>,
  );
  // The pumps' drain (PL2-P1-DV1): their discharge to the backwash drain.
  const draining = pumping && open('PL2-P1-DV1');
  const key = [
    pumping,
    draining,
    openings.map((o) => VALVES.map((v) => o[v]).join('')).join(','),
    battery.dirt.map((d) => Math.round(d * 10)).join(','),
  ].join('|');
  if (cache?.key === key) return cache.flows;
  const filters = openings.map((opening, i) => {
    const f = faceFlows(
      opening,
      Math.round(battery.dirt[i] * 10) / 10,
      pumping,
      OLYMPIC_HEAD,
    );
    // Up the riser: to the return, less what a backwash sends down it.
    return { ...f, riser: f.valve.v2 - f.valve.v3 };
  });
  const flows: BatteryFlows = {
    pumping,
    returning,
    filters,
    discharge: filters.reduce((sum, f) => sum + f.valve.v1 + f.valve.v3, 0),
    toPool: filters.reduce((sum, f) => sum + Math.max(0, f.valve.v2), 0),
    toWaste:
      filters.reduce(
        (sum, f) => sum + Math.max(0, f.valve.v4) + Math.max(0, f.valve.v5),
        0,
      ) + (draining ? PUMP_DRAIN_FLOW : 0),
    drain: draining ? PUMP_DRAIN_FLOW : 0,
  };
  cache = { key, flows };
  return flows;
}

/**
 * The beds `dt` seconds on: each takes the dirt in the water it filters
 * (down through it), and a backwash (up through it) washes it out, as
 * Dev26's filter does (`stepFiveValve`).
 */
export function stepOlympicBattery(
  battery: OlympicBatteryState,
  flows: BatteryFlows,
  dt: number,
): OlympicBatteryState {
  if (!(dt > 0)) return battery;
  return {
    dirt: battery.dirt.map((dirt, i) => {
      const bed = flows.filters[i]?.bed ?? 0;
      if (bed > 0) return dirt + (OLYMPIC_WATER_DIRT * bed * dt) / 3600 / 1000;
      if (bed < 0)
        return (
          dirt *
          Math.exp(-((-bed / BIG_FILTER.washFlow) * dt) / BIG_FILTER.washTime)
        );
      return dirt;
    }),
  };
}

/** Each flowmeter's reading, by what it reads (`Meter.reads`): `filter-<n>`, `pumps`. */
export function olympicMeterReadings(
  flows: BatteryFlows,
): Record<string, number> {
  return {
    pumps: flows.discharge,
    ...Object.fromEntries(
      flows.filters.map((f, i) => [`filter-${i + 1}`, f.riser]),
    ),
  };
}

/** The battery's flows as a world has them: its valves, its beds, and whether the Olympic's pumps run. */
export function olympicFlowsOf(world: {
  installedValves: Readonly<Record<string, boolean>>;
  olympic: OlympicBatteryState;
  pools: PoolsState;
  plant: PlantServices;
  motors?: MotorsState;
}): BatteryFlows {
  return olympicBatteryFlows(
    world.installedValves,
    world.olympic,
    circulating(world.pools.pool_02, world.plant, 'pool_02', world.motors),
  );
}
