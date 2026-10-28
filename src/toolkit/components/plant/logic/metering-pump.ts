import {
  DIAPHRAGM_PUMPS,
  diaphragmOutput,
  newDiaphragmState,
} from './diaphragm-pump';
import type { DiaphragmKind, DiaphragmState } from './diaphragm-pump';
import { runStrokes, standHead } from './diaphragm-head';
import type { HeadKind, HeadSpec, HeadState } from './diaphragm-head';
import {
  DMH,
  newMotorPumpState,
  setRate as motorSetRate,
  stepMotorPump,
} from './motor-dosing-pump';
import type { LevelInput, MotorPumpState } from './motor-dosing-pump';

/**
 * The plant's metering pumps as one family (prompt 102; the owner,
 * 2026-10-28: "link it to our ideal pump model so it behaves as
 * expected … subclasses of ideal pump for peristaltic and diaphragm
 * pumps"), so the world's dosing can ask each pool's pump for its dose
 * without knowing its kind. Pure.
 *
 * - **ideal**: the contract itself: demand × its most, delivered exactly,
 *   while powered and released (mission 101's `pumpRates` today).
 * - **peristaltic** (Grundflow PERI 30, after the Watson-Marlow Qdos 30):
 *   rate = rotor speed × the tube's volume a turn; gas passes through
 *   with the liquid, so it never gas-locks; its tube wears, giving a
 *   little less a turn until it is changed, and at the end of its life
 *   bursts, which its leak detector sees and stops it; against a closed
 *   discharge it stalls (its overpressure trip).
 * - **diaphragm**, stroke by stroke through the shared head model
 *   (`diaphragm-head.ts`: gas compressed each stroke, gas-locking, bleed,
 *   relief, flow monitor): `solenoid` (the DMX 1602, its stroke rate, a
 *   standard head), `stepper` (the DDS 7.5-16, full stroke always, and
 *   deaerating itself while it stands by, as the DDA's auto deaeration
 *   does), `motor` (the DMH 21-10, its stroke dial; `motor-dosing-pump.ts`).
 *
 * Every kind takes the same inputs and gives the same step: litres
 * delivered (and returned to its tank), its state, whether it runs, the
 * rate it is set to, and its error relay.
 */

export type MeteringKind =
  | 'ideal'
  | 'peristaltic'
  | 'solenoid'
  | 'stepper'
  | 'motor';

/** What every metering pump is given. */
export interface MeteringInputs {
  powered: boolean;
  /** Its run permissive: the controller's release and any interlocks. */
  release: boolean;
  /** The controller's output, 0 to 1 (as 4–20 mA, or pulses, or l/h). */
  demand: number;
  /** Its tank's level switches. */
  level: LevelInput;
  /** The pressure it pumps against, bar; Infinity, a closed discharge. */
  dischargeBar: number;
}

export interface MeteringStep<S> {
  state: S;
  /** Litres delivered to its line, and returned to its tank, over the step. */
  deliveredL: number;
  returnedL: number;
  /** Whether it is running (stroking, turning) now. */
  running: boolean;
  /** The rate it is set to, l/h: what its own display would show. */
  setLh: number;
  /** Strokes (or turns) begun, and how many delivered. */
  strokes: number;
  delivering: number;
  /** Its error relay: the fault it has stopped for, if any. */
  fault: string | null;
}

/** One kind of metering pump: its rating and its behaviour. */
export interface MeteringPump<S> {
  kind: MeteringKind;
  model: string;
  maxLh: number;
  initial(): S;
  step(s: S, i: MeteringInputs, delta: number): MeteringStep<S>;
  /** Its latched fault acknowledged at its keys (a local reset). */
  acknowledge(s: S): S;
}

const idle = <S>(
  state: S,
  fault: string | null,
  setLh = 0,
): MeteringStep<S> => ({
  state,
  deliveredL: 0,
  returnedL: 0,
  running: false,
  setLh,
  strokes: 0,
  delivering: 0,
  fault,
});

// ---- The ideal pump -----------------------------------------------------------

/** The ideal metering pump: demand × its most, exactly. */
export function idealPump(maxLh: number, model = 'ideal'): MeteringPump<null> {
  return {
    kind: 'ideal',
    model,
    maxLh,
    initial: () => null,
    step(s, i, delta) {
      const share = Math.max(0, Math.min(1, i.demand));
      const running = i.powered && i.release && share > 0;
      const setLh = share * maxLh;
      return running
        ? {
            ...idle(s, null, setLh),
            running,
            deliveredL: (setLh * delta) / 3600,
          }
        : idle(s, null, setLh);
    },
    acknowledge: (s) => s,
  };
}

