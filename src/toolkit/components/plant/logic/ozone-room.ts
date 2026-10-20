import { OZONE_PLANT } from '../../../../game/plant/ozone';
import {
  createSystem,
  output,
  setInput,
  stepSystem,
} from '../../../../game/sim/system';
import type { System } from '../../../../game/sim/system';

/**
 * The ozone room's plant, as the room runs it: one ozone plant block
 * (`src/game/plant/ozone.ts`) stepped a second at a time as frames pass,
 * worked by the generator's and the monitor's controls and the booster's
 * HAND · OFF · AUTO, and read as what the room's machines show
 * (`OzoneShown`). The faults a commissioning engineer can put on it
 * (the circulation stopped, the cooling water shut, the dryer's heater
 * failed, the cabinet door open, a leaking joint, the destructor failed)
 * are switches here too. Pure.
 */

/** What the ozone plant's machines show. */
export interface OzoneShown {
  /** The generator's mains is on. */
  powered: boolean;
  /** Making ozone. */
  producing: boolean;
  /** Its common alarm, and whether it has tripped (needing RESET). */
  alarm: boolean;
  tripped: boolean;
  /** Its two-line message display. */
  message: readonly [string, string];
  /** Ozone made, g/h, and the output asked for, 0 to 1. */
  output: number;
  setpoint: number;
  /** The dried air's dew point, °C, which tower dries, and the dryer's health. */
  dewPoint: number;
  tower: 0 | 1;
  dryerFault: boolean;
  /** Cooling water through the generator, l/h, and its temperature, °C. */
  coolingFlow: number;
  coolingTemp: number;
  /** The venturi's suction at the generator, bar gauge (negative). */
  vacuum: number;
  /** The booster pump: running, stopped, or faulted (0, 1, 2 for its lamps). */
  booster: 0 | 1 | 2;
  /** Ozone left in the water after the contact tank and after the carbon, mg/l. */
  residualContact: number;
  residualAfter: number;
  /** How far the carbon is spent, 0 to 1. */
  carbonUsed: number;
  /** The circulation's pressure into the deozoniser, bar. */
  pressureIn: number;
  /** The off-gas destructor: heating, its temperature °C, and a fault. */
  destructorOn: boolean;
  destructorTemp: number;
  destructorFault: boolean;
  /** Ozone in the room's air, ppm, and the monitor's warning and alarm. */
  roomPpm: number;
  warning: boolean;
  roomAlarm: boolean;
}

/** The faults the room can put on its plant. */
export interface OzoneFaults {
  circulationStopped: boolean;
  coolingShut: boolean;
  dryerHeater: boolean;
  doorOpen: boolean;
  leak: boolean;
  destructor: boolean;
}

export const NO_FAULTS: OzoneFaults = {
  circulationStopped: false,
  coolingShut: false,
  dryerHeater: false,
  doorOpen: false,
  leak: false,
  destructor: false,
};

/** The circulation, l/h of cooling water, and a leaking joint's gas, g/h. */
const CIRCULATION = 160;
const COOLING = 200;
const COOLING_TEMP = 15;
const LEAK = 2;
/** How long each dryer tower dries before the other takes over, s. */
const TOWER_CYCLE = 60;
/** How long a monitor TEST lights its lamps, s. */
const LAMP_TEST = 3;

/** The booster's selector positions. */
export const HAND = 0;
export const OFF = 1;
export const AUTO = 2;

export interface OzoneRoom {
  /** Run it on by `delta` seconds of the frame. */
  step(delta: number): void;
  shown(): OzoneShown;
  generatorControls: {
    start: () => void;
    stop: () => void;
    reset: () => void;
    mains: (on: boolean) => void;
    setpoint: (share: number) => void;
  };
  booster: (position: number) => void;
  monitorControls: { test: () => void; reset: () => void };
  /** Put a fault on, or take it off. */
  fault(name: keyof OzoneFaults, on: boolean): void;
  readonly system: System;
}

