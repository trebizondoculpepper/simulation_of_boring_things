/**
 * Experimental (placeholder) sources (the owner, 2026-10-23): for when the
 * game needs a source of some substance before the real plant behind it
 * is modelled, as a supply to try a machine, a detector or a line on. One
 * is always drawn the same way, as a cylinder coloured for its substance,
 * so it reads as a placeholder at a glance (`views/experimental-source.ts`).
 *
 * - **Typed outputs:** each output port carries one substance, in that
 *   substance's medium, so it can only be joined to what takes it.
 * - **A control port, `remaining`:** reports the quantity left, a number
 *   in the substance's unit, which may be infinite. It is its only control
 *   port, and it only reports: a source has no switch, since starting and
 *   stopping a supply is a valve's job.
 * - **Drawing from it:** what is downstream takes reduces what is left,
 *   never below nothing; a source that is empty delivers nothing.
 * - **Precise ports:** each port has its place and its outward direction
 *   in the source's own frame (`SOURCE_SHAPE`), which its view draws.
 *
 * Pure.
 */

/** What an experimental source can supply. */
export type Substance =
  | 'pool-water'
  | 'mains-water'
  | 'lthw'
  | 'natural-gas'
  | 'chlorine'
  | 'hypochlorite'
  | 'acid'
  | 'ozone'
  | 'compressed-air'
  | 'power-400v'
  | 'power-230v';

/** Each substance's medium (what kind of port carries it), its unit, and its colour on the cylinder. */
export const SUBSTANCES: Record<
  Substance,
  {
    medium: 'water' | 'gas' | 'chemical' | 'power';
    unit: string;
    colour: string;
    label: string;
  }
> = {
  'pool-water': {
    medium: 'water',
    unit: 'm³',
    colour: '#2f6db5',
    label: 'POOL WATER',
  },
  'mains-water': {
    medium: 'water',
    unit: 'm³',
    colour: '#3c8f4a',
    label: 'MAINS WATER',
  },
  lthw: { medium: 'water', unit: 'm³', colour: '#b5402f', label: 'LTHW' },
  'natural-gas': {
    medium: 'gas',
    unit: 'm³',
    colour: '#d9b23a',
    label: 'NATURAL GAS',
  },
  chlorine: { medium: 'gas', unit: 'kg', colour: '#c9d23c', label: 'CHLORINE' },
  hypochlorite: {
    medium: 'chemical',
    unit: 'l',
    colour: '#8a4fa3',
    label: 'HYPOCHLORITE',
  },
  acid: { medium: 'chemical', unit: 'l', colour: '#6d3f8f', label: 'ACID' },
  ozone: { medium: 'gas', unit: 'g', colour: '#8fc7e6', label: 'OZONE' },
  'compressed-air': {
    medium: 'gas',
    unit: 'm³',
    colour: '#9fc3d6',
    label: 'COMPRESSED AIR',
  },
  'power-400v': {
    medium: 'power',
    unit: 'kWh',
    colour: '#e07a22',
    label: '400 V 3-PH',
  },
  'power-230v': {
    medium: 'power',
    unit: 'kWh',
    colour: '#e8953e',
    label: '230 V',
  },
};

type Vec3 = [number, number, number];

/**
 * Its shape, metres, in its own frame: a cylinder standing on the floor
 * (y = 0) round the y axis, its band and readout facing +z. Its outputs
 * are studs round its back half at `outputs` high, each `stud` long; its
 * control port is a cable gland on the middle of its top, `gland` high.
 */
export const SOURCE_SHAPE = {
  radius: 0.25,
  height: 1.1,
  outputs: 0.85,
  stud: 0.08,
  gland: 0.04,
} as const;

/** Where output `k` of `n` faces, radians round y from +z: spread over the back. */
export const outputAngle = (k: number, n: number) =>
  Math.PI + (n === 1 ? 0 : (k / (n - 1) - 0.5) * Math.PI * 0.8);

