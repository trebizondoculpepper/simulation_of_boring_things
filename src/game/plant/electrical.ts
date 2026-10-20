import type { BlockKind } from '../sim/block-kind';
import { compose } from '../sim/composite';

/**
 * The plant's electrics, as blocks, and a motor control centre (MCC) as
 * one block made of them (`sim/composite.ts`). Pure. Units: current A,
 * time s.
 *
 * A motor started direct on line draws several times its full-load
 * current for the few seconds it takes to run up, then its full-load
 * current while it runs. An MCC's motors' currents add up on its supply;
 * the incomer's breaker carries them all. The breaker trips by its
 * thermal element on a sustained overload, sooner the greater the
 * overload (an inverse-time curve), or at once by its magnetic element on
 * a short circuit. Tripped, it cuts the supply until reset, and refuses
 * reset until its element has cooled. So starting everything at once can
 * trip an incomer that runs it all happily: a fault of the cluster, not of
 * any one motor.
 */

// ---- A motor and its starter ------------------------------------------------

export interface MotorParams {
  /** Full-load current, A; starting current as a multiple of it; run-up time, s. */
  flc: number;
  inrush: number;
  start: number;
}

export interface MotorState {
  phase: 'stopped' | 'starting' | 'running';
  timer: number;
}

/** A motor started direct on line: runs while its starter is on and it has supply. */
export const MOTOR: BlockKind<MotorParams, MotorState> = {
  kind: 'motor',
  inputs: [{ name: 'supply' }, { name: 'run' }],
  outputs: [{ name: 'current', unit: 'A' }, { name: 'running' }],
  params: { flc: 30, inrush: 6, start: 3 },
  init: () => ({ phase: 'stopped', timer: 0 }),
  step(p, s, i, dt, t) {
    const on = i.supply === true && i.run === true;
    if (!on)
      return {
        state: { phase: 'stopped', timer: 0 },
        outputs: { current: 0, running: false },
        sleep: { until: Infinity, hold: { supply: 0, run: 0 } },
      };
    if (s.phase === 'running')
      return {
        state: s,
        outputs: { current: p.flc, running: true },
        sleep: { until: Infinity, hold: { supply: 0, run: 0 } },
      };
    const timer = s.phase === 'starting' ? s.timer + dt : 0;
    if (timer >= p.start)
      return {
        state: { phase: 'running', timer: 0 },
        outputs: { current: p.flc, running: true },
      };
    return {
      state: { phase: 'starting', timer },
      outputs: { current: p.flc * p.inrush, running: false },
      // Asleep through its run-up, unless its supply or starter goes.
      sleep: { until: t + (p.start - timer), hold: { supply: 0, run: 0 } },
    };
  },
};

/** Currents added: what a busbar carries. */
export const SUM: BlockKind<object, null> = {
  kind: 'sum',
  inputs: ['a', 'b', 'c', 'd'].map((name) => ({ name, unit: 'A' })),
  outputs: [{ name: 'total', unit: 'A' }],
  params: {},
  init: () => null,
  read: (_p, _s, i) => ({
    total: ['a', 'b', 'c', 'd'].reduce(
      (n, k) => n + ((i[k] as number) ?? 0),
      0,
    ),
  }),
  step(_p, s, i) {
    return {
      state: s,
      outputs: SUM.read!({}, s, i, 0),
      sleep: { until: Infinity, hold: {} },
    };
  },
};

// ---- The incomer's breaker --------------------------------------------------

export interface BreakerParams {
  /** Its rated current, A. */
  rating: number;
  /** Its thermal curve: trips after k / ((I/In)² − 1) seconds over its rating. */
  k: number;
  /** Its magnetic element: trips at once at this multiple of its rating. */
  instant: number;
  /** How long its element takes to cool from tripping, s. */
  cool: number;
}

export interface BreakerState {
  /** How far its thermal element has gone toward tripping, 0 to 1. */
  heat: number;
  tripped: boolean;
}

/** A circuit breaker, after the moulded-case breakers of an LV incomer. */
export const BREAKER: BlockKind<BreakerParams, BreakerState> = {
  kind: 'breaker',
  inputs: [{ name: 'load', unit: 'A' }, { name: 'reset' }],
  outputs: [
    { name: 'live' },
    { name: 'tripped' },
    { name: 'heat', about: 'thermal element, 0 to 1' },
  ],
  params: { rating: 80, k: 60, instant: 10, cool: 120 },
  init: () => ({ heat: 0, tripped: false }),
  step(p, s, i, dt, t) {
    const load = (i.load as number) ?? 0;
    const ratio = load / p.rating;
    let heat = s.heat;
    let tripped = s.tripped;
    if (tripped) {
      heat = Math.max(0, heat - dt / p.cool);
      // Reset only once its element has cooled enough.
      if (i.reset === true && heat < 0.3) tripped = false;
    } else if (ratio >= p.instant) {
      tripped = true;
      heat = 1;
    } else if (ratio > 1) {
      heat += dt / (p.k / (ratio * ratio - 1));
      if (heat >= 1) {
        tripped = true;
        heat = 1;
      }
    } else heat = Math.max(0, heat - dt / p.cool);
    const outputs = { live: !tripped, tripped, heat };
    // Asleep while cool and within its rating, or tripped and cooling
    // (until it has cooled enough to reset).
    const sleep =
      !tripped && heat === 0
        ? {
            until: Infinity,
            hold: { reset: 0 },
            within: { load: [-Infinity, p.rating] as const },
          }
        : tripped
          ? {
              until: heat > 0.3 ? t + (heat - 0.3) * p.cool : Infinity,
              hold: { reset: 0 },
            }
          : undefined;
    return { state: { heat, tripped }, outputs, sleep };
  },
};

