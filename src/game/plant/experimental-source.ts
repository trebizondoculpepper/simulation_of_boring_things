import { WATERS } from '../water/water-condition';
import type { WaterCondition } from '../water/water-condition';

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
 * - **No infinite flows:** each has a potential (pressure, or volts), an
 *   internal resistance and a maximum rate, so what it gives is the
 *   potential difference over its resistance, never more than its
 *   maximum, and a draw over a step is capped by its rate.
 * - **Precise ports:** each port has its place and its outward direction
 *   in the source's own frame (`SOURCE_SHAPE`), which its view draws.
 *
 * Pure.
 */

/** What an experimental source can supply: every fluid, gas and power commodity of the plant. */
export type Substance =
  // Waters.
  | 'pool-water'
  | 'mains-water'
  | 'dirty-water'
  | 'lthw'
  | 'dhw'
  | 'chilled-water'
  // Gases.
  | 'natural-gas'
  | 'lpg'
  | 'chlorine'
  | 'ozone'
  | 'carbon-dioxide'
  | 'compressed-air'
  // Dosing chemicals.
  | 'hypochlorite'
  | 'acid'
  | 'sodium-bicarbonate'
  | 'flocculant'
  // Liquid fuels.
  | 'heating-oil'
  | 'diesel'
  // Power.
  | 'power-400v'
  | 'power-230v'
  | 'power-110v'
  | 'power-24v-dc';

/** What kind of port carries a substance. */
export type SourceMedium = 'water' | 'gas' | 'chemical' | 'oil' | 'power';

/**
 * Identification colours (BS 4800 references, as near as a screen shows
 * them). Pipe contents follow BS 1710, the UK's scheme for buildings
 * (ISO 14726 is for ships): a basic colour for the kind of fluid, and code
 * bands for the particular one. Power, which BS 1710 colours orange, is
 * banded with its IEC 60309 voltage colour.
 */
export const ID_COLOURS = {
  // BS 1710 basic colours.
  green: '#3d7f45', // water, 12 D 45
  brown: '#7a4a2b', // oils, 06 C 39
  ochre: '#c49a3c', // gases (not air), 08 C 35
  violet: '#6f4a8c', // acids and alkalis, 22 C 37
  lightBlue: '#8db8d8', // air, 20 E 51
  black: '#232323', // other fluids, drainage
  orange: '#e07a22', // electrical services, 06 E 51
  // BS 1710 code colours.
  blue: '#2f6fb3', // auxiliary blue, 18 E 53
  crimson: '#9c2830', // 04 D 45
  white: '#f2f2ec',
  emerald: '#2c8c58', // 14 E 53
  // IEC 60309 voltage colours.
  iecRed: '#c8302c', // 400 V
  iecBlue: '#2f62b0', // 230 V
  iecYellow: '#e6c229', // 110 V
  iecViolet: '#7a4fa0', // 20 to 25 V
} as const;

const C = ID_COLOURS;

/**
 * Each substance's flow, for a placeholder's simple linear model (the
 * owner, 2026-10-23: no infinite-speed flows): the potential it is
 * offered at (pressure, bar, for fluids; volts for power), and the most
 * that can pass, its unit an hour. Working figures; a spec may set its
 * own.
 */
export const FLOW: Record<SourceMedium, { potentialUnit: 'bar' | 'V' }> = {
  water: { potentialUnit: 'bar' },
  gas: { potentialUnit: 'bar' },
  chemical: { potentialUnit: 'bar' },
  oil: { potentialUnit: 'bar' },
  power: { potentialUnit: 'V' },
};

