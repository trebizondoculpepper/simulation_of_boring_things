import type { World } from '../../../game/world';
import {
  GAS_ZONE_IDS,
  extractRunning,
  gasAlarmsOf,
} from '../../../game/plant/gas';
import {
  CHLORINE,
  OZONE,
} from '../../components/general-safety/logic/gas-detection';
/**
 * A scripted state of the pool plant for the control room's development
 * room (dev_control), so that its instruments have something real to show
 * until the plant is simulated: a four-minute loop in which filter 2
 * slowly blocks, the hall's humidity drifts high and the free chlorine
 * dips low, each raising its alarm, while everything else runs normally.
 * Pure: a function of time.
 */

export interface PlantReading {
  /** Seconds into the loop. */
  t: number;
  pumps: { p1: boolean; p2: boolean };
  /** Circulation flow, m³/h. */
  flow: number;
  /** Filters' pressure differences, bar. */
  filterDp: readonly number[];
  uvOn: boolean;
  dosing: boolean;
  boilersFiring: boolean;
  /** Balance tank level, 0 to 1. */
  balance: number;
  /** Temperatures, °C. */
  mainPool: number;
  learnerPool: number;
  spa: number;
  hallAir: number;
  lthw: number;
  /** Hall relative humidity, %. */
  hallRh: number;
  /** Free chlorine, mg/l, and pH. */
  chlorine: number;
  ph: number;
  /** Motor currents, A. */
  amps: {
    p1: number;
    p2: number;
    supply: number;
    extract: number;
    boilers: number;
  };
  /** The annunciator windows whose alarm is in (`ANNUNCIATOR_ALARMS`). */
  alarms: readonly AlarmId[];
}

/** The annunciator's windows, in order: each names its fault and the room. */
export const ANNUNCIATOR_ALARMS = [
  'bal-low',
  'p1-trip',
  'p2-trip',
  'flow-low',
  'filter-dp',
  'uv-fail',
  'cl-low',
  'cl-high',
  'ph-range',
  'chem-leak',
  'chlorine-gas',
  'dosing-inhibit',
  'boiler-lockout',
  'gas-detected',
  'lthw-low',
  'pool-temp-low',
  'ahu-fault',
  'rh-high',
  'pool-alarm',
  'fire-alarm',
  'mains-fail',
  'gen-running',
  'backwash-high',
  'makeup-running',
  'chlorine-high',
  'ozone-gas',
  'ozone-high',
  'gas-purge',
  'extract-fail',
  // Each Olympic filter's bed dirty, its DP over the limit, and the
  // Wash-O-Tron out of AUTO (the owner, 2026-10-28).
  'f1-dp',
  'f2-dp',
  'f3-dp',
  'f4-dp',
  'f5-dp',
  'wot-not-auto',
  'spare',
] as const;
export type AlarmId = (typeof ANNUNCIATOR_ALARMS)[number];

/** Each alarm's window legend, and the room it sends the operator to. */
export const ALARM_TEXT: Record<AlarmId, { window: string; room: string }> = {
  'bal-low': { window: 'BAL TANK\nLOW LEVEL', room: 'BALANCE TANKS' },
  'p1-trip': { window: 'PUMP P1\nTRIP', room: 'PUMP ROOM' },
  'p2-trip': { window: 'PUMP P2\nTRIP', room: 'PUMP ROOM' },
  'flow-low': { window: 'CIRC FLOW\nLOW', room: 'PUMP ROOM' },
  'filter-dp': { window: 'FILTER\nHIGH DP', room: 'PUMP ROOM' },
  'uv-fail': { window: 'UV LAMP\nFAIL', room: 'PUMP ROOM' },
  'cl-low': { window: 'CL\nLOW', room: 'DOSING ROOM' },
  'cl-high': { window: 'CL\nHIGH', room: 'DOSING ROOM' },
  'ph-range': { window: 'PH\nOUT RANGE', room: 'DOSING ROOM' },
  'chem-leak': { window: 'CHEM STORE\nLEAK', room: 'CHEMICAL STORE' },
  'chlorine-gas': { window: 'CHLORINE\nGAS', room: 'CHEMICAL STORE' },
  'dosing-inhibit': { window: 'DOSING\nINHIBITED', room: 'DOSING ROOM' },
  'boiler-lockout': { window: 'BOILER\nLOCKOUT', room: 'BOILER ROOM' },
  'gas-detected': { window: 'GAS\nDETECTED', room: 'BOILER ROOM' },
  'lthw-low': { window: 'LTHW\nLOW PRESS', room: 'BOILER ROOM' },
  'pool-temp-low': { window: 'POOL TEMP\nLOW', room: 'BOILER ROOM' },
  'ahu-fault': { window: 'AHU\nFAULT', room: 'AIR HANDLING' },
  'rh-high': { window: 'HALL RH\nHIGH', room: 'AIR HANDLING' },
  'pool-alarm': { window: 'POOL\nALARM', room: 'POOL HALL' },
  'fire-alarm': { window: 'FIRE\nALARM', room: 'FIRE PANEL' },
  'mains-fail': { window: 'MAINS\nFAIL', room: 'SWITCH ROOM' },
  'gen-running': { window: 'GEN\nRUNNING', room: 'SWITCH ROOM' },
  'backwash-high': { window: 'BACKWASH\nTANK HIGH', room: 'BALANCE TANKS' },
  'makeup-running': { window: 'MAKE-UP\nRUNNING', room: 'BALANCE TANKS' },
  'chlorine-high': { window: 'CHLORINE\nGAS HIGH', room: 'CHEMICAL STORE' },
  'ozone-gas': { window: 'OZONE\nGAS', room: 'POOL PLANT ROOM' },
  'ozone-high': { window: 'OZONE\nGAS HIGH', room: 'POOL PLANT ROOM' },
  'gas-purge': { window: 'GAS EXTRACT\nPURGING', room: 'GAS ROOMS' },
  'extract-fail': { window: 'GAS EXTRACT\nNO SUPPLY', room: 'GAS ROOMS' },
  'f1-dp': { window: 'FILTER 1\nHIGH DP', room: 'OLYMPIC PLANT ROOM' },
  'f2-dp': { window: 'FILTER 2\nHIGH DP', room: 'OLYMPIC PLANT ROOM' },
  'f3-dp': { window: 'FILTER 3\nHIGH DP', room: 'OLYMPIC PLANT ROOM' },
  'f4-dp': { window: 'FILTER 4\nHIGH DP', room: 'OLYMPIC PLANT ROOM' },
  'f5-dp': { window: 'FILTER 5\nHIGH DP', room: 'OLYMPIC PLANT ROOM' },
  'wot-not-auto': {
    window: 'WASH-O-TRON\nNOT IN AUTO',
    room: 'OLYMPIC PLANT ROOM',
  },
  spare: { window: 'SPARE', room: 'NONE (SPARE WAY)' },
};

