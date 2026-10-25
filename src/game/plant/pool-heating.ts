import {
  FULL_GAS,
  newBoiler,
  pressBoiler,
  stepBoiler,
} from '../../toolkit/components/plant/logic/boiler-house';
import type {
  BoilerKey,
  BoilerState,
} from '../../toolkit/components/plant/logic/boiler-house';

/**
 * Heat exchange (scenario 4, `doc/prompts/done/027-scenario-heat-exchange.md`):
 * one gas condensing boiler on a closed primary circuit (boiler,
 * circulator, three-way valve, the shell-and-tube heat exchanger and its
 * bypass, back to the boiler), heating pool water passing through the
 * exchanger. The boiler's own controller (`boiler-house.ts`: purge,
 * ignition, firing, lockout) fires it on gas and power from their
 * supplies, modulating to hold its flow temperature; a PI controller works
 * the three-way valve to hold the pool water leaving the exchanger at its
 * set point.
 *
 * The heat: the exchanger as a counterflow exchanger by effectiveness
 * (ε–NTU), the boiler's output into its water's thermal mass, lags on the
 * exchanger's outlets and on every thermometer. Water carries
 * C = ρ·c·Q: 1.163 kW per K for each m³/h. Pure; °C, kW, m³/h, seconds.
 */

/** Working figures. */
export const HEATING = {
  /** The boiler's output at full fire, kW, and its efficiency. */
  boilerKW: 160,
  efficiency: 0.9,
  /** Its fan, controls and the circulator, kW. */
  electricKW: 0.55,
  /** The primary circuit's flow, and the pool water's through the exchanger, m³/h. */
  primaryFlow: 7,
  poolFlow: 15,
  /** The pool water coming in, °C. */
  poolIn: 26,
  /** The exchanger's conductance, kW/K. */
  UA: 14,
  /** The boiler's water's heat capacity, kJ/K (about 100 l), and the exchanger's lag, s. */
  boilerMass: 420,
  exchangerLag: 15,
  /** The thermometers' response (to 63 %), s. */
  sensorLag: 6,
  /** The three-way valve's end-to-end travel, s. */
  valveTravel: 60,
  /** The PI controller's gain (per K) and integral time, s. */
  gain: 0.12,
  integral: 90,
  /** The boiler's stat: it is called for heat below its set point less this, K. */
  statBand: 2,
} as const;

/** A flow's heat capacity rate, kW/K. */
export const capacity = (m3h: number) => (m3h * 1000 * 4.186) / 3600;

export interface PoolHeatingState {
  boiler: BoilerState;
  /** The primary circuit: boiler flow, the exchanger's primary outlet, boiler return, °C. */
  flow: number;
  hxOut: number;
  return: number;
  /** The pool water leaving the exchanger, °C. */
  poolOut: number;
  /** The three-way valve: its position (0 all bypass, 1 all through the exchanger). */
  valve: number;
  /** Its controller: AUTO or MANUAL, its set point, its integral, and a manual drive (−1, 0, +1). */
  auto: boolean;
  setpoint: number;
  integral: number;
  drive: number;
  /** The supplies, on or off: gas, power (the owner's: both unlimited). */
  gas: boolean;
  power: boolean;
  /** What the thermometers read, lagging the water: TT1 flow, TT2 hx out, TT3 return, TT4 pool in, TT5 pool out. */
  tt: [number, number, number, number, number];
  /** The heat passed in the exchanger, kW. */
  duty: number;
  /** The boiler's output, kW; its gas, m³/h; its electricity, kW. */
  output: number;
  gasRate: number;
  electric: number;
}

export function newPoolHeating(): PoolHeatingState {
  const cold = HEATING.poolIn;
  return {
    boiler: { ...newBoiler(), flow: cold, return: cold, setpoint: 80 },
    flow: cold,
    hxOut: cold,
    return: cold,
    poolOut: cold,
    valve: 0,
    auto: true,
    setpoint: 30,
    integral: 0,
    drive: 0,
    gas: true,
    power: true,
    tt: [cold, cold, cold, cold, cold],
    duty: 0,
    output: 0,
    gasRate: 0,
    electric: 0,
  };
}

/** A counterflow exchanger's effectiveness, for its two heat capacity rates, kW/K. */
export function effectiveness(ch: number, cc: number, UA = HEATING.UA) {
  const cmin = Math.min(ch, cc);
  const cmax = Math.max(ch, cc);
  if (cmin <= 0) return 0;
  const ntu = UA / cmin;
  const cr = cmin / cmax;
  if (Math.abs(1 - cr) < 1e-6) return ntu / (1 + ntu);
  const e = Math.exp(-ntu * (1 - cr));
  return (1 - e) / (1 - cr * e);
}

