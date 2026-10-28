/**
 * A motor-driven diaphragm metering pump (prompt 102; the owner,
 * 2026-10-28: "Design a new pump"), the replacement designed for the
 * Olympic's hypochlorite, whose DMX 1602 delivers at most 2.1 l/h where
 * the water needs about 12.5 l/h (`doc/research/water-chemistry-models.md`
 * §8.5). Grundflow's DMH 21-10, after the ProMinent Sigma/ 1 control type
 * (S1Cb 12017 PVT: 21 l/h at 10 bar, 3.8 ml a stroke, 90 strokes a
 * minute, a 4 mm stroke set by a self-locking dial from 0 to 100 %, an
 * integral relief valve, a multi-layer diaphragm with a rupture
 * indicator, a two-stage level input).
 *
 * What it does with what it is given, stroke by stroke:
 *
 * - **Rate.** Its output is its stroke rate (a share of 90 a minute, from
 *   its own ▲ ▼ in MANUAL, or a 4–20 mA signal in EXT) times its stroke
 *   length (the dial) times its most, 21 l/h.
 * - **Gas.** Hypochlorite gives off oxygen as it decomposes, in the head
 *   as it stands and from what it draws. Each stroke must first compress
 *   the head's gas to the discharge pressure before its outlet valve
 *   lifts; what is left of the stroke is delivered, carrying some of the
 *   gas out with it. Once the gas takes the whole stroke to compress, the
 *   pump is gas-locked: it strokes, sounds and shows its rate, and
 *   delivers nothing, until the gas is let out through its bleed valve
 *   (open, the stroke goes to the return at no pressure). A degassing head
 *   lets a little out at every stroke through a bleed orifice to the
 *   return, at a little of each stroke's liquid.
 * - **Relief.** Against a closed discharge its integral relief valve
 *   lifts at 11 bar, its stroke going back to the day tank.
 * - **Flow monitor.** Its flow monitor on the discharge valve counts
 *   strokes that deliver less than half: after 20 in a row it stops the
 *   pump, `Er F`, latched until STOP/START is pressed at the pump.
 * - **Level.** Its two-stage level input: LOW lights WARN; EMPTY stops
 *   it, `Er L`, clearing itself when the tank is filled.
 * - **Diaphragm.** A ruptured diaphragm shows red in its indicator and
 *   stops it, `Er d`, until the diaphragm is changed.
 *
 * The pump knows only what a real one could: its display shows the rate
 * it is set to, not what it delivers; a gas-locked pump reads as a healthy
 * one until its flow monitor trips (prompt 068's rule: no peeking). The
 * gas and idle rates are the game's own, chosen so a standby pump left a
 * night locks up and a degassing head clears it in a few strokes. Pure.
 */

import {
  FLOW_STROKES,
  headLocked,
  headStroke,
  runStrokes,
  standHead,
} from './diaphragm-head';
import type { HeadKind, HeadSpec } from './diaphragm-head';

export const DMH = {
  model: 'DMH 21-10',
  /** Its most at full stroke and rate, l/h, and its strokes a minute. */
  maxLh: 21,
  maxSpm: 90,
  /** Its most against, bar, and where its integral relief valve lifts. */
  maxBar: 10,
  reliefBar: 11,
  /** Its head's dead volume, ml: the liquid that stays in it each stroke. */
  deadMl: 6,
} as const;

/** One full stroke's volume, ml (3.9 ml: 21 l/h at 90 a minute). */
export const FULL_STROKE_ML = (DMH.maxLh * 1000) / 60 / DMH.maxSpm;

/** Its head, for the stroke-by-stroke model every diaphragm pump shares. */
export const DMH_HEAD: HeadSpec = {
  strokeMl: FULL_STROKE_ML,
  deadMl: DMH.deadMl,
  reliefBar: DMH.reliefBar,
};
export type { HeadKind };
export { FLOW_STROKES };
export type PumpError = 'flow' | 'level' | 'diaphragm';
export type DisplayShows = 'lh' | 'spm' | 'pct' | 'ma';
export type LevelInput = 'ok' | 'low' | 'empty';

export interface MotorPumpState {
  head: HeadKind;
  /** Started (STOP/START), or stopped. */
  on: boolean;
  /** MAN, its own rate; EXT, its 4–20 mA signal. */
  mode: 'manual' | 'analog';
  /** Its manual stroke rate, a share of its most. */
  manual: number;
  /** Its stroke length, the dial's setting, a share of its 4 mm. */
  strokeLength: number;
  /** Its bleed (priming) valve, open to the return. */
  bleedOpen: boolean;
  /** What its display shows (the i key). */
  shows: DisplayShows;
  /** Gas in its head, ml. */
  gasMl: number;
  /** Strokes counted on, for when the next begins. */
  phase: number;
  /** Strokes in a row the flow monitor has found short. */
  short: number;
  error: PumpError | null;
  /** Its diaphragm ruptured (a fault). */
  ruptured: boolean;
  /** Litres it has delivered to its discharge, and returned to its tank. */
  deliveredL: number;
  returnedL: number;
}

