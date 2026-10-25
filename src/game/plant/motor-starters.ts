import type { IsolatorName } from './services';
import type { PoolId } from './pools';

/**
 * The motors' starters, in the world: each motor started, stopped and
 * reset from a panel in its own plant room (044; the owner chose
 * distributed motor control, 2026-10-24). Pure.
 *
 * A starter has a HAND · OFF · AUTO selector: HAND runs it, OFF stops it,
 * AUTO leaves it to the plant's controls, unless START or STOP has been
 * given there (the selector turned clears it). It runs only with its
 * room's power and its local isolator on, its panel's emergency stop out,
 * and not tripped. Its trip, its motor's thermistors after a minute's
 * running with nothing flowing (its valves shut against it), latches until
 * RESET, which clears it only with the motor at rest. (Its pool's tank's
 * low-low level holds it off, as its room's power does, and lets it run
 * again once the tank has recovered: an interlock, not a trip.) A pool's
 * pumps are duty and standby: the duty pump runs in AUTO; the standby in
 * AUTO whenever the duty is not running.
 */

export type StarterMode = 'hand' | 'off' | 'auto';

/** Each motor with a starter in the world: its pool, its role, its local isolator, its drive and its full-load current, A. */
export const MOTORS = {
  'P-101A': {
    pool: 'pool_02',
    role: 'duty',
    isolator: 'P-101A isolator',
    kind: 'vsd',
    fla: 80,
  },
  'P-101B': {
    pool: 'pool_02',
    role: 'standby',
    isolator: 'P-101B isolator',
    kind: 'vsd',
    fla: 80,
  },
  'P-201A': {
    pool: 'pool_01',
    role: 'duty',
    isolator: 'P-201A isolator',
    kind: 'dol',
    fla: 14,
  },
  'P-201B': {
    pool: 'pool_01',
    role: 'standby',
    isolator: 'P-201B isolator',
    kind: 'dol',
    fla: 14,
  },
} as const satisfies Record<
  string,
  {
    pool: PoolId;
    role: 'duty' | 'standby';
    isolator: IsolatorName;
    kind: 'dol' | 'vsd';
    fla: number;
  }
>;
export type MotorTag = keyof typeof MOTORS;
export const MOTOR_TAGS = Object.keys(MOTORS) as MotorTag[];

/** The pools whose pumps have starters, and each pool's pumps, duty first. */
export const STARTED_POOLS = ['pool_01', 'pool_02'] as const;
export type StartedPool = (typeof STARTED_POOLS)[number];
export const POOL_MOTORS = (pool: PoolId): MotorTag[] =>
  MOTOR_TAGS.filter((t) => MOTORS[t].pool === pool).sort((a, b) =>
    MOTORS[a].role === 'duty' ? -1 : MOTORS[b].role === 'duty' ? 1 : 0,
  );

export interface MotorStarter {
  mode: StarterMode;
  /** START (true) or STOP (false) given in AUTO, or none. */
  command: boolean | null;
  running: boolean;
  tripped: boolean;
  /** Its current, A, the meter's needle damped. */
  current: number;
  /** Seconds since it last started. */
  since: number;
  /** Seconds it has run with nothing flowing. */
  starved: number;
}

export interface MotorsState {
  starters: Record<MotorTag, MotorStarter>;
  /** Each panel's emergency stop, struck in. */
  stopped: Record<StartedPool, boolean>;
}

/** As found: every starter in AUTO, the duty pumps running at full load. */
export function newMotors(): MotorsState {
  return {
    starters: Object.fromEntries(
      MOTOR_TAGS.map((t) => {
        const duty = MOTORS[t].role === 'duty';
        return [
          t,
          {
            mode: 'auto',
            command: null,
            running: duty,
            tripped: false,
            current: duty ? 0.8 * MOTORS[t].fla : 0,
            since: duty ? 3600 : 0,
            starved: 0,
          },
        ];
      }),
    ) as Record<MotorTag, MotorStarter>,
    stopped: { pool_01: false, pool_02: false },
  };
}

