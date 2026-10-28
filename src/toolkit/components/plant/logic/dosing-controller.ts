/**
 * A pool's dosing controller (prompt 105): one pure model with two faces,
 * the Olympic's Chlorella CX-7 touch-screen controller (after ProMinent's
 * DULCOMARIN 3 and W&T's DEPOLOX Pool) and the Lounge's pair of Chlorella
 * DC-1 single-channel controllers (after ProMinent's DULCOMETER D1C, about
 * 2000). Generalised from the world's hidden controller (`CONTROLLER`,
 * `stepControl` in `src/game/plant/water-treatment.ts`, mission 101): with
 * `WORLD_SETTINGS`, ideal probes and nothing wrong, its outputs are that
 * controller's to the last digit, so installing it swaps one for the other.
 *
 * It takes its sample cell's signals (the probes' currents and millivolts,
 * its temperature and its flow switch) and gives its outputs:
 *
 * - **Control.** PI on free chlorine (Xp as a band in mg/l, Tn in hours;
 *   0 makes it P alone), P on pH (acid only, a one-sided controller), each
 *   output 0 to 1 (Yout), as 4–20 mA, with its release contact. Each
 *   channel AUTO or MANUAL (a fixed output), and started or stopped.
 * - **Measurement.** Each probe's signal through its calibration: free and
 *   total chlorine amperometric (µA, a zero and a slope), pH a glass
 *   electrode (mV, a zero at pH 7 and a slope, temperature-compensated by
 *   the Pt1000), redox in mV as it comes; combined chlorine is total less
 *   free, where the cell has a total-chlorine probe.
 * - **Interlocks.** Sample flow (after its delay all dosing stops: W&T's
 *   "never disable the sample water monitoring"); circulation stopped; the
 *   pH lockout of chlorine (setpoint ± a switch-off range, DEPOLOX); the
 *   maximum dosing time (an output at 100 % that long is latched off until
 *   acknowledged: the overfeed alarm); a feed delay after a start or a
 *   restored flow; a pump's error relay and its day tank's empty switch.
 * - **Alarms.** Limit alarms (low and high, on chlorine and pH, after a
 *   checkout time as the D1C's limits have), and the interlocks', in a list
 *   with their times, active or cleared, acknowledged or not; relays for
 *   the control room (chlorine, pH, sample flow, dosing time, fault) and a
 *   common alarm relay that an acknowledgement drops out, as the D1C's.
 * - **Calibration.** Chlorine: a zero (sample flow stopped, the probe in
 *   water with no chlorine, refused beyond ±5 µA as W&T's) and a slope
 *   against a DPD reading (refused below 2 % of range or outside 25 to
 *   300 % of nominal, as the D1C's); pH: two buffers (pH 7 and 4, each
 *   recognised; refused closer than 2 pH apart, a zero beyond ±60 mV or a
 *   slope outside 46 to 70 mV/pH, the D1C's and W&T's limits) or one
 *   point against phenol red (its zero only). While calibrating, dosing
 *   stops, as on the D1C.
 * - **Its record.** A trend of its readings and outputs, a minute a point.
 *
 * Pure: no DOM or Three.js. Seconds throughout, except Tn in hours (the
 * world's `CONTROLLER.chlorineIntegral`).
 */

export type DoseChannel = 'hypochlorite' | 'acid';
export const DOSE_CHANNELS: readonly DoseChannel[] = ['hypochlorite', 'acid'];
export type DoseMode = 'auto' | 'manual';
export type ChlorineProbe = 'free' | 'total';

/** What a controller is set to: what its faces let the operator change, and its fixed limits. */
export interface ControllerSettings {
  /** Free chlorine's setpoint at the sample, mg/l; its band (Xp), mg/l; its integral time (Tn), h (0: P alone). */
  chlorineSet: number;
  chlorineBand: number;
  chlorineIntegral: number;
  /** pH's setpoint and band (acid dosed above it). */
  pHSet: number;
  pHBand: number;
  /** Chlorine dosing stops with pH this far either side of its setpoint (0: no lockout). */
  pHLockout: number;
  /** Limit alarms. */
  chlorineLow: number;
  chlorineHigh: number;
  pHLow: number;
  pHHigh: number;
  /** How long a value must stay past a limit before its alarm, s (the D1C's checkout time). */
  limitDelay: number;
  /** How long sample flow may be lost before dosing stops, s. */
  sampleFlowDelay: number;
  /** How long an output may run at 100 % before it is latched off, s (0: no limit). */
  doseLimit: number;
  /** How long dosing waits after a start or a restored sample flow, s. */
  feedDelay: number;
}

