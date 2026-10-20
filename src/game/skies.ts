/**
 * The skies the courtyard (dev_courtyard) shows over its open top, as
 * presets a sky shader and the room's lights are drawn from, and how one
 * gives way to the next. Pure logic: colours as [r, g, b] in 0 to 1
 * (linear-ish, as the shader takes them), angles in radians.
 */

export type SkyId =
  | 'overcast'
  | 'cumulus'
  | 'quake'
  | 'clear'
  | 'cirrus'
  | 'storm'
  | 'sunset'
  | 'night';

export type Rgb = readonly [number, number, number];

export interface Sky {
  name: string;
  /** The sky's colour overhead and at the horizon. */
  zenith: Rgb;
  horizon: Rgb;
  /** The sun: its height above the horizon and its bearing, its colour, how bright. */
  sunElevation: number;
  sunAzimuth: number;
  sunColour: Rgb;
  sun: number;
  /** Cloud: how much of the sky it covers (0 to 1), how soft its edges, its scale. */
  cover: number;
  softness: number;
  scale: number;
  /** How far the clouds are stretched into streaks (1 round, more streaky). */
  stretch: number;
  /** Their lit and shaded colours. */
  cloudLit: Rgb;
  cloudShade: Rgb;
  /** How fast they drift, metres a second at their height. */
  wind: number;
  /**
   * How many layers of cloud, one over another (1 to 3), and how much
   * faster each is than the one beneath it.
   */
  layers: number;
  layerSpeed: number;
  /**
   * Quake's way (0 or 1): the first layer a solid back layer of noise that
   * covers the whole sky, the layers over it cloud with holes cut in it,
   * all scrolling diagonally, each twice as fast as the one beneath.
   */
  quake: number;
  /** How much the stars show (0 to 1). */
  stars: number;
  /** The light on the ground from the sky as a whole. */
  ambient: Rgb;
  ambientLevel: number;
}

