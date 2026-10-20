import type {
  BlockKind,
  PortValues,
  Sleep,
  StepResult,
} from '../sim/block-kind';

/**
 * A heating loop's blocks, of the kinds formalised in `sim/block-kind.ts`:
 * a boiler, a circulating pump and a heat load (a tank of water, or a set
 * of heat emitters), wired boiler → load → boiler with the pump driving
 * the flow. Pure. Units: flow m³/h, temperature °C, heat kW, time s.
 *
 * Water carries 1.163 kW per m³/h for each kelvin of temperature it gains
 * or loses (its density and heat capacity: 1000 kg/m³ × 4.186 kJ/kg·K over
 * 3600 s/h).
 */

/** Heat carried by water, kW per (m³/h · K). */
export const WATER_HEAT = 1.163;
/** Natural gas's heat, kWh per m³ (gross), and a condensing boiler's efficiency. */
export const GAS_ENERGY = 10.55;
export const BOILER_EFFICIENCY = 0.95;

// ---- The boiler ------------------------------------------------------------

export type BoilerMode =
  | 'standby'
  | 'purge'
  | 'ignition'
  | 'firing'
  | 'blocked'
  | 'lockout';

export interface BoilerParams {
  /** Its output at full fire, kW. */
  power: number;
  /** The flow temperature it modulates toward, °C, and its band, K. */
  setpoint: number;
  band: number;
  /** Below this flow it will not fire: its flow switch, m³/h. */
  minFlow: number;
  /** Its return limit: above it for `confirm` seconds it shuts down, until the return falls `differential` below. */
  returnLimit: number;
  confirm: number;
  differential: number;
  /** Above this flow temperature it locks out: its overheat stat, °C. */
  highLimit: number;
  purge: number;
  ignition: number;
  /** How fast its firing rate follows its target, seconds. */
  lag: number;
  /** Below this gas pressure it will not fire (its low gas pressure switch), mbar. */
  minGasPressure: number;
  /** Below this water pressure it will not fire (code 9 on its display), bar. */
  minWaterPressure: number;
}

export interface BoilerState {
  mode: BoilerMode;
  /** Seconds in this mode (purge, ignition), or above the return limit. */
  timer: number;
  /** Firing rate, 0 to 1. */
  rate: number;
  /** Why it is stopped, if it is. */
  reason: string | null;
}

/**
 * A boiler, after the controllers of condensing boilers of the period
 * (`components/plant/logic/boiler-house.ts` is the full panel's version):
 * on demand it purges, lights and fires, modulating its rate to hold its
 * flow temperature at its setpoint (set from outside, or its own); it will not fire without flow through it (its flow
 * switch); it shuts down while its return water is too hot (a load that
 * no longer takes its heat) and starts again once it cools; it locks out
 * on overheat or a failed ignition until reset. All of that is inside it:
 * the plant sees its flow temperature, its heat, whether it is firing and
 * why not.
 */
/** The boiler's outputs from its state and the water arriving: its feedthrough. */
function boilerOutputs(
  p: BoilerParams,
  s: BoilerState,
  inputs: PortValues,
): PortValues {
  const flow = (inputs.flowIn as number) ?? 0;
  const back = (inputs.returnTemp as number) ?? 20;
  const heat = s.mode === 'firing' ? p.power * s.rate : 0;
  return {
    flowTemp: flow > 0 ? back + heat / (WATER_HEAT * flow) : back,
    heat,
    gasFlow: heat / (BOILER_EFFICIENCY * GAS_ENERGY),
    firing: s.mode === 'firing',
    // What its display would say: its mode, and why it is stopped.
    status: s.reason ? `${s.mode}: ${s.reason}` : s.mode,
    fault: s.mode === 'lockout' ? s.reason : null,
  };
}

