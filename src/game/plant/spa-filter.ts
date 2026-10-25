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
 * sized by its diameter, behind a multiport valve turned by an actuator.
 * Its programme runs a backwash on its schedule, set by its MODE button
 * (every 24, 12 or 6 hours, or off), or at once by WASH NOW: the pump
 * stops, the valve turns to BACKWASH and the pump runs the filter in
 * reverse to drain; it turns to RINSE, settling the bed to drain; then
 * back to FILTER and the pump restarts. Its dirty water goes to the drain;
 * what it takes the balance tank's make-up gives back. Pure; m³/h, g/m³, s.
 */

/** The cabinets' filters: the jacuzzi's Ø0.75 m, the foot spa's Ø0.5 m. */
export const SPA_FILTERS = {
  jacuzzi: { diameter: 0.75 },
  footSpa: { diameter: 0.5 },
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
  phaseTime: 0,
  sinceWash: 0,
});

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