/** What a starter needs to know from the world. */
export interface StarterWorld {
  /** Its room's power and its local isolator. */
  permitted: (tag: MotorTag) => boolean;
  /** Whether its pool's controls want circulation (always, for a pool). */
  demand: (pool: PoolId) => boolean;
  /**
   * Whether this motor's pump has somewhere to pump, as the step begins:
   * its pool's water moving, through its own discharge (a pump whose
   * discharge valve is shut is starved, whatever its partner does).
   */
  flowing: (pool: PoolId, tag: MotorTag) => boolean;
}

/** How long a pump runs with nothing flowing before its thermistors trip it, seconds. */
export const STARVED_TRIP = 60;

function step(
  s: MotorStarter,
  tag: MotorTag,
  wants: boolean,
  permitted: boolean,
  flowing: boolean,
  dt: number,
): MotorStarter {
  const m = MOTORS[tag];
  // Run on long enough against shut valves, its windings overheat.
  const starved = s.running && !flowing ? s.starved + dt : 0;
  const tripped = s.tripped || starved >= STARVED_TRIP;
  const running = permitted && !tripped && wants;
  const since = running ? (s.running ? s.since + dt : 0) : 0;
  // A direct-on-line motor draws six times its full-load current for its
  // first second; a drive ramps its motor up over ten seconds.
  const load = 0.8;
  const target = !running
    ? 0
    : m.kind === 'dol'
      ? since < 1
        ? 6 - 5 * since
        : load
      : load * Math.min(1, since / 10);
  const current =
    s.current + (target * m.fla - s.current) * Math.min(1, dt / 0.4);
  return {
    ...s,
    running,
    tripped,
    since,
    current,
    starved: running ? starved : 0,
  };
}

/** Every starter `dt` seconds on: the duty pump first, the standby taking over when it is not running. */
export function stepMotors(
  m: MotorsState,
  w: StarterWorld,
  dt: number,
): MotorsState {
  const starters = { ...m.starters };
  for (const pool of STARTED_POOLS) {
    let dutyRunning = false;
    for (const tag of POOL_MOTORS(pool)) {
      const s = starters[tag];
      const demand =
        w.demand(pool) && (MOTORS[tag].role === 'duty' || !dutyRunning);
      const wants =
        s.mode === 'hand'
          ? true
          : s.mode === 'auto'
            ? (s.command ?? demand)
            : false;
      const next = step(
        s,
        tag,
        wants,
        w.permitted(tag) && !m.stopped[pool],
        w.flowing(pool, tag),
        dt,
      );
      starters[tag] = next;
      if (MOTORS[tag].role === 'duty') dutyRunning = next.running;
    }
  }
  return { ...m, starters };
}

/** Whether any of a pool's pumps runs: undefined for a pool without starters. */
export function poolPumping(m: MotorsState, pool: PoolId): boolean | undefined {
  const tags = POOL_MOTORS(pool);
  return tags.length ? tags.some((t) => m.starters[t].running) : undefined;
}

/** What a panel does to a starter: its selector, START, STOP, RESET. */
export type StarterAction =
  | { act: 'mode'; mode: StarterMode }
  | { act: 'start' }
  | { act: 'stop' }
  | { act: 'reset' };

export function actOnStarter(
  m: MotorsState,
  tag: MotorTag,
  a: StarterAction,
): MotorsState {
  const s = m.starters[tag];
  if (!s) return m;
  const next: MotorStarter =
    a.act === 'mode'
      ? s.mode === a.mode
        ? s
        : { ...s, mode: a.mode, command: null }
      : a.act === 'reset'
        ? s.running
          ? s
          : { ...s, tripped: false }
        : // START and STOP count in AUTO only: HAND runs and OFF stops regardless.
          s.mode === 'auto'
          ? { ...s, command: a.act === 'start' }
          : s;
  return next === s ? m : { ...m, starters: { ...m.starters, [tag]: next } };
}
