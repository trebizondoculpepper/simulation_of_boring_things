/**
 * The 24th-century reinterpretations of the game's panels (mission 093,
 * dev48; the owner, 2026-10-27: "ALL the game's existing control panels
 * reinterpreted in this style ... on trial state"): each described as
 * data (`ParodySpec`), the same controls, lamps and readouts as its
 * original, grandly renamed; and a small trial each runs on, not the
 * world. Pure.
 *
 * The trial is deliberately simple and the same for every panel: its
 * buttons are read by their verbs (START, RUN, OPEN, ON … set it going;
 * STOP, SHUT, OFF … stop it; RESET clears a trip; ACCEPT, RESET and LAMP
 * TEST work its annunciator), its lamps by their words (RUN, ON, OPEN,
 * HEALTHY … lit while it goes; TRIP, FAULT, ALARM … lit while tripped),
 * and now and then a fault trips it, to be reset.
 */

/** A widget on a page, as data. */
export type ParodyWidget =
  /** A row of push buttons; `latch` makes them toggles. */
  | { kind: 'buttons'; labels: readonly string[]; latch?: boolean }
  /** A selector: one of its positions chosen. */
  | {
      kind: 'selector';
      label: string;
      options: readonly string[];
      selected?: number;
    }
  /** Lamps: lit by the trial, by their words. */
  | { kind: 'lamps'; labels: readonly string[] }
  /** Numeric read-outs: name, unit, and the range they wander in. */
  | {
      kind: 'readouts';
      items: readonly (readonly [string, string, number, number])[];
    }
  /** Bar gauges, wandering. */
  | { kind: 'gauges'; items: readonly string[]; vertical?: boolean }
  /** A trend of a wandering value. */
  | { kind: 'trend'; name: string }
  /** Annunciator windows, with their ACCEPT, RESET and LAMP TEST in the sidebar. */
  | { kind: 'annunciator'; windows: readonly string[]; columns?: number }
  /** A banner of words, flashing while the trial is tripped. */
  | { kind: 'banner'; words: string }
  /** A list of rows, each a value wandering. */
  | { kind: 'list'; rows: readonly string[] }
  /** A circuit: its machines in a loop, each touchable on and off. */
  | {
      kind: 'circuit';
      symbols: readonly {
        kind: 'pump' | 'valve' | 'filter' | 'tank' | 'boiler' | 'fan';
        label: string;
      }[];
    };

/** A page: columns of widgets, side by side, each stacked down. */
export interface ParodyPage {
  name: string;
  columns: readonly (readonly ParodyWidget[])[];
}

/** One panel reinterpreted. */
export interface ParodySpec {
  /** The original, as the game names it, with its tag. */
  original: string;
  /** Its new, grander title. */
  title: string;
  /** The code in its elbow (the original's tag, or its own). */
  code: string;
  colour?: string;
  /** Its glass, metres (default 1.6 × 1.0). */
  size?: { w: number; h: number };
  /** Its frame's outline. */
  shape?: 'rect' | 'rounded' | 'trapezium' | 'hexagon';
  pages: readonly ParodyPage[];
}

/** What a button's legend asks of the trial. */
export type Verb = 'go' | 'stop' | 'reset' | 'accept' | 'lamp-test' | 'other';

const GO =
  /\b(START|RUN|OPEN|ON|ENABLE|FIRE|FILL|ENGAGE|AUTO START|BOOST|PURGE|CALL|DOSE|PRIME|TEST RUN|ARM)\b/;
const STOP =
  /\b(STOP|SHUT|OFF|CLOSE|DISABLE|ISOLATE|HALT|E-STOP|EMERGENCY|INHIBIT|DISARM)\b/;

/** A button's verb, from its legend. */
export function verbOf(label: string): Verb {
  const l = label.toUpperCase();
  if (/LAMP TEST|TEST LAMPS/.test(l)) return 'lamp-test';
  if (/\b(ACCEPT|ACK|ACKNOWLEDGE|SILENCE|MUTE)\b/.test(l)) return 'accept';
  if (/\bRESET\b/.test(l)) return 'reset';
  if (STOP.test(l)) return 'stop';
  if (GO.test(l)) return 'go';
  return 'other';
}

/** What a lamp's legend shows: lit while going, while tripped, while stopped, or wandering. */
export type LampSense = 'going' | 'tripped' | 'stopped' | 'wander';

export function lampSense(label: string): LampSense {
  const l = label.toUpperCase();
  if (/\bNOT\b/.test(l)) return 'wander';
  if (
    /TRIP|FAULT|ALARM|LOCKOUT|FAIL|LEAK|HIGH HIGH|LOW LOW|HH\b|LL\b|DANGER|DETECT/.test(
      l,
    )
  )
    return 'tripped';
  if (/\b(STOPPED|SHUT|OFF|CLOSED|STANDBY|READY)\b/.test(l)) return 'stopped';
  if (
    /\b(RUN|RUNNING|ON|OPEN|HEALTHY|SUPPLY|AVAILABLE|LIVE|FIRING|FLAME|DOSING|SERVICE|AUTO|ENABLED|CALL|FILLING|POWER)\b/.test(
      l,
    )
  )
    return 'going';
  return 'wander';
}

export interface ParodyTrial {
  going: boolean;
  tripped: boolean;
  /** Seconds until the next fault trips it. */
  nextFault: number;
  seconds: number;
}

/** A trial, going, its first fault a little way off (seeded so panels differ). */
export const newTrial = (seed = 0): ParodyTrial => ({
  going: true,
  tripped: false,
  nextFault: 40 + ((seed * 37) % 50),
  seconds: 0,
});

/** The trial `dt` seconds on: a fault trips it when due, stopping it. */
export function stepTrial(t: ParodyTrial, dt: number): ParodyTrial {
  const seconds = t.seconds + dt;
  if (!t.tripped && seconds >= t.nextFault)
    return { going: false, tripped: true, nextFault: Infinity, seconds };
  return { ...t, seconds };
}

/**
 * A press of a button by its legend: the trial after it, and whether it
 * counted (a refused press is answered with a deny): going cannot start
 * while tripped; RESET counts only while tripped, and arms the next fault
 * a while off.
 */
export function pressTrial(
  t: ParodyTrial,
  label: string,
): { trial: ParodyTrial; counted: boolean } {
  const verb = verbOf(label);
  if (verb === 'go')
    return t.tripped
      ? { trial: t, counted: false }
      : { trial: { ...t, going: true }, counted: true };
  if (verb === 'stop') return { trial: { ...t, going: false }, counted: true };
  if (verb === 'reset')
    return t.tripped
      ? {
          trial: { ...t, tripped: false, nextFault: t.seconds + 90 },
          counted: true,
        }
      : { trial: t, counted: false };
  return { trial: t, counted: true };
}

/** Whether a lamp of `sense` is lit in trial `t` (a wandering one by its own slow beat). */
export function lampLit(sense: LampSense, t: ParodyTrial, k: number): boolean {
  if (sense === 'going') return t.going;
  if (sense === 'tripped') return t.tripped;
  if (sense === 'stopped') return !t.going;
  return Math.sin(t.seconds * (0.3 + 0.07 * k) + k * 2.1) > 0.2;
}

/** A wandering value between `lo` and `hi`, its own pace (`k`). */
export const wander = (seconds: number, lo: number, hi: number, k: number) =>
  lo +
  (hi - lo) *
    (0.5 +
      0.35 * Math.sin(seconds * (0.21 + 0.07 * k) + k * 1.7) +
      0.15 * Math.sin(seconds * (0.9 + 0.13 * k) + k));
