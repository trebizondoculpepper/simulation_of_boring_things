/**
 * A room's air, for modelling gas leaks (the owner, 2026-10-23): a coarse
 * grid of cells, a cubic metre each by default (the owner's choice: cheap,
 * and fine enough to tell near from far and floor from ceiling), each
 * holding the concentration of each gas in it, mg/m³.
 * Each step:
 *
 * - what leaks in is added to its cell;
 * - each gas spreads to the cells beside it (diffusion standing in for the
 *   room's turbulent mixing);
 * - a gas heavier than air sinks, a lighter one rises, at a speed growing
 *   with how much denser or lighter it is;
 * - ventilation carries off a share each second (its air changes an hour).
 *
 * Pure; metres, seconds, its own box from `min` to `max`.
 */

export type Gas = 'ozone' | 'chlorine';

/** Each gas: its molar mass (g/mol) and its density against air's. */
export const GASES: Record<
  Gas,
  { molarMass: number; relativeDensity: number; label: string }
> = {
  ozone: { molarMass: 48, relativeDensity: 1.66, label: 'OZONE' },
  chlorine: { molarMass: 70.9, relativeDensity: 2.45, label: 'CHLORINE' },
};

/** mg/m³ to parts per million by volume, at 25 °C and one atmosphere. */
export const toPpm = (gas: Gas, mgPerM3: number) =>
  (mgPerM3 * 24.45) / GASES[gas].molarMass;

export interface RoomAirOptions {
  min: readonly [number, number, number];
  max: readonly [number, number, number];
  /** Cell size, metres (1: a cubic metre a cell). */
  cell?: number;
  /** Effective (turbulent) diffusivity, m²/s. */
  mixing?: number;
  /** Air changes an hour. */
  airChanges?: number;
  /** Sinking speed per unit of excess relative density, m/s. */
  settling?: number;
}

export interface RoomAir {
  readonly nx: number;
  readonly ny: number;
  readonly nz: number;
  readonly cell: number;
  /** Add `mg` of `gas` at a point. */
  inject(gas: Gas, at: readonly [number, number, number], mg: number): void;
  /** Advance `dt` seconds. */
  step(dt: number): void;
  /** The concentration at a point, mg/m³. */
  sample(gas: Gas, at: readonly [number, number, number]): number;
  /** The whole field of one gas, cell by cell (x fastest, then z, then y). */
  field(gas: Gas): Float32Array;
  /** Each cell's middle. */
  centre(i: number, j: number, k: number): [number, number, number];
  /** All of a gas in the room, mg. */
  total(gas: Gas): number;
}

export function createRoomAir({
  min,
  max,
  cell = 1,
  mixing = 0.05,
  airChanges = 2,
  settling = 0.03,
}: RoomAirOptions): RoomAir {
  const nx = Math.max(1, Math.round((max[0] - min[0]) / cell));
  const ny = Math.max(1, Math.round((max[1] - min[1]) / cell));
  const nz = Math.max(1, Math.round((max[2] - min[2]) / cell));
  const N = nx * ny * nz;
  const idx = (i: number, j: number, k: number) => (j * nz + k) * nx + i;
  const fields = new Map<Gas, Float32Array>();
  const scratch = new Float32Array(N);
  const fieldOf = (gas: Gas) => {
    let f = fields.get(gas);
    if (!f) fields.set(gas, (f = new Float32Array(N)));
    return f;
  };
  const cellOf = (p: readonly [number, number, number]) => [
    Math.min(nx - 1, Math.max(0, Math.floor((p[0] - min[0]) / cell))),
    Math.min(ny - 1, Math.max(0, Math.floor((p[1] - min[1]) / cell))),
    Math.min(nz - 1, Math.max(0, Math.floor((p[2] - min[2]) / cell))),
  ];
  const volume = cell ** 3;
  // The longest step the explicit scheme stays stable for.
  const stable = (0.9 * cell * cell) / (6 * mixing);

  const advance = (gas: Gas, f: Float32Array, dt: number) => {
    const k = (mixing * dt) / (cell * cell);
    // Sinking (or rising), as an upwind shift down (or up) each step.
    const speed = settling * (GASES[gas].relativeDensity - 1);
    const shift = Math.min(0.9, (Math.abs(speed) * dt) / cell);
    const down = speed > 0;
    const keep = Math.exp(-((airChanges / 3600) * dt));
    for (let j = 0; j < ny; j++)
      for (let z = 0; z < nz; z++)
        for (let i = 0; i < nx; i++) {
          const c = idx(i, j, z);
          const v = f[c];
          // Neighbours; a wall reflects (no flux through it).
          const xm = i > 0 ? f[c - 1] : v;
          const xp = i < nx - 1 ? f[c + 1] : v;
          const zm = z > 0 ? f[idx(i, j, z - 1)] : v;
          const zp = z < nz - 1 ? f[idx(i, j, z + 1)] : v;
          const ym = j > 0 ? f[idx(i, j - 1, z)] : v;
          const yp = j < ny - 1 ? f[idx(i, j + 1, z)] : v;
          let next = v + k * (xm + xp + zm + zp + ym + yp - 6 * v);
          // What flows in from above (sinking) or below (rising), and out.
          if (down) {
            const inflow = j < ny - 1 ? yp * shift : 0;
            const outflow = j > 0 ? v * shift : 0;
            next += inflow - outflow;
          } else {
            const inflow = j > 0 ? ym * shift : 0;
            const outflow = j < ny - 1 ? v * shift : 0;
            next += inflow - outflow;
          }
          scratch[c] = Math.max(0, next * keep);
        }
    f.set(scratch);
  };

  return {
    nx,
    ny,
    nz,
    cell,
    inject(gas, at, mg) {
      if (!(mg > 0)) return;
      const [i, j, k] = cellOf(at);
      fieldOf(gas)[idx(i, j, k)] += mg / volume;
    },
    step(dt) {
      if (!(dt > 0)) return;
      const n = Math.max(1, Math.ceil(dt / stable));
      for (const [gas, f] of fields)
        for (let s = 0; s < n; s++) advance(gas, f, dt / n);
    },
    sample(gas, at) {
      const f = fields.get(gas);
      if (!f) return 0;
      const [i, j, k] = cellOf(at);
      return f[idx(i, j, k)];
    },
    field: (gas) => fieldOf(gas),
    centre: (i, j, k) => [
      min[0] + (i + 0.5) * cell,
      min[1] + (j + 0.5) * cell,
      min[2] + (k + 0.5) * cell,
    ],
    total(gas) {
      const f = fields.get(gas);
      if (!f) return 0;
      let sum = 0;
      for (let c = 0; c < N; c++) sum += f[c];
      return sum * volume;
    },
  };
}

