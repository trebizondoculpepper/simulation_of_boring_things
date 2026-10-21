/**
 * A commercial spa's controller (after the Balboa and Gecko spa packs):
 * the circulation pump runs all the time, through the heater, which keeps
 * the water at its set point with a little hysteresis, and only while
 * water flows past it; all that is in the plant, out of the bathers'
 * sight. The bathers have three buttons by the tub: START runs the jets
 * and the air for a timed cycle, after which they stop of themselves;
 * STOP stops them at once (it is the spa's emergency stop, which a
 * public spa must have); LIGHT switches the underwater light. The plant
 * may also stop the spa outright (`setStopped`). Pure.
 */

export const SPA = {
  /** A jets or air cycle, seconds. */
  cycle: 600,
  /**
   * How long after the blower starts the air reaches the water and it
   * bubbles, and how long after it stops the bubbling dies away, seconds.
   */
  bubblesAfter: 3,
  bubblesLinger: 4,
  /** The heater, kW, and the water it heats, m³. */
  heaterKw: 12,
  volume: 2.83,
  /** Heat lost to the room per kelvin above it, W/K; more with jets and air. */
  loss: 180,
  agitated: 2.2,
  room: 30,
  /** The set point's range and step, °C, and the heater's hysteresis. */
  min: 30,
  max: 40,
  step: 0.5,
  hysteresis: 0.5,
} as const;

export interface SpaState {
  /** The water, °C, and the set point. */
  water: number;
  setpoint: number;
  /** Seconds left in the jets' and the blower's cycles: 0 is off. */
  jets: number;
  air: number;
  light: boolean;
  /** The water bubbling, which follows the blower by a few seconds. */
  bubbling: boolean;
  /** Whether the blower ran at the last step, and for how long it has been so. */
  blowing: boolean;
  airFor: number;
  /** The emergency stop is pushed in. */
  stopped: boolean;
  heating: boolean;
}

export const initialSpa = (water = 35, setpoint = 37): SpaState => ({
  water,
  setpoint,
  jets: 0,
  air: 0,
  light: false,
  bubbling: false,
  blowing: false,
  airFor: 0,
  stopped: false,
  heating: false,
});

/** Whether the circulation pump (and so flow past the heater) is running. */
export const circulating = (s: SpaState) => !s.stopped;

/** START: the jets and the air, for a cycle (from its start again). */
export const startCycle = (s: SpaState): SpaState =>
  s.stopped ? s : { ...s, jets: SPA.cycle, air: SPA.cycle };

/** STOP: the jets and the air off at once. */
export const stopCycle = (s: SpaState): SpaState => ({ ...s, jets: 0, air: 0 });

/** The jets alone: start, or stop. */
export const pressJets = (s: SpaState): SpaState =>
  s.stopped ? s : { ...s, jets: s.jets > 0 ? 0 : SPA.cycle };

export const pressAir = (s: SpaState): SpaState =>
  s.stopped ? s : { ...s, air: s.air > 0 ? 0 : SPA.cycle };

export const pressLight = (s: SpaState): SpaState => ({
  ...s,
  light: !s.light,
});

/** Raise or lower the set point a step, within its range. */
export const nudgeSetpoint = (s: SpaState, by: 1 | -1): SpaState => ({
  ...s,
  setpoint: Math.min(SPA.max, Math.max(SPA.min, s.setpoint + by * SPA.step)),
});

/** The emergency stop struck in (everything stops) or pulled out again. */
export const setStopped = (s: SpaState, stopped: boolean): SpaState =>
  stopped
    ? { ...s, stopped, jets: 0, air: 0, heating: false }
    : { ...s, stopped };

/** The spa `dt` seconds on. */
export function stepSpa(s: SpaState, dt: number): SpaState {
  const jets = Math.max(0, s.jets - dt);
  const air = Math.max(0, s.air - dt);
  // The air takes a moment to reach the water, and its bubbles a moment
  // to die away after it stops.
  const blowing = air > 0;
  const airFor = blowing === s.blowing ? s.airFor + dt : 0;
  const bubbling =
    air > 0
      ? s.bubbling || airFor >= SPA.bubblesAfter
      : s.bubbling && airFor < SPA.bubblesLinger;
  // The heater comes on below the set point less the hysteresis and goes
  // off at it, and only while the circulation runs past it.
  const heating =
    circulating(s) &&
    (s.heating ? s.water < s.setpoint : s.water < s.setpoint - SPA.hysteresis);
  const capacity = SPA.volume * 1000 * 4186;
  const loss =
    (s.water - SPA.room) * SPA.loss * (jets > 0 || air > 0 ? SPA.agitated : 1);
  const water =
    s.water + ((heating ? SPA.heaterKw * 1000 : 0) - loss) * (dt / capacity);
  return { ...s, jets, air, heating, water, bubbling, blowing, airFor };
}

/** The panel's temperature readout: the water to a tenth of a degree. */
export const spaReadout = (s: SpaState) => s.water.toFixed(1);