const flow = (potential: number, maxRate: number) => ({ potential, maxRate });
const FLOWS: Record<Substance, { potential: number; maxRate: number }> = {
  'pool-water': flow(2, 150), // m³/h, a circulation pump's discharge
  'mains-water': flow(3, 5), // m³/h, a 50 mm service
  'dirty-water': flow(0.5, 60), // m³/h, backwash to drain
  lthw: flow(2, 20),
  dhw: flow(3, 4),
  'chilled-water': flow(2, 15),
  'natural-gas': flow(0.021, 40), // m³/h at 21 mbar, a U16 meter's worth
  lpg: flow(0.037, 10), // kg/h at 37 mbar
  chlorine: flow(4, 2), // kg/h, a drum's draw-off
  ozone: flow(1, 50), // g/h
  'carbon-dioxide': flow(5, 5), // kg/h
  'compressed-air': flow(7, 30), // m³/h free air
  hypochlorite: flow(3, 10), // l/h, a dosing pump
  acid: flow(3, 5),
  'sodium-bicarbonate': flow(3, 10),
  flocculant: flow(3, 1),
  'heating-oil': flow(1, 60), // l/h
  diesel: flow(1, 60),
  'power-400v': flow(400, 70), // kW, a 100 A supply
  'power-230v': flow(230, 7.4), // kW, 32 A
  'power-110v': flow(110, 1.8), // kW, 16 A
  'power-24v-dc': flow(24, 0.24), // kW, 10 A
};

/**
 * Each substance: its medium (what kind of port carries it), its unit, its
 * basic identification colour, its code bands (top to bottom), and its
 * name as lettered on it.
 */
export const SUBSTANCES: Record<
  Substance,
  {
    medium: SourceMedium;
    unit: string;
    colour: string;
    bands: readonly string[];
    label: string;
  }
> = {
  // Water: BS 1710 green, with its code bands.
  'pool-water': {
    medium: 'water',
    unit: 'm³',
    colour: C.green,
    bands: [C.blue, C.white, C.blue],
    label: 'POOL WATER',
  },
  // Drinking water: an auxiliary blue band.
  'mains-water': {
    medium: 'water',
    unit: 'm³',
    colour: C.green,
    bands: [C.blue],
    label: 'MAINS WATER',
  },
  // Backwash and waste water, to drain: black, other fluids.
  'dirty-water': {
    medium: 'water',
    unit: 'm³',
    colour: C.black,
    bands: [],
    label: 'DIRTY WATER',
  },
  // Low-temperature hot water, central heating below 100 °C: blue, crimson, blue.
  lthw: {
    medium: 'water',
    unit: 'm³',
    colour: C.green,
    bands: [C.blue, C.crimson, C.blue],
    label: 'LTHW',
  },
  // Domestic hot water: white, crimson, white.
  dhw: {
    medium: 'water',
    unit: 'm³',
    colour: C.green,
    bands: [C.white, C.crimson, C.white],
    label: 'DOMESTIC HOT WATER',
  },
  // Chilled water: white, emerald green, white.
  'chilled-water': {
    medium: 'water',
    unit: 'm³',
    colour: C.green,
    bands: [C.white, C.emerald, C.white],
    label: 'CHILLED WATER',
  },
  // Gases: yellow ochre, named; air light blue.
  'natural-gas': {
    medium: 'gas',
    unit: 'm³',
    colour: C.ochre,
    bands: [],
    label: 'NATURAL GAS',
  },
  lpg: { medium: 'gas', unit: 'kg', colour: C.ochre, bands: [], label: 'LPG' },
  chlorine: {
    medium: 'gas',
    unit: 'kg',
    colour: C.ochre,
    bands: [],
    label: 'CHLORINE',
  },
  ozone: {
    medium: 'gas',
    unit: 'g',
    colour: C.ochre,
    bands: [],
    label: 'OZONE',
  },
  // For pH correction, dosed into the pool water.
  'carbon-dioxide': {
    medium: 'gas',
    unit: 'kg',
    colour: C.ochre,
    bands: [],
    label: 'CARBON DIOXIDE',
  },
  'compressed-air': {
    medium: 'gas',
    unit: 'm³',
    colour: C.lightBlue,
    bands: [],
    label: 'COMPRESSED AIR',
  },
  // Acids and alkalis: violet, named.
  hypochlorite: {
    medium: 'chemical',
    unit: 'l',
    colour: C.violet,
    bands: [],
    label: 'HYPOCHLORITE',
  },
  acid: {
    medium: 'chemical',
    unit: 'l',
    colour: C.violet,
    bands: [],
    label: 'ACID',
  },
  // Raises alkalinity.
  'sodium-bicarbonate': {
    medium: 'chemical',
    unit: 'l',
    colour: C.violet,
    bands: [],
    label: 'SODIUM BICARBONATE',
  },
  // Polyaluminium chloride, ahead of the filters: other fluids, black.
  flocculant: {
    medium: 'chemical',
    unit: 'l',
    colour: C.black,
    bands: [],
    label: 'FLOCCULANT',
  },
  // Oils: brown.
  'heating-oil': {
    medium: 'oil',
    unit: 'l',
    colour: C.brown,
    bands: [],
    label: 'FUEL OIL',
  },
  // For the standby generator.
  diesel: {
    medium: 'oil',
    unit: 'l',
    colour: C.brown,
    bands: [],
    label: 'DIESEL',
  },
  // Electrical: orange, banded in its IEC 60309 voltage colour.
  'power-400v': {
    medium: 'power',
    unit: 'kWh',
    colour: C.orange,
    bands: [C.iecRed],
    label: '400 V 3-PH',
  },
  // UK mains, single phase: 230 V nominal (BS 7671), often called 240 V.
  'power-230v': {
    medium: 'power',
    unit: 'kWh',
    colour: C.orange,
    bands: [C.iecBlue],
    label: '230 V 1-PH',
  },
  // Reduced low voltage for portable tools, centre-tapped to earth.
  'power-110v': {
    medium: 'power',
    unit: 'kWh',
    colour: C.orange,
    bands: [C.iecYellow],
    label: '110 V CTE',
  },
  // Control supplies.
  'power-24v-dc': {
    medium: 'power',
    unit: 'kWh',
    colour: C.orange,
    bands: [C.iecViolet],
    label: '24 V DC',
  },
};