export interface ExperimentalSourceSpec {
  id: string;
  substance: Substance;
  /** How many outputs it has (each typed by its substance). */
  outputs?: number;
  /** How much it starts with, in its substance's unit; Infinity for an endless supply. */
  quantity?: number;
}

/** A port of an experimental source, as the port graph takes it. */
export interface SourcePort {
  name: string;
  direction: 'out';
  /** Its connection point, and the way it faces, in the source's frame. */
  at: Vec3;
  out: Vec3;
  data: {
    medium: 'water' | 'gas' | 'chemical' | 'power' | 'control';
    substance?: Substance;
    required: boolean;
    /** A control port's reading: a number in `unit`, read only, which may be infinite. */
    control?: {
      valueType: 'number';
      unit: string;
      access: 'read';
      infinite: boolean;
    };
  };
}

export interface ExperimentalSource {
  spec: Required<ExperimentalSourceSpec>;
  /** Its ports: `out-1`, `out-2`… typed by its substance, and `remaining`. */
  ports: SourcePort[];
  /** What is left, in its unit; Infinity if endless: the `remaining` port's value. */
  remaining(): number;
  /** Whether it is endless. */
  readonly endless: boolean;
  /** Take up to `amount`; returns what was delivered. */
  draw(amount: number): number;
  /** The `remaining` control port's reading, as a panel shows it. */
  reading(): string;
}

export function createExperimentalSource(
  spec: ExperimentalSourceSpec,
): ExperimentalSource {
  const full: Required<ExperimentalSourceSpec> = {
    outputs: 1,
    quantity: Infinity,
    ...spec,
  };
  if (!(full.outputs >= 1) || !Number.isInteger(full.outputs))
    throw new Error(
      `${spec.id}: an experimental source needs a whole number of outputs`,
    );
  if (!(full.quantity >= 0))
    throw new Error(`${spec.id}: a quantity cannot be negative`);
  const { medium, unit } = SUBSTANCES[full.substance];
  let left = full.quantity;
  const round = (v: number) => Math.round(v * 1e4) / 1e4;
  const { radius: r, height: h, outputs: y, stud, gland } = SOURCE_SHAPE;
  const ports: SourcePort[] = [
    ...Array.from({ length: full.outputs }, (_, k): SourcePort => {
      const a = outputAngle(k, full.outputs);
      const dir: Vec3 = [round(Math.sin(a)), 0, round(Math.cos(a))];
      return {
        name: `out-${k + 1}`,
        direction: 'out',
        // The stud's end, standing `stud` proud of the cylinder.
        at: [round(dir[0] * (r + stud)), y, round(dir[2] * (r + stud))],
        out: dir,
        data: { medium, substance: full.substance, required: false },
      };
    }),
    {
      name: 'remaining',
      direction: 'out',
      at: [0, h + gland, 0],
      out: [0, 1, 0],
      data: {
        medium: 'control',
        required: false,
        control: {
          valueType: 'number',
          unit,
          access: 'read',
          infinite: full.quantity === Infinity,
        },
      },
    },
  ];
  return {
    spec: full,
    ports,
    remaining: () => left,
    endless: full.quantity === Infinity,
    draw(amount: number) {
      if (!(amount > 0)) return 0;
      const given = Math.min(amount, left);
      if (left !== Infinity) left -= given;
      return given;
    },
    reading() {
      if (left === Infinity) return '∞';
      return left >= 100
        ? left.toFixed(0)
        : left >= 10
          ? left.toFixed(1)
          : left.toFixed(2);
    },
  };
}

/** Whether an output of `source` may join a port taking `medium` (and, if named, `substance`). */
export function canSupply(
  source: ExperimentalSource,
  medium: string,
  substance?: Substance,
) {
  const { medium: m } = SUBSTANCES[source.spec.substance];
  return m === medium && (!substance || substance === source.spec.substance);
}
