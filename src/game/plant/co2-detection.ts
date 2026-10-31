/**
 * CO₂ gas detection (CO₂ dosing, the owner, 2026-10-31;
 * `doc/plans/co2-system.md`): carbon dioxide is an asphyxiant, heavier than
 * air, so every room it is piped into (the loading bay with the cylinders
 * and master valve, and each plant room that doses it) carries a fixed CO₂
 * detector, its sensing head low, about 0.3 m above the floor. Pure; ppm by
 * volume, rooms m³, air changes an hour, gas g/h, time s.
 *
 * After the toxic gas detection's pattern (`general-safety/logic/
 * gas-detection.ts`: a well-mixed room whose extract carries the gas off,
 * a detector lagging the air, alarms latched until reset with the air
 * clear, ACCEPT silencing the sounder), changed where CO₂ differs: the air
 * already holds some (`background`), the detector is infrared (NDIR, after
 * Crowcon's Xgard IQ or Dräger's Polytron 2 IR CO₂, 0–5 % volume), and
 * its alarms follow EH40's workplace exposure limits for CO₂, 5,000 ppm
 * over 8 hours and 15,000 ppm over 15 minutes, as the detector's own
 * rolling averages, as well as the instantaneous levels:
 *
 * - **A1 (low)**: the reading at 5,000 ppm, or its 8-hour average at
 *   5,000. The beacon flashes, and the room's dosing valve shuts
 *   (`dosingInterlock`).
 * - **A2 (high)**: the reading at 15,000 ppm, or its 15-minute average at
 *   15,000. The sounder sounds, the extract runs at its purge speed, and
 *   the master valve in the loading bay trips shut (`masterInterlock`).
 *
 * The averages are kept as the period's detectors keep them, in buckets:
 * fifteen one-minute means for the 15-minute average, thirty-two
 * quarter-hour means for the 8-hour one, filled with the background at
 * first.
 */

/** CO₂ at 20 °C: 1.84 kg/m³ (44.01 g/mol over 24.06 l/mol). */
export const CO2_DENSITY_G_M3 = 44.01 / 0.02406;

export const CO2_LIMITS = {
  /** EH40 long-term (8-hour TWA) and short-term (15-minute STEL) limits, ppm. */
  twa: 5000,
  stel: 15000,
  /** The instantaneous alarm levels, ppm. */
  a1: 5000,
  a2: 15000,
  /** The detector's T90, s (an NDIR head). */
  t90: 30,
  /** Its range, ppm (0–5 % volume). */
  range: 50000,
} as const;

export interface Co2RoomParams {
  /** Its air, m³. */
  volume: number;
  /** Air changes an hour: the extract running, purging, and stopped. */
  changes: number;
  purge: number;
  still: number;
  /** The CO₂ in its air with no leak, ppm (outdoors about 420; a plant room more). */
  background: number;
}

/**
 * The rooms with CO₂ in them. Sizes are estimates for now: the loading bay
 * about 8 × 10 × 4 m with its roller door's leakage and a low extract; the
 * Lounge plant room about 15 × 10 × 4 m, the Olympic's about 30 × 15 × 5 m,
 * each with its plant room ventilation (about 4 air changes, 10 purging).
 */
export const CO2_ROOMS = {
  loading_bay: {
    volume: 320,
    changes: 3,
    purge: 10,
    still: 0.5,
    background: 420,
  },
  plant_pool_01: {
    volume: 600,
    changes: 4,
    purge: 10,
    still: 0.3,
    background: 500,
  },
  plant_pool_02: {
    volume: 2250,
    changes: 4,
    purge: 10,
    still: 0.3,
    background: 500,
  },
} as const satisfies Record<string, Co2RoomParams>;
export type Co2RoomId = keyof typeof CO2_ROOMS;
export const CO2_ROOM_IDS = Object.keys(CO2_ROOMS) as Co2RoomId[];

const MINUTE = 60;
const QUARTER = 900;
const MINUTES = 15;
const QUARTERS = 32;

export interface Co2DetectorState {
  /** CO₂ in the room's air above its background, ppm. */
  excess: number;
  /** The detector's reading, ppm (its background included; not limited to its range). */
  reading: number;
  /** The minute and quarter being filled: ppm·s so far, and seconds. */
  minute: { sum: number; t: number };
  quarter: { sum: number; t: number };
  /** The last fifteen minutes' means, and the last thirty-two quarter-hours', ppm, oldest first. */
  minutes: number[];
  quarters: number[];
  a1: boolean;
  a2: boolean;
  /** The sounder accepted (silenced) until the alarm rises again. */
  accepted: boolean;
}

export function newCo2Detector(p: Co2RoomParams): Co2DetectorState {
  return {
    excess: 0,
    reading: p.background,
    minute: { sum: 0, t: 0 },
    quarter: { sum: 0, t: 0 },
    minutes: Array.from({ length: MINUTES }, () => p.background),
    quarters: Array.from({ length: QUARTERS }, () => p.background),
    a1: false,
    a2: false,
    accepted: false,
  };
}

