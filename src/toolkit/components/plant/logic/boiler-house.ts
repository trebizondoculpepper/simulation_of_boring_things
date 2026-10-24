/**
 * The boiler house, as logic: each boiler's controller and the gas
 * supply they share. Pure: a state you step with the time that passes.
 *
 * A boiler's controller runs the sequence a period Remeha code display
 * shows as a status digit (after the Remeha Gas 310 ECO's control panel:
 * a digital code display, LED indicators, function keys for manual and
 * automatic and forced high and low firing, an on/off switch, and a
 * flashing fault code on lockout; the codes here are in Remeha's style,
 * to be checked against its manual):
 *
 *   0 standby     no heat demand
 *   1 purge       the fan clears the combustion chamber before lighting
 *   2 ignition    spark and gas valve open; the flame must prove
 *   3 burner on   firing for heating, modulating
 *   7 pump run-on the burner is off; the pump carries away the heat
 *   9 blocked     a condition stops it (low water pressure) until it clears
 *
 * A flame that fails to prove (no gas: an isolating valve shut, the safety
 * shut-off valve closed) is tried again; after its third try the boiler
 * locks out, flashing its fault code, until someone presses RESET.
 *
 * The gas house: the incoming emergency control valve (ECV), the meter,
 * and the automatic safety shut-off valve (SSOV), which opens only while
 * the emergency stop is healthy and no gas is detected; each boiler then
 * has its own manual isolating valve.
 */

export type BoilerCode = 0 | 1 | 2 | 3 | 7 | 9;

/** Fault codes, flashed on lockout. */
export const FAULTS = {
  'ignition-failure': 2,
  'flame-loss': 5,
  overheat: 1,
} as const;
export type Fault = keyof typeof FAULTS;

/** What the display shows, stepped by the MODE key. */
export const DISPLAY_MODES = [
  'status',
  'flow',
  'return',
  'pressure',
  'rate',
  'setpoint',
] as const;
export type DisplayMode = (typeof DISPLAY_MODES)[number];

/** Forced firing, from the function key (the service engineer's). */
export type Forcing = 'auto' | 'high' | 'low';

export interface BoilerState {
  on: boolean;
  code: BoilerCode;
  /** Seconds in this code. */
  timer: number;
  /** Ignition attempts since the last success. */
  tries: number;
  lockout: Fault | null;
  /** Firing rate, 0 to 1 of its output. */
  rate: number;
  flow: number;
  return: number;
  /** System water pressure, bar. */
  pressure: number;
  setpoint: number;
  forcing: Forcing;
  mode: DisplayMode;
}

export const PURGE_SECONDS = 6;
export const IGNITION_SECONDS = 4;
export const RUN_ON_SECONDS = 20;
export const MAX_TRIES = 3;
/** Below this system pressure the boiler blocks, bar. */
export const LOW_PRESSURE = 0.8;
/** A 300 kW boiler's gas at full fire, m³/h of natural gas (G20). */
export const FULL_GAS = 31.7;

export function newBoiler(): BoilerState {
  return {
    on: true,
    code: 0,
    timer: 0,
    tries: 0,
    lockout: null,
    rate: 0,
    flow: 60,
    return: 58,
    pressure: 2.4,
    setpoint: 80,
    forcing: 'auto',
    mode: 'status',
  };
}

export interface BoilerInputs {
  /** Whether heat is wanted (the cascade's demand on this boiler). */
  demand: boolean;
  /** Whether gas reaches its burner: isolator open and SSOV open. */
  gas: boolean;
  /** The system return water temperature, °C. */
  systemReturn: number;
  /** The system pressure, bar. */
  pressure: number;
  /** Whether its electrical supply is on (by default, it is). */
  powered?: boolean;
}

