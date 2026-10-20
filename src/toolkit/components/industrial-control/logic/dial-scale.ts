/**
 * A dial gauge's scale, as EN 837-1 gauges print them: a 270° arc from
 * bottom left (the minimum) round to bottom right (the maximum), major
 * marks at a round step with their numbers, and minor marks between.
 * Pure arithmetic.
 */

/** The arc the scale covers, radians, and where it starts (screen angles, y down). */
export const SWEEP = Math.PI * 1.5;
export const START = Math.PI * 0.75;

export interface DialScale {
  min: number;
  max: number;
  /** The values of the numbered marks. */
  majors: number[];
  /** How many minor divisions between neighbouring majors. */
  minorPerMajor: number;
}

/** A round step for about `count` divisions of `span`: 1, 2, 2.5 or 5 × 10ⁿ. */
export function niceStep(span: number, count = 5) {
  const rough = span / count;
  const power = 10 ** Math.floor(Math.log10(rough));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * power >= rough) return m * power;
  return 10 * power;
}

/** The scale of a gauge reading from `min` to `max`. */
export function dialScale(min: number, max: number): DialScale {
  const step = niceStep(max - min);
  const majors: number[] = [];
  const first = Math.ceil(min / step - 1e-9) * step;
  for (let v = first; v <= max + 1e-9; v += step)
    majors.push(Math.round(v * 1e6) / 1e6 + 0);
  const leading = String(step / 10 ** Math.floor(Math.log10(step)))[0];
  const minorPerMajor = leading === '2' ? 4 : 5;
  return { min, max, majors, minorPerMajor };
}

/** Where `value` puts the pointer, as an angle round the dial (clamped to its stops). */
export function pointerAngle(value: number, min: number, max: number) {
  const share = Math.max(-0.02, Math.min(1.02, (value - min) / (max - min)));
  return START + share * SWEEP;
}

/** How a mark's value is printed: no needless decimals. */
export const markText = (value: number) =>
  Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