export const BOILER: BlockKind<BoilerParams, BoilerState> = {
  kind: 'boiler',
  inputs: [
    { name: 'flowIn', unit: 'm³/h', about: 'water through it' },
    { name: 'returnTemp', unit: '°C', about: 'water arriving' },
    { name: 'demand', about: 'heat wanted' },
    { name: 'gas', about: 'gas at its valve' },
    { name: 'gasPressure', unit: 'mbar', about: 'gas pressure at its inlet' },
    { name: 'reset', about: 'its RESET key' },
    {
      name: 'setpoint',
      unit: '°C',
      about: 'its flow setpoint, if set from outside',
    },
    { name: 'waterPressure', unit: 'bar', about: 'the system water pressure' },
  ],
  outputs: [
    { name: 'flowTemp', unit: '°C', about: 'water leaving' },
    { name: 'heat', unit: 'kW', about: 'heat put into the water' },
    { name: 'gasFlow', unit: 'm³/h', about: 'gas it burns' },
    { name: 'firing' },
    { name: 'status', about: 'what it is doing' },
    { name: 'fault', about: 'why it is locked out' },
  ],
  params: {
    power: 300,
    setpoint: 80,
    band: 10,
    minFlow: 3,
    returnLimit: 85,
    confirm: 5,
    differential: 8,
    highLimit: 95,
    purge: 6,
    ignition: 4,
    lag: 20,
    minGasPressure: 17,
    minWaterPressure: 0.8,
  },
  init: () => ({ mode: 'standby', timer: 0, rate: 0, reason: null }),
  read: boilerOutputs,
  step(p, s, inputs, dt, t, tick): StepResult<BoilerState> {
    const flow = (inputs.flowIn as number) ?? 0;
    const back = (inputs.returnTemp as number) ?? 20;
    const demand = inputs.demand === true;
    const gas = inputs.gas !== false;
    const pressure = inputs.gasPressure;
    // Its low gas pressure switch: off below its minimum, on again a
    // millibar above it.
    const lowGas =
      typeof pressure === 'number' &&
      pressure < p.minGasPressure + (s.reason === 'low gas pressure' ? 1 : 0);
    const out = (
      mode: BoilerMode,
      rate: number,
      reason: string | null,
      fault: string | null = null,
    ): PortValues => {
      const heat = mode === 'firing' ? p.power * rate : 0;
      return {
        flowTemp: flow > 0 ? back + heat / (WATER_HEAT * flow) : back,
        heat,
        gasFlow: heat / (BOILER_EFFICIENCY * GAS_ENERGY),
        firing: mode === 'firing',
        // What its display would say: its mode, and why it is stopped.
        status: reason ? `${mode}: ${reason}` : mode,
        fault,
      };
    };
    // What would disturb a stopped boiler: any change to its switches,
    // flow crossing its flow switch, the return crossing its limit.
    const idle = (
      within: Record<string, readonly [number, number]>,
    ): Sleep => ({
      until: Infinity,
      hold: { demand: 0, gas: 0, reset: 0 },
      within: {
        gasPressure: [p.minGasPressure, Infinity],
        waterPressure: [p.minWaterPressure, Infinity],
        ...within,
      },
    });
    // Locked out: nothing but RESET moves it.
    if (s.mode === 'lockout') {
      if (inputs.reset === true)
        return {
          state: { mode: 'standby', timer: 0, rate: 0, reason: null },
          outputs: out('standby', 0, null),
        };
      return {
        state: s,
        outputs: out('lockout', 0, s.reason, s.reason),
        sleep: { until: Infinity, hold: { reset: 0 } },
      };
    }
    // Low water pressure: it will not fire (not a lockout).
    const water = inputs.waterPressure;
    if (typeof water === 'number' && water < p.minWaterPressure) {
      const state: BoilerState = {
        mode: 'blocked',
        timer: 0,
        rate: 0,
        reason: 'low water pressure',
      };
      return {
        state,
        outputs: out('blocked', 0, state.reason),
        sleep: idle({ waterPressure: [-Infinity, p.minWaterPressure] }),
      };
    }
    // No flow: its flow switch holds it off.
    if (flow < p.minFlow) {
      const state: BoilerState = {
        mode: 'blocked',
        timer: 0,
        rate: 0,
        reason: 'no flow',
      };
      return {
        state,
        outputs: out('blocked', 0, 'no flow'),
        sleep: idle({ flowIn: [-Infinity, p.minFlow] }),
      };
    }
    // Gas pressure too low: its switch stops it, until the pressure
    // returns (not a lockout).
    if (lowGas) {
      const state: BoilerState = {
        mode: 'standby',
        timer: 0,
        rate: 0,
        reason: 'low gas pressure',
      };
      return {
        state,
        outputs: out('standby', 0, state.reason),
        sleep: {
          until: Infinity,
          hold: { demand: 0, gas: 0, reset: 0 },
          within: { gasPressure: [-Infinity, p.minGasPressure + 1] },
        },
      };
    }
    if (s.reason === 'low gas pressure') s = { ...s, reason: null };
    // Its return too hot for `confirm` seconds: it shuts down, until the
    // return has fallen its differential below the limit.
    const hot = back > p.returnLimit;
    if (s.reason === 'return too hot') {
      if (back > p.returnLimit - p.differential) {
        const state: BoilerState = { ...s, mode: 'standby', rate: 0 };
        return {
          state,
          outputs: out('standby', 0, s.reason),
          sleep: idle({
            flowIn: [p.minFlow, Infinity],
            returnTemp: [p.returnLimit - p.differential, Infinity],
          }),
        };
      }
      s = { mode: 'standby', timer: 0, rate: 0, reason: null };
    }
    // It starts on demand; missing gas is found only when its flame fails
    // to prove, as on a real boiler.
    const wanted = demand;
    if (s.mode === 'firing' || s.mode === 'purge' || s.mode === 'ignition') {
      // Time over the limit: newly over, it crossed within the last tick
      // (asleep, it was promised to stay under).
      const above = hot ? (s.timer > 0 ? s.timer + dt : Math.min(dt, tick)) : 0;
      if (above >= p.confirm) {
        const state: BoilerState = {
          mode: 'standby',
          timer: 0,
          rate: 0,
          reason: 'return too hot',
        };
        return { state, outputs: out('standby', 0, state.reason) };
      }
      if (!wanted) {
        const state: BoilerState = {
          mode: 'standby',
          timer: 0,
          rate: 0,
          reason: null,
        };
        return { state, outputs: out('standby', 0, null) };
      }
      if (s.mode === 'purge' || s.mode === 'ignition') {
        const timer = s.timer + dt;
        const length = s.mode === 'purge' ? p.purge : p.ignition;
        if (timer < length)
          return {
            state: { ...s, timer },
            outputs: out(s.mode, 0, null),
            // Asleep through the rest of the purge or ignition, unless disturbed.
            sleep: {
              until: t + (length - timer),
              hold: { demand: 0, gas: 0 },
              within: { flowIn: [p.minFlow, Infinity] },
            },
          };
        if (s.mode === 'purge')
          return {
            state: { mode: 'ignition', timer: 0, rate: 0, reason: null },
            outputs: out('ignition', 0, null),
          };
        // The flame proves, or it does not.
        if (!gas) {
          const state: BoilerState = {
            mode: 'lockout',
            timer: 0,
            rate: 0,
            reason: 'ignition failure',
          };
          return {
            state,
            outputs: out('lockout', 0, state.reason, state.reason),
          };
        }
        return {
          state: { mode: 'firing', timer: 0, rate: 0.2, reason: null },
          outputs: out('firing', 0.2, null),
        };
      }
      // Its gas lost while it burns: the flame fails, and it locks out.
      if (!gas) {
        const state: BoilerState = {
          mode: 'lockout',
          timer: 0,
          rate: 0,
          reason: 'flame failure',
        };
        return {
          state,
          outputs: out('lockout', 0, state.reason, state.reason),
        };
      }
      // Firing: modulating to hold its flow temperature at its setpoint.
      // The rate that would do it exactly is what the water arriving needs
      // to be raised to the setpoint; the controller closes on it
      // smoothly (exactly, for any step), within its turn-down.
      const setpoint =
        typeof inputs.setpoint === 'number' ? inputs.setpoint : p.setpoint;
      const needed = (WATER_HEAT * flow * (setpoint - back)) / p.power;
      const target = Math.max(0.2, Math.min(1, needed));
      const rate = target + (s.rate - target) * Math.exp(-dt / p.lag);
      const outputs = out('firing', rate, null);
      if ((outputs.flowTemp as number) > p.highLimit) {
        const state: BoilerState = {
          mode: 'lockout',
          timer: 0,
          rate: 0,
          reason: 'overheat',
        };
        return {
          state,
          outputs: out('lockout', 0, state.reason, state.reason),
        };
      }
      const state: BoilerState = {
        mode: 'firing',
        timer: above,
        rate,
        reason: null,
      };
      // Steady when its rate has met its target and its return is below
      // its limit: asleep until the return drifts half a kelvin, the flow
      // changes by a twentieth, or a limit is crossed.
      const steady = Math.abs(target - rate) < 0.002 && !hot;
      // Judged steady, it settles on its target exactly, so no shortfall
      // is frozen in while it sleeps.
      if (steady) state.rate = target;
      // How far its return may drift before its rate should change: a
      // tenth of a kelvin while it modulates; pinned at full or lowest
      // fire, exactly as far as keeps it pinned there.
      const perKelvin = (WATER_HEAT * flow) / p.power;
      const slack =
        needed >= 1
          ? (needed - 1) / perKelvin
          : needed <= 0.2
            ? (0.2 - needed) / perKelvin
            : 0;
      const drift = Math.max(0.1, slack);
      return {
        state,
        outputs,
        sleep: steady
          ? {
              until: Infinity,
              hold: {
                demand: 0,
                gas: 0,
                setpoint: 0,
                returnTemp: drift,
                flowIn: 0.05 * flow,
              },
              within: {
                flowIn: [p.minFlow, Infinity],
                returnTemp: [-Infinity, p.returnLimit],
                gasPressure: [p.minGasPressure, Infinity],
                waterPressure: [p.minWaterPressure, Infinity],
              },
            }
          : undefined,
      };
    }
    // Standby: it starts on demand.
    if (wanted && !hot)
      return {
        state: { mode: 'purge', timer: 0, rate: 0, reason: null },
        outputs: out('purge', 0, null),
      };
    return {
      state: { mode: 'standby', timer: 0, rate: 0, reason: s.reason },
      outputs: out('standby', 0, s.reason),
      sleep: idle({
        flowIn: [p.minFlow, Infinity],
        returnTemp: [-Infinity, p.returnLimit],
      }),
    };
  },
};