/**
 * The annunciator's gas windows, from the world's gas detection
 * (`game/plant/gas.ts`): each gas's low and high alarms in any of its
 * rooms, an extract purging, and an extract without its supplies in a
 * room with gas in its air.
 */
export function gasAlarmIds(world: World): AlarmId[] {
  const ids: AlarmId[] = [];
  const cl = gasAlarmsOf(world.gas, CHLORINE);
  const o3 = gasAlarmsOf(world.gas, OZONE);
  if (cl.a1) ids.push('chlorine-gas');
  if (cl.a2) ids.push('chlorine-high');
  if (o3.a1) ids.push('ozone-gas');
  if (o3.a2) ids.push('ozone-high');
  const zones = GAS_ZONE_IDS.map((id) => ({ id, ...world.gas[id] }));
  if (zones.some((z) => z.state.a2 && extractRunning(world.plant, z.id)))
    ids.push('gas-purge');
  if (
    zones.some(
      (z) =>
        (z.leak > 0 || z.state.conc > 0) && !extractRunning(world.plant, z.id),
    )
  )
    ids.push('extract-fail');
  return ids;
}

/** How long the scripted loop runs before it repeats, seconds. */
export const DEMO_LOOP = 240;

/** Where filter 2's pressure difference raises its alarm, bar. */
export const FILTER_DP_LIMIT = 0.7;
/** Where the free chlorine raises its low alarm, mg/l. */
export const CHLORINE_LOW = 1.0;
/** Where the hall's humidity raises its alarm, %. */
export const RH_HIGH = 62;

/** The plant at `seconds` into the demonstration. */
export function plantAt(seconds: number): PlantReading {
  const t = ((seconds % DEMO_LOOP) + DEMO_LOOP) % DEMO_LOOP;
  const f = t / DEMO_LOOP;
  const wave = (period: number, phase = 0) =>
    Math.sin(((t + phase) / period) * Math.PI * 2);
  // Filter 2 loads through the loop and is backwashed at its end.
  const filterDp = [0.34, 0.4 + 0.42 * f, 0.36, 0.31].map(
    (dp, i) => dp + 0.01 * wave(37, i * 9),
  );
  const flow = 612 - 40 * Math.max(0, f - 0.6) + 4 * wave(23);
  const hallRh = 57 + 7 * wave(DEMO_LOOP, 30);
  // The chlorine dips between 150 and 200 s, as a feed fails, and recovers.
  const dip = t > 150 && t < 200 ? Math.sin(((t - 150) / 50) * Math.PI) : 0;
  const chlorine = 1.4 - 0.6 * dip + 0.03 * wave(31);
  const ph = 7.3 + 0.04 * wave(53);
  const balance = 0.64 + 0.06 * wave(41);
  const boilersFiring = wave(90) > -0.3;
  const alarms: AlarmId[] = [];
  if (filterDp[1] > FILTER_DP_LIMIT) alarms.push('filter-dp');
  if (chlorine < CHLORINE_LOW) alarms.push('cl-low');
  if (hallRh > RH_HIGH) alarms.push('rh-high');
  if (balance > 0.69) alarms.push('makeup-running');
  return {
    t,
    pumps: { p1: true, p2: false },
    flow,
    filterDp,
    uvOn: true,
    dosing: true,
    boilersFiring,
    balance,
    mainPool: 29.2 + 0.15 * wave(97),
    learnerPool: 31.0 + 0.1 * wave(83, 20),
    spa: 36.4 + 0.2 * wave(61, 10),
    hallAir: 30.1 + 0.3 * wave(DEMO_LOOP),
    lthw: boilersFiring ? 78.5 + 1.5 * wave(29) : 71 + wave(29),
    hallRh,
    chlorine,
    ph,
    amps: {
      p1: 37 + 1.5 * wave(17),
      p2: 0,
      supply: 29 + wave(19),
      extract: 27 + wave(21, 5),
      boilers: boilersFiring ? 18 + wave(13) : 3,
    },
    alarms,
  };
}

/** A reading's value printed to one decimal place, in four characters. */
export const fixed = (value: number, places = 1) =>
  value.toFixed(places).padStart(4, ' ');
