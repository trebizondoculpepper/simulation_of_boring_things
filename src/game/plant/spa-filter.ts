import type {
  GlassInputs,
  GlassMode,
} from '../../toolkit/components/plant/logic/sight-glass';
import {
  bedPasses,
  filterSizing,
  newIdealFilter,
  stepFilterBed,
  washedOut,
} from './ideal-filter';
import type { IdealFilterSpec, IdealFilterState } from './ideal-filter';

/**
 * A packaged spa cabinet's filter and its automatic backwash (the owner,
 * 2026-10-25): the jacuzzi's and the foot spa's work the same way, the
 * jacuzzi's only bigger. Each is the ideal filter (`ideal-filter.ts`),
 * sized by its diameter. Inside, small servo-driven three-way valves (the
 * owner, 2026-10-25: not a five-valve face, which is for bigger plant)
 * turn its pump's flow between the spa and the drain, and the bed's way
 * through.
 * Its programme runs a backwash on its schedule, set by its MODE button
 * (every 24, 12 or 6 hours, or off), or at once by WASH NOW: the pump
 * stops, the valve turns to BACKWASH and the pump runs the filter in
 * reverse to drain; it turns to RINSE, settling the bed to drain; then
 * back to FILTER and the pump restarts. Its dirty water goes to the drain;
 * what it takes the balance tank's make-up gives back. Pure; m³/h, g/m³, s.
 */

/**
 * The cabinets' filters, the largest the cabinets hold without moving
 * their fittings (the owner, 2026-10-25): the jacuzzi's Ø0.44 m on a 0.8 m
 * bed, the foot spa's Ø0.38 m on 0.6 m; at their circulations (8 and
 * 6 m³/h) both filter at about 53 m/h, a spa filter's rate.
 */
export const SPA_FILTERS = {
  jacuzzi: { diameter: 0.44, bedDepth: 0.8 },
  footSpa: { diameter: 0.38, bedDepth: 0.6 },
} as const satisfies Record<string, IdealFilterSpec>;

/** The schedules MODE steps through, in order. */
export const SCHEDULES = ['24h', '12h', '6h', 'off'] as const;
export type BackwashSchedule = (typeof SCHEDULES)[number];
const EVERY: Record<BackwashSchedule, number> = {
  '24h': 24 * 3600,
  '12h': 12 * 3600,
  '6h': 6 * 3600,
  off: Infinity,
};

/** The programme's steps, and how long each takes, s. */
export const PROGRAMME = { stopping: 10, backwash: 180, rinse: 45 } as const;
export type FilterPhase = 'filter' | keyof typeof PROGRAMME;

export interface SpaFilter {
  spec: IdealFilterSpec;
  bed: IdealFilterState;
  schedule: BackwashSchedule;
  phase: FilterPhase;
  /** Seconds in this phase. */
  phaseTime: number;
  /** Seconds since its last backwash. */
  sinceWash: number;
}

export const newSpaFilter = (
  spec: IdealFilterSpec,
  schedule: BackwashSchedule = '24h',
): SpaFilter => ({
  spec,
  bed: newIdealFilter(),
  schedule,
  phase: 'filter',
  // In service from the start: its UV long since warm.
  phaseTime: UV_WARM,
  sinceWash: 0,
});

/** A UV lamp's warm-up after its flow returns, s. */
export const UV_WARM = 30;
/** Its servo valves' travel, s: during the stop at the start of a wash, and after it, back to filtering. */
export const SERVO_TRAVEL = 6;

/**
 * What a wash changes in its cabinet, beside the water's way (the owner,
 * 2026-10-25): its servo valves move at the start (in the stop) and the
 * end (back to filtering); its pump stops for the stop, then runs on
 * through the backwash and rinse, against the drain's lighter load; its
 * dosing pumps stop (dosing what goes to drain wastes chemical); its UV
 * goes out with no flow through it and warms up again after; its heater
 * stays off; its jets and air are refused; its filter's gauge reads the
 * wash's pressures; its WASH lamp lights. Pure.
 */
export function washSignals(f: SpaFilter) {
  const washing = f.phase !== 'filter';
  return {
    washing,
    /** Its servo valves travelling now. */
    servos:
      f.phase === 'stopping' ||
      (f.phase === 'filter' && f.phaseTime < SERVO_TRAVEL),
    /** Its pump's motor let run: not in the stop. */
    pumpAllowed: f.phase !== 'stopping',
    /** Its pump's sound: lighter, faster, against the drain. */
    pumpRate: washing && f.phase !== 'stopping' ? 1.08 : 1,
    dosing: !washing,
    heating: !washing,
    jets: !washing,
    /** Its UV lit: with its flow back, after its warm-up. */
    uvReady: !washing && f.phaseTime >= UV_WARM,
    /** Its filter's gauge, bar, while its pump runs. */
    gaugeBar: { filter: 0.7, backwash: 0.45, rinse: 0.6, stopping: 0 }[f.phase],
    /** Its sight glass, if it shows one: the backwash murky, the rinse clearing. */
    murk:
      f.phase === 'backwash'
        ? Math.max(0.2, 1 - f.phaseTime / PROGRAMME.backwash)
        : f.phase === 'rinse'
          ? 0.2 * (1 - f.phaseTime / PROGRAMME.rinse)
          : 0,
  };
}

