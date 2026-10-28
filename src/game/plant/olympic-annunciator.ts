import type { World } from '../world';
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
  // A spare way, blank, as boards were bought with (the main board's too).
  'spare',
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
  'dosing-inhibit': 'DOSING\nINHIBITED',
  'day-tank-low': 'DAY TANK\nLOW',
  'pool-temp-low': 'POOL TEMP\nLOW',
  'rh-high': 'HALL RH\nHIGH',
  'hall-air-fail': 'HALL AIR\nPLANT FAIL',
  ozone: 'OZONE\nIN AIR',
  'power-fail': 'ROOM POWER\nFAIL',
  spare: '',
};

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
  'cl-low': 'cl-low',
  'cl-high': 'cl-high',
  ph: 'ph-range',
  'dosing-inhibit': 'dosing-inhibit',
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
  const own: Partial<Record<OlympicAlarmId, boolean>> = {
    'circ-tripped': water.tripped,
    'no-auto': a.mode === 'off' && b.mode === 'off',
    'day-tank-low': dayTankLowAt(world, 'pool_02'),
    ozone: gas.a1 || gas.a2,
    'power-fail': !serviceAvailable(world.plant, 'plant_pool_02', 'power'),
  };
  return OLYMPIC_ALARMS.filter((id) => {
    const from = FROM_MAIN[id];
    return from ? main.includes(from) : Boolean(own[id]);
  });
}