// ---- The pump --------------------------------------------------------------

/** A circulating pump: its flow while running. */
export const PUMP: BlockKind<{ flow: number }, null> = {
  kind: 'pump',
  inputs: [{ name: 'running' }],
  outputs: [{ name: 'flow', unit: 'm³/h' }],
  params: { flow: 10 },
  init: () => null,
  step: (p, s, inputs) => ({
    state: s,
    outputs: { flow: inputs.running === true ? p.flow : 0 },
    sleep: { until: Infinity, hold: { running: 0 } },
  }),
};

// ---- The heat load ---------------------------------------------------------

export interface LoadParams {
  /** The water it holds, as heat capacity, kJ/K (a tonne of water: 4186). */
  capacity: number;
  /** What it loses to its surroundings, kW per kelvin above them. */
  loss: number;
  /** Its surroundings' temperature, °C. */
  ambient: number;
  /** Its starting temperature, °C. */
  start: number;
}

/**
 * A heat load: a mass of water (a tank, or emitters and their pipework),
 * fully mixed, warmed by the flow through it and losing heat to its
 * surroundings. Its temperature follows exactly (the equation is linear,
 * so any step, however long, is solved exactly): it settles where the
 * heat brought equals the heat lost. Water leaves it at its temperature.
 * A mass of water changes slowly but seldom stops changing, so rather
 * than wait to be settled it sleeps for as long as it would take to drift
 * a twentieth of a kelvin at its present rate, then catches up exactly.
 */
