/**
 * The costlier effects' graphics settings (the owner, 2026-10-28;
 * `doc/research/graphics-quality-presets.md`): ambient occlusion and bloom
 * each off or at a quality, and the largest image drawn whatever the
 * screen. What each choice means for the passes and the pixel ratio. Pure.
 */

export const EFFECT_LEVELS = ['off', 'low', 'medium', 'high'] as const;
export type EffectLevel = (typeof EFFECT_LEVELS)[number];

/**
 * The maximum resolution (the owner, 2026-10-29): `native`, the viewport,
 * draws as many pixels as the window has (so the cost follows the
 * window's size), or the image is drawn no larger than one of the common
 * PC gaming resolutions, or the Steam Deck's, width and height both.
 * Smallest first, the viewport last, as the menu's switch turns.
 */
export const RESOLUTION_CAPS = [
  '640x480',
  '1024x768',
  '1280x720',
  '1280x800',
  '1366x768',
  '1600x900',
  '1920x1080',
  '1920x1200',
  '2560x1080',
  '2560x1440',
  '2560x1600',
  '3440x1440',
  '3840x2160',
  'native',
] as const;
export type ResolutionCap = (typeof RESOLUTION_CAPS)[number];

/** The old height-only caps (before 2026-10-29), as the resolutions they become. */
export const OLD_RESOLUTION_CAPS: Readonly<Record<string, ResolutionCap>> = {
  '720': '1280x720',
  '1080': '1920x1080',
  '1440': '2560x1440',
};

/** A stored cap, or an old one, as a cap; null if it is neither. */
export function parseResolutionCap(value: unknown): ResolutionCap | null {
  if (RESOLUTION_CAPS.includes(value as ResolutionCap))
    return value as ResolutionCap;
  return OLD_RESOLUTION_CAPS[String(value)] ?? null;
}

/** How each choice is named in the menu. */
export const EFFECT_LABELS: Record<EffectLevel, string> = {
  off: 'Off',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};
export const RESOLUTION_LABELS: Record<ResolutionCap, string> = {
  '640x480': '640 × 480 (VGA)',
  '1024x768': '1024 × 768 (XGA)',
  '1280x720': '1280 × 720 (720p)',
  '1280x800': '1280 × 800 (Steam Deck)',
  '1366x768': '1366 × 768 (laptop)',
  '1600x900': '1600 × 900',
  '1920x1080': '1920 × 1080 (1080p)',
  '1920x1200': '1920 × 1200',
  '2560x1080': '2560 × 1080 (ultrawide)',
  '2560x1440': '2560 × 1440 (1440p)',
  '2560x1600': '2560 × 1600',
  '3440x1440': '3440 × 1440 (ultrawide)',
  '3840x2160': '3840 × 2160 (4K)',
  native: 'Viewport (the window’s size)',
};

/** Each maximum resolution on the menu's 16-character LCD: its size, and what it is. */
export const RESOLUTION_LCD: Record<ResolutionCap, readonly [string, string]> =
  {
    '640x480': ['640 x 480', 'VGA'],
    '1024x768': ['1024 x 768', 'XGA'],
    '1280x720': ['1280 x 720', '720p'],
    '1280x800': ['1280 x 800', 'STEAM DECK'],
    '1366x768': ['1366 x 768', 'LAPTOP'],
    '1600x900': ['1600 x 900', '900p'],
    '1920x1080': ['1920 x 1080', '1080p FULL HD'],
    '1920x1200': ['1920 x 1200', 'WUXGA'],
    '2560x1080': ['2560 x 1080', 'ULTRAWIDE'],
    '2560x1440': ['2560 x 1440', '1440p QHD'],
    '2560x1600': ['2560 x 1600', 'WQXGA'],
    '3440x1440': ['3440 x 1440', 'ULTRAWIDE QHD'],
    '3840x2160': ['3840 x 2160', '4K UHD'],
    native: ['VIEWPORT', 'WINDOW SIZE'],
  };

/**
 * Ambient occlusion at `level`: whether it runs, and its samples per pixel
 * (`full` is the room's own, as tuned: 12 in most, 6 on the bridge, 3 in
 * the museum). Low is a third of it and Medium half, never fewer than 4,
 * the fewest GTAO still looks like occlusion at, unless the room's own is
 * fewer still.
 */