/**
 * The world's controller's settings (`CONTROLLER`, mission 101): its
 * setpoints, bands and lockout, and none of the interlocks it does not
 * have, so that this model with them is that controller.
 */
export const WORLD_SETTINGS: ControllerSettings = {
  chlorineSet: 1.3,
  chlorineBand: 0.5,
  chlorineIntegral: 6,
  pHSet: 7.3,
  pHBand: 0.3,
  pHLockout: 0.4,
  chlorineLow: 0,
  chlorineHigh: Infinity,
  pHLow: 0,
  pHHigh: 14,
  limitDelay: 0,
  sampleFlowDelay: Infinity,
  doseLimit: 0,
  feedDelay: 0,
};

/**
 * A controller as commissioned in a plant room: the world's control, with
 * alarm limits round PWTAG's ranges, a two-minute sample-flow delay, a
 * two-hour dosing time limit and a one-minute feed delay.
 */
export const PLANT_SETTINGS: ControllerSettings = {
  ...WORLD_SETTINGS,
  chlorineLow: 0.8,
  chlorineHigh: 2.5,
  pHLow: 7.0,
  pHHigh: 7.6,
  limitDelay: 300,
  sampleFlowDelay: 120,
  doseLimit: 7200,
  feedDelay: 60,
};

/** What each setting may be set to, and by how much a press moves it. */
export const SETTING_RANGES: Record<
  keyof ControllerSettings,
  { min: number; max: number; step: number }
> = {
  chlorineSet: { min: 0.2, max: 3, step: 0.05 },
  chlorineBand: { min: 0.1, max: 2, step: 0.05 },
  chlorineIntegral: { min: 0, max: 24, step: 0.5 },
  pHSet: { min: 6.8, max: 7.8, step: 0.05 },
  pHBand: { min: 0.1, max: 1, step: 0.05 },
  pHLockout: { min: 0, max: 1.5, step: 0.05 },
  chlorineLow: { min: 0, max: 3, step: 0.05 },
  chlorineHigh: { min: 0.5, max: 10, step: 0.1 },
  pHLow: { min: 6, max: 7.6, step: 0.05 },
  pHHigh: { min: 7, max: 9, step: 0.05 },
  limitDelay: { min: 0, max: 3600, step: 60 },
  sampleFlowDelay: { min: 0, max: 600, step: 30 },
  doseLimit: { min: 0, max: 36000, step: 1800 },
  feedDelay: { min: 0, max: 3600, step: 60 },
};

/** The probes' nominal signals: an amperometric chlorine probe's µA per mg/l; a glass electrode's Nernst slope at 25 °C, mV per pH. */
export const NOMINAL = { chlorineUa: 10, nernst: 59.16 } as const;

/** The calibration's limits (the D1C's and W&T's). */
export const CAL_LIMITS = {
  /** A chlorine zero beyond this, µA, is dirty electrodes or a leaking valve (W&T). */
  zeroUa: 5,
  /** A DPD reading below this share of the 0–2 mg/l range is refused (D1C). */
  dpdLow: 0.04,
  /** A chlorine slope outside these shares of nominal is refused (D1C). */
  slope: [0.25, 3] as const,
  /** pH: buffers at least this far apart; a zero within ±mV; a slope within mV/pH (D1C, W&T). */
  bufferDistance: 2,
  zeroMv: 60,
  slopeMv: [46, 70] as const,
} as const;

/** The pH buffers a controller recognises. */
export const BUFFERS = [4, 7, 10] as const;

/** A sample cell's signals, as its probes and switch give them. */
export interface CellSignals {
  /** The free-chlorine probe's current, µA. */
  freeUa: number;
  /** The total-chlorine probe's, µA, if the cell has one. */
  totalUa: number | null;
  /** The pH electrode's, mV (0 at pH 7 for an ideal one, falling as pH rises). */
  phMv: number;
  /** The redox electrode's, mV, if the cell has one. */
  redoxMv: number | null;
  /** The Pt1000's, °C. */
  temperature: number;
  /** The flow switch: sample water passing. */
  flowOk: boolean;
}

/** Everything a controller is told each step. */
export interface ControllerInputs {
  cell: CellSignals;
  /** The circulation running (its pumps' contact). */
  circulating: boolean;
  /** Each pump's error relay. */
  pumpFault?: Partial<Record<DoseChannel, boolean>>;
  /** Each day tank's empty switch. */
  tankEmpty?: Partial<Record<DoseChannel, boolean>>;
}

/** An amperometric probe's calibration: its zero current and its µA per mg/l. */
export interface AmpCal {
  zeroUa: number;
  slopeUa: number;
}

