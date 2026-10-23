/**
 * Experimental (placeholder) sources (the owner, 2026-10-23): for when the
 * game needs a source of some substance before the real plant behind it
 * is modelled, as a supply to try a machine, a detector or a line on. One
 * is always drawn the same way, as a cylinder coloured for its substance,
 * so it reads as a placeholder at a glance (`views/experimental-source.ts`).
 *
 * - **Typed outputs:** each output port carries one substance, in that
 *   substance's medium, so it can only be joined to what takes it.
 * - **A control port, `remaining`:** reports the quantity left, which may
 *   be infinite.
 * - **Drawing from it:** reduces what is left, and never below nothing; a
 *   source that is empty delivers nothing.
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
  data: {
    medium: 'water' | 'gas' | 'chemical' | 'power' | 'control';
    substance?: Substance;
    required: boolean;
    control?: { valueType: 'number'; unit: string; access: 'read' };
  };
}

export interface ExperimentalSource {
  spec: Required<ExperimentalSourceSpec>;
  /** Its ports: `out-1`, `out-2`… typed by its substance, and `remaining`. */
  ports: SourcePort[];
  /** What is left, in its unit; Infinity if endless. */
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
  const ports: SourcePort[] = [
    ...Array.from({ length: full.outputs }, (_, k) => ({
      name: `out-${k + 1}`,
      direction: 'out' as const,
      data: { medium, substance: full.substance, required: false },
    })),
    {
      name: 'remaining',
      direction: 'out',
      data: {
        medium: 'control',
        required: false,
        control: { valueType: 'number', unit, access: 'read' },
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
