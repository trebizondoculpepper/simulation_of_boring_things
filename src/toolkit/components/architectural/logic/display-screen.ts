/**
 * A wall-hung flat display, after a slim 55-inch commercial signage
 * screen: its sizes stood portrait or landscape, which of a run of
 * pictures it shows at a moment, and how a picture is cropped to fill it.
 * Pure; metres and seconds.
 */

/** A 55-inch display (16:9, 1.21 × 0.68 m of picture), slim, its bezel 15 mm. */
export const DISPLAY_55 = {
  /** Its case, long side by short side by depth. */
  long: 1.26,
  short: 0.73,
  depth: 0.035,
  /** The bezel round the picture. */
  bezel: 0.015,
} as const;

export type Orientation = 'portrait' | 'landscape';

/** Its case's width and height as hung. */
export function displaySize(orientation: Orientation) {
  const { long, short } = DISPLAY_55;
  return orientation === 'portrait'
    ? { w: short, h: long }
    : { w: long, h: short };
}

/** The picture's width and height as hung: the case less its bezel. */
export function pictureSize(orientation: Orientation) {
  const { w, h } = displaySize(orientation);
  return { w: w - 2 * DISPLAY_55.bezel, h: h - 2 * DISPLAY_55.bezel };
}

/** Which of `count` pictures shows at `seconds`, each held `period` seconds. */
export const slideAt = (seconds: number, count: number, period: number) =>
  count > 0 ? Math.floor(Math.max(0, seconds) / period) % count : 0;

/**
 * How a picture of aspect `image` (width / height) is cropped to fill a
 * screen of aspect `screen`: the share of each axis it keeps, and the
 * offset that keeps its middle (as a texture's repeat and offset).
 */
export function cropToFill(image: number, screen: number) {
  if (image > screen) {
    const keep = screen / image;
    return { repeat: [keep, 1], offset: [(1 - keep) / 2, 0] } as const;
  }
  const keep = image / screen;
  return { repeat: [1, keep], offset: [0, (1 - keep) / 2] } as const;
}