/** Step `boiler` on by `delta` seconds. Returns a new state. */
export function stepBoiler(
  boiler: BoilerState,
  inputs: BoilerInputs,
  delta: number,
): BoilerState {
  const b: BoilerState = {
    ...boiler,
    timer: boiler.timer + delta,
    pressure: inputs.pressure,
  };
  const to = (code: BoilerCode) => {
    b.code = code;
    b.timer = 0;
  };
  const wanted =
    b.on && b.lockout === null && (inputs.demand || b.forcing !== 'auto');
  // Without power nothing runs: no fan, no ignition, no flame.
  if (inputs.powered === false) {
    b.rate = 0;
    if (b.code !== 0) to(0);
    return b;
  }
  if (!b.on || b.lockout) {
    b.rate = 0;
    if (b.code !== 0 && b.code !== 9) to(0);
  } else if (inputs.pressure < LOW_PRESSURE) {
    b.rate = 0;
    if (b.code !== 9) to(9);
  } else
    switch (b.code) {
      case 9:
        to(0);
        break;
      case 0:
        if (wanted) to(1);
        break;
      case 1:
        if (!wanted) to(0);
        else if (b.timer >= PURGE_SECONDS) to(2);
        break;
      case 2:
        if (b.timer >= IGNITION_SECONDS) {
          if (inputs.gas) {
            b.tries = 0;
            to(3);
          } else {
            b.tries += 1;
            if (b.tries >= MAX_TRIES) {
              b.lockout = 'ignition-failure';
              b.tries = 0;
              to(0);
            } else to(1);
          }
        }
        break;
      case 3:
        if (!inputs.gas) {
          // The flame goes out with the gas: a flame loss, retried once.
          b.rate = 0;
          b.tries += 1;
          if (b.tries >= MAX_TRIES) {
            b.lockout = 'flame-loss';
            b.tries = 0;
            to(0);
          } else to(1);
        } else if (!wanted) {
          b.rate = 0;
          to(7);
        } else {
          // Modulate toward the setpoint; forced high or low overrides.
          const want =
            b.forcing === 'high'
              ? 1
              : b.forcing === 'low'
                ? 0.2
                : Math.max(0.2, Math.min(1, (b.setpoint + 3 - b.flow) / 12));
          b.rate += (want - b.rate) * Math.min(1, delta * 0.5);
        }
        break;
      case 7:
        if (wanted) to(1);
        else if (b.timer >= RUN_ON_SECONDS) to(0);
        break;
    }
  // The water: heated by the burner, cooled toward the system's return.
  const heat = b.code === 3 ? b.rate * 22 : 0;
  const target = inputs.systemReturn + heat;
  b.flow += (target - b.flow) * Math.min(1, delta * 0.08);
  b.return += (inputs.systemReturn - b.return) * Math.min(1, delta * 0.08);
  if (b.flow > 95 && !b.lockout) {
    b.lockout = 'overheat';
    b.rate = 0;
    to(0);
  }
  return b;
}

/** The keys on its panel, as the controller hears them. */
export type BoilerKey =
  | 'mode'
  | 'step'
  | 'plus'
  | 'minus'
  | 'store'
  | 'reset'
  | 'manual'
  | 'power';

/** What pressing `key` does. */
export function pressBoiler(boiler: BoilerState, key: BoilerKey): BoilerState {
  const b = { ...boiler };
  switch (key) {
    case 'mode':
    case 'step': {
      const i = DISPLAY_MODES.indexOf(b.mode);
      b.mode = DISPLAY_MODES[(i + 1) % DISPLAY_MODES.length];
      break;
    }
    // − and + set the flow temperature from any display, showing it.
    case 'plus':
      return setBoilerSetpoint(b, b.setpoint + 1);
    case 'minus':
      return setBoilerSetpoint(b, b.setpoint - 1);
    case 'store':
      b.mode = 'status';
      break;
    case 'reset':
      if (b.lockout) {
        b.lockout = null;
        b.code = 0;
        b.timer = 0;
        b.tries = 0;
      }
      break;
    case 'manual':
      b.forcing =
        b.forcing === 'auto' ? 'high' : b.forcing === 'high' ? 'low' : 'auto';
      break;
    case 'power':
      b.on = !b.on;
      break;
  }
  return b;
}

/** The flow temperature it fires to, °C, from 40 to 90, shown as it is set. */
export const SETPOINT_RANGE = { min: 40, max: 90 } as const;

export function setBoilerSetpoint(
  boiler: BoilerState,
  celsius: number,
): BoilerState {
  return {
    ...boiler,
    setpoint: Math.round(
      Math.max(SETPOINT_RANGE.min, Math.min(SETPOINT_RANGE.max, celsius)),
    ),
    mode: 'setpoint',
  };
}

