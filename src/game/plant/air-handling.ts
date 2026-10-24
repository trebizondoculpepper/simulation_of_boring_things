import { POOLS } from '../plant-sizing/pools.config';
import { sizePlant } from '../plant-sizing/sizing';
import { ahuSizeFor } from '../plant-sizing/ahu-range';
import type { AhuSize } from '../plant-sizing/ahu-range';
import {
  changeFilters,
  newAhu,
  resetAhu,
  stepAhu,
} from '../../toolkit/components/plant/logic/pool-ahu';
import type {
  AhuMode,
  AhuState,
} from '../../toolkit/components/plant/logic/pool-ahu';
import type { PoolId, PoolsState } from './pools';

/**
 * The pool halls' air handling units in the world: each unit's state and
 * its controls (its isolator and HAND-OFF-AUTO), each hall's time
 * programme, and what the units do to their halls. Each unit works as
 * `logic/pool-ahu.ts` has it, fed from the air plant's supply; a hall's
 * air is moved, heated and dried by its units in proportion to the share
 * of its design airflow running, and grows damper and colder (`pools.ts`,
 * `thermal.ts`) as they stop. Pure.
 */

export type AirHall = 'lounge' | 'olympic' | 'jacuzzi' | 'footbath';

export interface AirUnit {
  /** Its tag: AHU-801 and on. */
  tag: string;
  hall: AirHall;
  /** What it serves, for its plates. */
  serves: string;
  size: AhuSize;
  /** Its design airflow, m³/h. */
  airflow: number;
}

const HALL_OF: Record<string, AirHall> = {
  pool_01: 'lounge',
  pool_02: 'olympic',
  pool_03: 'jacuzzi',
  pool_04: 'footbath',
};
const SERVES: Record<AirHall, string> = {
  lounge: 'LOUNGE POOL HALL',
  olympic: 'OLYMPIC POOL HALL',
  jacuzzi: 'JACUZZI ROOM',
  footbath: 'FOOTBATH PASSAGE',
};

/** Every unit, from the plant sizing: each hall's airflow over its units, each the size to carry it. */
export const AIR_UNITS: readonly AirUnit[] = (() => {
  const halls = sizePlant(POOLS).halls;
  const order: AirHall[] = ['lounge', 'olympic', 'jacuzzi', 'footbath'];
  const units: AirUnit[] = [];
  for (const hall of order) {
    const h = halls.find((x) => HALL_OF[x.attraction.room] === hall);
    if (!h) continue;
    const each = h.airflow / h.units;
    for (let i = 0; i < h.units; i++)
      units.push({
        tag: `AHU-${801 + units.length}`,
        hall,
        serves: h.units > 1 ? `${SERVES[hall]} ${i + 1}` : SERVES[hall],
        size: ahuSizeFor(each),
        airflow: Math.round(each),
      });
  }
  return units;
})();

/** Each hall's pool. */
export const HALL_POOL: Record<AirHall, PoolId> = {
  lounge: 'pool_01',
  olympic: 'pool_02',
  jacuzzi: 'pool_03',
  footbath: 'pool_04',
};

/** A unit in the world: its working (as `AhuState`, its hall's humidity the hall's) and its controls. */
export interface AirUnitWorld extends Omit<AhuState, 'hallRh'> {
  /** Its local isolator, on. */
  isolator: boolean;
  mode: AhuMode;
}

export interface AirHandlingState {
  units: Record<string, AirUnitWorld>;
  /** Each hall's time programme: occupied, so its units run in AUTO. */
  occupied: Record<AirHall, boolean>;
}

/** Every unit running, as found on arrival: dampers open, fans up, in AUTO, every hall occupied. */
export function newAirHandling(): AirHandlingState {
  return {
    units: Object.fromEntries(
      AIR_UNITS.map((u) => {
        const { hallRh: _, ...s } = newAhu({
          dampers: 1,
          speed: 1,
          filterPa: 90 + (u.airflow % 97),
        });
        return [u.tag, { ...s, isolator: true, mode: 'auto' as AhuMode }];
      }),
    ),
    occupied: { lounge: true, olympic: true, jacuzzi: true, footbath: true },
  };
}

// The halls' pools, without importing `pools.ts`, which imports this.
const POOL_IDS = Object.values(HALL_POOL);