export function ambientOcclusionAt(level: EffectLevel, full = 12) {
  if (level === 'off') return { enabled: false, samples: full };
  const share = level === 'low' ? 1 / 3 : level === 'medium' ? 1 / 2 : 1;
  return {
    enabled: true,
    samples: Math.min(full, Math.max(4, Math.round(full * share))),
  };
}

/**
 * Bloom at `level`: whether it runs, and the share of each side of the
 * image its blur chain works at (its cost goes with the square).
 */
export function bloomAt(level: EffectLevel) {
  return {
    enabled: level !== 'off',
    scale: level === 'low' ? 0.25 : level === 'medium' ? 0.5 : 1,
  };
}

/**
 * The pixel ratio a canvas `width` × `height` CSS pixels is drawn at,
 * asked for `wanted`, under `cap`: never more pixels wide or tall than the
 * cap allows. A cap only ever lowers the ratio.
 */
export function cappedPixelRatio(
  wanted: number,
  width: number,
  height: number,
  cap: ResolutionCap,
): number {
  if (cap === 'native') return wanted;
  const [w, h] = cap.split('x').map(Number);
  let ratio = wanted;
  if (width > 0) ratio = Math.min(ratio, w / width);
  if (height > 0) ratio = Math.min(ratio, h / height);
  return ratio;
}

/**
 * What is done when the maximum resolution's shape is not the window's
 * (the owner, 2026-10-29): `fill`, the window's own shape drawn with no
 * more pixels than the cap (no borders); `centre`, the cap's size shown
 * as it is, centred, shrunk in proportion only if the window is smaller;
 * `letterbox`, scaled up or down to fit, its shape kept, black bars
 * either side; `stretch`, scaled to fill the window, its shape not kept.
 */
export const ASPECT_FITS = ['fill', 'centre', 'letterbox', 'stretch'] as const;
export type AspectFit = (typeof ASPECT_FITS)[number];

export const ASPECT_FIT_LABELS: Record<AspectFit, string> = {
  fill: 'Fill (the window’s shape)',
  centre: 'Centre (actual size)',
  letterbox: 'Letterbox (fit, keep shape)',
  stretch: 'Stretch (fill, ignore shape)',
};

/** Each on the menu's 16-character LCD. */
export const ASPECT_FIT_LCD: Record<AspectFit, readonly [string, string]> = {
  fill: ['FILL', 'WINDOW SHAPE'],
  centre: ['CENTRE', 'ACTUAL SIZE'],
  letterbox: ['LETTERBOX', 'FIT, KEEP SHAPE'],
  stretch: ['STRETCH', 'FILL, ANY SHAPE'],
};

/**
 * Where the image is laid out in a `viewW` × `viewH` window (CSS pixels,
 * `dpr` device pixels to each), under `cap` and `fit`: its laid-out box,
 * offset to centre it, and the scale it is then drawn at each way (only
 * Stretch's is not 1). Null to fill the window as it is.
 */
export function frameLayout(
  viewW: number,
  viewH: number,
  dpr: number,
  cap: ResolutionCap,
  fit: AspectFit,
): {
  width: number;
  height: number;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
} | null {
  if (cap === 'native' || fit === 'fill' || !(viewW > 0 && viewH > 0))
    return null;
  const [w, h] = cap.split('x').map(Number);
  // The cap's size in CSS pixels, so Centre shows it pixel for pixel.
  const cssW = w / Math.max(dpr, 1e-6);
  const cssH = h / Math.max(dpr, 1e-6);
  const fitScale = Math.min(viewW / cssW, viewH / cssH);
  const scale = fit === 'centre' ? Math.min(1, fitScale) : fitScale;
  const width = cssW * scale;
  const height = cssH * scale;
  if (fit === 'stretch')
    return {
      width,
      height,
      x: 0,
      y: 0,
      scaleX: viewW / width,
      scaleY: viewH / height,
    };
  return {
    width,
    height,
    x: (viewW - width) / 2,
    y: (viewH - height) / 2,
    scaleX: 1,
    scaleY: 1,
  };
}

// ---- Presets (mission 087) --------------------------------------------------

/**
 * Graphics presets, Low, Medium and High (mission 087; the owner,
 * 2026-10-28), so a less powerful machine can start light. High is the
 * game as it has always looked. A preset does two things: choosing it
 * writes the player's own settings above it (render quality, ambient
 * occlusion, bloom, film effects), which can then be changed one by one;
 * and it decides the effects with no setting of their own (antialiasing,
 * the pixel-ratio cap, the pool's refraction, shadows and their size).
 */