// ---- The peristaltic pump -------------------------------------------------------

export const PERI_30 = {
  model: 'PERI 30',
  maxLh: 30,
  /** Its rotor's most, turns a minute (the game's, after the Qdos 30). */
  maxRpm: 55,
  /** Its overpressure trip, bar. */
  maxBar: 7,
  /** Its tube's life, hours; its output a turn falls 15 % over it, and it bursts at 1.25 lives. */
  tubeLifeH: 4000,
  wear: 0.15,
  burstLives: 1.25,
} as const;

/** One turn's volume of a new tube, ml. */
export const PERI_TURN_ML = (PERI_30.maxLh * 1000) / 60 / PERI_30.maxRpm;

export interface PeristalticState {
  on: boolean;
  mode: 'auto' | 'manual';
  manual: number;
  /** Hours its tube has run, and whether it has burst. */
  tubeHours: number;
  burst: boolean;
  error: 'leak' | 'level' | 'stall' | null;
  turns: number;
}

export const newPeristalticState = (): PeristalticState => ({
  on: true,
  mode: 'auto',
  manual: 0.45,
  tubeHours: 0,
  burst: false,
  error: null,
  turns: 0,
});

/** Its tube's volume a turn now, ml: less as it wears. */
export const peristalticTurnMl = (s: PeristalticState) =>
  PERI_TURN_ML *
  (1 - PERI_30.wear * Math.min(1, s.tubeHours / PERI_30.tubeLifeH));

/** A new tube fitted: its wear and any burst gone, its leak cleared. */
export const changeTube = (s: PeristalticState): PeristalticState => ({
  ...s,
  tubeHours: 0,
  burst: false,
  error: s.error === 'leak' ? null : s.error,
});

export const peristalticPump: MeteringPump<PeristalticState> = {
  kind: 'peristaltic',
  model: PERI_30.model,
  maxLh: PERI_30.maxLh,
  initial: newPeristalticState,
  step(s0, i, delta) {
    let s = { ...s0 };
    if (s.burst) s.error = 'leak';
    if (i.level === 'empty' && !s.error) s.error = 'level';
    if (s.error === 'level' && i.level !== 'empty') s.error = null;
    const share = Math.max(
      0,
      Math.min(1, s.mode === 'auto' ? i.demand : s.manual),
    );
    const setLh = share * PERI_30.maxLh;
    if (!i.powered || !s.on || s.error || !i.release || share <= 0)
      return idle(s, s.error, setLh);
    if (i.dischargeBar > PERI_30.maxBar) {
      s = { ...s, error: 'stall' };
      return idle(s, s.error, setLh);
    }
    const turns = ((share * PERI_30.maxRpm) / 60) * delta;
    const ml = turns * peristalticTurnMl(s);
    const began = Math.floor(s.turns + turns) - Math.floor(s.turns);
    s = {
      ...s,
      turns: (s.turns + turns) % 1000,
      tubeHours: s.tubeHours + delta / 3600,
    };
    if (s.tubeHours >= PERI_30.tubeLifeH * PERI_30.burstLives)
      s = { ...s, burst: true, error: 'leak' };
    return {
      state: s,
      deliveredL: ml / 1000,
      returnedL: 0,
      running: true,
      setLh,
      strokes: began,
      delivering: began,
      fault: s.error,
    };
  },
  // A stall resets at its keys; a leak only with a new tube; a level by filling.
  acknowledge: (s) => (s.error === 'stall' ? { ...s, error: null } : s),
};

// ---- The solenoid and stepper diaphragm pumps ----------------------------------

/** Their heads, for the shared stroke model: a full stroke, the head's liquid, its relief. */
export const DIAPHRAGM_HEADS: Record<DiaphragmKind, HeadSpec> = {
  solenoid: {
    strokeMl:
      (DIAPHRAGM_PUMPS.solenoid.maxLh * 1000) /
      60 /
      DIAPHRAGM_PUMPS.solenoid.maxSpm,
    deadMl: 0.6,
    reliefBar: 18,
  },
  stepper: {
    strokeMl:
      (DIAPHRAGM_PUMPS.stepper.maxLh * 1000) /
      60 /
      DIAPHRAGM_PUMPS.stepper.maxSpm,
    deadMl: 1.5,
    reliefBar: 18,
  },
};