/**
 * What the four-digit code display shows: the status digit and the flow
 * temperature ("3 78") in status mode; a letter and a value in the other
 * modes ("r 61" return, "P2.4" pressure, "H 64" firing rate, "S 80"
 * setpoint); and on lockout its fault code, flashing ("E 02"). With no
 * gas at its inlet (`gas` false: its gas pressure switch open, the safety
 * shut-off valve or a valve upstream shut) it says so even while idle,
 * "6A5 " (GAS) alternating with what it would show, a second each.
 */
export function boilerDisplay(
  boiler: BoilerState,
  seconds: number,
  gas = true,
) {
  if (!boiler.on) return '    ';
  if (boiler.lockout) {
    const shown = Math.floor(seconds * 2) % 2 === 0;
    return shown
      ? `E ${String(FAULTS[boiler.lockout]).padStart(2, '0')}`
      : '    ';
  }
  if (!gas && Math.floor(seconds) % 2 === 0) return GAS_LOW_DISPLAY;
  const two = (v: number) =>
    String(Math.round(Math.max(0, Math.min(99, v)))).padStart(2, ' ');
  switch (boiler.mode) {
    case 'status':
      return `${boiler.code} ${two(boiler.flow)}`;
    case 'flow':
      return `F ${two(boiler.flow)}`;
    case 'return':
      return `r ${two(boiler.return)}`;
    case 'pressure':
      return `P${boiler.pressure.toFixed(1).padStart(3, ' ')}`;
    case 'rate':
      return `H ${two(boiler.rate * 100)}`;
    case 'setpoint':
      return `S ${two(boiler.setpoint)}`;
  }
}

/** What the display shows for no gas at the boiler's inlet: GAS, as seven segments can. */
export const GAS_LOW_DISPLAY = '6A5 ';

/** Its indicator LEDs. */
export function boilerLamps(boiler: BoilerState) {
  return {
    burner: boiler.code === 3,
    lockout: boiler.lockout !== null,
    pump:
      boiler.on &&
      (boiler.code === 3 || boiler.code === 7 || boiler.code === 1),
    manual: boiler.forcing !== 'auto',
  };
}

// ---- The gas house ---------------------------------------------------------

export interface GasHouse {
  /** The incoming emergency control valve, at the meter. */
  ecvOpen: boolean;
  /** The emergency stop by the door: pressed (latched) or not. */
  stopPressed: boolean;
  /** Gas detected by the methane head. */
  gasDetected: boolean;
  /** The SSOV, which opens only while all is well, and stays shut until reset. */
  ssovOpen: boolean;
  /** Each boiler's manual isolating valve. */
  isolators: boolean[];
}

export function newGasHouse(boilers = 2): GasHouse {
  return {
    ecvOpen: true,
    stopPressed: false,
    gasDetected: false,
    ssovOpen: true,
    isolators: Array.from({ length: boilers }, () => true),
  };
}

/** Whether the SSOV may be opened: stop healthy, no gas, supply on. */
export const ssovPermitted = (house: GasHouse) =>
  !house.stopPressed && !house.gasDetected && house.ecvOpen;

/** The house after a change: the SSOV trips shut when its permit goes. */
export function settleGasHouse(house: GasHouse): GasHouse {
  return { ...house, ssovOpen: house.ssovOpen && ssovPermitted(house) };
}

/** Reset the gas safety system: the SSOV reopens if it is permitted. */
export function resetGasHouse(house: GasHouse): GasHouse {
  return { ...house, ssovOpen: ssovPermitted(house) };
}

/** Whether gas reaches boiler `i`'s burner. */
export const gasTo = (house: GasHouse, i: number) =>
  house.ecvOpen && house.ssovOpen && (house.isolators[i] ?? false);

/** The gas flowing through the meter, m³/h, from the boilers' firing rates. */
export function meterFlow(house: GasHouse, boilers: readonly BoilerState[]) {
  return boilers.reduce(
    (n, b, i) => n + (gasTo(house, i) && b.code === 3 ? b.rate * FULL_GAS : 0),
    0,
  );
}

/** Gas pressures, mbar: at the meter inlet and after the SSOV. */
export function gasPressures(house: GasHouse, flow: number) {
  const supply = house.ecvOpen ? 21 - flow * 0.02 : 0;
  return { supply, burners: house.ssovOpen ? supply - flow * 0.04 : 0 };
}