const UNIT = new Map(AIR_UNITS.map((u) => [u.tag, u]));

/** Each hall's relative humidity, %, from the pools' state. */
export const hallRhOf = (pools: PoolsState): Record<PoolId, number> =>
  Object.fromEntries(POOL_IDS.map((id) => [id, pools[id].hallRh])) as Record<
    PoolId,
    number
  >;

/** Whether a unit is one of the building's, in the world (not a dev room's exhibit). */
export const inWorld = (tag: string) => UNIT.has(tag);

/** A unit's state as its controller shows it, with its hall's humidity. */
export function unitState(
  a: AirHandlingState,
  tag: string,
  hallRh: Record<PoolId, number>,
): AhuState {
  const { isolator: _i, mode: _m, ...s } = a.units[tag];
  return { ...s, hallRh: hallRh[HALL_POOL[UNIT.get(tag)!.hall]] };
}

/** Every unit `dt` seconds on, the air plant's supply `supply`, each hall at its humidity. */
export function stepAirHandling(
  a: AirHandlingState,
  hallRh: Record<PoolId, number>,
  supply: boolean,
  dt: number,
): AirHandlingState {
  const units: Record<string, AirUnitWorld> = {};
  for (const u of AIR_UNITS) {
    const w = a.units[u.tag];
    const next = stepAhu(
      unitState(a, u.tag, hallRh),
      {
        isolatorOn: supply && w.isolator,
        mode: w.mode,
        demand: a.occupied[u.hall],
      },
      dt,
    );
    const { hallRh: _, ...s } = next;
    units[u.tag] = { ...s, isolator: w.isolator, mode: w.mode };
  }
  return { ...a, units };
}

/** What its units do for each hall: the share of its design airflow moving, and of it being dried by a heat pump, 0 to 1. */
export function hallHandling(
  a: AirHandlingState,
): Record<PoolId, { share: number; drying: number }> {
  const out = Object.fromEntries(
    POOL_IDS.map((id) => [id, { share: 0, drying: 0 }]),
  ) as Record<PoolId, { share: number; drying: number }>;
  const design = Object.fromEntries(POOL_IDS.map((id) => [id, 0])) as Record<
    PoolId,
    number
  >;
  for (const u of AIR_UNITS) {
    const id = HALL_POOL[u.hall];
    const s = a.units[u.tag];
    design[id] += u.airflow;
    out[id].share += u.airflow * s.speed;
    if (s.heatPump) out[id].drying += u.airflow * s.speed;
  }
  for (const id of POOL_IDS)
    if (design[id] > 0) {
      out[id].share /= design[id];
      out[id].drying /= design[id];
    }
  return out;
}

/**
 * A hall's relative humidity, %, `dt` seconds on: drawn, over about an
 * hour, toward 52 % with all its units running and drying, 62 % with
 * them only moving air, and 80 % with none, the pool's evaporation left
 * in it.
 */
export function stepHallRh(
  rh: number,
  h: { share: number; drying: number },
  dt: number,
) {
  const target = 80 - 18 * h.share - 10 * h.drying;
  return rh + (target - rh) * Math.min(1, dt / 3600);
}

/** A unit's controls worked: its isolator, HAND-OFF-AUTO, RESET or FILTERS CHANGED. */
export type AirUnitAction =
  | { act: 'isolator'; on: boolean }
  | { act: 'mode'; mode: AhuMode }
  | { act: 'reset' }
  | { act: 'filters' };

export function actOnUnit(
  a: AirHandlingState,
  tag: string,
  action: AirUnitAction,
): AirHandlingState {
  const w = a.units[tag];
  if (!w) return a;
  // RESET and FILTERS CHANGED as the unit's own logic has them; the
  // hall's humidity plays no part.
  const withRh = { ...w, hallRh: 0 };
  const next: AirUnitWorld =
    action.act === 'isolator'
      ? { ...w, isolator: action.on }
      : action.act === 'mode'
        ? { ...w, mode: action.mode }
        : action.act === 'reset'
          ? { ...w, tripped: resetAhu(withRh).tripped }
          : { ...w, filterPa: changeFilters(withRh).filterPa };
  return { ...a, units: { ...a.units, [tag]: next } };
}