// ---- A gas detector ----------------------------------------------------------------

export interface DetectorSpec {
  gas: Gas;
  /** Alarm levels, ppm. */
  low: number;
  high: number;
  /** How quickly its sensor follows the air: a 90 % response time, s. */
  t90?: number;
}

/**
 * Alarm levels after UK workplace limits (EH40): ozone 0.2 ppm over 15
 * minutes, chlorine 0.5 ppm; low alarms at half (ozone) or the limit
 * (chlorine). Working figures: a real site sets its own.
 */
export const DETECTOR_LEVELS: Record<Gas, DetectorSpec> = {
  ozone: { gas: 'ozone', low: 0.1, high: 0.2, t90: 30 },
  chlorine: { gas: 'chlorine', low: 0.5, high: 1, t90: 30 },
};

export type AlarmState = 'clear' | 'low' | 'high';

/**
 * A fixed gas detector: its sensor follows its cell's air with a lag; it
 * alarms when its reading reaches a level, and stays alarmed (latched)
 * until it is reset with the air clear again.
 */
export function createGasDetector(spec: DetectorSpec) {
  const t90 = spec.t90 ?? 30;
  // A first-order lag reaching 90 % in t90.
  const rate = Math.log(10) / t90;
  let ppm = 0;
  let alarm: AlarmState = 'clear';
  return {
    spec,
    /** Follow the air: `seen` ppm at its sensor, for `dt` seconds. */
    sense(seen: number, dt: number) {
      ppm += (seen - ppm) * (1 - Math.exp(-rate * dt));
      if (ppm >= spec.high) alarm = 'high';
      else if (ppm >= spec.low && alarm === 'clear') alarm = 'low';
    },
    reading: () => ppm,
    alarm: () => alarm,
    /** Reset the latched alarm; it comes straight back if the air is not clear. */
    reset() {
      alarm = ppm >= spec.high ? 'high' : ppm >= spec.low ? 'low' : 'clear';
    },
  };
}

// ---- A vent ----------------------------------------------------------------------

/**
 * A vent: where a gas line opens into the room's air. Fed through its
 * valve from its source, it releases at its rated rate while the valve is
 * open and the source has gas, and nothing otherwise.
 */
export function createVent({
  gas,
  rate,
  at,
}: {
  gas: Gas;
  /** What it releases while open, g/h. */
  rate: number;
  /** Where in the room's air, metres. */
  at: readonly [number, number, number];
}) {
  let flowing = false;
  return {
    gas,
    rate,
    at,
    /** Release for `dt` s from `draw` (the source, through an open valve). */
    step(
      dt: number,
      open: boolean,
      draw: (grams: number) => number,
      air: RoomAir,
    ) {
      const given = open ? draw((rate / 3600) * dt) : 0;
      flowing = given > 0;
      air.inject(gas, at, given * 1000);
    },
    flowing: () => flowing,
  };
}
