/**
 * The Lidoluxe Wash-O-Tron (prompt 072; the owner, 2026-10-26): the filter
 * maker's own retrofit controller for the Olympic's five five-valve
 * filters, about 1996. It sets each filter's state from its buttons
 * (FILTER, BACKWASH, RINSE, ISOLATE, DRAIN; LOCKOUT), and in AUTO runs a
 * programme washing the filters one at a time: BACKWASH → SETTLE → RINSE
 * → FILTER, each step on its timer, started only once its valves are
 * proved and its flow is seen. It works the same valves the operators
 * do; it never washes while too few filters are left in service, never
 * starts a wash the backwash pit has no room for, and waits while the pit
 * is inhibited. Air scour: provided for, not fitted. Pure: it takes what
 * it can sense and gives the valves it commands.
 */

export type FilterMode = 'filter' | 'backwash' | 'rinse' | 'isolate' | 'drain';

/** A filter's valves, as the controller commands them for each mode (and the programme's SETTLE, all shut). */
export const MODE_VALVES: Record<
  FilterMode | 'settle',
  readonly ('V1' | 'V2' | 'V3' | 'V4' | 'V5' | 'DV1')[]
> = {
  filter: ['V1', 'V2'],
  backwash: ['V3', 'V4'],
  rinse: ['V1', 'V5'],
  isolate: [],
  settle: [],
  drain: ['DV1'],
};
export const FILTER_VALVES = ['V1', 'V2', 'V3', 'V4', 'V5', 'DV1'] as const;
export type FilterValve = (typeof FILTER_VALVES)[number];

/** Where a filter is in a change of state: steady, its old path shutting, its new opening, its flow being proved. */
export type Phase = 'steady' | 'closing' | 'opening' | 'proving' | 'fault';

export interface WashFilter {
  /** The mode it is in (or last reached). */
  mode: FilterMode | 'settle';
  /** The mode it is going to. */
  target: FilterMode | 'settle';
  phase: Phase;
  /** Seconds in its phase. */
  phaseTime: number;
  /** Handed to the programme. */
  auto: boolean;
  /** Held isolated against the programme while worked on (local only). */
  lockout: boolean;
  /** The world's time it was last washed, s. */
  lastWash: number;
}

export type ProgrammeStep = 'backwash' | 'settle' | 'rinse';
export type Waiting =
  | null
  | 'PIT CAPACITY'
  | 'PIT INHIBIT'
  | 'LOW FLOW'
  | 'FILTER UNAVAILABLE';

export interface WashOTron {
  filters: WashFilter[];
  /** The programme running (AUTO), held, the filter it is washing and its step. */
  running: boolean;
  hold: boolean;
  washing: number | null;
  step: ProgrammeStep | null;
  /** Seconds into the step, counted only once it is proved. */
  stepTime: number;
  waiting: Waiting;
  /** A filter asked to be washed now, out of turn. */
  washNow: number | null;
  /** Its setpoints, seconds and hours. */
  setpoints: Setpoints;
  /** Its display: the view shown, and the setpoint being edited there. */
  view: number;
  setpoint: number;
  /** A value being edited, not yet stored by ENTER. */
  editing: number | null;
  /** Seconds left of setpoint editing (PROGRAMME held). */
  unlocked: number;
  /** Its annunciator: each alarm on, and accepted. */
  alarms: Record<Alarm, { on: boolean; accepted: boolean }>;
  /** Its last events, newest first. */
  events: string[];
}

export type Alarm = 'stepOverrun' | 'valveFault' | 'pitInhibit' | 'lowCirc';
export const ALARMS: readonly Alarm[] = [
  'stepOverrun',
  'valveFault',
  'pitInhibit',
  'lowCirc',
];

export interface Setpoints {
  backwash: number;
  settle: number;
  rinse: number;
  /** Hours between washes of a filter. */
  interval: number;
  /** Air scour, seconds: provided for, not fitted (0). */
  airScour: number;
}

