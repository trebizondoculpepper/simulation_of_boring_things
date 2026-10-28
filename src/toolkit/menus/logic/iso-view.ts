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

/** The largest the panel is drawn when fitting the whole screen, CSS pixels a millimetre. */
export const LARGEST_FITTED = 3;

/**
 * The panel's width and scale drawn as large as the screen allows, the
 * whole of it seen (the owner, 2026-10-28: "fit the screen vertically so
 * it is sized as big as possible"): each width the panel could be laid out
 * at, a centimetre apart, is laid out (`laid`, its actual width and
 * height), and the one drawn largest while fitting both the screen's width
 * and height, less its margins, is kept; snapped down to a twentieth.
 */
export function fitPanelToScreen(
  cssWidth: number,
  cssHeight: number,
  laid: (width: number) => { width: number; height: number },
): DeskFit {
  const usableW = Math.max(1, cssWidth - 2 * SCREEN_MARGIN);
  const usableH = Math.max(1, cssHeight - 2 * SCREEN_MARGIN);
  const across = Math.cos(DESK_VIEW.yaw);
  const down = Math.cos(DESK_VIEW.pitch);
  let best: DeskFit = fitPanel(cssWidth);
  let bestScale = 0;
  for (let w = PANEL_WIDTH.min; w <= PANEL_WIDTH.max + 1e-9; w += 0.01) {
    const p = laid(w);
    const scale = Math.min(
      LARGEST_FITTED,
      usableW / (p.width * 1000 * across),
      usableH / (p.height * 1000 * down),
    );
    if (scale > bestScale + 1e-9) {
      bestScale = scale;
      best = { panelWidth: w, pixelsPerMillimetre: scale };
    }
  }
  return {
    panelWidth: best.panelWidth,
    pixelsPerMillimetre: Math.max(
      0.05,
      Math.floor(best.pixelsPerMillimetre * 20 + 1e-9) / 20,
    ),
  };
}

/**
 * Where the camera looks and how large it draws: the point of the panel's
 * face at the screen's centre (metres from the panel's centre, x right, y
 * up) and CSS pixels a metre.
 */
export interface DeskView {
  x: number;
  y: number;
  scale: number;
}

/** How long a zoom in or out takes, seconds. */
export const ZOOM_SECONDS = 0.45;
/** The most a plate is zoomed to, CSS pixels a millimetre. */
export const ZOOM_LARGEST = 8;
/**
 * A share of the plate's fit the zoom stops at: a fifth short of filling
 * the screen (the owner, 2026-10-28), so the controls around it show.
 */
export const ZOOM_SHARE = 0.8;

/**
 * The view framing one plate (the owner, 2026-10-28: "clicking on a panel
 * square zooms in"): `box` in panel metres (x right, y down from its top
 * left), on a panel `width` × `height`: `ZOOM_SHARE` of as large as the
 * screen shows it whole, no larger than `ZOOM_LARGEST`.
 */
export function plateView(
  box: { x: number; y: number; w: number; h: number },
  panel: { width: number; height: number },
  cssWidth: number,
  cssHeight: number,
): DeskView {
  const usableW = Math.max(1, cssWidth - 2 * SCREEN_MARGIN);
  const usableH = Math.max(1, cssHeight - 2 * SCREEN_MARGIN);
  return {
    x: box.x + box.w / 2 - panel.width / 2,
    y: panel.height / 2 - (box.y + box.h / 2),
    scale:
      ZOOM_SHARE *
      Math.min(
        ZOOM_LARGEST * 1000,
        usableW / (box.w * Math.cos(DESK_VIEW.yaw)),
        usableH / (box.h * Math.cos(DESK_VIEW.pitch)),
      ),
  };
}

/** Ease in and out (cubic), `t` from 0 to 1. */
export const easeInOut = (t: number) => {
  const u = Math.min(1, Math.max(0, t));
  return u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2;
};

/**
 * The view `t` (0 to 1) of the way from `from` to `to`, eased: its scale
 * eased in proportion (so the zoom feels even), and its centre so the
 * point under the screen's centre glides.
 */
export function viewBetween(from: DeskView, to: DeskView, t: number): DeskView {
  const e = easeInOut(t);
  return {
    x: from.x + (to.x - from.x) * e,
    y: from.y + (to.y - from.y) * e,
    scale: from.scale * (to.scale / from.scale) ** e,
  };
}