export const SKIES: Record<SkyId, Sky> = {
  quake: {
    // A parody of Quake's skies on its demonic levels: as Quake draws them,
    // a solid back layer and cloud over it with holes cut in it (its
    // black), scrolling diagonally, the front twice as fast as the back
    // (GLQuake: time × 8 and × 16), racing as if a storm raged above;
    // its colours from the mauve ramp of Quake's palette (indices 144 to
    // 159, #bb739f down to #2f171b) that its purple skies are drawn in.
    name: 'HELL',
    zenith: [0.231, 0.122, 0.137],
    horizon: [0.325, 0.169, 0.216],
    sunElevation: 0.9,
    sunAzimuth: 2.0,
    sunColour: [0.733, 0.451, 0.624],
    sun: 0,
    cover: 0.45,
    softness: 0.06,
    scale: 1.8,
    stretch: 1,
    cloudLit: [0.733, 0.451, 0.624],
    cloudShade: [0.184, 0.09, 0.106],
    wind: 110,
    layers: 3,
    layerSpeed: 2,
    quake: 1,
    stars: 0,
    ambient: [0.451, 0.263, 0.325],
    ambientLevel: 0.55,
  },
  clear: {
    name: 'CLEAR',
    zenith: [0.16, 0.36, 0.78],
    horizon: [0.62, 0.76, 0.9],
    sunElevation: 0.95,
    sunAzimuth: 2.4,
    sunColour: [1, 0.96, 0.88],
    sun: 2.6,
    cover: 0,
    softness: 0.2,
    scale: 1,
    stretch: 1,
    cloudLit: [1, 1, 1],
    cloudShade: [0.75, 0.78, 0.84],
    wind: 3,
    layers: 1,
    layerSpeed: 1.6,
    quake: 0,
    stars: 0,
    ambient: [0.62, 0.72, 0.88],
    ambientLevel: 0.9,
  },
  cumulus: {
    name: 'FLUFFY CLOUDS',
    zenith: [0.2, 0.42, 0.8],
    horizon: [0.66, 0.78, 0.9],
    sunElevation: 0.85,
    sunAzimuth: 2.2,
    sunColour: [1, 0.95, 0.86],
    sun: 2.2,
    cover: 0.38,
    softness: 0.12,
    scale: 1,
    stretch: 1,
    cloudLit: [1, 1, 0.98],
    cloudShade: [0.64, 0.68, 0.76],
    wind: 2,
    layers: 2,
    layerSpeed: 1.6,
    quake: 0,
    stars: 0,
    ambient: [0.66, 0.74, 0.86],
    ambientLevel: 0.9,
  },
  overcast: {
    name: 'OVERCAST',
    zenith: [0.62, 0.64, 0.66],
    horizon: [0.74, 0.75, 0.76],
    sunElevation: 0.7,
    sunAzimuth: 2.0,
    sunColour: [0.9, 0.9, 0.9],
    sun: 0.25,
    cover: 0.97,
    softness: 0.5,
    scale: 1.6,
    stretch: 1.4,
    cloudLit: [0.78, 0.79, 0.8],
    cloudShade: [0.55, 0.57, 0.6],
    wind: 4,
    layers: 1,
    layerSpeed: 1.6,
    quake: 0,
    stars: 0,
    ambient: [0.72, 0.74, 0.76],
    ambientLevel: 1.1,
  },
  cirrus: {
    name: 'HIGH CIRRUS',
    zenith: [0.18, 0.4, 0.82],
    horizon: [0.64, 0.78, 0.92],
    sunElevation: 0.75,
    sunAzimuth: 2.6,
    sunColour: [1, 0.97, 0.9],
    sun: 2.4,
    cover: 0.3,
    softness: 0.45,
    scale: 0.7,
    stretch: 6,
    cloudLit: [1, 1, 1],
    cloudShade: [0.86, 0.9, 0.96],
    wind: 14,
    layers: 1,
    layerSpeed: 1.6,
    quake: 0,
    stars: 0,
    ambient: [0.64, 0.74, 0.88],
    ambientLevel: 0.9,
  },
  storm: {
    name: 'GATHERING STORM',
    zenith: [0.18, 0.2, 0.24],
    horizon: [0.36, 0.38, 0.4],
    sunElevation: 0.5,
    sunAzimuth: 2.0,
    sunColour: [0.7, 0.72, 0.76],
    sun: 0.1,
    cover: 0.92,
    softness: 0.3,
    scale: 1.3,
    stretch: 1,
    cloudLit: [0.42, 0.44, 0.48],
    cloudShade: [0.12, 0.13, 0.16],
    wind: 18,
    layers: 1,
    layerSpeed: 1.6,
    quake: 0,
    stars: 0,
    ambient: [0.36, 0.38, 0.42],
    ambientLevel: 0.6,
  },
  sunset: {
    name: 'SUNSET',
    zenith: [0.2, 0.24, 0.5],
    horizon: [0.98, 0.56, 0.3],
    sunElevation: 0.06,
    sunAzimuth: 4.4,
    sunColour: [1, 0.55, 0.28],
    sun: 1.4,
    cover: 0.3,
    softness: 0.2,
    scale: 1.1,
    stretch: 2.2,
    cloudLit: [1, 0.62, 0.42],
    cloudShade: [0.4, 0.3, 0.42],
    wind: 5,
    layers: 1,
    layerSpeed: 1.6,
    quake: 0,
    stars: 0.05,
    ambient: [0.62, 0.48, 0.5],
    ambientLevel: 0.6,
  },
  night: {
    name: 'NIGHT',
    zenith: [0.01, 0.015, 0.04],
    horizon: [0.05, 0.06, 0.1],
    sunElevation: -0.6,
    sunAzimuth: 1.0,
    sunColour: [0.5, 0.56, 0.7],
    sun: 0,
    cover: 0.15,
    softness: 0.3,
    scale: 1.1,
    stretch: 1.5,
    cloudLit: [0.1, 0.11, 0.14],
    cloudShade: [0.04, 0.045, 0.06],
    wind: 3,
    layers: 1,
    layerSpeed: 1.6,
    quake: 0,
    stars: 1,
    ambient: [0.18, 0.22, 0.34],
    ambientLevel: 0.25,
  },
};