/** A glass electrode's: its mV at pH 7 and its mV per pH at 25 °C. */
export interface PhCal {
  zeroMv: number;
  slopeMv: number;
}

export interface Calibration {
  free: AmpCal;
  total: AmpCal;
  ph: PhCal;
}

/** The last calibration of each probe: when, and what it found or why it was refused. */
export interface CalRecord {
  at: number;
  ok: boolean;
  /** Its slope as a percentage of nominal, its zero (µA or mV). */
  slopePercent: number;
  zero: number;
  note: string;
}

/** A calibration under way. */
export type CalSession =
  | { probe: ChlorineProbe; step: 'zero' | 'span' }
  | {
      probe: 'ph';
      method: 'buffers';
      step: 'first' | 'second';
      first: { buffer: number; mv: number } | null;
    }
  | { probe: 'ph'; method: 'process' };

export type AlarmCode =
  | 'chlorine-low'
  | 'chlorine-high'
  | 'ph-low'
  | 'ph-high'
  | 'sample-flow'
  | 'circulation'
  | 'ph-lockout'
  | 'dose-limit-hypochlorite'
  | 'dose-limit-acid'
  | 'pump-hypochlorite'
  | 'pump-acid'
  | 'tank-hypochlorite'
  | 'tank-acid';

/** What each alarm says, in the controller's plain text. */
export const ALARM_TEXT: Record<AlarmCode, string> = {
  'chlorine-low': 'Free chlorine below low limit',
  'chlorine-high': 'Free chlorine above high limit',
  'ph-low': 'pH below low limit',
  'ph-high': 'pH above high limit',
  'sample-flow': 'Sample water flow low: dosing stopped',
  circulation: 'Circulation stopped: dosing stopped',
  'ph-lockout': 'pH out of range: chlorine dosing locked out',
  'dose-limit-hypochlorite': 'Maximum dosing time, hypochlorite: check pump',
  'dose-limit-acid': 'Maximum dosing time, acid: check pump',
  'pump-hypochlorite': 'Hypochlorite pump fault',
  'pump-acid': 'Acid pump fault',
  'tank-hypochlorite': 'Hypochlorite day tank empty',
  'tank-acid': 'Acid day tank empty',
};

/** Notes, not alarms: shown, but they raise no relay and want no acknowledgement. */
const NOTES: ReadonlySet<AlarmCode> = new Set(['ph-lockout']);

/** One line of the alarm list. */
export interface AlarmEntry {
  code: AlarmCode;
  /** Controller seconds it came, and went (null while it stands). */
  raised: number;
  cleared: number | null;
  acked: boolean;
}

/** A point of its trend. */
export interface TrendPoint {
  t: number;
  free: number;
  combined: number | null;
  ph: number;
  redox: number | null;
  temperature: number;
  hypochlorite: number;
  acid: number;
}

/** What it reads now, through its calibration. */
export interface Measured {
  free: number;
  total: number | null;
  combined: number | null;
  ph: number;
  redox: number | null;
  temperature: number;
}

export interface ControllerState {
  /** Seconds since it was switched on. */
  clock: number;
  settings: ControllerSettings;
  running: Record<DoseChannel, boolean>;
  mode: Record<DoseChannel, DoseMode>;
  /** Each channel's output in MANUAL, 0 to 1. */
  manual: Record<DoseChannel, number>;
  cal: Calibration;
  calLog: Partial<Record<ChlorineProbe | 'ph', CalRecord>>;
  session: CalSession | null;
  /** Chlorine's integral, mg/l, bounded by its band. */
  integral: number;
  /** Seconds the sample flow has been lost; the feed delay still to run. */
  flowLost: number;
  feedDelayLeft: number;
  /** Seconds each output has been at 100 %, and whether it was latched off for it. */
  atFull: Record<DoseChannel, number>;
  timedOut: Record<DoseChannel, boolean>;
  /** Seconds each limit has been passed. */
  past: Record<'chlorineLow' | 'chlorineHigh' | 'pHLow' | 'pHHigh', number>;
  alarms: AlarmEntry[];
  trend: TrendPoint[];
  /** What its last step read and gave. */
  measured: Measured;
  signals: CellSignals;
  yout: Record<DoseChannel, number>;
  release: Record<DoseChannel, boolean>;
  lockout: boolean;
  flowFail: boolean;
  circulating: boolean;
}

/** A trend point every minute; twelve hours kept. */
export const TREND_STEP = 60;
export const TREND_POINTS = 720;
/** At most this many lines in the alarm list (the oldest cleared go first). */
export const ALARM_LINES = 24;