/** Each setpoint: its name on the display, its step, its limits. */
export const SETPOINTS: readonly {
  key: keyof Setpoints;
  name: string;
  step: number;
  min: number;
  max: number;
  unit: 's' | 'h';
  fitted?: boolean;
}[] = [
  { key: 'backwash', name: 'BACKWASH', step: 10, min: 60, max: 600, unit: 's' },
  { key: 'settle', name: 'SETTLE', step: 10, min: 0, max: 300, unit: 's' },
  { key: 'rinse', name: 'RINSE', step: 10, min: 30, max: 600, unit: 's' },
  { key: 'interval', name: 'INTERVAL', step: 1, min: 6, max: 168, unit: 'h' },
  {
    key: 'airScour',
    name: 'AIR SCOUR',
    step: 0,
    min: 0,
    max: 0,
    unit: 's',
    fitted: false,
  },
];

/** Its display's views, cycled by MODE. */
export const VIEWS = [
  'PROGRAMME',
  'NEXT',
  'PIT',
  'SETPOINTS',
  'EVENTS',
] as const;

export const WASH = {
  /** A valve's actuator, shut to open, s (as the room's actuators stroke), with a margin. */
  travel: 10,
  /** Waiting this long for flow before a fault, s. */
  proveFlow: 30,
  /** A step overruns this long past its time, s. */
  overrun: 120,
  /** Filters left in service while one washes, at least. */
  minInService: 4,
  /** What a wash puts in the pit, m³, at about this flow, m³/h. */
  washFlow: 180,
  /** Setpoint editing stays open this long after PROGRAMME, s. */
  unlockFor: 60,
  /** Flow through a bed that proves it, m³/h. */
  provedFlow: 20,
} as const;

export function newWashOTron(filters = 5): WashOTron {
  return {
    filters: Array.from({ length: filters }, () => ({
      mode: 'filter' as const,
      target: 'filter' as const,
      phase: 'steady' as const,
      phaseTime: 0,
      auto: true,
      lockout: false,
      lastWash: 0,
    })),
    running: false,
    hold: false,
    washing: null,
    step: null,
    stepTime: 0,
    waiting: null,
    washNow: null,
    setpoints: {
      backwash: 300,
      settle: 60,
      rinse: 180,
      interval: 48,
      airScour: 0,
    },
    view: 0,
    setpoint: 0,
    editing: null,
    unlocked: 0,
    alarms: Object.fromEntries(
      ALARMS.map((a) => [a, { on: false, accepted: false }]),
    ) as WashOTron['alarms'],
    events: [],
  };
}

export type WashAction =
  | { act: 'mode'; filter: number; mode: FilterMode }
  | { act: 'auto'; filter: number }
  | { act: 'lockout'; filter: number }
  | { act: 'run' }
  | { act: 'hold' }
  | { act: 'step' }
  | { act: 'skip' }
  | { act: 'wash-now'; filter: number }
  | { act: 'view' }
  | { act: 'unlock' }
  | { act: 'adjust'; by: 1 | -1 }
  | { act: 'enter' }
  | { act: 'accept' }
  | { act: 'reset' };

const log = (s: WashOTron, time: number, text: string): string[] => {
  const hh = String(Math.floor((time / 3600) % 24)).padStart(2, '0');
  const mm = String(Math.floor((time / 60) % 60)).padStart(2, '0');
  return [`${hh}:${mm} ${text}`, ...s.events].slice(0, 8);
};

const setFilter = (
  s: WashOTron,
  n: number,
  f: Partial<WashFilter>,
): WashFilter[] => s.filters.map((x, i) => (i === n ? { ...x, ...f } : x));

/** Start a filter toward `target`: its present path shut first, unless already there. */
function go(f: WashFilter, target: FilterMode | 'settle'): Partial<WashFilter> {
  if (f.target === target && f.phase !== 'fault') return {};
  return { target, phase: 'closing', phaseTime: 0 };
}

