/**
 * A diaphragm metering pump's controller (prompt 089, item 2; the owner,
 * 2026-10-27: the dosing set's pumps to the peristaltic pump's standard,
 * still diaphragm pumps): what it does with what it is asked for, and what
 * its display shows. Two kinds, each at its real rating:
 *
 * - `solenoid`, after the ProMinent gamma/ X GMXa 1602: a solenoid drives
 *   its diaphragm one stroke at a time, up to 180 strokes a minute of
 *   0.19 ml, 2.1 l/h; its rate is its stroke frequency.
 * - `stepper`, after the Grundfos SMART Digital DDA 7.5-16: a stepper motor
 *   drives the diaphragm at full stroke, up to 7.5 l/h, its suction stroke
 *   quick and its discharge stroke spread out, up to 190 strokes a minute.
 *
 * Its keys: START and STOP (it doses only once started, as long as its
 * controller asks), ▲ and ▼ (its manual rate, used in MANUAL), and P (its
 * mode, AUTO following the controller's rate, or MANUAL). Pure.
 */

export type DiaphragmKind = 'solenoid' | 'stepper';

export interface DiaphragmSpec {
  /** The most it doses, l/h, and the most strokes a minute. */
  maxLh: number;
  maxSpm: number;
  /** Its model, as its rating plate gives it. */
  model: string;
}

export const DIAPHRAGM_PUMPS: Record<DiaphragmKind, DiaphragmSpec> = {
  solenoid: { maxLh: 2.1, maxSpm: 180, model: 'DMX 1602' },
  stepper: { maxLh: 7.5, maxSpm: 190, model: 'DDS 7.5-16' },
};

export interface DiaphragmState {
  /** Started at its keys (START), or stopped (STOP). */
  on: boolean;
  mode: 'auto' | 'manual';
  /** Its manual rate, a fraction of its most. */
  manual: number;
}

export const newDiaphragmState = (): DiaphragmState => ({
  on: true,
  mode: 'auto',
  manual: 0.5,
});

export type DiaphragmKey = 'start' | 'stop' | 'up' | 'down' | 'mode';

/** Its state after a key is pressed. */
export function pressKey(s: DiaphragmState, key: DiaphragmKey): DiaphragmState {
  switch (key) {
    case 'start':
      return { ...s, on: true };
    case 'stop':
      return { ...s, on: false };
    case 'up':
      return {
        ...s,
        manual: Math.min(1, Math.round((s.manual + 0.05) * 20) / 20),
      };
    case 'down':
      return {
        ...s,
        manual: Math.max(0.05, Math.round((s.manual - 0.05) * 20) / 20),
      };
    case 'mode':
      return { ...s, mode: s.mode === 'auto' ? 'manual' : 'auto' };
  }
}

/** What its controller asks: to dose, and at what rate, l/h. */
export interface Demand {
  running: boolean;
  rate: number;
}

export interface DiaphragmOutput {
  running: boolean;
  /** Its rate now, l/h, and as a fraction of its most. */
  rate: number;
  fraction: number;
  /** Strokes a minute. */
  spm: number;
}

/**
 * What it does: in AUTO, the controller's rate while it asks (limited to
 * its most); in MANUAL, its own rate while the controller asks (its
 * release contact); nothing stopped, or unpowered.
 */
export function diaphragmOutput(
  kind: DiaphragmKind,
  s: DiaphragmState,
  demand: Demand,
  powered = true,
): DiaphragmOutput {
  const spec = DIAPHRAGM_PUMPS[kind];
  const asked = s.mode === 'auto' ? demand.rate / spec.maxLh : s.manual;
  const fraction = Math.max(0, Math.min(1, asked));
  const running = powered && s.on && demand.running && fraction > 0;
  if (!running) return { running: false, rate: 0, fraction, spm: 0 };
  return {
    running,
    rate: fraction * spec.maxLh,
    fraction,
    spm: Math.round(fraction * spec.maxSpm),
  };
}

/** Strokes counted on from `phase` (in strokes) over `delta` s; how many began. */
export function strokesOn(phase: number, spm: number, delta: number) {
  const next = phase + (spm / 60) * delta;
  return { phase: next, began: Math.floor(next) - Math.floor(phase) };
}

/** Its display's lines: its tag and state; its rate; its mode and strokes. */
export function diaphragmDisplay(
  label: string,
  s: DiaphragmState,
  out: DiaphragmOutput,
  powered = true,
): {
  top: string;
  state: string;
  rate: string;
  unit: string;
  foot: string;
} | null {
  if (!powered) return null;
  return {
    top: label.slice(0, 12),
    state: !s.on ? 'STOP' : out.running ? 'RUN' : 'PAUSE',
    rate: (out.running ? out.rate : 0).toFixed(2),
    unit: 'L/H',
    // At most 15 characters, in the 96-dot display's 16.
    foot: `${s.mode === 'auto' ? 'AUTO' : 'MAN'} ${Math.round(out.fraction * 100)}% ${out.spm}SPM`,
  };
}