export function ozoneRoom(): OzoneRoom {
  let system = createSystem({ ozone: { kind: OZONE_PLANT } }, {}, {});
  let mains = false;
  let started = false;
  let hoa = AUTO;
  let setpoint = 1;
  let reset = false;
  let faults: OzoneFaults = { ...NO_FAULTS };
  let pending = 0;
  let time = 0;
  let testing = 0;
  const apply = () => {
    const values: Record<string, boolean | number> = {
      flow: faults.circulationStopped ? 0 : CIRCULATION,
      power: mains,
      // HAND runs the booster and generator whatever START says; OFF
      // stops both; AUTO runs them when started.
      run: mains && (hoa === HAND || (hoa === AUTO && started)),
      setpoint: Math.round(setpoint * 100),
      coolingFlow: faults.coolingShut ? 0 : COOLING,
      coolingTemp: COOLING_TEMP,
      dryerFault: faults.dryerHeater,
      door: faults.doorOpen,
      leak: faults.leak ? LEAK : 0,
      destructorFault: faults.destructor,
      reset,
    };
    for (const [name, value] of Object.entries(values))
      system = setInput(system, `ozone.${name}`, value);
  };
  apply();
  const read = (port: string) => output(system, `ozone.${port}`);
  const num = (port: string) => (read(port) as number) ?? 0;
  return {
    get system() {
      return system;
    },
    step(delta) {
      time += delta;
      testing = Math.max(0, testing - delta);
      pending += delta;
      while (pending >= 1) {
        pending -= 1;
        apply();
        system = stepSystem(system, 1);
        // RESET is a press: it lasts one step.
        if (reset) {
          reset = false;
          apply();
        }
      }
    },
    shown() {
      const status = String(read('status') ?? 'off');
      const code = num('code');
      const dose = num('dose');
      const running = read('running') === true;
      const boosterRuns = mains && (hoa === HAND || (hoa === AUTO && started));
      return {
        powered: mains,
        producing: read('lampOzone') === true,
        alarm: read('lampAlarm') === true || testing > 0,
        tripped: read('tripped') === true,
        message: [
          mains ? `OZ-160 ${dose.toFixed(0).padStart(4)} g/h` : '',
          mains
            ? code
              ? `E${code} ${status.replace(/^tripped: /, '').toUpperCase()}`
              : status.toUpperCase()
            : '',
        ],
        output: dose,
        setpoint,
        dewPoint: num('dewPoint'),
        tower: Math.floor(time / TOWER_CYCLE) % 2 === 0 ? 0 : 1,
        dryerFault: faults.dryerHeater && mains,
        coolingFlow: faults.coolingShut ? 0 : COOLING,
        coolingTemp: COOLING_TEMP + (running ? 4 : 0),
        vacuum: num('vacuum') / 1000,
        booster: boosterRuns ? (read('vacuum') !== 0 ? 0 : 2) : 1,
        residualContact: num('residual'),
        residualAfter: num('residualOut'),
        carbonUsed: 1 - num('carbon') / 100,
        pressureIn: faults.circulationStopped ? 0.3 : 1.6,
        destructorOn: mains && !faults.destructor,
        destructorTemp: mains && !faults.destructor ? 130 : 20,
        destructorFault: faults.destructor && mains,
        roomPpm: num('roomOzone'),
        warning: read('roomWarning') === true || testing > 0,
        roomAlarm: read('roomAlarm') === true || testing > 0,
      };
    },
    generatorControls: {
      start: () => {
        started = true;
        apply();
      },
      stop: () => {
        started = false;
        apply();
      },
      reset: () => {
        reset = true;
        apply();
      },
      mains: (on) => {
        mains = on;
        if (!on) started = false;
        apply();
      },
      setpoint: (share) => {
        setpoint = share;
        apply();
      },
    },
    booster: (position) => {
      hoa = position;
      apply();
    },
    monitorControls: {
      test: () => (testing = LAMP_TEST),
      reset: () => {
        reset = true;
        apply();
      },
    },
    fault(name, on) {
      faults = { ...faults, [name]: on };
      apply();
    },
  };
}