const clamp = (x: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, x));
const clamp01 = (x: number) => clamp(x, 0, 1);

/** A glass electrode's slope at `temperature`, mV per pH, from its slope at 25 °C. */
export const slopeAt = (slope25: number, temperature: number) =>
  (slope25 * (temperature + 273.15)) / 298.15;

/** An ideal cell's signals for water of these readings: what an ideal probe gives. */
export function idealSignals(w: {
  free: number;
  total?: number | null;
  ph: number;
  redox?: number | null;
  temperature: number;
  flowOk?: boolean;
}): CellSignals {
  return {
    freeUa: w.free * NOMINAL.chlorineUa,
    totalUa:
      w.total === undefined || w.total === null
        ? null
        : w.total * NOMINAL.chlorineUa,
    phMv: -(w.ph - 7) * slopeAt(NOMINAL.nernst, w.temperature),
    redoxMv: w.redox ?? null,
    temperature: w.temperature,
    flowOk: w.flowOk ?? true,
  };
}

export const NOMINAL_CAL: Calibration = {
  free: { zeroUa: 0, slopeUa: NOMINAL.chlorineUa },
  total: { zeroUa: 0, slopeUa: NOMINAL.chlorineUa },
  ph: { zeroMv: 0, slopeMv: NOMINAL.nernst },
};

/** A chlorine reading from its current. */
export const chlorineFrom = (ua: number, c: AmpCal) =>
  Math.max(0, (ua - c.zeroUa) / c.slopeUa);
/** A pH reading from its millivolts at a temperature. */
export const phFrom = (mv: number, c: PhCal, temperature: number) =>
  7 - (mv - c.zeroMv) / slopeAt(c.slopeMv, temperature);

/** What the signals read, through the calibration. */
export function measure(s: CellSignals, cal: Calibration): Measured {
  const free = chlorineFrom(s.freeUa, cal.free);
  const total =
    s.totalUa === null
      ? null
      : Math.max(free, chlorineFrom(s.totalUa, cal.total));
  return {
    free,
    total,
    combined: total === null ? null : Math.max(0, total - free),
    ph: phFrom(s.phMv, cal.ph, s.temperature),
    redox: s.redoxMv,
    temperature: s.temperature,
  };
}

const both = <T>(v: T): Record<DoseChannel, T> => ({
  hypochlorite: v,
  acid: v,
});

/** A controller switched on, its readings these signals', its integral as given. */
export function newController(
  settings: ControllerSettings = PLANT_SETTINGS,
  signals: CellSignals = idealSignals({ free: 1.3, ph: 7.3, temperature: 29 }),
  integral = 0,
): ControllerState {
  const s: ControllerState = {
    clock: 0,
    settings,
    running: both(true),
    mode: both<DoseMode>('auto'),
    manual: both(0.2),
    cal: NOMINAL_CAL,
    calLog: {},
    session: null,
    integral,
    flowLost: 0,
    feedDelayLeft: 0,
    atFull: both(0),
    timedOut: both(false),
    past: { chlorineLow: 0, chlorineHigh: 0, pHLow: 0, pHHigh: 0 },
    alarms: [],
    trend: [],
    measured: measure(signals, NOMINAL_CAL),
    signals,
    yout: both(0),
    release: both(false),
    lockout: false,
    flowFail: false,
    circulating: true,
  };
  // Its outputs as its readings call for them now.
  return stepController(s, { cell: signals, circulating: true }, 0);
}

/** Its alarms with `code` standing (raised now if not already) or gone. */
function setAlarm(
  alarms: AlarmEntry[],
  code: AlarmCode,
  on: boolean,
  now: number,
): AlarmEntry[] {
  const standing = alarms.findIndex(
    (a) => a.code === code && a.cleared === null,
  );
  if (on && standing < 0) {
    const next = [
      ...alarms,
      { code, raised: now, cleared: null, acked: NOTES.has(code) },
    ];
    // The oldest finished lines go first, then the oldest of all.
    while (next.length > ALARM_LINES) {
      const done = next.findIndex((a) => a.cleared !== null && a.acked);
      next.splice(done >= 0 ? done : 0, 1);
    }
    return next;
  }
  if (!on && standing >= 0) {
    const next = alarms.slice();
    next[standing] = { ...next[standing], cleared: now };
    // A cleared, acknowledged note leaves the list.
    return NOTES.has(code) ? next.filter((_, i) => i !== standing) : next;
  }
  return alarms;
}

/**
 * The controller `dt` seconds on: its readings from its cell's signals;
 * its interlocks, timers and alarms; PI on chlorine and P on pH, each in
 * AUTO or MANUAL, released or not; its trend.
 */