/** The exchanger's duty and outlets for its inlets and its primary share. */
export function exchange(hotIn: number, coldIn: number, valve: number) {
  const ch = capacity(HEATING.primaryFlow * valve);
  const cc = capacity(HEATING.poolFlow);
  const q = effectiveness(ch, cc) * Math.min(ch, cc) * (hotIn - coldIn);
  return {
    q,
    hotOut: ch > 0 ? hotIn - q / ch : hotIn,
    coldOut: coldIn + q / cc,
  };
}

const ease = (from: number, to: number, tau: number, dt: number) =>
  to + (from - to) * Math.exp(-dt / tau);

export type HeatingEvent =
  | { type: 'boiler'; key: BoilerKey }
  | { type: 'auto'; on: boolean }
  | { type: 'setpoint'; by: number }
  | { type: 'drive'; to: number }
  | { type: 'gas'; on: boolean }
  | { type: 'power'; on: boolean };

export function pressHeating(
  s: PoolHeatingState,
  e: HeatingEvent,
): PoolHeatingState {
  switch (e.type) {
    case 'boiler':
      return { ...s, boiler: pressBoiler(s.boiler, e.key) };
    case 'auto':
      // Bumpless: the integral picks up from where the valve stands.
      return { ...s, auto: e.on, integral: s.valve, drive: 0 };
    case 'setpoint':
      return { ...s, setpoint: Math.min(40, Math.max(20, s.setpoint + e.by)) };
    case 'drive':
      return { ...s, drive: e.to };
    case 'gas':
      return { ...s, gas: e.on };
    case 'power':
      return { ...s, power: e.on };
  }
}

/** Step the loop `dt` seconds (in small steps inside, so the lags hold). */
export function stepPoolHeating(
  state: PoolHeatingState,
  dt: number,
): PoolHeatingState {
  let s = state;
  const n = Math.max(1, Math.ceil(dt / 0.25));
  for (let k = 0; k < n; k++) s = stepOnce(s, dt / n);
  return s;
}

function stepOnce(s: PoolHeatingState, dt: number): PoolHeatingState {
  if (!(dt > 0)) return s;
  // The circulator runs on the power supply.
  const pumping = s.power;
  const cp = capacity(pumping ? HEATING.primaryFlow : 0);
  // The boiler's controller, seeing the real flow temperature.
  const demand =
    s.boiler.flow < s.boiler.setpoint - HEATING.statBand ||
    (s.boiler.code === 3 && s.boiler.flow < s.boiler.setpoint);
  const boiler = stepBoiler(
    { ...s.boiler, flow: s.flow, return: s.return },
    {
      demand,
      gas: s.gas,
      systemReturn: s.return,
      pressure: 1.5,
      powered: s.power,
    },
    dt,
  );
  const output = boiler.code === 3 ? boiler.rate * HEATING.boilerKW : 0;
  // The exchanger, on the share of the primary flow the valve sends it.
  const share = pumping ? s.valve : 0;
  const x = exchange(s.flow, HEATING.poolIn, share);
  const hxOut = ease(s.hxOut, x.hotOut, HEATING.exchangerLag, dt);
  const poolOut = ease(
    s.poolOut,
    pumping ? x.coldOut : HEATING.poolIn,
    HEATING.exchangerLag,
    dt,
  );
  const ret = pumping ? share * hxOut + (1 - share) * s.flow : s.return;
  // The boiler's water: its output in, the circuit's flow carrying heat away.
  const flow =
    s.flow + ((output - cp * (s.flow - ret)) / HEATING.boilerMass) * dt;
  // The duty: what the primary side actually gives up.
  const duty = capacity(HEATING.primaryFlow * share) * (s.flow - hxOut);
  // The valve's controller, and its actuator's travel.
  let { integral } = s;
  let target: number;
  if (s.auto) {
    const error = s.setpoint - s.tt[4];
    integral = Math.min(
      1,
      Math.max(0, integral + ((HEATING.gain * error) / HEATING.integral) * dt),
    );
    target = Math.min(1, Math.max(0, HEATING.gain * error + integral));
  } else target = s.drive > 0 ? 1 : s.drive < 0 ? 0 : s.valve;
  const travel = dt / HEATING.valveTravel;
  const valve =
    target > s.valve
      ? Math.min(target, s.valve + travel)
      : Math.max(target, s.valve - travel);
  const water = [flow, hxOut, ret, HEATING.poolIn, poolOut];
  const tt = s.tt.map((t, k) =>
    ease(t, water[k], HEATING.sensorLag, dt),
  ) as PoolHeatingState['tt'];
  return {
    ...s,
    boiler: { ...boiler, flow, return: ret },
    flow,
    hxOut,
    return: ret,
    poolOut,
    valve,
    integral,
    tt,
    duty: Math.max(0, duty),
    output,
    gasRate:
      (boiler.code === 3 ? boiler.rate : 0) *
      FULL_GAS *
      (HEATING.boilerKW / 300),
    electric: s.power ? HEATING.electricKW : 0,
  };
}