const mean = (xs: readonly number[]) =>
  xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length);

/** Its 15-minute average, ppm (the STEL's). */
export const co2Stel = (s: Co2DetectorState) => mean(s.minutes);
/** Its 8-hour average, ppm (the TWA's). */
export const co2Twa = (s: Co2DetectorState) => mean(s.quarters);

export interface Co2RoomInputs {
  /** CO₂ coming into the room's air, g/h (a leak; a stuck valve's gas has gone into the water, not the room). */
  leakGh: number;
  /** The room's extract switched on (its supplies there). */
  fan: boolean;
}

/** The extract's air changes an hour now: purging in A2. */
export const co2AirChanges = (
  p: Co2RoomParams,
  s: Co2DetectorState,
  fan: boolean,
) => (!fan ? p.still : s.a2 ? p.purge : p.changes);

/** One stretch of no more than a minute. */
function stepPart(
  p: Co2RoomParams,
  s: Co2DetectorState,
  i: Co2RoomInputs,
  dt: number,
): Co2DetectorState {
  // The room: mixed at once, carried off by its air changes toward where the leak alone would hold it.
  const k = co2AirChanges(p, s, i.fan) / 3600;
  const leakM3h = Math.max(0, i.leakGh) / CO2_DENSITY_G_M3;
  const settle = k > 0 ? (leakM3h * 1e6) / 3600 / (p.volume * k) : Infinity;
  const excess = Number.isFinite(settle)
    ? settle + (s.excess - settle) * Math.exp(-k * dt)
    : s.excess + (leakM3h * 1e6 * dt) / 3600 / p.volume;
  // The head: a first-order lag.
  const ppm = p.background + excess;
  const tau = CO2_LIMITS.t90 / Math.LN10;
  const reading = ppm + (s.reading - ppm) * Math.exp(-dt / tau);
  // Its averages.
  let minute = { sum: s.minute.sum + reading * dt, t: s.minute.t + dt };
  let quarter = { sum: s.quarter.sum + reading * dt, t: s.quarter.t + dt };
  let minutes = s.minutes;
  let quarters = s.quarters;
  if (minute.t >= MINUTE - 1e-9) {
    minutes = [...minutes.slice(1), minute.sum / minute.t];
    minute = { sum: 0, t: 0 };
  }
  if (quarter.t >= QUARTER - 1e-9) {
    quarters = [...quarters.slice(1), quarter.sum / quarter.t];
    quarter = { sum: 0, t: 0 };
  }
  const next = { ...s, excess, reading, minute, quarter, minutes, quarters };
  const a1 = s.a1 || alarmA1(next);
  const a2 = s.a2 || alarmA2(next);
  return {
    ...next,
    a1,
    a2,
    accepted: s.accepted && !(a2 && !s.a2),
  };
}

const alarmA1 = (s: Co2DetectorState) =>
  s.reading >= CO2_LIMITS.a1 || co2Twa(s) >= CO2_LIMITS.twa;
const alarmA2 = (s: Co2DetectorState) =>
  s.reading >= CO2_LIMITS.a2 || co2Stel(s) >= CO2_LIMITS.stel;

/** A room and its detector `dt` seconds on. */
export function stepCo2Detector(
  p: Co2RoomParams,
  s: Co2DetectorState,
  i: Co2RoomInputs,
  dt: number,
): Co2DetectorState {
  if (!(dt > 0)) return s;
  let out = s;
  let left = dt;
  while (left > 1e-9) {
    // Stop at each minute's end so its bucket is closed on time.
    const step = Math.min(left, MINUTE - out.minute.t);
    out = stepPart(p, out, i, step);
    left -= step;
  }
  return out;
}

/** Its interlock to the room's CO₂ valve controller: shut while in either alarm (latched until reset). */
export const dosingInterlock = (s: Co2DetectorState) => s.a1 || s.a2;
/** Its interlock to the loading bay's master valve: trip it on the high alarm. */
export const masterInterlock = (s: Co2DetectorState) => s.a2;

/** ACCEPT: the sounder stops; the beacon flashes on. */
export const acceptCo2 = (s: Co2DetectorState): Co2DetectorState =>
  s.accepted ? s : { ...s, accepted: true };

/** RESET: the alarms clear only once neither's condition holds any more. */
export function resetCo2(s: Co2DetectorState): Co2DetectorState {
  if (alarmA1(s) || alarmA2(s)) return s;
  return { ...s, a1: false, a2: false, accepted: false };
}

/** What the detector shows: its beacon flashing, its sounder sounding. */
export const co2DetectorAlarms = (s: Co2DetectorState) => ({
  beacon: s.a1 || s.a2,
  sounder: s.a2 && !s.accepted,
});