/** The skies in the order their buttons stand: the owner's three first. */
export const SKY_IDS: readonly SkyId[] = [
  'overcast',
  'cumulus',
  'quake',
  'clear',
  'cirrus',
  'storm',
  'sunset',
  'night',
];

const mix = (a: number, b: number, f: number) => a + (b - a) * f;
const mixRgb = (a: Rgb, b: Rgb, f: number): Rgb => [
  mix(a[0], b[0], f),
  mix(a[1], b[1], f),
  mix(a[2], b[2], f),
];

/** Part way from one sky to another (f from 0 to 1), every quantity eased. */
export function blendSkies(a: Sky, b: Sky, f: number): Sky {
  const e = f * f * (3 - 2 * f);
  // The sun's bearing turns the short way round.
  let turn = b.sunAzimuth - a.sunAzimuth;
  turn -= Math.round(turn / (2 * Math.PI)) * 2 * Math.PI;
  return {
    name: e < 0.5 ? a.name : b.name,
    zenith: mixRgb(a.zenith, b.zenith, e),
    horizon: mixRgb(a.horizon, b.horizon, e),
    sunElevation: mix(a.sunElevation, b.sunElevation, e),
    sunAzimuth: a.sunAzimuth + turn * e,
    sunColour: mixRgb(a.sunColour, b.sunColour, e),
    sun: mix(a.sun, b.sun, e),
    cover: mix(a.cover, b.cover, e),
    softness: mix(a.softness, b.softness, e),
    scale: mix(a.scale, b.scale, e),
    stretch: mix(a.stretch, b.stretch, e),
    cloudLit: mixRgb(a.cloudLit, b.cloudLit, e),
    cloudShade: mixRgb(a.cloudShade, b.cloudShade, e),
    wind: mix(a.wind, b.wind, e),
    layers: mix(a.layers, b.layers, e),
    layerSpeed: mix(a.layerSpeed, b.layerSpeed, e),
    quake: mix(a.quake, b.quake, e),
    stars: mix(a.stars, b.stars, e),
    ambient: mixRgb(a.ambient, b.ambient, e),
    ambientLevel: mix(a.ambientLevel, b.ambientLevel, e),
  };
}

/** Seconds one sky takes to give way to the next. */
export const SKY_CHANGE_SECONDS = 6;

/**
 * The sky over the courtyard, which changes gradually to whichever is
 * chosen. `step` advances it and gives the sky to draw.
 */
export function createSkyChanger(initial: SkyId = 'overcast') {
  let from: Sky = SKIES[initial];
  let target: SkyId = initial;
  let progress = 1;
  let now: Sky = from;
  return {
    /** Change to `id`, from whatever is showing now. */
    choose(id: SkyId) {
      if (id === target) return;
      from = now;
      target = id;
      progress = 0;
    },
    step(dt: number): Sky {
      progress = Math.min(1, progress + Math.max(0, dt) / SKY_CHANGE_SECONDS);
      now =
        progress >= 1
          ? SKIES[target]
          : blendSkies(from, SKIES[target], progress);
      return now;
    },
    get target() {
      return target;
    },
    get sky() {
      return now;
    },
  };
}

/** The sun's direction as a unit vector (x east, y up, z south). */
export function sunDirection(sky: Pick<Sky, 'sunElevation' | 'sunAzimuth'>) {
  const c = Math.cos(sky.sunElevation);
  return {
    x: Math.sin(sky.sunAzimuth) * c,
    y: Math.sin(sky.sunElevation),
    z: -Math.cos(sky.sunAzimuth) * c,
  };
}
