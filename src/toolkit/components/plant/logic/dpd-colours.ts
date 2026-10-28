/**
 * The DPD test kit's colours (107c): DPD's pink deepening with chlorine
 * (0 to 3 mg/l, colourless to deep magenta), and phenol red's yellow to
 * red with pH (6.8 to 8.2), as a comparator's discs print them. Pure.
 */

const mix = (a: readonly number[], b: readonly number[], k: number) =>
  a.map((x, i) => Math.round(x + (b[i] - x) * Math.max(0, Math.min(1, k))));
const hex = (rgb: readonly number[]) =>
  `#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}`;

/** DPD's colour at a chlorine reading, mg/l. */
export const dpdColour = (mgPerL: number) =>
  hex(mix([248, 244, 244], [176, 18, 110], mgPerL / 3));

/** Phenol red's colour at a pH. */
export function phenolColour(ph: number) {
  const k = (ph - 6.8) / 1.4;
  return hex(
    k < 0.5
      ? mix([240, 200, 40], [240, 120, 50], k * 2)
      : mix([240, 120, 50], [200, 20, 50], (k - 0.5) * 2),
  );
}