/** What a button does, at `time`. */
export function actOnWashOTron(
  s: WashOTron,
  a: WashAction,
  time: number,
): WashOTron {
  switch (a.act) {
    case 'mode': {
      const f = s.filters[a.filter];
      if (!f || f.lockout) return s;
      // A state chosen by hand takes the filter out of the programme.
      const out = s.washing === a.filter;
      return {
        ...s,
        filters: setFilter(s, a.filter, { ...go(f, a.mode), auto: false }),
        ...(out ? { washing: null, step: null, stepTime: 0 } : {}),
        events: log(s, time, `F${a.filter + 1} ${a.mode.toUpperCase()}`),
      };
    }
    case 'auto': {
      const f = s.filters[a.filter];
      if (!f || f.lockout) return s;
      return { ...s, filters: setFilter(s, a.filter, { auto: !f.auto }) };
    }
    case 'lockout': {
      const f = s.filters[a.filter];
      if (!f) return s;
      const lockout = !f.lockout;
      return {
        ...s,
        filters: setFilter(s, a.filter, {
          lockout,
          auto: lockout ? false : f.auto,
          ...(lockout ? go(f, 'isolate') : {}),
        }),
        ...(lockout && s.washing === a.filter
          ? { washing: null, step: null, stepTime: 0 }
          : {}),
        events: log(
          s,
          time,
          `F${a.filter + 1} ${lockout ? 'LOCKED OUT' : 'LOCKOUT OFF'}`,
        ),
      };
    }
    case 'run':
      return {
        ...s,
        running: !s.running,
        hold: false,
        events: log(s, time, s.running ? 'AUTO OFF' : 'AUTO ON'),
      };
    case 'hold':
      return s.running ? { ...s, hold: !s.hold } : s;
    case 'step':
      // End the step now: never a proof or the pit's admission skipped,
      // only its timer (STEP is refused while its valves are unproved).
      if (s.washing === null || s.step === null) return s;
      if (s.filters[s.washing].phase !== 'steady') return s;
      return { ...s, stepTime: Number.POSITIVE_INFINITY };
    case 'skip': {
      // Pass this filter: back to filtering, still due.
      if (s.washing === null) return s;
      const n = s.washing;
      return {
        ...s,
        filters: setFilter(s, n, go(s.filters[n], 'filter')),
        washing: null,
        step: null,
        stepTime: 0,
        events: log(s, time, `F${n + 1} SKIPPED`),
      };
    }
    case 'wash-now':
      return s.filters[a.filter]?.lockout ? s : { ...s, washNow: a.filter };
    case 'view':
      // In SETPOINTS, MODE steps through the setpoints before moving on.
      if (VIEWS[s.view] === 'SETPOINTS' && s.setpoint < SETPOINTS.length - 1)
        return { ...s, setpoint: s.setpoint + 1, editing: null };
      return {
        ...s,
        view: (s.view + 1) % VIEWS.length,
        setpoint: 0,
        editing: null,
      };
    case 'unlock':
      return { ...s, unlocked: WASH.unlockFor };
    case 'adjust': {
      if (VIEWS[s.view] !== 'SETPOINTS' || s.unlocked <= 0) return s;
      const sp = SETPOINTS[s.setpoint];
      if (sp.fitted === false) return s;
      const now = s.editing ?? s.setpoints[sp.key];
      return {
        ...s,
        editing: Math.min(sp.max, Math.max(sp.min, now + a.by * sp.step)),
        unlocked: WASH.unlockFor,
      };
    }
    case 'enter': {
      if (s.editing === null || s.unlocked <= 0) return s;
      const sp = SETPOINTS[s.setpoint];
      return {
        ...s,
        setpoints: { ...s.setpoints, [sp.key]: s.editing },
        editing: null,
        events: log(s, time, `${sp.name} ${s.editing}${sp.unit}`),
      };
    }
    case 'accept':
      return {
        ...s,
        alarms: Object.fromEntries(
          ALARMS.map((k) => [k, { ...s.alarms[k], accepted: true }]),
        ) as WashOTron['alarms'],
      };
    case 'reset': {
      // Faults cleared: a faulted filter back to filtering.
      const filters = s.filters.map((f) =>
        f.phase === 'fault'
          ? {
              ...f,
              target: f.lockout ? ('isolate' as const) : ('filter' as const),
              phase: 'closing' as const,
              phaseTime: 0,
            }
          : f,
      );
      return {
        ...s,
        filters,
        alarms: Object.fromEntries(
          ALARMS.map((k) => [
            k,
            s.alarms[k].on && k === 'pitInhibit'
              ? s.alarms[k]
              : { on: false, accepted: false },
          ]),
        ) as WashOTron['alarms'],
      };
    }
  }
}

