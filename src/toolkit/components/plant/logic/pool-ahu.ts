/**
 * A pool hall air handling unit's working (`views/pool-ahu.ts`): pure.
 *
 * Started, its dampers open first, and only once they are open do its
 * fans run up, over twenty seconds. Its heat pump dries the hall's air,
 * cutting in above 60 % relative humidity and out below 55 %; with the
 * unit stopped, the hall's air grows damper. Its filters load as it runs,
 * from 80 Pa clean to the 250 Pa at which they want changing; left to
 * 400 Pa, the unit trips on them, until they are changed and it is reset.
 */

export type AhuMode = 'hand' | 'off' | 'auto';

export interface AhuState {
  /** Dampers' opening, 0 to 1. */
  dampers: number;
  /** Fans' speed, 0 to 1. */
  speed: number;
  heatPump: boolean;
  /** Pressure drop across its filters, Pa. */
  filterPa: number;
  /** Its hall's relative humidity, %. */
  hallRh: number;
  /** Tripped on blocked filters. */
  tripped: boolean;
}

export interface AhuInputs {
  /** Its local isolator. */
  isolatorOn: boolean;
  mode: AhuMode;
  /** The building's time programme, in AUTO: the hall in use. */
  demand: boolean;
}

export const FILTER_CLEAN = 80;
export const FILTER_CHANGE = 250;
export const FILTER_TRIP = 400;
/** Seconds of running for the filters to load from clean to change. */
const FILTER_LIFE = 90 * 86400;

export const newAhu = (state: Partial<AhuState> = {}): AhuState => ({
  dampers: 0,
  speed: 0,
  heatPump: false,
  filterPa: FILTER_CLEAN,
  hallRh: 58,
  tripped: false,
  ...state,
});

/** Whether it is asked to run. */
export const wanted = (s: AhuState, i: AhuInputs) =>
  i.isolatorOn &&
  !s.tripped &&
  (i.mode === 'hand' || (i.mode === 'auto' && i.demand));

const toward = (v: number, target: number, rate: number, dt: number) =>
  v < target
    ? Math.min(target, v + rate * dt)
    : Math.max(target, v - rate * dt);

export function stepAhu(s: AhuState, i: AhuInputs, dt: number): AhuState {
  const run = wanted(s, i);
  const dampers = toward(s.dampers, run ? 1 : 0, 1 / 10, dt);
  // The fans start once the dampers are open, and stop before they shut.
  const speed = toward(s.speed, run && dampers > 0.9 ? 1 : 0, 1 / 20, dt);
  const running = speed > 0.05;
  const heatPump = running && (s.heatPump ? s.hallRh > 55 : s.hallRh > 60);
  // The hall's air: dried by the heat pump, a little by fresh air alone,
  // and damper by the pool's evaporation when nothing moves it.
  const rhTarget = heatPump ? 52 : running ? 62 : 80;
  const hallRh = s.hallRh + (rhTarget - s.hallRh) * Math.min(1, dt / 3600);
  const filterPa =
    s.filterPa + speed * ((FILTER_CHANGE - FILTER_CLEAN) / FILTER_LIFE) * dt;
  const tripped = s.tripped || filterPa >= FILTER_TRIP;
  return { dampers, speed, heatPump, filterPa, hallRh, tripped };
}

/** New filters fitted: back to clean. */
export const changeFilters = (s: AhuState): AhuState => ({
  ...s,
  filterPa: FILTER_CLEAN,
});

/** RESET: clears a trip only once its cause is gone. */
export const resetAhu = (s: AhuState): AhuState =>
  s.filterPa < FILTER_TRIP ? { ...s, tripped: false } : s;

/** Its front panel's lamps. */
export function ahuLamps(s: AhuState) {
  return {
    run: s.speed > 0.05,
    heatPump: s.heatPump,
    filter: s.filterPa >= FILTER_CHANGE,
    fault: s.tripped,
  };
}

/** Its controller's 16 × 2 display. */
export function ahuDisplay(s: AhuState, airflow: number): string[] {
  const pad = (t: string) => t.padEnd(16).slice(0, 16);
  const flow = Math.round((airflow * s.speed) / 100) * 100;
  const first = s.tripped
    ? 'TRIP: FILTERS'
    : s.speed > 0.05
      ? `RUN ${String(flow).padStart(5)} M3/H`
      : s.dampers > 0.05
        ? 'DAMPERS OPENING'
        : 'STOPPED';
  const second = `RH ${Math.round(s.hallRh)}% FLT ${Math.round(s.filterPa)}PA`;
  return [pad(first), pad(second)];
}
