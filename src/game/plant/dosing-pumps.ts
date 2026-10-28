import {
  idealPump,
  keyedDiaphragmPump,
  motorPump,
  peristalticPump,
} from '../../toolkit/components/plant/logic/metering-pump';
import type {
  KeyedDiaphragmState,
  MeteringKind,
  MeteringPump,
  PeristalticState,
} from '../../toolkit/components/plant/logic/metering-pump';
import type { MotorPumpState } from '../../toolkit/components/plant/logic/motor-dosing-pump';
import { admitGas } from '../../toolkit/components/plant/logic/motor-dosing-pump';
import { POOL_IDS } from './pools';
import type { PoolId } from './pools';
import type { Chemical } from './chemicals';

/**
 * Each pool's dosing pumps as the world has them (prompt 102, linked to
 * mission 101's chemistry): each a real metering pump of the family
 * (`metering-pump.ts`), its state in the world, so what it delivers (not
 * its controller's ask × its most) goes into the day tank's draw and the
 * water. Pure.
 *
 * - The lounge's and the Olympic's hypochlorite: the DMX 1602 the rooms
 *   draw (`solenoid`), 2.1 l/h. The Olympic's is undersized (the owner,
 *   2026-10-28: kept, to watch it fail). Its board's duty pump is the one
 *   modelled; the standby stands as its board draws it.
 * - Their acid: the DDS 7.5-16 (`stepper`), 7.5 l/h.
 * - The spa cabinets' heads stay ideal at their sizes until their pumps are
 *   chosen (mission 101, question 8).
 *
 * Each is stepped with the world: released while its pool may be dosed
 * with its chemical (`dosedByPool`), asked its controller's output, against
 * its injection point's 2 bar. A pump that has stopped (a gas-locked DMX's
 * flow trip) doses nothing until acknowledged at its keys
 * (`dosing-pump/act`). What it delivers is averaged for the displays that
 * show a flow (`meanLh`); its board shows what it is set to and its fault.
 */

/** Each pool's pumps' kinds. */
export const POOL_PUMP_KINDS: Record<PoolId, Record<Chemical, MeteringKind>> = {
  pool_01: { hypochlorite: 'solenoid', acid: 'stepper' },
  pool_02: { hypochlorite: 'solenoid', acid: 'stepper' },
  pool_03: { hypochlorite: 'ideal', acid: 'ideal' },
  pool_04: { hypochlorite: 'ideal', acid: 'ideal' },
};

/** The spa heads' ideal sizes, l/h (mission 101's `DOSING_PUMPS`, kept). */
export const IDEAL_PUMPS: Partial<Record<PoolId, Record<Chemical, number>>> = {
  pool_03: { hypochlorite: 0.5, acid: 0.5 },
  pool_04: { hypochlorite: 0.1, acid: 0.1 },
};

/** The back pressure at each injection point, bar (the game's). */
export const INJECTION_BAR = 2;
/** The time over which a pump's delivery is averaged for its displays, s. */
const MEAN_SECONDS = 20;

export type PumpState =
  | null
  | KeyedDiaphragmState
  | PeristalticState
  | MotorPumpState;

export interface DosingPump {
  kind: MeteringKind;
  state: PumpState;
  /** Whether it ran last step, the rate it is set to, l/h, and its error relay. */
  running: boolean;
  setLh: number;
  fault: string | null;
  /** What it has delivered, l/h, averaged over about 20 s; and in all, litres. */
  meanLh: number;
  deliveredL: number;
}

export type DosingPumps = Record<PoolId, Record<Chemical, DosingPump>>;

/** A pump's model, by its pool and chemical. */
const MODELS = new Map<string, MeteringPump<PumpState>>();
export function pumpModel(id: PoolId, c: Chemical): MeteringPump<PumpState> {
  const cached = MODELS.get(`${id}.${c}`);
  if (cached) return cached;
  const kind = POOL_PUMP_KINDS[id][c];
  const model =
    kind === 'ideal'
      ? idealPump(IDEAL_PUMPS[id]?.[c] ?? 0)
      : kind === 'peristaltic'
        ? peristalticPump
        : kind === 'motor'
          ? motorPump
          : keyedDiaphragmPump(kind);
  const made = model as unknown as MeteringPump<PumpState>;
  MODELS.set(`${id}.${c}`, made);
  return made;
}

/** The most a pool's pump can give, l/h. */
export const pumpMost = (id: PoolId, c: Chemical) => pumpModel(id, c).maxLh;

