import type {
  MimicSpec,
  MimicState,
  Point,
} from '../../components/industrial-control/logic/mimic';
import { WET_HALL_PLANT, wetHallAlarms } from '../../../game/plant/wet-hall';
import type { WetHallState } from '../../../game/plant/wet-hall';

/**
 * The wet hall's mimic and control panel, by the booster set: the
 * make-up along the top (the main in, the break tank, the booster set,
 * the meter, out to the pool plant rooms) and the backwash along the
 * bottom (in from the filters, the holding tank, its discharge pump,
 * out to the sewer), lit where things run or fail, with the tanks'
 * levels and the make-up's flow and meter reading, and the booster
 * set's RESET. Pure.
 */

const MAINS = '#5c88b8';
const WASTE = '#8a6d4a';
const pt = (x: number, y: number): Point => [x, y];

const W = 2.2;
const H = 1.2;
const TOP = 0.16;
const BOTTOM = -0.28;

export const wetHallMimicSpec: MimicSpec = {
  title: 'WET HALL — MAKE-UP AND BACKWASH',
  width: W,
  height: H,
  lines: [
    { colour: MAINS, points: [pt(-1.02, TOP), pt(1.02, TOP)], width: 8 },
    { colour: WASTE, points: [pt(1.02, BOTTOM), pt(-1.02, BOTTOM)], width: 8 },
  ],
  shapes: [
    { symbol: 'tank', at: pt(-0.55, TOP), size: 0.1, label: 'BREAK TANK' },
    { symbol: 'pump', at: pt(-0.05, TOP), size: 0.07, label: 'BOOSTER SET' },
    { symbol: 'valve', at: pt(0.4, TOP), size: 0.05, label: 'METER' },
    {
      symbol: 'tank',
      at: pt(0.45, BOTTOM),
      size: 0.1,
      label: 'BACKWASH TANK',
    },
    { symbol: 'pump', at: pt(-0.05, BOTTOM), size: 0.07, label: 'P-601' },
  ],
  labels: [
    { text: 'MAINS IN', at: pt(-0.9, TOP + 0.07), size: 0.8 },
    { text: 'TO POOL PLANT', at: pt(0.85, TOP + 0.07), size: 0.8 },
    { text: 'FROM FILTERS', at: pt(0.85, BOTTOM + 0.07), size: 0.8 },
    { text: 'TO SEWER', at: pt(-0.9, BOTTOM + 0.07), size: 0.8 },
  ],
  lamps: [
    { id: 'mains', at: pt(-0.9, TOP - 0.1), colour: 'green', label: 'MAINS' },
    {
      id: 'break-low',
      at: pt(-0.55, TOP - 0.17),
      colour: 'amber',
      label: 'LOW',
    },
    {
      id: 'booster-run',
      at: pt(-0.12, TOP - 0.17),
      colour: 'green',
      label: 'RUN',
    },
    {
      id: 'booster-trip',
      at: pt(0.02, TOP - 0.17),
      colour: 'red',
      label: 'LOW WATER',
    },
    {
      id: 'backwash-high',
      at: pt(0.45, BOTTOM - 0.17),
      colour: 'red',
      label: 'HIGH',
    },
    {
      id: 'discharge-run',
      at: pt(-0.05, BOTTOM - 0.17),
      colour: 'green',
      label: 'RUN',
    },
  ],
  readouts: [
    { id: 'break', at: pt(-0.55, TOP + 0.24) },
    { id: 'makeup', at: pt(0.4, TOP + 0.24) },
    { id: 'backwash', at: pt(0.45, BOTTOM + 0.2) },
  ],
  buttons: [
    {
      id: 'booster-reset',
      at: pt(-0.05, TOP - 0.29),
      colour: 'black',
      legend: 'RESET',
    },
  ],
  modes: [
    { id: 'level', legend: 'LEVEL' },
    { id: 'volume', legend: 'VOLUME' },
  ],
};

/** What the mimic reads: the wet hall, and whether the main is on. */
export interface WetHallReading {
  wetHall: WetHallState;
  mains: boolean;
}

export function wetHallMimicState({
  wetHall: s,
  mains,
}: WetHallReading): MimicState {
  const P = WET_HALL_PLANT;
  const alarms = wetHallAlarms(s);
  return {
    lamps: {
      mains,
      'break-low': alarms.breakTankLow,
      'booster-run': s.boosterRunning && !s.boosterTripped,
      'booster-trip': alarms.boosterLowWater,
      'backwash-high': alarms.backwashHigh,
      'discharge-run': s.discharging,
    },
    readouts: {
      break: {
        level: {
          value: (s.breakTank / P.breakTank) * 100,
          unit: '%',
          name: 'BREAK TANK',
        },
        volume: {
          value: s.breakTank,
          unit: 'm3',
          name: 'BREAK TANK',
          places: 1,
        },
      },
      makeup: {
        level: { value: s.flow, unit: 'm3/h', name: 'MAKE-UP', places: 1 },
        volume: {
          value: Math.min(9999, s.meter),
          unit: 'm3',
          name: 'METER',
        },
      },
      backwash: {
        level: {
          value: (s.backwashTank / P.backwashTank) * 100,
          unit: '%',
          name: 'BACKWASH',
        },
        volume: {
          value: s.backwashTank,
          unit: 'm3',
          name: 'BACKWASH',
          places: 1,
        },
      },
    },
  };
}
