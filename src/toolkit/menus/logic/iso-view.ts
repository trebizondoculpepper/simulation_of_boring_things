/**
 * The settings panel's view (mission 096): a "desk" view rather than true
 * isometric, the orthographic camera a little above the panel's face
 * (straight on, so its rows stay level; the owner, 2026-10-27, asked for
 * the plates to line up), so the parts stand proud and read as 3D while small
 * lettering is barely foreshortened. The panel is as wide as the screen
 * lets it be at a legible scale, and as tall as its modules need; the view
 * scrolls down it. Pure.
 */

/** The camera's pose, radians: how far it looks down at the face, and round. */
export const DESK_VIEW = {
  pitch: (14 * Math.PI) / 180,
  yaw: 0,
};

/**
 * The scale the panel is drawn at where the screen allows, CSS pixels a
 * millimetre: half the first trial's (the owner, 2026-10-27: "about 50 %
 * smaller", so more of the panel is seen at once).
 */
export const LEGIBLE = 0.95;
/** The largest it is drawn, on a wide screen. */
export const LARGEST = 1.25;
/** The panel's narrowest and widest, metres. */
export const PANEL_WIDTH = { min: 0.36, max: 1.7 } as const;
/** The screen's margin each side, CSS pixels. */
export const SCREEN_MARGIN = 16;

export interface DeskFit {
  /** The panel's width, metres. */
  panelWidth: number;
  /** CSS pixels a millimetre, snapped to twentieths. */
  pixelsPerMillimetre: number;
}

/** The panel's width and scale for a screen `cssWidth` wide. */
export function fitPanel(cssWidth: number): DeskFit {
  const usable = Math.max(1, cssWidth - 2 * SCREEN_MARGIN);
  const across = Math.cos(DESK_VIEW.yaw);
  const panelWidth = Math.min(
    PANEL_WIDTH.max,
    Math.max(PANEL_WIDTH.min, usable / (LEGIBLE * 1000 * across)),
  );
  // As large as fits, up to the largest, snapped down to a twentieth (a whole pixel every 20 mm).
  const fits = usable / (panelWidth * 1000 * across);
  const pixelsPerMillimetre = Math.max(
    0.05,
    Math.floor(Math.min(LARGEST, fits) * 20 + 1e-9) / 20,
  );
  return { panelWidth, pixelsPerMillimetre };
}

/** How far the view can scroll down a panel `panelHeight` tall, metres along its face. */
export function scrollRange(
  panelHeight: number,
  cssHeight: number,
  pixelsPerMillimetre: number,
): number {
  const seen = cssHeight / (pixelsPerMillimetre * 1000);
  const drawn = panelHeight * Math.cos(DESK_VIEW.pitch);
  const margin = (2 * SCREEN_MARGIN) / (pixelsPerMillimetre * 1000);
  return Math.max(0, (drawn + margin - seen) / Math.cos(DESK_VIEW.pitch));
}

/** A scroll kept within its range. */
export const clampScroll = (scroll: number, range: number) =>
  Math.max(0, Math.min(range, scroll));