export interface ExperimentalSourceSpec {
  id: string;
  substance: Substance;
  /** How many outputs it has (each typed by its substance). */
  outputs?: number;
  /** How much it starts with, in its substance's unit; Infinity for an endless supply. */
  quantity?: number;
  /**
   * A water's condition (prompt 070): what it carries besides its volume.
   * A water source's is its substance's (`WATER_OF`) unless given.
   */
  condition?: WaterCondition;
  /** The potential it offers (bar, or volts for power); its substance's by default. */
  potential?: number;
  /** The most it can deliver, its unit an hour; its substance's by default. */
  maxRate?: number;
  /**
   * Its internal resistance: potential lost per unit an hour of flow. By
   * default its maximum rate takes half its potential.
   */
  resistance?: number;
}

type Vec3 = [number, number, number];

/**
 * Its shape, metres, in its own frame: a cylinder standing on the floor
 * (y = 0) round the y axis, its front (lettering and readout) facing +z.
 * Its outputs or inputs (the owner, 2026-10-23) are upright studs across
 * the middle of its top, `pitch` apart along x, each `stud` tall; its
 * control port is a cable gland on its back (−z), `control` high and
 * `gland` proud.
 */
export const SOURCE_SHAPE = {
  radius: 0.25,
  height: 1.1,
  stud: 0.08,
  pitch: 0.12,
  control: 0.45,
  gland: 0.04,
} as const;

/** Where stud `k` of `n` stands across the top, metres along x from its middle. */
export const studOffset = (k: number, n: number) =>
  (k - (n - 1) / 2) * SOURCE_SHAPE.pitch;