export type SpaFilterAction = { act: 'mode' } | { act: 'wash-now' };

export function actOnSpaFilter(f: SpaFilter, a: SpaFilterAction): SpaFilter {
  if (a.act === 'mode')
    return {
      ...f,
      schedule:
        SCHEDULES[(SCHEDULES.indexOf(f.schedule) + 1) % SCHEDULES.length],
    };
  return f.phase === 'filter' ? { ...f, phase: 'stopping', phaseTime: 0 } : f;
}

/** Whether the programme lets its cabinet circulate to the spa: only while filtering. */
export const filtering = (f: SpaFilter) => f.phase === 'filter';

/**
 * The flows through it, from the pump's: filtering, down through the bed
 * back to the spa; backwashing, up through it to drain; rinsing, down
 * through it to drain; stopping, none.
 */
export function spaFilterFlows(f: SpaFilter, pump: number, inDirt: number) {
  const running = f.phase !== 'stopping' && pump > 0;
  const bed = !running ? 0 : f.phase === 'backwash' ? -pump : pump;
  const toSpa = running && f.phase === 'filter' ? pump : 0;
  const toWaste = running && f.phase !== 'filter' ? pump : 0;
  const passes = bedPasses(f.spec, f.bed, inDirt);
  return {
    bed,
    toSpa,
    toWaste,
    /** Dirt in what it gives, g/m³: the spa's water filtered, or what it washes out to drain. */
    outDirt: bed > 0 ? passes : 0,
    wasteDirt:
      f.phase === 'backwash'
        ? inDirt + washedOut(f.spec, f.bed, bed)
        : f.phase === 'rinse'
          ? passes
          : 0,
  };
}

/** The filter `dt` seconds on: its programme, and its bed by the flow through it. */
export function stepSpaFilter(
  f: SpaFilter,
  pump: number,
  inDirt: number,
  dt: number,
): SpaFilter {
  if (!(dt > 0)) return f;
  const flows = spaFilterFlows(f, pump, inDirt);
  const bed = stepFilterBed(f.spec, f.bed, flows.bed, inDirt, dt);
  let { phase, phaseTime, sinceWash } = f;
  phaseTime += dt;
  sinceWash += dt;
  if (phase === 'filter') {
    if (sinceWash >= EVERY[f.schedule]) {
      phase = 'stopping';
      phaseTime = 0;
    }
  } else if (phaseTime >= PROGRAMME[phase]) {
    const next: Record<keyof typeof PROGRAMME, FilterPhase> = {
      stopping: 'backwash',
      backwash: 'rinse',
      rinse: 'filter',
    };
    phase = next[phase];
    phaseTime = 0;
    if (phase === 'filter') sinceWash = 0;
  }
  return { ...f, bed, phase, phaseTime, sinceWash };
}

const clock = (s: number) => {
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  return h > 0
    ? `${h}:${String(m % 60).padStart(2, '0')}h`
    : `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

/** Its line on its cabinet's display, the same on both cabinets. */
export function spaFilterLine(f: SpaFilter): string {
  if (f.phase !== 'filter')
    return `${
      { stopping: 'WASH: STOP', backwash: 'BACKWASH', rinse: 'RINSE' }[f.phase]
    } ${clock(PROGRAMME[f.phase] - f.phaseTime)}`;
  if (f.schedule === 'off') return 'WASH OFF';
  return `WASH ${f.schedule.toUpperCase()} IN ${clock(EVERY[f.schedule] - f.sinceWash)}`;
}

/** A filter's design flow, m³/h, for its cabinet's sizing. */
export const spaFilterFlow = (f: SpaFilter) => filterSizing(f.spec).designFlow;

/**
 * What its sight glass shows of its bed (`sight-glass.ts`): its dirt as
 * the crust, its fissuring as the channelled surface, the backwash's
 * murk, the rinse clearing.
 */
export function spaFilterGlass(f: SpaFilter, pumping: boolean): GlassInputs {
  const mode: GlassMode =
    !pumping || f.phase === 'stopping'
      ? 'stopped'
      : f.phase === 'filter'
        ? 'service'
        : f.phase;
  return {
    mode,
    dirt: f.bed.dirt / filterSizing(f.spec).dirtRef,
    channelling: f.bed.fissuring,
    murk: pumping ? washSignals(f).murk : 0,
  };
}
