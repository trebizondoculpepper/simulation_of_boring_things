/**
 * How each plate of a panel was machined (mission 096; the owner,
 * 2026-10-27: "each piece machined at a slightly different angle, so there
 * are score marks in the plate"): the angle of its score marks and a slight
 * difference in its tone, fixed by where it sits, so a plate looks the same
 * every time and its neighbours catch the light differently. Angles come in
 * a few steps, so plates share materials. Pure.
 */

/** How many angles the score marks are cut at, and how many tones. */
export const MACHINING_ANGLES = 6;
export const MACHINING_TONES = 3;

/** A small, steady hash of a plate's place. */
const hash = (column: number, row: number) => {
  let h = (column * 374761393 + row * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
};

/** The plate at (`column`, `row`): which angle step and which tone it has. */
export function machining(column: number, row: number) {
  const h = hash(column, row);
  const step = h % MACHINING_ANGLES;
  const tone = Math.floor(h / MACHINING_ANGLES) % MACHINING_TONES;
  return { step, tone };
}

/** An angle step's angle, radians: spread over a half turn, never quite square. */
export const machiningAngle = (step: number) =>
  ((step + 0.37) / MACHINING_ANGLES) * Math.PI;