/** A port of an experimental source or sink, as the port graph takes it. */
export interface SourcePort {
  name: string;
  direction: 'in' | 'out';
  /** Its connection point, and the way it faces, in its own frame. */
  at: Vec3;
  out: Vec3;
  data: {
    medium: SourceMedium | 'control';
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
  readonly role: 'source';
  spec: Required<
    Omit<
      ExperimentalSourceSpec,
      'potential' | 'maxRate' | 'resistance' | 'condition'
    >
  >;
  /** Its ports: `out-1`, `out-2`… typed by its substance, and `remaining`. */
  ports: SourcePort[];
  /** What is left, in its unit; Infinity if endless: the `remaining` port's value. */
  remaining(): number;
  /** Whether it is endless. */
  readonly endless: boolean;
  /** Its flow model: potential, maximum rate and internal resistance. */
  flow: FlowModel;
  /** Its flow, its unit an hour, into something at `downstream` potential. */
  rateInto(downstream: number): number;
  /** Take up to `amount` over `dt` seconds, never faster than its maximum rate; returns what was delivered. */
  draw(amount: number, dt: number): number;
  /** The `remaining` control port's reading, as a panel shows it. */
  reading(): string;
  /** Its control port's value: what is left. */
  value(): number;
  /** A water source's water, its condition (prompt 070); none for other substances. */
  condition(): WaterCondition | undefined;
  /** Set what a water source gives (an ideal source's water can be anything). */
  setCondition(c: WaterCondition): void;
}

/** Each water's condition, as an ideal source of it gives it (prompt 070). */
export const WATER_OF: Partial<Record<Substance, WaterCondition>> = {
  'pool-water': WATERS.pool,
  'mains-water': WATERS.mains,
  'dirty-water': WATERS.dirty,
  lthw: WATERS.lthw,
  dhw: WATERS.dhw,
  'chilled-water': WATERS.chilled,
};

/** A substance's ports for a source or sink: its studs round the back, typed, and its one control port on top. */
function terminalPorts(
  substance: Substance,
  count: number,
  direction: 'in' | 'out',
  control: string,
  infinite: boolean,
): SourcePort[] {
  const { medium, unit } = SUBSTANCES[substance];
  const round = (v: number) => Math.round(v * 1e4) / 1e4;
  const { radius: r, height: h, stud, gland } = SOURCE_SHAPE;
  return [
    ...Array.from({ length: count }, (_, k): SourcePort => ({
      name: `${direction}-${k + 1}`,
      direction,
      // The stud's end, standing `stud` up from the top, pointing up.
      at: [round(studOffset(k, count)), round(h + stud), 0],
      out: [0, 1, 0],
      data: { medium, substance, required: false },
    })),
    {
      name: control,
      direction: 'out',
      // A gland on the back, facing back.
      at: [0, SOURCE_SHAPE.control, -(r + gland)],
      out: [0, 0, -1],
      data: {
        medium: 'control',
        required: false,
        control: { valueType: 'number', unit, access: 'read', infinite },
      },
    },
  ];
}

/** What a terminal's flow model needs, filled in from its substance. */
function flowModel(
  id: string,
  substance: Substance,
  spec: { potential?: number; maxRate?: number; resistance?: number },
  potentialDefault: number,
) {
  const base = FLOWS[substance];
  const maxRate = spec.maxRate ?? base.maxRate;
  const potential = spec.potential ?? potentialDefault;
  const resistance = spec.resistance ?? base.potential / (2 * maxRate);
  if (!(maxRate > 0) || maxRate === Infinity)
    throw new Error(`${id}: a maximum rate must be finite and above nothing`);
  if (!(resistance > 0))
    throw new Error(`${id}: an internal resistance must be above nothing`);
  return {
    potential,
    maxRate,
    resistance,
    potentialUnit: FLOW[SUBSTANCES[substance].medium].potentialUnit,
    /** Flow for a potential difference across it, its unit an hour: by its resistance, up to its maximum. */
    rateFor: (difference: number) =>
      Math.min(maxRate, Math.max(0, difference) / resistance),
    /** The most that can pass in `dt` seconds. */
    capFor: (dt: number) => (maxRate * Math.max(0, dt)) / 3600,
  };
}

export type FlowModel = ReturnType<typeof flowModel>;

/** A quantity as a panel shows it: ∞, or to three figures or so. */
const show = (v: number) =>
  v === Infinity
    ? '∞'
    : v >= 100
      ? v.toFixed(0)
      : v >= 10
        ? v.toFixed(1)
        : v.toFixed(2);

export function createExperimentalSource(
  spec: ExperimentalSourceSpec,
): ExperimentalSource {
  const full = { outputs: 1, quantity: Infinity, ...spec };
  const model = flowModel(
    spec.id,
    spec.substance,
    spec,
    FLOWS[spec.substance].potential,
  );
  if (!(full.outputs >= 1) || !Number.isInteger(full.outputs))
    throw new Error(
      `${spec.id}: an experimental source needs a whole number of outputs`,
    );
  if (!(full.quantity >= 0))
    throw new Error(`${spec.id}: a quantity cannot be negative`);
  let left = full.quantity;
  let water = spec.condition ?? WATER_OF[spec.substance];
  const ports = terminalPorts(
    full.substance,
    full.outputs,
    'out',
    'remaining',
    full.quantity === Infinity,
  );
  return {
    role: 'source',
    spec: full,
    ports,
    remaining: () => left,
    value: () => left,
    endless: full.quantity === Infinity,
    flow: model,
    rateInto: (downstream) =>
      left > 0 ? model.rateFor(model.potential - downstream) : 0,
    draw(amount: number, dt: number) {
      if (!(amount > 0)) return 0;
      const given = Math.min(amount, left, model.capFor(dt));
      if (left !== Infinity) left -= given;
      return given;
    },
    reading: () => show(left),
    condition: () => water,
    setCondition(c) {
      if (water) water = c;
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

// ---- Sinks -----------------------------------------------------------------------

/**
 * An experimental sink: the counterpart of a source, somewhere for a
 * substance to go before what really takes it is modelled (a drain, a
 * flue, the grid). Drawn the same way, with the sink symbol.
 *
 * - **Typed inputs:** `in-1`, `in-2`… each taking one substance, in its
 *   substance's medium.
 * - **A control port, `contents`:** reports what it holds, a number in its
 *   substance's unit, starting at nothing, even for a sink with no limit.
 *   Like a source's, it only reports: there is no switch.
 * - **Taking:** what is delivered to it fills it, up to its capacity; a
 *   full sink takes nothing more.
 */
export interface ExperimentalSinkSpec {
  id: string;
  substance: Substance;
  /** How many inputs it has (each typed by its substance). */
  inputs?: number;
  /** How much it can take, in its substance's unit; Infinity for no limit. */
  capacity?: number;
  /** The potential it takes at (back pressure, or volts for power); none by default. */
  potential?: number;
  /** The most it can take, its unit an hour; its substance's by default. */
  maxRate?: number;
  /** Its internal resistance, as a source's. */
  resistance?: number;
}

export interface ExperimentalSink {
  readonly role: 'sink';
  spec: Required<
    Omit<ExperimentalSinkSpec, 'potential' | 'maxRate' | 'resistance'>
  >;
  /** Its ports: `in-1`, `in-2`… typed by its substance, and `contents`. */
  ports: SourcePort[];
  /** The room it has left, in its unit; Infinity if it has no limit. */
  space(): number;
  /** What it has taken so far. */
  received(): number;
  readonly endless: boolean;
  /** Its flow model: potential, maximum rate and internal resistance. */
  flow: FlowModel;
  /** Its flow, its unit an hour, from something at `upstream` potential. */
  rateFrom(upstream: number): number;
  /** Deliver up to `amount` over `dt` seconds, never faster than its maximum rate; returns what it took. */
  accept(amount: number, dt: number): number;
  reading(): string;
  /** Its control port's value: what it holds. */
  value(): number;
}

export function createExperimentalSink(
  spec: ExperimentalSinkSpec,
): ExperimentalSink {
  const full = { inputs: 1, capacity: Infinity, ...spec };
  const model = flowModel(spec.id, spec.substance, spec, 0);
  if (!(full.inputs >= 1) || !Number.isInteger(full.inputs))
    throw new Error(
      `${spec.id}: an experimental sink needs a whole number of inputs`,
    );
  if (!(full.capacity >= 0))
    throw new Error(`${spec.id}: a capacity cannot be negative`);
  let taken = 0;
  const space = () => full.capacity - taken;
  return {
    role: 'sink',
    spec: full,
    ports: terminalPorts(
      full.substance,
      full.inputs,
      'in',
      'contents',
      // What it holds is never infinite, whatever its capacity.
      false,
    ),
    space,
    value: () => taken,
    received: () => taken,
    endless: full.capacity === Infinity,
    flow: model,
    rateFrom: (upstream) =>
      space() > 0 ? model.rateFor(upstream - model.potential) : 0,
    accept(amount: number, dt: number) {
      if (!(amount > 0)) return 0;
      const took = Math.min(amount, space(), model.capFor(dt));
      taken += took;
      return took;
    },
    reading: () => show(taken),
  };
}

/** Whether an input of `sink` may take from a port giving `medium` (and, if named, `substance`). */
export function canAccept(
  sink: ExperimentalSink,
  medium: string,
  substance?: Substance,
) {
  const { medium: m } = SUBSTANCES[sink.spec.substance];
  return m === medium && (!substance || substance === sink.spec.substance);
}

/** A source or a sink: what its view needs. */
export type ExperimentalTerminal = ExperimentalSource | ExperimentalSink;

/** A number to three significant figures, plainly (no exponent). */
const sig = (v: number) => {
  if (v === 0) return '0';
  const digits = Math.max(0, 2 - Math.floor(Math.log10(Math.abs(v))));
  return Number(v.toFixed(Math.min(6, digits))).toString();
};

/**
 * The rating plate lettered on a source or sink: its substance, its
 * capacity (what a source starts with, what a sink can hold), its maximum
 * flow, its internal resistance and the potential it works at,
 * each in its own units. A fluid's resistance is in its pressure unit per
 * unit an hour of flow (bar/(m³/h)); power's in ohms, at its nominal
 * voltage (a kilowatt being 1000/V amps).
 */
export function ratingLines(t: ExperimentalTerminal): string[] {
  const { label, unit, medium } = SUBSTANCES[t.spec.substance];
  const { maxRate, resistance, potential, potentialUnit } = t.flow;
  const power = medium === 'power';
  const nominal = FLOWS[t.spec.substance].potential;
  const capacity = (q: number) =>
    q === Infinity ? 'UNLIMITED' : `${sig(q)} ${power ? 'kWh' : unit}`;
  return [
    `SUBSTANCE  ${label}`,
    `CAPACITY  ${t.role === 'source' ? capacity(t.spec.quantity) : capacity(t.spec.capacity)}`,
    `MAX FLOW  ${sig(maxRate)} ${power ? 'kW' : `${unit}/h`}`,
    power
      ? `RESISTANCE  ${sig((resistance * nominal) / 1000)} Ω`
      : `RESISTANCE  ${sig(resistance)} ${potentialUnit}/(${unit}/h)`,
    `${t.role === 'source' ? 'SUPPLY' : 'BACK'} ${power ? 'VOLTAGE' : 'PRESSURE'}  ${sig(potential)} ${potentialUnit}`,
  ];
}

/**
 * Move a substance from `source` to `sink` for `dt` seconds through a line
 * that is `open` (both its valves): at the potential difference over the
 * two internal resistances in series, never more than either's maximum
 * rate, and only what the source has and the sink has room for. Returns
 * the rate it flowed at, its unit an hour.
 */
export function transfer(
  source: ExperimentalSource,
  sink: ExperimentalSink,
  open: boolean,
  dt: number,
) {
  if (!open || !(dt > 0) || source.remaining() <= 0 || sink.space() <= 0)
    return 0;
  const difference = source.flow.potential - sink.flow.potential;
  const rate = Math.min(
    source.flow.maxRate,
    sink.flow.maxRate,
    Math.max(0, difference) / (source.flow.resistance + sink.flow.resistance),
  );
  const amount = Math.min((rate * dt) / 3600, source.remaining(), sink.space());
  const given = source.draw(amount, dt);
  const took = sink.accept(given, dt);
  return (took * 3600) / dt;
}

/**
 * A value for `digits` LED digits, with as many decimals as fit (up to
 * three), its point taking no digit of its own: 25 as 25.000, 0 as 0.000.
 */
export function ledText(value: number, digits: number) {
  const whole = Math.max(1, Math.floor(Math.abs(value)).toString().length);
  const decimals = Math.max(0, Math.min(3, digits - whole));
  return value.toFixed(decimals);
}

/**
 * What a source's or sink's dot-matrix display shows (a 16 × 2 character
 * LCD): what it reads on the first line, its value and unit on the second,
 * right-aligned. Its controller's character set has no ³, so cubic metres
 * read m^3 (the owner, 2026-10-23); an endless source reads
 * UNLIMITED.
 */
export function lcdLines(t: ExperimentalTerminal, columns = 16): string[] {
  const { unit, medium } = SUBSTANCES[t.spec.substance];
  const shown = (medium === 'power' ? 'kWh' : unit).replace('³', '^3');
  const value = t.value();
  const second =
    value === Infinity
      ? 'UNLIMITED'
      : `${value.toFixed(value >= 1e6 ? 0 : 3)} ${shown}`;
  return [
    (t.role === 'source' ? 'REMAINING' : 'CONTENTS').padEnd(columns),
    second.padStart(columns).slice(-columns),
  ];
}