// ---- A motor control centre, as one block ------------------------------------

/**
 * The plant MCC: two pump motors (30 A each) and two boiler-house fans
 * (5 A each), their currents added on its busbar. Outside it is one block:
 * a supply in, a starter command for each pump and one for the fans; out,
 * its total current and whether each pump's motor is running.
 */
export const MCC = compose({
  kind: 'motor-control-centre',
  blocks: {
    p1: { kind: MOTOR },
    p2: { kind: MOTOR },
    f1: { kind: MOTOR, params: { flc: 5, inrush: 6, start: 2 } },
    f2: { kind: MOTOR, params: { flc: 5, inrush: 6, start: 2 } },
    bus: { kind: SUM },
  },
  wires: {
    'bus.a': 'p1.current',
    'bus.b': 'p2.current',
    'bus.c': 'f1.current',
    'bus.d': 'f2.current',
  },
  inputs: {
    supply: ['p1.supply', 'p2.supply', 'f1.supply', 'f2.supply'],
    runP1: ['p1.run'],
    runP2: ['p2.run'],
    fans: ['f1.run', 'f2.run'],
  },
  outputs: { current: 'bus.total', p1: 'p1.running', p2: 'p2.running' },
});

// ---- An RCD and the circuit it protects --------------------------------------

export interface RcdParams {
  /** Its rated residual current, mA (30 mA for personal protection). */
  ratedResidual: number;
  /**
   * How long a residual takes to trip it, s: at its rating, and at five
   * times it. BS EN 61008 allows at most 300 ms and 40 ms; real devices are
   * quicker, and these are typical.
   */
  tripAtRated: number;
  tripAtFive: number;
  /** The residual its TEST button puts through it, mA. */
  testResidual: number;
}

export interface RcdState {
  closed: boolean;
  /** Seconds the residual has been at or over its rating. */
  timer: number;
}

/**
 * A residual current device: it compares the current going out with the
 * current coming back; the difference (the residual, leaking to earth
 * through a fault, or through a person) trips it once it has lasted its
 * trip time, sooner the larger it is. Below half its rating it never trips.
 * Tripped, it breaks the circuit until reset by hand, and a reset onto a
 * fault that is still there trips it again. Its TEST button puts a known
 * residual through it, as the label says to press quarterly.
 */
export const RCD: BlockKind<RcdParams, RcdState> = {
  kind: 'rcd',
  inputs: [
    { name: 'line', about: 'supply arriving' },
    {
      name: 'residual',
      unit: 'mA',
      about: 'current leaking to earth beyond it',
    },
    { name: 'test', about: 'its TEST button' },
    { name: 'reset', about: 'its toggle, put back up' },
  ],
  outputs: [{ name: 'live' }, { name: 'tripped' }],
  params: {
    ratedResidual: 30,
    tripAtRated: 0.2,
    tripAtFive: 0.025,
    testResidual: 45,
  },
  init: () => ({ closed: true, timer: 0 }),
  step(p, s, i, dt) {
    let closed = s.closed || i.reset === true;
    const residual =
      ((i.residual as number) ?? 0) + (i.test === true ? p.testResidual : 0);
    let timer = 0;
    if (closed && residual >= p.ratedResidual) {
      timer = s.timer + dt;
      const limit =
        residual >= 5 * p.ratedResidual ? p.tripAtFive : p.tripAtRated;
      if (timer >= limit) {
        closed = false;
        timer = 0;
      }
    }
    const live = closed && i.line !== false;
    return {
      state: { closed, timer },
      outputs: { live, tripped: !closed },
      sleep:
        timer === 0
          ? {
              until: Infinity,
              hold: { line: 0, test: 0, reset: 0 },
              within: { residual: [-Infinity, p.ratedResidual] },
            }
          : undefined,
    };
  },
};

/**
 * A heater on a circuit: it draws its current while it has supply, and
 * leaks `fault` mA to earth through a fault (a damaged element, water in
 * a connector) when energised.
 */
export const HEATER: BlockKind<{ current: number }, null> = {
  kind: 'heater',
  inputs: [{ name: 'supply' }, { name: 'fault', unit: 'mA' }],
  outputs: [
    { name: 'current', unit: 'A' },
    { name: 'leakage', unit: 'mA' },
  ],
  params: { current: 10 },
  init: () => null,
  read: (p, _s, i) => {
    const on = i.supply === true;
    return {
      current: on ? p.current : 0,
      leakage: on ? ((i.fault as number) ?? 0) : 0,
    };
  },
  step(p, s, i) {
    return {
      state: s,
      outputs: HEATER.read!(p, s, i, 0),
      sleep: { until: Infinity, hold: { supply: 0, fault: 0 } },
    };
  },
};
