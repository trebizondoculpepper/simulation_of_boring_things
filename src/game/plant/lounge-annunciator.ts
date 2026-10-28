import type { World } from '../world';
import type { PoolId } from './pools';
import { serviceAvailable } from './services';
import { loungeFlowsOf } from './lounge-valves';
import { loungeFilterDp } from './lounge-filters';
import { uvLampOn } from './uv';
import { WET_HALL_PLANT } from './wet-hall';
import { DAY_TANKS, DISTRIBUTION } from './chemical-distribution';
import { CHEMICALS } from './chemicals';
import {
  acceptLocationAlarms,
  newLocationAnnunciator,
  resetLocationAlarms,
  senseLocationAlarms,
} from './location-annunciator';
import type {
  LocationAnnunciatorState,
  LocationWindow,
} from './location-annunciator';

/**
 * The lounge pool's annunciator (the owner, 2026-10-28): sixteen windows
 * for its plant room's faults, one on the wall by its local control panel
 * and an identical one in the control room, sharing one state in the
 * world, so ACCEPT or RESET at either is done at both. Pure.
 *
 * ISA sequence M with first-out, as every location's annunciator
 * (`location-annunciator.ts`, mission 099).
 */

export const LOUNGE_ALARMS = [
  'bt-low',
  'circ-tripped',
  'p201a-trip',
  'p201b-trip',
  'no-auto',
  'flow-low',
  'f1-offline',
  'f2-offline',
  'filter-dp',
  'pit-high',
  'uv-fail',
  'ozone',
  'chlorine',
  'ph',
  'day-tank-low',
  'power-fail',
] as const;
export type LoungeAlarmId = (typeof LOUNGE_ALARMS)[number];

/** Each window's engraving, two short lines. */
export const LOUNGE_ALARM_TEXT: Record<LoungeAlarmId, string> = {
  'bt-low': 'BALANCE TANK\nLOW',
  'circ-tripped': 'CIRC TRIPPED\nBT LOW-LOW',
  'p201a-trip': 'P-201A\nTRIPPED',
  'p201b-trip': 'P-201B\nTRIPPED',
  'no-auto': 'NO PUMP\nIN AUTO',
  'flow-low': 'CIRC FLOW\nLOW',
  'f1-offline': 'FILTER 1\nOFF-LINE',
  'f2-offline': 'FILTER 2\nOFF-LINE',
  'filter-dp': 'FILTER DP\nHIGH',
  'pit-high': 'BACKWASH PIT\nHIGH',
  'uv-fail': 'UV LAMP\nFAIL',
  ozone: 'OZONE\nIN AIR',
  chlorine: 'CHLORINE\nLOW / HIGH',
  ph: 'pH OUT OF\nRANGE',
  'day-tank-low': 'DAY TANK\nLOW',
  'power-fail': 'ROOM POWER\nFAIL',
};

/** The balance tank's low alarm, a share of its float level's volume. */
const BT_LOW = 0.2;
/** Under half its 90 m³/h design flow. */
const FLOW_LOW = 45;
/** A bed's pressure difference that calls for a backwash, bar. */
const DP_HIGH = 0.7;
/** Free chlorine's band, mg/l, and pH's. */
const CHLORINE = { low: 1.0, high: 3 };
const PH = { low: 7.0, high: 7.8 };

/** Each filter's valves, IV1, BV1, IV2, DV1, by asset id (`installed-valves.ts`). */
const FILTER_VALVES = [
  ['valve-0001', 'valve-0002', 'valve-0003', 'valve-0004'],
  ['valve-0005', 'valve-0006', 'valve-0007', 'valve-0008'],
] as const;

/** Whether a filter's valves stand as for service: in and out open, backwash and drain shut. */
function inService(world: World, i: 0 | 1): boolean {
  const at = (id: string) => (world.loungeValvePositions[id] ?? 0) >= 0.5;
  const [inlet, backwash, outlet, drain] = FILTER_VALVES[i];
  return at(inlet) && at(outlet) && !at(backwash) && !at(drain);
}

/** Either of `site`'s day tanks under its low switch and not being filled. */
export function dayTankLowAt(world: World, site: PoolId): boolean {
  return CHEMICALS.some((c) => {
    const i = DAY_TANKS[c].findIndex((t) => t.site === site);
    const tank = world.distribution[c].tanks[i];
    return (
      i >= 0 &&
      !!tank &&
      tank.litres < DAY_TANKS[c][i].litres * DISTRIBUTION.low &&
      world.distribution[c].serving !== i
    );
  });
}

/** The lounge's alarms present in `world` now. */
export function loungeAlarms(world: World): LoungeAlarmId[] {
  const water = world.pools.pool_01;
  const a = world.motors.starters['P-201A'];
  const b = world.motors.starters['P-201B'];
  const powered = serviceAvailable(world.plant, 'plant_pool_01', 'power');
  const circulating = powered && !water.tripped && water.flow > 0.5;
  const alarms: LoungeAlarmId[] = [];
  if (water.balance < BT_LOW) alarms.push('bt-low');
  if (water.tripped) alarms.push('circ-tripped');
  if (a.tripped) alarms.push('p201a-trip');
  if (b.tripped) alarms.push('p201b-trip');
  if (a.mode === 'off' && b.mode === 'off') alarms.push('no-auto');
  if (water.flow < FLOW_LOW) alarms.push('flow-low');
  if (!inService(world, 0)) alarms.push('f1-offline');
  if (!inService(world, 1)) alarms.push('f2-offline');
  const dp = loungeFilterDp(world.loungeFilters, loungeFlowsOf(world));
  if (Math.max(...dp) > DP_HIGH) alarms.push('filter-dp');
  if (
    world.wetHall.inhibit ||
    world.wetHall.backwashTank > WET_HALL_PLANT.backwashTank * 0.95
  )
    alarms.push('pit-high');
  if (circulating && !uvLampOn(world, 'pool_01')) alarms.push('uv-fail');
  const gas = world.gas.plant_pool_01.state;
  if (gas.a1 || gas.a2) alarms.push('ozone');
  if (water.freeChlorine < CHLORINE.low || water.freeChlorine > CHLORINE.high)
    alarms.push('chlorine');
  if (water.ph < PH.low || water.ph > PH.high) alarms.push('ph');
  const low = dayTankLowAt(world, 'pool_01');
  if (low) alarms.push('day-tank-low');
  if (!powered) alarms.push('power-fail');
  return alarms;
}

export type LoungeWindow = LocationWindow;
export type LoungeAnnunciatorState = LocationAnnunciatorState<LoungeAlarmId>;

export const newLoungeAnnunciator = (): LoungeAnnunciatorState =>
  newLocationAnnunciator(LOUNGE_ALARMS);

/** The alarms present now: a dark window whose alarm comes in starts flashing. */
export const senseLoungeAlarms = (
  state: LoungeAnnunciatorState,
  present: readonly LoungeAlarmId[],
): LoungeAnnunciatorState => senseLocationAlarms(LOUNGE_ALARMS, state, present);

/** ACCEPT: flashing windows go steady. */
export const acceptLoungeAlarms = (
  state: LoungeAnnunciatorState,
): LoungeAnnunciatorState => acceptLocationAlarms(LOUNGE_ALARMS, state);

/** RESET: accepted windows whose alarms have cleared go dark; the first-out with its window. */
export const resetLoungeAlarms = (
  state: LoungeAnnunciatorState,
): LoungeAnnunciatorState => resetLocationAlarms(LOUNGE_ALARMS, state);
