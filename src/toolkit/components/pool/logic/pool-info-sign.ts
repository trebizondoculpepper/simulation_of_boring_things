/**
 * What a poolside information sign shows: the time, the hall's air
 * temperature and humidity, and under the pool's name its five water
 * readings, each on its own row of red seven-segment digits. Pure: the
 * sign's state, and the text each row shows from it at a moment.
 *
 * After the water-treatment boards poolside in public pools (Eltin's,
 * with Bodet's for the enclosure; `doc/research/pool-info-sign.md`).
 *
 * Conventions, as on the real boards:
 * - A reading not to hand shows dashes, never zero.
 * - A reading too old to trust (older than its field's `staleAfter`)
 *   still shows, but flashes: `stale` is set and the view blinks it.
 * - A reading the digits cannot hold shows `Err`.
 * - Power off shows nothing; the segment test lights every segment and
 *   point, so a dead segment shows.
 *
 * Water temperature, pH and free chlorine are measured continuously in
 * the plant's sample flow cell (once `sampling.ts`, now the Trios' `aqualis-sampler.ts`); combined
 * chlorine is not measured there but worked out by hand from the daily
 * DPD test and keyed in, so it goes stale only after a day.
 */

export type SignField =
  | 'air'
  | 'humidity'
  | 'water'
  | 'ph'
  | 'free'
  | 'combined'
  | 'redox';

export interface SignFieldSpec {
  id: SignField;
  /** The hall's readings, above the pool's name, or the pool's, below. */
  group: 'hall' | 'pool';
  /** The printed legend, in lines. */
  label: readonly string[];
  /** The printed unit after the digits, if any. */
  unit: string;
  /** Digit cells (a point takes none of its own). */
  digits: number;
  decimals: number;
  /** Seconds after which a reading is shown as stale. */
  staleAfter: number;
  /** How it is measured: online in the flow cell, or by hand. */
  source: 'online' | 'manual';
}

export const SIGN_FIELDS: readonly SignFieldSpec[] = [
  {
    id: 'air',
    group: 'hall',
    label: ['AIR', 'TEMPERATURE'],
    unit: '°C',
    digits: 3,
    decimals: 1,
    staleAfter: 300,
    source: 'online',
  },
  {
    id: 'humidity',
    group: 'hall',
    label: ['HUMIDITY'],
    unit: '%',
    digits: 3,
    decimals: 0,
    staleAfter: 300,
    source: 'online',
  },
  {
    id: 'water',
    group: 'pool',
    label: ['WATER', 'TEMPERATURE'],
    unit: '°C',
    digits: 3,
    decimals: 1,
    staleAfter: 300,
    source: 'online',
  },
  {
    id: 'ph',
    group: 'pool',
    label: ['pH'],
    unit: '',
    digits: 2,
    decimals: 1,
    staleAfter: 300,
    source: 'online',
  },
  {
    id: 'free',
    group: 'pool',
    label: ['FREE', 'CHLORINE'],
    unit: 'mg/l',
    digits: 3,
    decimals: 2,
    staleAfter: 300,
    source: 'online',
  },
  {
    id: 'combined',
    group: 'pool',
    label: ['COMBINED', 'CHLORINE'],
    unit: 'mg/l',
    digits: 3,
    decimals: 2,
    staleAfter: 26 * 3600,
    source: 'manual',
  },
  {
    id: 'redox',
    group: 'pool',
    label: ['REDOX'],
    unit: 'mV',
    digits: 3,
    decimals: 0,
    staleAfter: 300,
    source: 'online',
  },
];

export interface SignReading {
  /** The value, or null when there is none. */
  value: number | null;
  /** When it was measured or keyed in, seconds on the sign's clock. */
  at: number | null;
}

export interface PoolSignState {
  power: boolean;
  /** The time of day, seconds since midnight, or null with no clock. */
  clock: number | null;
  /** The segment test: every segment lit. */
  test: boolean;
  name: string;
  readings: Record<SignField, SignReading>;
}

export interface SignRow {
  field: SignField;
  /** For `SevenSegment.show`: digits, with any point after its digit. */
  text: string;
  stale: boolean;
}

export interface SignFrame {
  /** The clock's hours and minutes, two digits each ('' when dark). */
  hours: string;
  minutes: string;
  /** Whether the colon between them is lit (it beats the seconds). */
  colon: boolean;
  /** The name strip's text; empty when dark. */
  name: string;
  rows: readonly SignRow[];
}