export function stepController(
  s: ControllerState,
  i: ControllerInputs,
  dt: number,
): ControllerState {
  const P = s.settings;
  const clock = s.clock + dt;
  const m = measure(i.cell, s.cal);
  const pumpFault = i.pumpFault ?? {};
  const tankEmpty = i.tankEmpty ?? {};
  // Sample flow, and the feed delay a restored flow or circulation re-arms.
  const flowLost = i.cell.flowOk ? 0 : s.flowLost + dt;
  const flowFail = !i.cell.flowOk && flowLost >= P.sampleFlowDelay;
  const restored =
    (s.flowFail && !flowFail) || (!s.circulating && i.circulating);
  const feedDelayLeft = restored
    ? P.feedDelay
    : Math.max(0, s.feedDelayLeft - dt);
  const calibrating = s.session !== null;
  const blocked =
    !i.circulating || flowFail || calibrating || feedDelayLeft > 0;
  const lockout = P.pHLockout > 0 && Math.abs(m.ph - P.pHSet) > P.pHLockout;
  const free: Record<DoseChannel, boolean> = {
    hypochlorite:
      s.running.hypochlorite &&
      !blocked &&
      !lockout &&
      !s.timedOut.hypochlorite &&
      !tankEmpty.hypochlorite,
    acid: s.running.acid && !blocked && !s.timedOut.acid && !tankEmpty.acid,
  };
  // PI on chlorine (its integral held while it may not dose, or in MANUAL);
  // P on pH.
  const error = P.chlorineSet - m.free;
  const integral =
    free.hypochlorite &&
    s.mode.hypochlorite === 'auto' &&
    P.chlorineIntegral > 0
      ? clamp(
          s.integral + (error * dt) / 3600 / P.chlorineIntegral,
          -P.chlorineBand,
          P.chlorineBand,
        )
      : s.integral;
  const auto: Record<DoseChannel, number> = {
    hypochlorite: clamp01((error + integral) / P.chlorineBand),
    acid: clamp01((m.ph - P.pHSet) / P.pHBand),
  };
  const yout = {} as Record<DoseChannel, number>;
  const atFull = {} as Record<DoseChannel, number>;
  const timedOut = { ...s.timedOut };
  for (const c of DOSE_CHANNELS) {
    yout[c] = free[c] ? (s.mode[c] === 'auto' ? auto[c] : s.manual[c]) : 0;
    // The maximum dosing time: in AUTO, at 100 %, counting.
    atFull[c] =
      free[c] && s.mode[c] === 'auto' && yout[c] >= 0.999
        ? s.atFull[c] + dt
        : 0;
    if (P.doseLimit > 0 && atFull[c] >= P.doseLimit) timedOut[c] = true;
  }
  // The limits, each past for its checkout time before its alarm.
  const pastFor = (on: boolean, was: number) => (on ? was + dt : 0);
  const past = {
    chlorineLow: pastFor(m.free < P.chlorineLow, s.past.chlorineLow),
    chlorineHigh: pastFor(m.free > P.chlorineHigh, s.past.chlorineHigh),
    pHLow: pastFor(m.ph < P.pHLow, s.past.pHLow),
    pHHigh: pastFor(m.ph > P.pHHigh, s.past.pHHigh),
  };
  const limit = (k: keyof typeof past) =>
    past[k] > 0 && past[k] >= P.limitDelay;
  const raised: [AlarmCode, boolean][] = [
    ['chlorine-low', limit('chlorineLow')],
    ['chlorine-high', limit('chlorineHigh')],
    ['ph-low', limit('pHLow')],
    ['ph-high', limit('pHHigh')],
    ['sample-flow', flowFail],
    ['circulation', !i.circulating],
    ['ph-lockout', lockout && s.running.hypochlorite],
    ['dose-limit-hypochlorite', timedOut.hypochlorite],
    ['dose-limit-acid', timedOut.acid],
    ['pump-hypochlorite', pumpFault.hypochlorite === true],
    ['pump-acid', pumpFault.acid === true],
    ['tank-hypochlorite', tankEmpty.hypochlorite === true],
    ['tank-acid', tankEmpty.acid === true],
  ];
  let alarms = s.alarms;
  for (const [code, on] of raised) alarms = setAlarm(alarms, code, on, clock);
  // Its trend, a point a minute.
  const last = s.trend[s.trend.length - 1];
  const trend =
    !last || clock - last.t >= TREND_STEP
      ? [
          ...s.trend.slice(Math.max(0, s.trend.length - TREND_POINTS + 1)),
          {
            t: clock,
            free: m.free,
            combined: m.combined,
            ph: m.ph,
            redox: m.redox,
            temperature: m.temperature,
            hypochlorite: yout.hypochlorite,
            acid: yout.acid,
          },
        ]
      : s.trend;
  return {
    ...s,
    clock,
    integral,
    flowLost,
    feedDelayLeft,
    atFull,
    timedOut,
    past,
    alarms,
    trend,
    measured: m,
    signals: i.cell,
    yout,
    release: free,
    lockout,
    flowFail,
    circulating: i.circulating,
  };
}