/** How far a heat load may drift unseen while asleep, kelvin. */
const LOAD_DRIFT = 0.05;

/** The load's temperature `dt` seconds on from `temp`, its inputs held: solved exactly. */
function loadAfter(
  p: LoadParams,
  temp: number,
  inputs: PortValues,
  dt: number,
) {
  const flow = Math.max(0, (inputs.flowIn as number) ?? 0);
  const warm = (inputs.flowTemp as number) ?? temp;
  const carry = WATER_HEAT * flow;
  const settle = (carry * warm + p.loss * p.ambient) / (carry + p.loss || 1);
  const rate = (carry + p.loss) / p.capacity;
  return {
    temp: settle + (temp - settle) * Math.exp(-rate * dt),
    settle,
    rate,
    flow,
  };
}

export const LOAD: BlockKind<LoadParams, { temp: number; at: number }> = {
  kind: 'heat-load',
  inputs: [
    { name: 'flowIn', unit: 'm³/h' },
    { name: 'flowTemp', unit: '°C' },
  ],
  outputs: [
    { name: 'returnTemp', unit: '°C' },
    { name: 'heatLost', unit: 'kW' },
  ],
  params: { capacity: 4186 * 2, loss: 4, ambient: 20, start: 20 },
  init: (p) => ({ temp: p.start, at: 0 }),
  // Its temperature now, asleep or not: carried on exactly from when it
  // last stepped, so what it hands on is never stale (a stale return,
  // passed back through the boiler as its own inflow, would starve it).
  read(p, s, inputs, t) {
    const { temp } = loadAfter(p, s.temp, inputs, t - s.at);
    return { returnTemp: temp, heatLost: p.loss * (temp - p.ambient) };
  },
  step(p, s, inputs, dt, t) {
    const { temp, settle, rate, flow } = loadAfter(p, s.temp, inputs, dt);
    const outputs = { returnTemp: temp, heatLost: p.loss * (temp - p.ambient) };
    // Asleep while it would drift less than LOAD_DRIFT from the course its
    // present inputs set: its readings follow that course meanwhile, and
    // woken, it catches up the whole time exactly.
    const drifting = Math.abs((settle - temp) * rate);
    const horizon = drifting > 0 ? LOAD_DRIFT / drifting : Infinity;
    return {
      state: { temp, at: t },
      outputs,
      sleep:
        horizon >= 10
          ? {
              until: t + Math.min(horizon, 900),
              hold: { flowTemp: 0.25, flowIn: 0.05 * Math.max(flow, 1) },
            }
          : undefined,
    };
  },
};
