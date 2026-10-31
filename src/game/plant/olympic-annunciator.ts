import type { World } from '../world';
import {
  TRIO_WINDOWS,
  TRIO_WINDOW_TEXT,
  trioWater,
  trioWindows,
} from './aqualis-annunciator';
import { serviceAvailable } from './services';
import { dayTankLowAt } from './lounge-annunciator';
import { plantReadingOf } from '../../toolkit/gallery/logic/world-reading';
import type { AlarmId } from '../../toolkit/gallery/logic/control-room-demo';

/**
 * The Olympic pool's annunciator (mission 099; the owner, 2026-10-28: "an
 * Olympic pool annunciator"): twenty-four windows, six by four, for the
 * faults of the Olympic's plant and hall, in the old control room with
 * the lounge's and the wet hall's (`location-annunciator.ts` for its
 * sequence). Its pool's windows on the plant's main annunciator stay
 * there as they were; these are the same conditions, read the same way
 * (`world-reading.ts`), named by the Olympic's own tags, with those the
 * main board has no window for (its circulation tripped, no pump in
 * AUTO, its day tanks low, its room's ozone and power). Pure.
 */

export const OLYMPIC_ALARMS = [
  'bt-low',
  'circ-tripped',
  'p101a-trip',
  'p101b-trip',
  'no-auto',
  'flow-low',
  'f1-dp',
  'f2-dp',
  'f3-dp',
  'f4-dp',
  'f5-dp',
  'wot-not-auto',
  'uv-fail',
  'cl-low',
  'cl-high',
  'ph',
  'dosing-inhibit',
  'day-tank-low',
  'pool-temp-low',
  'rh-high',
  'hall-air-fail',
  'ozone',
  'power-fail',
  // Its Dr Aqualis Trio's (mission 114, `aqualis-annunciator.ts`): its
  // CONTROLLER FAULT in the old spare way, the board grown from 24 windows
  // to 30, two of them spare ways (as boards were bought with).
  ...TRIO_WINDOWS.pool_02,
  'spare',
  'spare-2',
] as const;
export type OlympicAlarmId = (typeof OLYMPIC_ALARMS)[number];

/** Each window's engraving, two short lines (the spare's blank). */
export const OLYMPIC_ALARM_TEXT: Record<OlympicAlarmId, string> = {
  'bt-low': 'BALANCE TANK\nLOW',
  'circ-tripped': 'CIRC TRIPPED\nBT LOW-LOW',
  'p101a-trip': 'P-101A\nTRIPPED',
  'p101b-trip': 'P-101B\nTRIPPED',
  'no-auto': 'NO PUMP\nIN AUTO',
  'flow-low': 'CIRC FLOW\nLOW',
  'f1-dp': 'FILTER 1\nHIGH DP',
  'f2-dp': 'FILTER 2\nHIGH DP',
  'f3-dp': 'FILTER 3\nHIGH DP',
  'f4-dp': 'FILTER 4\nHIGH DP',
  'f5-dp': 'FILTER 5\nHIGH DP',
  'wot-not-auto': 'WASH-O-TRON\nNOT IN AUTO',
  'uv-fail': 'UV LAMP\nFAIL',
  'cl-low': 'CHLORINE\nLOW',
  'cl-high': 'CHLORINE\nHIGH',
  ph: 'pH OUT OF\nRANGE',
  'day-tank-low': 'DAY TANK\nLOW',
  'pool-temp-low': 'POOL TEMP\nLOW',
  'rh-high': 'HALL RH\nHIGH',
  'hall-air-fail': 'HALL AIR\nPLANT FAIL',
  ozone: 'OZONE\nIN AIR',
  'power-fail': 'ROOM POWER\nFAIL',
  ...TRIO_WINDOW_TEXT,
  spare: '',
  'spare-2': '',
};

/** Free chlorine's band, mg/l, and pH's, as the main board's (`world-reading.ts`). */
const CHLORINE = { low: 1.0, high: 3 };
const PH = { low: 7.0, high: 7.8 };

/** The main board's windows this board repeats, by its own ids. */
const FROM_MAIN: Partial<Record<OlympicAlarmId, AlarmId>> = {
  'bt-low': 'bal-low',
  'p101a-trip': 'p1-trip',
  'p101b-trip': 'p2-trip',
  'flow-low': 'flow-low',
  'f1-dp': 'f1-dp',
  'f2-dp': 'f2-dp',
  'f3-dp': 'f3-dp',
  'f4-dp': 'f4-dp',
  'f5-dp': 'f5-dp',
  'wot-not-auto': 'wot-not-auto',
  'uv-fail': 'uv-fail',
  'pool-temp-low': 'pool-temp-low',
  'rh-high': 'rh-high',
  'hall-air-fail': 'ahu-fault',
};

/** The Olympic's alarms present in `world` now, in its windows' order. */
export function olympicAlarms(world: World): OlympicAlarmId[] {
  const main = plantReadingOf(world, 'pool_02').alarms;
  const water = world.pools.pool_02;
  const a = world.motors.starters['P-101A'];
  const b = world.motors.starters['P-101B'];
  const gas = world.gas.plant_pool_02.state;
  const read = trioWater(world.aqualis, 'pool_02');
  const trio = trioWindows(world.aqualis, 'pool_02');
  const own: Partial<Record<OlympicAlarmId, boolean>> = {
    'circ-tripped': water.tripped,
    'no-auto': a.mode === 'off' && b.mode === 'off',
    'day-tank-low': dayTankLowAt(world, 'pool_02'),
    ozone: gas.a1 || gas.a2,
    'power-fail': !serviceAvailable(world.plant, 'plant_pool_02', 'power'),
    // Its water as its Trio's analyser reads it (decision 10), and its
    // Trio's inhibit and alarms (mission 114).
    'cl-low': read.freeChlorine < CHLORINE.low,
    'cl-high': read.freeChlorine > CHLORINE.high,
    ph: read.ph < PH.low || read.ph > PH.high,
    ...Object.fromEntries(trio.map((w) => [w, true])),
  };
  return OLYMPIC_ALARMS.filter((id) => {
    const from = FROM_MAIN[id];
    return from ? main.includes(from) : Boolean(own[id]);
  });
}