const newPump = (id: PoolId, c: Chemical): DosingPump => ({
  kind: POOL_PUMP_KINDS[id][c],
  state: pumpModel(id, c).initial(),
  running: false,
  setLh: 0,
  fault: null,
  meanLh: 0,
  deliveredL: 0,
});

/** Every pool's pumps, new and primed. */
export function newDosingPumps(): DosingPumps {
  return Object.fromEntries(
    POOL_IDS.map((id) => [
      id,
      { hypochlorite: newPump(id, 'hypochlorite'), acid: newPump(id, 'acid') },
    ]),
  ) as DosingPumps;
}

/** What a step asks of a pool's pumps: its controller's outputs, and whether each may dose. */
export interface PumpDemand {
  hypochlorite: number;
  acid: number;
}

/**
 * Every pool's pumps `dt` seconds on: each asked its controller's output
 * while its pool may be dosed with its chemical (`allowed`: `dosedByPool`'s
 * volume for it), what each delivered as l/h over the step (`rates`, the
 * day tanks' draw and the water's dose).
 */
export function stepDosingPumps(
  pumps: DosingPumps,
  demand: Record<PoolId, PumpDemand>,
  allowed: Partial<Record<PoolId, Record<Chemical, number>>>,
  dt: number,
): { pumps: DosingPumps; rates: Record<PoolId, Record<Chemical, number>> } {
  const next = {} as DosingPumps;
  const rates = {} as Record<PoolId, Record<Chemical, number>>;
  const mean = dt > 0 ? 1 - Math.exp(-dt / MEAN_SECONDS) : 0;
  for (const id of POOL_IDS) {
    next[id] = { ...pumps[id] };
    rates[id] = { hypochlorite: 0, acid: 0 };
    for (const c of ['hypochlorite', 'acid'] as const) {
      const pump = pumps[id]?.[c] ?? newPump(id, c);
      const model = pumpModel(id, c);
      const r = model.step(
        pump.state,
        {
          powered: true,
          release: (allowed[id]?.[c] ?? 0) > 0,
          demand: Math.max(0, Math.min(1, demand[id]?.[c] ?? 0)),
          level: 'ok',
          dischargeBar: INJECTION_BAR,
        },
        dt,
      );
      const lh = dt > 0 ? (r.deliveredL / dt) * 3600 : 0;
      rates[id][c] = lh;
      next[id][c] = {
        kind: pump.kind,
        state: r.state,
        running: r.running,
        setLh: r.setLh,
        fault: r.fault,
        meanLh: pump.meanLh + (lh - pump.meanLh) * mean,
        deliveredL: pump.deliveredL + r.deliveredL,
      };
    }
  }
  return { pumps: next, rates };
}

/** What can be done to a pool's pump: its fault acknowledged; gas let into its head (a scenario's). */
export type DosingPumpAction =
  | { act: 'acknowledge'; pool: PoolId; chemical: Chemical }
  /** Its bleed (priming, deaeration) valve opened or shut. */
  | { act: 'bleed'; pool: PoolId; chemical: Chemical; open: boolean }
  | { act: 'gas'; pool: PoolId; chemical: Chemical; ml: number };

export function actOnDosingPumps(
  pumps: DosingPumps,
  a: DosingPumpAction,
): DosingPumps {
  const pump = pumps[a.pool]?.[a.chemical];
  if (!pump) return pumps;
  const model = pumpModel(a.pool, a.chemical);
  let state = pump.state;
  if (a.act === 'acknowledge') state = model.acknowledge(state);
  else if (a.act === 'bleed') {
    if (pump.kind === 'motor')
      state = { ...(state as MotorPumpState), bleedOpen: a.open };
    else if (pump.kind === 'solenoid' || pump.kind === 'stepper') {
      const s = state as KeyedDiaphragmState;
      state = { ...s, head: { ...s.head, bleedOpen: a.open } };
    }
  } else if (pump.kind === 'motor')
    state = admitGas(state as MotorPumpState, a.ml);
  else if (pump.kind === 'solenoid' || pump.kind === 'stepper') {
    const s = state as KeyedDiaphragmState;
    state = { ...s, head: { ...s.head, gasMl: s.head.gasMl + a.ml } };
  }
  if (state === pump.state) return pumps;
  return {
    ...pumps,
    [a.pool]: {
      ...pumps[a.pool],
      [a.chemical]: {
        ...pump,
        state,
        fault: a.act === 'acknowledge' ? null : pump.fault,
      },
    },
  };
}