export type GraphicsPreset = 'low' | 'medium' | 'high';

/** The presets, lowest first, as a selector offers them. */
export const GRAPHICS_PRESETS: readonly GraphicsPreset[] = [
  'low',
  'medium',
  'high',
];

export const DEFAULT_GRAPHICS: GraphicsPreset = 'high';

/**
 * How ambient occlusion is drawn (the owner, 2026-10-30): LIVE, screen-space
 * GTAO every frame at `ambientOcclusion`'s quality; ONE-TIME (`bake`), the
 * baked per-vertex occlusion, faded in once ready; or OFF, neither.
 */
export type AoMode = 'live' | 'bake' | 'off';
export const AO_MODES: readonly AoMode[] = ['live', 'bake', 'off'];
export const AO_MODE_LABELS: Record<AoMode, string> = {
  live: 'Live',
  bake: 'One-time',
  off: 'Off',
};

/** The settings panel's AMBIENT OCCLUSION switch: each mode's LCD lines. */
export const AO_MODE_LCD: Record<AoMode, readonly [string, string]> = {
  live: ['LIVE', 'EVERY FRAME'],
  bake: ['ONE-TIME', 'BAKED, KEPT'],
  off: ['OFF', 'NONE'],
};

/** What choosing a preset writes into the player's own settings. */
export interface PresetChoices {
  renderLevel: number;
  /** Ambient occlusion's mode: ONE-TIME (baked), or OFF on Low (the owner, 2026-10-30). */
  aoMode: AoMode;
  /** LIVE ambient occlusion's quality, should LIVE be chosen. */
  ambientOcclusion: EffectLevel;
  bloom: EffectLevel;
  filmEffects: boolean;
}

/** What a preset itself decides. */
export interface GraphicsOptions {
  /** The most pixels drawn per CSS pixel, before the render quality scales it. */
  pixelRatioCap: number;
  /** Multisample antialiasing on the canvas (taken when a room's renderer is made). */
  antialias: boolean;
  /** The pool's screen-space refraction pass. */
  refraction: boolean;
  /** Shadow maps at all. */
  shadows: boolean;
  /** The largest shadow map side, pixels: bigger maps a room asks for are cut to it. */
  shadowMapMax: number;
}

export const PRESET_CHOICES: Record<GraphicsPreset, PresetChoices> = {
  low: {
    renderLevel: 6,
    aoMode: 'off',
    ambientOcclusion: 'low',
    bloom: 'off',
    filmEffects: false,
  },
  medium: {
    renderLevel: 3,
    aoMode: 'bake',
    ambientOcclusion: 'medium',
    bloom: 'medium',
    filmEffects: true,
  },
  high: {
    renderLevel: 0,
    aoMode: 'bake',
    ambientOcclusion: 'high',
    bloom: 'high',
    filmEffects: true,
  },
};

export const GRAPHICS: Record<GraphicsPreset, GraphicsOptions> = {
  low: {
    pixelRatioCap: 1,
    antialias: false,
    refraction: false,
    shadows: false,
    shadowMapMax: 1024,
  },
  medium: {
    pixelRatioCap: 1.25,
    antialias: false,
    refraction: true,
    shadows: true,
    shadowMapMax: 1024,
  },
  high: {
    pixelRatioCap: 2,
    antialias: true,
    refraction: true,
    shadows: true,
    shadowMapMax: 4096,
  },
};

/** A preset's own options. */
export const graphicsOptions = (preset: GraphicsPreset): GraphicsOptions =>
  GRAPHICS[preset];

/**
 * A preset named in text (a URL, a save), or null: the names, any case,
 * and `med` for medium.
 */
export function parsePreset(text: unknown): GraphicsPreset | null {
  if (typeof text !== 'string') return null;
  const name = text.trim().toLowerCase();
  if (name === 'med') return 'medium';
  return (GRAPHICS_PRESETS as readonly string[]).includes(name)
    ? (name as GraphicsPreset)
    : null;
}

/** A shadow map's side, pixels, cut to a preset's largest. */
export const shadowMapSide = (wanted: number, max: number) =>
  Math.max(1, Math.min(wanted, max));