/** As commissioned for the Olympic: EXT, its dial at 60 % (12.6 l/h most). */
export const newMotorPumpState = (
  head: HeadKind = 'degassing',
): MotorPumpState => ({
  head,
  on: true,
  mode: 'analog',
  manual: 0.5,
  strokeLength: 0.6,
  bleedOpen: false,
  shows: 'lh',
  gasMl: 0,
  phase: 0,
  short: 0,
  error: null,
  ruptured: false,
  deliveredL: 0,
  returnedL: 0,
});

export type MotorPumpKey = 'startStop' | 'mode' | 'up' | 'down' | 'info';

const SHOWS: readonly DisplayShows[] = ['lh', 'spm', 'pct', 'ma'];
const step = (v: number, by: number, min: number) =>
  Math.max(min, Math.min(1, Math.round((v + by) * 20) / 20));

/**
 * Its state after a key: STOP/START starts or stops it, and first clears
 * a flow error it has latched (leaving it stopped); P changes its mode;
 * ▲ ▼ its manual rate, 5 % a press; i what its display shows.
 */
export function pressMotorKey(
  s: MotorPumpState,
  key: MotorPumpKey,
): MotorPumpState {
  switch (key) {
    case 'startStop':
      if (s.error === 'flow') return { ...s, error: null, short: 0, on: false };
      return { ...s, on: !s.on };
    case 'mode':
      return { ...s, mode: s.mode === 'manual' ? 'analog' : 'manual' };
    case 'up':
      return { ...s, manual: step(s.manual, 0.05, 0.05) };
    case 'down':
      return { ...s, manual: step(s.manual, -0.05, 0.05) };
    case 'info':
      return {
        ...s,
        shows: SHOWS[(SHOWS.indexOf(s.shows) + 1) % SHOWS.length],
      };
  }
}

/** Its stroke length dial, a detent (5 %) a click: up (+1) or down (−1). */
export const turnStrokeDial = (
  s: MotorPumpState,
  direction: number,
): MotorPumpState => ({
  ...s,
  strokeLength: step(s.strokeLength, Math.sign(direction) * 0.05, 0),
});

/** Its bleed valve opened (or shut). */
export const setBleed = (s: MotorPumpState, open: boolean): MotorPumpState => ({
  ...s,
  bleedOpen: open,
});

/** Gas let into its head (air drawn from a tank run dry, a loose suction union). */
export const admitGas = (s: MotorPumpState, ml: number): MotorPumpState => ({
  ...s,
  gasMl: s.gasMl + ml,
});

/** Its diaphragm ruptured, or changed for a new one. */
export const setRuptured = (
  s: MotorPumpState,
  ruptured: boolean,
): MotorPumpState => ({
  ...s,
  ruptured,
  error: ruptured ? 'diaphragm' : s.error === 'diaphragm' ? null : s.error,
});

/** What it is given: its supply, its controller's signals, its tank, its line. */
export interface MotorPumpInputs {
  powered: boolean;
  /** Its controller's release (pause) contact: true lets it run. */
  release: boolean;
  /** Its analogue signal, mA (4 to 20). */
  signalMa: number;
  level: LevelInput;
  /** The pressure it pumps against, bar (gauge); Infinity, a closed discharge. */
  dischargeBar: number;
}

/** Its stroke rate share, as its mode takes it. */
export const rateShare = (s: MotorPumpState, signalMa: number) =>
  s.mode === 'manual'
    ? s.manual
    : Math.max(0, Math.min(1, (signalMa - 4) / 16));

/** Whether it strokes now. */
export function strokes(s: MotorPumpState, i: MotorPumpInputs) {
  return (
    i.powered &&
    s.on &&
    !s.error &&
    i.release &&
    (s.mode === 'manual' || i.signalMa > 4.1) &&
    rateShare(s, i.signalMa) > 0
  );
}

/** The rate it is set to, l/h: what its display shows. */
export const setRate = (s: MotorPumpState, signalMa: number) =>
  rateShare(s, signalMa) * s.strokeLength * DMH.maxLh;

/** One stroke of the DMH's head (`diaphragm-head.ts`). */
export const oneStroke = (
  volume: number,
  gas: number,
  bar: number,
  head: HeadKind,
  bleedOpen: boolean,
) => headStroke(DMH_HEAD, volume, gas, bar, head, bleedOpen);

/** What happened over a step: its strokes, and what they did. */
export interface MotorPumpStep {
  state: MotorPumpState;
  /** Strokes that began, and of them, how many the flow monitor saw deliver. */
  strokes: number;
  delivering: number;
  /** Litres delivered and returned over the step. */
  deliveredL: number;
  returnedL: number;
}