/** Its 4–20 mA output for a channel. */
export const milliamps = (s: ControllerState, c: DoseChannel) =>
  4 + 16 * s.yout[c];

/** Its relays to the control room, and its common alarm relay (dropped out by an acknowledgement). */
export interface ControllerRelays {
  chlorine: boolean;
  ph: boolean;
  sampleFlow: boolean;
  doseLimit: boolean;
  fault: boolean;
  common: boolean;
}

const standing = (s: ControllerState, ...codes: AlarmCode[]) =>
  s.alarms.some((a) => a.cleared === null && codes.includes(a.code));

export function relays(s: ControllerState): ControllerRelays {
  return {
    chlorine: standing(s, 'chlorine-low', 'chlorine-high'),
    ph: standing(s, 'ph-low', 'ph-high'),
    sampleFlow: standing(s, 'sample-flow'),
    doseLimit: standing(s, 'dose-limit-hypochlorite', 'dose-limit-acid'),
    fault:
      standing(
        s,
        'pump-hypochlorite',
        'pump-acid',
        'tank-hypochlorite',
        'tank-acid',
        'circulation',
      ) ||
      !s.running.hypochlorite ||
      !s.running.acid,
    common: s.alarms.some((a) => !a.acked),
  };
}

/** Its alarms not yet acknowledged, and those standing. */
export const unacknowledged = (s: ControllerState) =>
  s.alarms.filter((a) => !a.acked);
export const standingAlarms = (s: ControllerState) =>
  s.alarms.filter((a) => a.cleared === null);

// ---- What the operator does ---------------------------------------------------

export type ControllerAction =
  | { kind: 'start'; channel?: DoseChannel }
  | { kind: 'stop'; channel?: DoseChannel }
  | { kind: 'mode'; channel: DoseChannel; mode: DoseMode }
  | { kind: 'manual'; channel: DoseChannel; value: number }
  | { kind: 'set'; key: keyof ControllerSettings; value: number }
  | { kind: 'ack' }
  | { kind: 'cal-begin'; probe: ChlorineProbe }
  | { kind: 'cal-begin'; probe: 'ph'; method: 'buffers' | 'process' }
  | { kind: 'cal-zero' }
  | { kind: 'cal-span'; value: number }
  | { kind: 'cal-buffer' }
  | { kind: 'cal-process'; value: number }
  | { kind: 'cal-skip' }
  | { kind: 'cal-end' };

/** Why an action was refused, or null when it was carried out. */
export type Refusal =
  | 'zero-high'
  | 'dpd-low'
  | 'slope'
  | 'buffer-distance'
  | 'buffer-unknown'
  | 'zero'
  | 'not-calibrating'
  | 'out-of-range'
  | null;

/** What each refusal says on the touch screen. */
export const REFUSAL_TEXT: Record<Exclude<Refusal, null>, string> = {
  'zero-high': 'Zero current too high: is the sample flow stopped?',
  'dpd-low': 'DPD value too low to calibrate',
  slope: 'Slope out of range: probe worn or fouled',
  'buffer-distance': 'Buffers too close together',
  'buffer-unknown': 'Buffer not recognised',
  zero: 'Zero point out of range: electrode worn',
  'not-calibrating': 'No calibration in progress',
  'out-of-range': 'Value out of range',
};

export interface ActionResult {
  state: ControllerState;
  refused: Refusal;
  /** What it found, for the face to show (a slope, a buffer). */
  found?: { slopePercent?: number; zero?: number; buffer?: number };
}

const ok = (state: ControllerState, found?: ActionResult['found']) => ({
  state,
  refused: null,
  found,
});

/** Round to a setting's step, as its keys move it. */
const toStep = (v: number, step: number) => Math.round(v / step + 1e-9) * step;

/** The recognised buffer nearest a reading at the nominal slope, if near enough. */
export function recognisedBuffer(mv: number, temperature: number) {
  const ph = 7 - mv / slopeAt(NOMINAL.nernst, temperature);
  const best = BUFFERS.reduce((a, b) =>
    Math.abs(b - ph) < Math.abs(a - ph) ? b : a,
  );
  return Math.abs(best - ph) <= 1 ? best : null;
}