export const noReading = (): SignReading => ({ value: null, at: null });

export function createSignState(name = 'MAIN POOL'): PoolSignState {
  return {
    power: true,
    clock: null,
    test: false,
    name,
    readings: Object.fromEntries(
      SIGN_FIELDS.map((f) => [f.id, noReading()]),
    ) as Record<SignField, SignReading>,
  };
}

/** Dashes across a field's digits, its point where the value's would be. */
const dashes = (f: SignFieldSpec) => {
  const whole = f.digits - f.decimals;
  return '-'.repeat(whole) + (f.decimals ? '.' + '-'.repeat(f.decimals) : '');
};

/** One reading as its row's digits. */
export function fieldText(f: SignFieldSpec, reading: SignReading): string {
  const { value } = reading;
  if (value === null || !Number.isFinite(value)) return dashes(f);
  const text = value.toFixed(f.decimals);
  const cells =
    text.replace('.', '').replace('-', '').length + (value < 0 ? 1 : 0);
  return cells > f.digits ? 'Err' : text;
}

/** Whether `reading`, at `now`, is older than its field allows. */
export function isStale(
  f: SignFieldSpec,
  reading: SignReading,
  now: number,
): boolean {
  return (
    reading.value !== null &&
    reading.at !== null &&
    now - reading.at > f.staleAfter
  );
}

/** What the sign shows at `now`. */
export function signFrame(state: PoolSignState, now: number): SignFrame {
  if (!state.power)
    return {
      hours: '',
      minutes: '',
      colon: false,
      name: '',
      rows: SIGN_FIELDS.map((f) => ({ field: f.id, text: '', stale: false })),
    };
  if (state.test)
    return {
      hours: '8.8.',
      minutes: '8.8.',
      colon: true,
      name: state.name.toUpperCase(),
      rows: SIGN_FIELDS.map((f) => ({
        field: f.id,
        text: '8.'.repeat(f.digits),
        stale: false,
      })),
    };
  const { clock } = state;
  const minute = clock === null ? null : Math.floor(clock / 60) % (24 * 60);
  return {
    hours:
      minute === null ? '--' : String(Math.floor(minute / 60)).padStart(2, '0'),
    minutes: minute === null ? '--' : String(minute % 60).padStart(2, '0'),
    colon: clock !== null && clock % 1 < 0.5,
    name: state.name.toUpperCase(),
    rows: SIGN_FIELDS.map((f) => {
      const reading = state.readings[f.id];
      return {
        field: f.id,
        text: fieldText(f, reading),
        stale: isStale(f, reading, now),
      };
    }),
  };
}

/**
 * A development data source, clearly not the plant: editable values that
 * a test panel sets, and a mode to show the sign's states. Its readings
 * do not come from any chemistry simulation.
 */
export type DevSignMode = 'normal' | 'missing' | 'stale' | 'test';

export interface DevSignValues {
  air: number;
  humidity: number;
  water: number;
  ph: number;
  free: number;
  combined: number;
  redox: number;
  /** When combined chlorine was last keyed in, seconds. */
  combinedAt: number;
}

export const DEV_SIGN_DEFAULTS: DevSignValues = {
  air: 30.5,
  humidity: 62,
  water: 29.5,
  ph: 7.4,
  free: 1.2,
  combined: 0.25,
  redox: 750,
  combinedAt: 0,
};

/**
 * The sign's state from the development source at `now`; `clock` the
 * time of day, seconds.
 */
export function devSignState(
  name: string,
  power: boolean,
  mode: DevSignMode,
  values: DevSignValues,
  now: number,
  clock: number | null = null,
): PoolSignState {
  const state = createSignState(name);
  state.power = power;
  state.clock = clock;
  state.test = mode === 'test';
  if (mode === 'missing') return state;
  // Stale: the online readings stopped arriving ten minutes ago.
  const online = mode === 'stale' ? now - 600 : now;
  state.readings = {
    air: { value: values.air, at: online },
    humidity: { value: values.humidity, at: online },
    water: { value: values.water, at: online },
    ph: { value: values.ph, at: online },
    free: { value: values.free, at: online },
    combined: { value: values.combined, at: values.combinedAt },
    redox: { value: values.redox, at: online },
  };
  return state;
}