export interface KeyedDiaphragmState {
  /** Its keys' state (`diaphragm-pump.ts`): START/STOP, AUTO/MANUAL, its rate. */
  keys: DiaphragmState;
  head: HeadState;
  phase: number;
  error: 'flow' | 'level' | null;
}

export const newKeyedDiaphragmState = (
  head: HeadKind = 'standard',
): KeyedDiaphragmState => ({
  keys: newDiaphragmState(),
  head: { head, gasMl: 0, bleedOpen: false, short: 0 },
  phase: 0,
  error: null,
});

/**
 * A keyed diaphragm pump (the DMX 1602 or the DDS 7.5-16): its keys and
 * rate as `diaphragm-pump.ts` has them, its head stroke by stroke. Both
 * see their own gas-locking (the gamma/ X from its solenoid's current, the
 * DDA by its FlowControl) and stop, `flow`, until acknowledged at their
 * keys. The stepper deaerates itself while it stands by, so it never
 * starts locked.
 */
export function keyedDiaphragmPump(
  kind: DiaphragmKind,
): MeteringPump<KeyedDiaphragmState> {
  const spec = DIAPHRAGM_PUMPS[kind];
  const head = DIAPHRAGM_HEADS[kind];
  return {
    kind,
    model: spec.model,
    maxLh: spec.maxLh,
    initial: () => newKeyedDiaphragmState(),
    step(s0, i, delta) {
      let s = { ...s0, head: standHead(head, s0.head, delta) };
      if (i.level === 'empty' && !s.error) s.error = 'level';
      if (s.error === 'level' && i.level !== 'empty') s.error = null;
      const out = diaphragmOutput(
        kind,
        s.keys,
        { running: i.release, rate: i.demand * spec.maxLh },
        i.powered && !s.error,
      );
      const setLh = out.fraction * spec.maxLh;
      if (!out.running) {
        // Auto deaeration in standby: the stepper clears what gathers.
        if (kind === 'stepper' && i.powered)
          s = { ...s, head: { ...s.head, gasMl: 0 } };
        return idle(s, s.error, setLh);
      }
      const next = s.phase + (out.spm / 60) * delta;
      const began = Math.floor(next) - Math.floor(s.phase);
      const r = runStrokes(head, s.head, began, head.strokeMl, i.dischargeBar);
      s = {
        ...s,
        phase: next % 1000,
        head: r.state,
        error: r.tripped ? 'flow' : s.error,
      };
      return {
        state: s,
        deliveredL: r.deliveredMl / 1000,
        returnedL: r.returnedMl / 1000,
        running: true,
        setLh,
        strokes: began,
        delivering: r.delivering,
        fault: s.error,
      };
    },
    acknowledge: (s) =>
      s.error === 'flow'
        ? { ...s, error: null, head: { ...s.head, short: 0 } }
        : s,
  };
}

// ---- The motor-driven diaphragm pump ---------------------------------------------

/** The DMH 21-10 (`motor-dosing-pump.ts`), its demand as 4–20 mA. */
export const motorPump: MeteringPump<MotorPumpState> = {
  kind: 'motor',
  model: DMH.model,
  maxLh: DMH.maxLh,
  initial: () => newMotorPumpState(),
  step(s, i, delta) {
    const signalMa = 4 + 16 * Math.max(0, Math.min(1, i.demand));
    const r = stepMotorPump(
      s,
      {
        powered: i.powered,
        release: i.release,
        signalMa,
        level: i.level,
        dischargeBar: i.dischargeBar,
      },
      delta,
    );
    return {
      state: r.state,
      deliveredL: r.deliveredL,
      returnedL: r.returnedL,
      running:
        r.strokes > 0 ||
        (r.state.on &&
          !r.state.error &&
          i.release &&
          i.powered &&
          signalMa > 4.1),
      setLh: motorSetRate(r.state, signalMa),
      strokes: r.strokes,
      delivering: r.delivering,
      fault: r.state.error,
    };
  },
  // A flow error clears at STOP/START, leaving it stopped; started again by the same key.
  acknowledge: (s) =>
    s.error === 'flow' ? { ...s, error: null, short: 0, on: true } : s,
};

/** Each kind's pump by its kind (the ideal one at `maxLh`). */
export function meteringPump(kind: MeteringKind, maxLh = 1) {
  switch (kind) {
    case 'ideal':
      return idealPump(maxLh);
    case 'peristaltic':
      return peristalticPump;
    case 'solenoid':
    case 'stepper':
      return keyedDiaphragmPump(kind);
    case 'motor':
      return motorPump;
  }
}
