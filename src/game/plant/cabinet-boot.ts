/**
 * A packaged spa cabinet's controller starting and stopping (the owner,
 * 2026-10-25): its little microprocessor, and the servo valves inside it.
 * The jacuzzi's and the foot spa's are the same board. Pure; seconds.
 *
 * Its supply lost or its POWER off, it stops at once: the pump with it, and
 * its servo valves, spring-return, swing back shut. Powered again, it
 * boots (BOOTING), checks its inputs (SELF TEST), then opens its servo
 * valves one after another (STARTING), never all at once, and only with
 * every one open does it let the pump run (RUNNING), with one short beep.
 * A fault it sees (its pump's NO FLOW trip, its tank at low-low) stops it
 * (FAULT) with three; when the fault clears, it checks its inputs again
 * and starts up as before.
 */

/** Its phases, in the order it passes through them. */
export type BootPhase =
  | 'off'
  | 'booting'
  | 'checking'
  | 'starting'
  | 'running'
  | 'fault';

/** Its servo valves, in the order it opens them: suction, return, the filter to service, the heat exchanger's primary. */
export const CABINET_SERVOS = ['suction', 'return', 'filter', 'heat'] as const;
export type CabinetServo = (typeof CABINET_SERVOS)[number];

export const BOOT = {
  /** Its microprocessor's boot, s. */
  boot: 3,
  /** Its check of its inputs, s. */
  check: 3,
  /** Between one servo's opening and the next's, s. */
  stagger: 1.5,
  /** A servo's travel, shut to open, s: a small, fast geared motor. */
  travel: 1,
  /** A servo springing back shut with its power gone, s. */
  spring: 0.6,
} as const;

export interface CabinetBoot {
  phase: BootPhase;
  /** Seconds in this phase. */
  time: number;
  /** Each servo's travel, 0 shut to 1 open. */
  valves: Record<CabinetServo, number>;
}

const valvesAt = (v: number) =>
  Object.fromEntries(CABINET_SERVOS.map((s) => [s, v])) as Record<
    CabinetServo,
    number
  >;

/** In service: running, every servo open (a new game's). */
export const runningCabinet = (): CabinetBoot => ({
  phase: 'running',
  time: 0,
  valves: valvesAt(1),
});

/** Switched off, every servo shut. */
export const offCabinet = (): CabinetBoot => ({
  phase: 'off',
  time: 0,
  valves: valvesAt(0),
});

export interface CabinetBootInputs {
  /** Its supply on and its POWER switch on. */
  powered: boolean;
  /** A fault its inputs show now ('' none): a trip, a low tank. */
  fault: string;
}

/** Whether it lets its pump run: running, every servo open. */
export const cabinetReady = (b: CabinetBoot) => b.phase === 'running';

/**
 * Whether it commands its `turn`th servo open (from 0): running, or
 * starting and that servo's turn come; never while booting or in its self
 * test (the owner, 2026-10-25). The cabinet's motorised valves outside it
 * take their turns by this too.
 */
export const servoCommanded = (b: CabinetBoot, turn: number) =>
  b.phase === 'running' ||
  (b.phase === 'starting' && b.time >= turn * BOOT.stagger);

/** Each servo, as far as its phase commands it: opened in turn while it starts. */
function commanded(b: CabinetBoot): Record<CabinetServo, boolean> {
  return Object.fromEntries(
    CABINET_SERVOS.map((s, i) => [s, servoCommanded(b, i)]),
  ) as Record<CabinetServo, boolean>;
}

/** It `dt` seconds on. */
export function stepCabinetBoot(
  b: CabinetBoot,
  i: CabinetBootInputs,
  dt: number,
): CabinetBoot {
  if (!(dt > 0)) return b;
  // Unpowered: off at once, its servos springing shut.
  if (!i.powered) {
    const shut = BOOT.spring > 0 ? dt / BOOT.spring : 1;
    return {
      phase: 'off',
      time: b.phase === 'off' ? b.time + dt : 0,
      valves: Object.fromEntries(
        CABINET_SERVOS.map((s) => [s, Math.max(0, b.valves[s] - shut)]),
      ) as Record<CabinetServo, number>,
    };
  }
  let { phase, time } = b;
  time += dt;
  const go = (next: BootPhase) => {
    phase = next;
    time = 0;
  };
  if (phase === 'off') go('booting');
  else if (phase === 'booting' && time >= BOOT.boot) go('checking');
  else if (phase === 'checking' && time >= BOOT.check)
    go(i.fault ? 'fault' : 'starting');
  else if ((phase === 'starting' || phase === 'running') && i.fault)
    go('fault');
  else if (phase === 'fault' && !i.fault) go('checking');
  // Its servos toward where it commands them: open in turn, or shut.
  const want = commanded({ ...b, phase, time });
  const step = dt / BOOT.travel;
  const valves = Object.fromEntries(
    CABINET_SERVOS.map((s) => [
      s,
      want[s]
        ? Math.min(1, b.valves[s] + step)
        : // A fault or a fresh start: driven shut, as slowly as they open.
          Math.max(0, b.valves[s] - step),
    ]),
  ) as Record<CabinetServo, number>;
  if (phase === 'starting' && CABINET_SERVOS.every((s) => valves[s] >= 1))
    go('running');
  return { phase, time, valves };
}

/** Whether any of its servos is moving now. */
export const servosMoving = (before: CabinetBoot, after: CabinetBoot) =>
  CABINET_SERVOS.some((s) => before.valves[s] !== after.valves[s]);

/** The beep a change of phase gives: one when it comes online, three for a fault. */
export function bootBeep(
  before: BootPhase,
  after: BootPhase,
): 'online' | 'fault' | null {
  if (before === after) return null;
  if (after === 'running') return 'online';
  if (after === 'fault') return 'fault';
  return null;
}

/** Its display's second line while it is not running, or null once it is. */
export function bootLine(b: CabinetBoot, fault = ''): string | null {
  switch (b.phase) {
    case 'off':
      return null;
    case 'booting':
      return 'BOOTING...';
    case 'checking':
      return 'SELF TEST';
    case 'starting': {
      const open = CABINET_SERVOS.filter((s) => b.valves[s] >= 1).length;
      return `STARTING ${open}/${CABINET_SERVOS.length}`;
    }
    case 'fault':
      return `FAULT ${fault || 'CHECK'}`.slice(0, 16);
    default:
      return null;
  }
}
