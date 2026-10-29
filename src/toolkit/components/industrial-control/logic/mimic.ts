/**
 * A mimic panel: a custom-built board that draws a plant system as an
 * infographic (pipes and ducts in their colours, the equipment as
 * symbols, labels) with indicator LEDs set into it where things run or
 * fail, LED readouts at the points that are measured, and a row of
 * illuminated buttons that change what every readout shows (flow, then
 * pressure, then temperature…), each readout's small LCD legend saying
 * what it is showing. Wired straight to the plant, made for one job.
 *
 * The board's layout is data (`MimicSpec`), in metres from the board's
 * middle, y up; what it shows is a `MimicState`. Pure: no DOM, no Three.
 */

import type { FlowState } from './mimic-chaser';

export type LampColour = 'green' | 'amber' | 'red' | 'white' | 'blue';

export const LAMP_COLOURS: Record<LampColour, string> = {
  green: '#5dff7a',
  amber: '#ffb02a',
  red: '#ff3b24',
  white: '#f4f6ff',
  blue: '#4aa8ff',
};

export type MimicSymbol =
  | 'tank'
  | 'pool'
  | 'pump'
  | 'filter'
  | 'valve'
  | 'hx'
  | 'boiler'
  | 'fan'
  | 'coil'
  | 'uv'
  | 'damper'
  | 'heatpump'
  | 'cylinder';

export type Point = readonly [number, number];

export interface MimicSpec {
  title: string;
  /** The board's size, metres. */
  width: number;
  height: number;
  /** Pipes and ducts: a colour, the points they run through, a width in px. */
  lines: readonly {
    colour: string;
    points: readonly Point[];
    width?: number;
    /**
     * Its LED chaser (prompt 066): the id of the flow it shows, running
     * along its points when forward; LEDs in its colour, or amber. A line
     * without one is drawn plain, as before. `size`, the LEDs' diameter in
     * metres, for a board read from across a room (default CHASER_SIZE).
     */
    flow?: {
      id: string;
      amber?: boolean;
      size?: number;
      /** Its LEDs' lit colour, if not the line's own (or amber). */
      lit?: string;
    };
  }[];
  /** The equipment, drawn as symbols with a label under each. */
  shapes: readonly {
    symbol: MimicSymbol;
    at: Point;
    size?: number;
    label?: string;
    /** A two-state indicator fitted at the centre of this symbol. */
    indicator?: { open: string; shut: string };
  }[];
  /** Other printed text. */
  labels?: readonly { text: string; at: Point; size?: number }[];
  /** Indicator LEDs set into the board, each named. */
  lamps: readonly {
    id: string;
    at: Point;
    colour: LampColour;
    label?: string;
  }[];
  /** LED readouts at the measured points, each with an LCD legend. */
  readouts: readonly { id: string; at: Point }[];
  /**
   * Push buttons set into the drawing, in line with the plant they work
   * (a pump's START and STOP beside its symbol), each named.
   */
  buttons?: readonly {
    id: string;
    at: Point;
    colour: 'green' | 'red' | 'black' | 'white';
    legend?: string;
  }[];
  /** The display modes, one illuminated button each, in order. */
  modes: readonly { id: string; legend: string }[];
}

/** One readout's reading in one mode: its value, unit and short name. */
export interface Reading {
  value: number;
  unit: string;
  /** Decimal places shown (default 0). */
  places?: number;
  /** What it measures, for the legend: "P1 OUT". */
  name: string;
}

/** What a mimic shows: each lamp lit or not, each readout's reading by mode. */
export interface MimicState {
  lamps: Readonly<Record<string, boolean>>;
  readouts: Readonly<Record<string, Readonly<Record<string, Reading>>>>;
  /** Each chased line's flow, by its flow id (prompt 066); missing is still. */
  flows?: Readonly<Record<string, FlowState>>;
}

/** Characters a readout shows: four digits, with the decimal point free. */
export const READOUT_DIGITS = 4;
/** Characters an LCD legend shows. */
export const LEGEND_COLUMNS = 10;

/**
 * What a four-digit LED readout shows for `reading`: right-aligned, with
 * its decimal places; blank if there is nothing to show in this mode, and
 * dashes if the value will not fit.
 */
export function readoutText(reading: Reading | undefined) {
  if (!reading || !Number.isFinite(reading.value))
    return ' '.repeat(READOUT_DIGITS);
  const text = reading.value.toFixed(reading.places ?? 0);
  const digits = text.replace('.', '').replace('-', '');
  if (digits.length > READOUT_DIGITS) return '-'.repeat(READOUT_DIGITS);
  return text.padStart(READOUT_DIGITS + (text.includes('.') ? 1 : 0), ' ');
}

/** What a readout's LCD legend says: its name and unit, or blank. */
export function legendText(reading: Reading | undefined) {
  if (!reading) return '';
  const unit = reading.unit;
  const room = LEGEND_COLUMNS - unit.length - 1;
  return `${reading.name.slice(0, Math.max(0, room)).padEnd(room)} ${unit}`.slice(
    0,
    LEGEND_COLUMNS,
  );
}

/**
 * What is wrong with a spec, if anything: everything inside the board,
 * ids unique, at least one mode, and every readout shown in some mode by
 * `state` (checked when given).
 */
export function checkMimic(spec: MimicSpec, state?: MimicState): string[] {
  const problems: string[] = [];
  const inside = ([x, y]: Point) =>
    Math.abs(x) <= spec.width / 2 && Math.abs(y) <= spec.height / 2;
  const ids = new Set<string>();
  for (const item of [
    ...spec.lamps,
    ...spec.readouts,
    ...(spec.buttons ?? []),
  ]) {
    if (ids.has(item.id)) problems.push(`duplicate id ${item.id}`);
    ids.add(item.id);
    if (!inside(item.at)) problems.push(`${item.id} is off the board`);
  }
  for (const shape of spec.shapes)
    if (!inside(shape.at))
      problems.push(`${shape.label ?? shape.symbol} is off the board`);
  for (const line of spec.lines)
    for (const point of line.points)
      if (!inside(point))
        problems.push(`a line runs off the board at ${point.join(', ')}`);
  if (spec.modes.length === 0) problems.push('no modes');
  if (state) {
    for (const lamp of spec.lamps)
      if (!(lamp.id in state.lamps))
        problems.push(`lamp ${lamp.id} is not driven`);
    for (const shape of spec.shapes)
      if (shape.indicator)
        for (const lamp of [shape.indicator.open, shape.indicator.shut])
          if (!(lamp in state.lamps))
            problems.push(
              `symbol ${shape.symbol} indicator ${lamp} is not driven`,
            );
    for (const readout of spec.readouts) {
      const shown = spec.modes.some((m) => state.readouts[readout.id]?.[m.id]);
      if (!shown)
        problems.push(`readout ${readout.id} shows nothing in any mode`);
    }
  }
  return problems;
}
