/**
 * The switch room's working logic: a motor starter in the motor control
 * centre, and the emergency lighting central battery. Pure: the views
 * show it and the parts drive it.
 *
 * Some things are taken as given and not modelled: the incoming supply is
 * a steady 400 V three-phase (the owner's rule), so the central battery's
 * mains never fails of itself, only when a test takes it off.
 */

// ---- Motor starters ----------------------------------------------------------

/** HAND runs on the door's START and STOP; AUTO on the plant's demand. */
export type StarterMode = 'hand' | 'off' | 'auto';

export interface Starter {
  kind: 'dol' | 'vsd';
  /** In HAND, started and not since stopped. */
  latched: boolean;
  running: boolean;
  tripped: boolean;
  /** The motor's current as a fraction of its full-load current. */
  current: number;
  /** Seconds since it last started. */
  since: number;
}

export interface StarterInputs {
  /** The door's isolator. */
  isolatorOn: boolean;
  mode: StarterMode;
  /** The panel's emergency stop, struck in. */
  stopped?: boolean;
  /** What the plant's controls want, in AUTO. */
  demand: boolean;
  /** The load it drives, as a fraction of full load. */
  load?: number;
}

export const newStarter = (kind: Starter['kind']): Starter => ({
  kind,
  latched: false,
  running: false,
  tripped: false,
  current: 0,
  since: 0,
});

/** A press of one of the door's buttons. */
export function pressStarter(
  s: Starter,
  key: 'start' | 'stop' | 'reset',
): Starter {
  if (key === 'start') return { ...s, latched: true };
  if (key === 'stop') return { ...s, latched: false };
  // A trip resets only with the motor at rest.
  return s.running ? s : { ...s, tripped: false };
}

/** The overload relay or drive fault trips it, as a fault would. */
export const tripStarter = (s: Starter): Starter => ({
  ...s,
  tripped: true,
  latched: false,
});

/**
 * `dt` seconds on. A direct-on-line motor draws six times its full-load
 * current for its first second or so; a drive ramps its motor up over
 * ten seconds, never drawing more than full load.
 */
export function stepStarter(
  s: Starter,
  input: StarterInputs,
  dt: number,
): Starter {
  const permitted = input.isolatorOn && !input.stopped && !s.tripped;
  const wanted =
    input.mode === 'hand'
      ? s.latched
      : input.mode === 'auto'
        ? input.demand
        : false;
  const running = permitted && wanted;
  // Turned to OFF or isolated, HAND forgets its START.
  const latched = permitted && input.mode === 'hand' ? s.latched : false;
  const since = running ? (s.running ? s.since + dt : 0) : 0;
  const load = input.load ?? 0.8;
  const target = !running
    ? 0
    : s.kind === 'dol'
      ? since < 1
        ? 6 - 5 * since
        : load
      : load * Math.min(1, since / 10);
  // The meter's needle follows, damped.
  const current =
    s.kind === 'dol' && running && since < 1
      ? target
      : s.current + (target - s.current) * Math.min(1, dt * 3);
  return { ...s, latched, running, since, current };
}

// ---- The emergency lighting central battery ----------------------------------

/** A test under BS 5266-1: a short monthly function test, a yearly duration test. */
export type BatteryTest = 'function' | 'duration';

export interface CentralBattery {
  /** State of charge, 0 to 1. */
  charge: number;
  test: { kind: BatteryTest; left: number } | null;
  /** How the last test ended. */
  last: 'passed' | 'failed' | null;
  /** Circuits and how many answer as healthy. */
  circuits: number;
  healthy: number;
}

/** How long each test runs, s: a minute, and the system's rated three hours. */
export const TEST_LENGTH: Record<BatteryTest, number> = {
  function: 60,
  duration: 3 * 3600,
};
/** At full load a full battery lasts its rating (EN 50171): three hours. */
const DISCHARGE = 1 / (3 * 3600);
/** And it recharges to 80 % within 12 h. */
const RECHARGE = 0.8 / (12 * 3600);
/** Below this the battery is low; at zero the inverter cuts out. */
export const LOW = 0.2;

export const newCentralBattery = (): CentralBattery => ({
  charge: 1,
  test: null,
  last: null,
  circuits: 12,
  healthy: 12,
});

/** A press of a test key: starts that test, or ends one running early. */
export function pressTest(
  b: CentralBattery,
  kind: BatteryTest,
): CentralBattery {
  if (b.test) return { ...b, test: null };
  return { ...b, test: { kind, left: TEST_LENGTH[kind] } };
}

export function stepCentralBattery(
  b: CentralBattery,
  dt: number,
): CentralBattery {
  if (!b.test) return { ...b, charge: Math.min(1, b.charge + RECHARGE * dt) };
  const charge = Math.max(0, b.charge - DISCHARGE * dt);
  const left = b.test.left - dt;
  if (charge <= 0) return { ...b, charge, test: null, last: 'failed' };
  if (left <= 0) return { ...b, charge, test: null, last: 'passed' };
  return { ...b, charge, test: { ...b.test, left } };
}

/** The cabinet's status lamps. */
export function batteryLamps(b: CentralBattery) {
  return {
    mains: !b.test,
    charging: !b.test && b.charge < 0.999,
    fault: b.last === 'failed' || b.healthy < b.circuits,
    low: b.charge < LOW,
  };
}

/** The battery's voltage: 18 blocks of 12 V, floating at 13.65 V a block. */
export function batteryVolts(b: CentralBattery) {
  if (b.test) return 18 * (10.5 + 2.2 * b.charge);
  return 18 * (b.charge >= 0.999 ? 13.65 : 13.2 + 0.6 * b.charge);
}

const pad = (text: string) => text.padEnd(20).slice(0, 20);
const clock = (s: number) => {
  const t = Math.max(0, Math.ceil(s));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = t % 60;
  return h
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`;
};

/** Its 20 × 4 display, as the controller writes it. */
export function batteryDisplay(b: CentralBattery): string[] {
  const percent = `${Math.round(b.charge * 100)}%`.padStart(4);
  const volts = `${Math.round(batteryVolts(b))}V DC`;
  const first = b.test
    ? `${b.test.kind === 'function' ? 'FUNCTION' : 'DURATION'} TEST ${clock(b.test.left)}`
    : `MAINS OK    ${volts}`;
  const state = b.test ? 'DISCHARGE' : b.charge < 0.999 ? 'CHARGING' : 'FLOAT';
  const circuits = `CIRCUITS ${b.healthy}/${b.circuits} ${b.healthy === b.circuits ? 'OK' : 'FAULT'}`;
  const last = b.test
    ? `ON BATTERY  ${volts}`
    : b.last === 'passed'
      ? 'LAST TEST PASSED'
      : b.last === 'failed'
        ? 'LAST TEST FAILED'
        : 'NO TEST RECORDED';
  return [first, `BATT ${percent}  ${state}`, circuits, last].map(pad);
}