/** What it senses, from the world. */
export interface WashSensing {
  /** The world's time, s. */
  time: number;
  /** Whether the Olympic's pumps run. */
  pumping: boolean;
  /** Each filter's flow through its bed, m³/h: down positive, up (backwash) negative. */
  bedFlow: readonly number[];
  /** The pit's water, and its HIGH, m³; whether it is inhibited. */
  pit: number;
  pitHigh: number;
  pitInhibit: boolean;
  /** Whether a lounge filter is washing (none at once). */
  loungeWashing: boolean;
}

/** Whether a filter's flow proves its mode. */
function flowProved(mode: FilterMode | 'settle', flow: number): boolean {
  if (mode === 'backwash') return flow < -WASH.provedFlow;
  if (mode === 'rinse' || mode === 'filter') return flow > WASH.provedFlow;
  return true;
}

/** What a whole wash puts in the pit, m³. */
export function washVolume(s: Setpoints): number {
  return (WASH.washFlow * (s.backwash + s.rinse)) / 3600;
}

/** The controller `dt` seconds on. */
export function stepWashOTron(
  s: WashOTron,
  sense: WashSensing,
  dt: number,
): WashOTron {
  let next: WashOTron = { ...s, unlocked: Math.max(0, s.unlocked - dt) };
  // Each filter's change of state: shut, then open, then proved.
  next = {
    ...next,
    filters: next.filters.map((f, i) => {
      const t = f.phaseTime + dt;
      switch (f.phase) {
        case 'closing':
          return t >= WASH.travel
            ? { ...f, phase: 'opening' as const, phaseTime: 0 }
            : { ...f, phaseTime: t };
        case 'opening':
          return t >= WASH.travel
            ? { ...f, phase: 'proving' as const, phaseTime: 0 }
            : { ...f, phaseTime: t };
        case 'proving': {
          const needsFlow =
            sense.pumping &&
            (f.target === 'backwash' ||
              f.target === 'rinse' ||
              f.target === 'filter');
          if (!needsFlow || flowProved(f.target, sense.bedFlow[i] ?? 0))
            return {
              ...f,
              mode: f.target,
              phase: 'steady' as const,
              phaseTime: 0,
            };
          return t >= WASH.proveFlow
            ? { ...f, phase: 'fault' as const, phaseTime: 0 }
            : { ...f, phaseTime: t };
        }
        default:
          return { ...f, phaseTime: t };
      }
    }),
  };
  const faulted = next.filters.some((f) => f.phase === 'fault');
  const raise = (a: WashOTron['alarms'], k: Alarm, on: boolean) =>
    on && !a[k].on
      ? { ...a, [k]: { on: true, accepted: false } }
      : !on && k === 'pitInhibit'
        ? { ...a, [k]: { on: false, accepted: false } }
        : a;
  let alarms = raise(next.alarms, 'valveFault', faulted);
  alarms = raise(alarms, 'pitInhibit', sense.pitInhibit);
  next = { ...next, alarms };
  if (!next.running || next.hold) return { ...next, waiting: null };

  // A wash under way: its step's timer, once proved.
  if (next.washing !== null && next.step !== null) {
    const n = next.washing;
    const f = next.filters[n];
    if (f.phase === 'fault') return { ...next, hold: true };
    if (sense.pitInhibit) return { ...next, waiting: 'PIT INHIBIT' };
    if (f.phase !== 'steady') return { ...next, waiting: null };
    const stepTime = next.stepTime + dt;
    const limit =
      next.step === 'backwash'
        ? next.setpoints.backwash
        : next.step === 'settle'
          ? next.setpoints.settle
          : next.setpoints.rinse;
    if (stepTime > limit + WASH.overrun && Number.isFinite(stepTime))
      next = { ...next, alarms: raise(next.alarms, 'stepOverrun', true) };
    if (stepTime < limit) return { ...next, stepTime, waiting: null };
    // The step done: on to the next.
    const order: ProgrammeStep[] = ['backwash', 'settle', 'rinse'];
    const at = order.indexOf(next.step as ProgrammeStep);
    if (at < order.length - 1) {
      const step = order[at + 1];
      return {
        ...next,
        step,
        stepTime: 0,
        filters: setFilter(next, n, go(f, step)),
        events: log(next, sense.time, `F${n + 1} ${step.toUpperCase()}`),
      };
    }
    return {
      ...next,
      washing: null,
      step: null,
      stepTime: 0,
      filters: setFilter(next, n, { ...go(f, 'filter'), lastWash: sense.time }),
      events: log(next, sense.time, `F${n + 1} WASHED`),
    };
  }

  // None under way: the next due, if it may start.
  const due = (i: number) =>
    next.washNow === i ||
    sense.time - next.filters[i].lastWash >= next.setpoints.interval * 3600;
  const candidate = next.filters.findIndex(
    (f, i) =>
      (f.auto || next.washNow === i) &&
      !f.lockout &&
      f.mode === 'filter' &&
      f.phase === 'steady' &&
      due(i),
  );
  if (candidate < 0) return { ...next, waiting: null };
  const inService = next.filters.filter(
    (f, i) => i !== candidate && f.mode === 'filter' && f.phase === 'steady',
  ).length;
  if (inService < WASH.minInService || sense.loungeWashing)
    return {
      ...next,
      waiting: 'FILTER UNAVAILABLE',
      alarms: raise(next.alarms, 'lowCirc', inService < WASH.minInService),
    };
  if (!sense.pumping) return { ...next, waiting: 'LOW FLOW' };
  if (sense.pitInhibit) return { ...next, waiting: 'PIT INHIBIT' };
  if (sense.pit + washVolume(next.setpoints) > sense.pitHigh)
    return { ...next, waiting: 'PIT CAPACITY' };
  return {
    ...next,
    washing: candidate,
    step: 'backwash',
    stepTime: 0,
    waiting: null,
    washNow: next.washNow === candidate ? null : next.washNow,
    filters: setFilter(
      next,
      candidate,
      go(next.filters[candidate], 'backwash'),
    ),
    events: log(next, sense.time, `F${candidate + 1} BACKWASH`),
  };
}

/** The valves the controller commands for filter `n`, open or shut, in its phase. */
export function commandedValves(f: WashFilter): Record<FilterValve, boolean> {
  // Shutting: everything shut. Opening and after: the target's path.
  const open =
    f.phase === 'closing' || f.phase === 'fault'
      ? []
      : f.phase === 'steady'
        ? MODE_VALVES[f.mode]
        : MODE_VALVES[f.target];
  return Object.fromEntries(
    FILTER_VALVES.map((v) => [v, open.includes(v)]),
  ) as Record<FilterValve, boolean>;
}

/**
 * Whether a filter's valves, as they stand, are what its steady mode
 * needs: a valve worked by hand mid-wash shows here.
 */
export function valvesMatch(
  f: WashFilter,
  open: Readonly<Record<FilterValve, boolean>>,
): boolean {
  const want = MODE_VALVES[f.mode];
  return FILTER_VALVES.every((v) => open[v] === want.includes(v));
}