/** An action at its face, on the signals it last read. */
export function act(s: ControllerState, a: ControllerAction): ActionResult {
  const sig = s.signals;
  const T = sig.temperature;
  const channels = (c?: DoseChannel) => (c ? [c] : DOSE_CHANNELS);
  const log = (probe: ChlorineProbe | 'ph', rec: Omit<CalRecord, 'at'>) => ({
    ...s.calLog,
    [probe]: { ...rec, at: s.clock },
  });
  switch (a.kind) {
    case 'start':
    case 'stop': {
      const running = { ...s.running };
      for (const c of channels(a.channel)) running[c] = a.kind === 'start';
      const starting =
        a.kind === 'start' && channels(a.channel).some((c) => !s.running[c]);
      return ok({
        ...s,
        running,
        feedDelayLeft: starting ? s.settings.feedDelay : s.feedDelayLeft,
      });
    }
    case 'mode':
      return ok({ ...s, mode: { ...s.mode, [a.channel]: a.mode } });
    case 'manual':
      return ok({
        ...s,
        manual: { ...s.manual, [a.channel]: clamp01(toStep(a.value, 0.01)) },
      });
    case 'set': {
      const r = SETTING_RANGES[a.key];
      if (!(a.value >= r.min - 1e-9 && a.value <= r.max + 1e-9))
        return { state: s, refused: 'out-of-range' };
      return ok({
        ...s,
        settings: { ...s.settings, [a.key]: toStep(a.value, r.step) },
      });
    }
    case 'ack': {
      // Every alarm acknowledged; the dosing-time latches reset with them
      // (DEPOLOX: "Maximum dosing time?" stands until acknowledged).
      return ok({
        ...s,
        alarms: s.alarms.map((x) => (x.acked ? x : { ...x, acked: true })),
        timedOut: both(false),
        atFull: both(0),
      });
    }
    case 'cal-begin':
      return ok({
        ...s,
        session:
          a.probe === 'ph'
            ? a.method === 'buffers'
              ? { probe: 'ph', method: 'buffers', step: 'first', first: null }
              : { probe: 'ph', method: 'process' }
            : { probe: a.probe, step: 'zero' },
      });
    case 'cal-end':
      return ok({
        ...s,
        session: null,
        feedDelayLeft: s.session ? s.settings.feedDelay : s.feedDelayLeft,
      });
    case 'cal-skip': {
      const x = s.session;
      if (x && x.probe !== 'ph' && x.step === 'zero')
        return ok({ ...s, session: { probe: x.probe, step: 'span' } });
      return { state: s, refused: 'not-calibrating' };
    }
    case 'cal-zero': {
      const x = s.session;
      if (!x || x.probe === 'ph' || x.step !== 'zero')
        return { state: s, refused: 'not-calibrating' };
      const ua = x.probe === 'free' ? sig.freeUa : (sig.totalUa ?? 0);
      const cal = s.cal[x.probe];
      if (Math.abs(ua) > CAL_LIMITS.zeroUa) {
        return {
          state: {
            ...s,
            calLog: log(x.probe, {
              ok: false,
              slopePercent: (cal.slopeUa / NOMINAL.chlorineUa) * 100,
              zero: ua,
              note: REFUSAL_TEXT['zero-high'],
            }),
          },
          refused: 'zero-high',
        };
      }
      return ok(
        {
          ...s,
          cal: { ...s.cal, [x.probe]: { ...cal, zeroUa: ua } },
          session: { probe: x.probe, step: 'span' },
        },
        { zero: ua },
      );
    }
    case 'cal-span': {
      const x = s.session;
      if (!x || x.probe === 'ph' || x.step !== 'span')
        return { state: s, refused: 'not-calibrating' };
      const cal = s.cal[x.probe];
      const ua = x.probe === 'free' ? sig.freeUa : (sig.totalUa ?? 0);
      const refuse = (why: Exclude<Refusal, null>, slope: number) => ({
        state: {
          ...s,
          calLog: log(x.probe, {
            ok: false,
            slopePercent: (slope / NOMINAL.chlorineUa) * 100,
            zero: cal.zeroUa,
            note: REFUSAL_TEXT[why],
          }),
        },
        refused: why,
      });
      if (!(a.value >= CAL_LIMITS.dpdLow))
        return refuse('dpd-low', cal.slopeUa);
      const slope = (ua - cal.zeroUa) / a.value;
      const share = slope / NOMINAL.chlorineUa;
      if (!(share >= CAL_LIMITS.slope[0] && share <= CAL_LIMITS.slope[1]))
        return refuse('slope', slope);
      const slopePercent = share * 100;
      return ok(
        {
          ...s,
          cal: { ...s.cal, [x.probe]: { ...cal, slopeUa: slope } },
          calLog: log(x.probe, {
            ok: true,
            slopePercent,
            zero: cal.zeroUa,
            note: 'Calibrated',
          }),
          session: null,
          feedDelayLeft: s.settings.feedDelay,
        },
        { slopePercent },
      );
    }
    case 'cal-buffer': {
      const x = s.session;
      if (!x || x.probe !== 'ph' || x.method !== 'buffers')
        return { state: s, refused: 'not-calibrating' };
      const buffer = recognisedBuffer(sig.phMv, T);
      const refuse = (why: Exclude<Refusal, null>) => ({
        state: {
          ...s,
          calLog: log('ph', {
            ok: false,
            slopePercent: (s.cal.ph.slopeMv / NOMINAL.nernst) * 100,
            zero: s.cal.ph.zeroMv,
            note: REFUSAL_TEXT[why],
          }),
        },
        refused: why,
      });
      if (buffer === null) return refuse('buffer-unknown');
      if (x.step === 'first')
        return ok(
          {
            ...s,
            session: {
              ...x,
              step: 'second',
              first: { buffer, mv: sig.phMv },
            },
          },
          { buffer },
        );
      const first = x.first!;
      if (Math.abs(buffer - first.buffer) < CAL_LIMITS.bufferDistance)
        return refuse('buffer-distance');
      // mV per pH at this temperature, and so at 25 °C; the zero at pH 7.
      const slopeT = (first.mv - sig.phMv) / (buffer - first.buffer);
      const slopeMv = (slopeT * 298.15) / (T + 273.15);
      const zeroMv = first.mv + (first.buffer - 7) * slopeT;
      if (
        !(slopeMv >= CAL_LIMITS.slopeMv[0] && slopeMv <= CAL_LIMITS.slopeMv[1])
      )
        return refuse('slope');
      if (Math.abs(zeroMv) > CAL_LIMITS.zeroMv) return refuse('zero');
      const slopePercent = (slopeMv / NOMINAL.nernst) * 100;
      return ok(
        {
          ...s,
          cal: { ...s.cal, ph: { zeroMv, slopeMv } },
          calLog: log('ph', {
            ok: true,
            slopePercent,
            zero: zeroMv,
            note: 'Two-point calibration',
          }),
          session: null,
          feedDelayLeft: s.settings.feedDelay,
        },
        { buffer, slopePercent, zero: zeroMv },
      );
    }
    case 'cal-process': {
      const x = s.session;
      if (!x || x.probe !== 'ph' || x.method !== 'process')
        return { state: s, refused: 'not-calibrating' };
      // The zero that makes the reading the test's, its slope kept.
      const zeroMv = sig.phMv + (a.value - 7) * slopeAt(s.cal.ph.slopeMv, T);
      const slopePercent = (s.cal.ph.slopeMv / NOMINAL.nernst) * 100;
      if (Math.abs(zeroMv) > CAL_LIMITS.zeroMv)
        return {
          state: {
            ...s,
            calLog: log('ph', {
              ok: false,
              slopePercent,
              zero: zeroMv,
              note: REFUSAL_TEXT.zero,
            }),
          },
          refused: 'zero',
        };
      return ok(
        {
          ...s,
          cal: { ...s.cal, ph: { ...s.cal.ph, zeroMv } },
          calLog: log('ph', {
            ok: true,
            slopePercent,
            zero: zeroMv,
            note: 'One-point (phenol red)',
          }),
          session: null,
          feedDelayLeft: s.settings.feedDelay,
        },
        { zero: zeroMv },
      );
    }
  }
}

/** What a session's probe reads now, for its screen: raw and measured. */
export function sessionReading(s: ControllerState) {
  const x = s.session;
  if (!x) return null;
  if (x.probe === 'ph') {
    const mv = s.signals.phMv;
    return {
      raw: mv,
      unit: 'mV',
      value: phFrom(mv, s.cal.ph, s.signals.temperature),
      buffer: recognisedBuffer(mv, s.signals.temperature),
    };
  }
  const ua = x.probe === 'free' ? s.signals.freeUa : (s.signals.totalUa ?? 0);
  return {
    raw: ua,
    unit: 'µA',
    value: chlorineFrom(ua, s.cal[x.probe]),
    buffer: null,
  };
}