/** Its state `delta` seconds on. */
export function stepMotorPump(
  s0: MotorPumpState,
  i: MotorPumpInputs,
  delta: number,
): MotorPumpStep {
  let s = { ...s0 };
  // Faults that stop it before it strokes.
  if (s.ruptured) s.error = 'diaphragm';
  if (i.level === 'empty' && !s.error) s.error = 'level';
  if (s.error === 'level' && i.level !== 'empty') s.error = null;
  // The head's hypochlorite gives off gas as it stands, running or not.
  s = { ...s, ...standHead(DMH_HEAD, s, delta) };
  if (!strokes(s, i))
    return { state: s, strokes: 0, delivering: 0, deliveredL: 0, returnedL: 0 };
  const spm = rateShare(s, i.signalMa) * DMH.maxSpm;
  const next = s.phase + (spm / 60) * delta;
  const began = Math.floor(next) - Math.floor(s.phase);
  s.phase = next % 1000;
  const r = runStrokes(
    DMH_HEAD,
    s,
    began,
    FULL_STROKE_ML * s.strokeLength,
    i.dischargeBar,
  );
  s = {
    ...s,
    ...r.state,
    deliveredL: s.deliveredL + r.deliveredMl / 1000,
    returnedL: s.returnedL + r.returnedMl / 1000,
  };
  if (r.tripped) s = { ...s, error: 'flow', on: false };
  return {
    state: s,
    strokes: began,
    delivering: r.delivering,
    deliveredL: r.deliveredMl / 1000,
    returnedL: r.returnedMl / 1000,
  };
}

/** Whether it is gas-locked: a stroke now would not lift its outlet valve. */
export const gasLocked = (s: MotorPumpState, bar: number) =>
  headLocked(DMH_HEAD, s, FULL_STROKE_ML * s.strokeLength, bar);

/** Its four-digit readout's text, and which of its lamps are lit. */
export interface MotorPumpDisplay {
  /** For the seven-segment readout: four characters and any points. */
  text: string;
  /** Which unit lamp beside the readout is lit, if any. */
  unit: DisplayShows | null;
  run: boolean;
  warn: boolean;
  error: boolean;
  manual: boolean;
  ext: boolean;
}

const ERROR_TEXT: Record<PumpError, string> = {
  flow: 'Er F',
  level: 'Er L',
  diaphragm: 'Er d',
};

/** A value in four digits: 12.6, 2.83, 0.50. */
const fourDigits = (v: number) =>
  v >= 100 ? String(Math.round(v)) : v >= 10 ? v.toFixed(1) : v.toFixed(2);

/**
 * What its display shows: the rate it is set to in l/h (or its strokes a
 * minute, its stroke rate's share, or its signal in mA, as i chooses),
 * `StoP` stopped, `PAUS` waiting for its release or signal, its error's
 * code; dark unpowered.
 */
export function motorPumpDisplay(
  s: MotorPumpState,
  i: Pick<MotorPumpInputs, 'powered' | 'release' | 'signalMa' | 'level'>,
): MotorPumpDisplay | null {
  if (!i.powered) return null;
  const lamps = {
    warn: i.level !== 'ok',
    error: !!s.error,
    manual: s.mode === 'manual',
    ext: s.mode === 'analog',
  };
  const running = strokes(s, { ...i, dischargeBar: 0 });
  if (s.error)
    return { text: ERROR_TEXT[s.error], unit: null, run: false, ...lamps };
  if (!s.on) return { text: 'StoP', unit: null, run: false, ...lamps };
  if (!running && s.shows !== 'ma')
    return { text: 'PAUS', unit: null, run: false, ...lamps };
  const share = rateShare(s, i.signalMa);
  const text =
    s.shows === 'lh'
      ? fourDigits(setRate(s, i.signalMa))
      : s.shows === 'spm'
        ? String(Math.round(share * DMH.maxSpm))
        : s.shows === 'pct'
          ? String(Math.round(share * 100))
          : Math.max(0, i.signalMa).toFixed(1);
  return { text, unit: s.shows, run: running, ...lamps };
}

/** Its state in words, as it shows itself (for the information overlay). */
export function motorPumpWords(
  s: MotorPumpState,
  i: Pick<MotorPumpInputs, 'powered' | 'release' | 'signalMa' | 'level'>,
) {
  const d = motorPumpDisplay(s, i);
  if (!d) return 'unpowered, its display dark';
  const what = s.error
    ? `stopped, its display ${d.text}`
    : !s.on
      ? 'stopped at its keys'
      : d.run
        ? `running, set to ${setRate(s, i.signalMa).toFixed(2)} l/h`
        : 'paused, waiting for its controller';
  return `${what}; ${s.mode === 'manual' ? 'MAN' : 'EXT'}; stroke dial at ${Math.round(s.strokeLength * 100)} %; bleed valve ${s.bleedOpen ? 'open' : 'shut'}`;
}
