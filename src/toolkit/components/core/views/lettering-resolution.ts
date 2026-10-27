/**
 * How finely printed lettering is drawn: a multiple of each lettering
 * kind's usual canvas resolution (`createMicroLabel`'s 16 px a line, an
 * engraved plate's 640 px, Dymo tape's 512 px). Rooms see lettering from
 * a walker's distance and keep 1; a menu panel (mission 096), drawn large
 * and close on its own overlay, builds its lettering inside
 * `withLetteringScale` so it stays crisp at two or three device pixels to
 * the CSS pixel.
 */

let scale = 1;

/** The multiple now in force. */
export const letteringScale = () => scale;

/** Build `make`'s lettering at `multiple` times the usual resolution. */
export function withLetteringScale<T>(multiple: number, make: () => T): T {
  const was = scale;
  scale = Math.max(1, multiple);
  try {
    return make();
  } finally {
    scale = was;
  }
}
