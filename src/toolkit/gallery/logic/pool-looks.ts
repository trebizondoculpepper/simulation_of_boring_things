/**
 * Three ways of lighting and finishing the poolrooms room (dev11), to
 * compare (`doc/research/poolrooms-look.md`), chosen with the LOOK
 * selector on its lectern. The room is the same in each
 * (`pool-room-plan.ts`); what differs is where its light comes from, how
 * its tiles are glazed and how the frame is finished.
 *
 * - Overcast: soft light from the rooflights and glazing as area lights,
 *   bounced round the room by a picture of the room captured from inside
 *   it.
 * - Sunlight: after ZhUyU1997/poolrooms (three.js): a sun through the
 *   rooflights casting real shadows, visible light shafts, a strong
 *   hemisphere light standing in for bounce, and little image fill.
 * - Unity: the values of rfsheffer/PoolRooms (Unity HDRP, MIT): satin
 *   tiles (smoothness 0.5), cool ceiling lamps, bloom 0.2, ambient
 *   occlusion 0.5 over 1.5 m, ACES.
 */

export type PoolLookId = 'overcast' | 'sunlight' | 'unity';

/** The looks in the selector's order, left to right. */
export const POOL_LOOK_ORDER: readonly PoolLookId[] = [
  'overcast',
  'sunlight',
  'unity',
];

export interface PoolLook {
  /** A few words for the title card, and where the look comes from. */
  title: string;
  source: string;
  /** ACES tone mapping's exposure. */
  exposure: number;
  /** Tile glaze: roughness range, clear coat, bump (1 is the default). */
  walls: { roughness: [number, number]; glaze: number };
  deck: { roughness: [number, number]; glaze: number };
  bump: number;
  /** How bright the rooflights' and glazing's panels glow (multiples of white). */
  rooflightGlow: number;
  glazingGlow: number;
  /** Area lights at the rooflights and the glazing (0 for none). */
  roofArea: number;
  glazingArea: number;
  hemisphere: { sky: string; ground: string; intensity: number };
  /** The captured room's light on itself (0 for none). */
  bounce: number;
  /** A sun through the rooflights: lux-like intensity, elevation and azimuth (radians; azimuth from +z toward +x). */
  sun: {
    intensity: number;
    colour: string;
    elevation: number;
    azimuth: number;
    /** How bright its shafts are in the air (0 for none). */
    shafts: number;
  } | null;
  /** Spot lamps in the ceiling: intensity (candela), colour, beam angle. */
  lamps: { intensity: number; colour: string; angle: number } | null;
  bloom: { strength: number; radius: number; threshold: number };
  /** Ambient occlusion: how strongly it is blended, and its radius, metres. */
  ao: { blend: number; radius: number };
  /** Caustics under the water, and reflected above it. */
  caustics: number;
  reflected: number;
  grain: number;
  vignette: number;
}

export const POOL_LOOKS: Record<PoolLookId, PoolLook> = {
  overcast: {
    title: 'OVERCAST',
    source: 'Soft rooflight bounced round the room',
    exposure: 1.0,
    walls: { roughness: [0.06, 0.22], glaze: 0.6 },
    deck: { roughness: [0.14, 0.32], glaze: 0.35 },
    bump: 1,
    rooflightGlow: 3,
    glazingGlow: 1.6,
    roofArea: 4.5,
    glazingArea: 3,
    hemisphere: { sky: '#f2f8f7', ground: '#c9d8d6', intensity: 0.15 },
    bounce: 0.5,
    sun: null,
    lamps: null,
    bloom: { strength: 0.12, radius: 0.4, threshold: 3.0 },
    ao: { blend: 0.85, radius: 0.9 },
    caustics: 1.6,
    reflected: 0.09,
    grain: 0.035,
    vignette: 0.32,
  },
  sunlight: {
    title: 'SUNLIGHT',
    source: 'After ZhUyU1997/poolrooms (three.js)',
    exposure: 0.95,
    walls: { roughness: [0.08, 0.24], glaze: 0.5 },
    deck: { roughness: [0.16, 0.34], glaze: 0.3 },
    bump: 1,
    rooflightGlow: 6,
    glazingGlow: 1.4,
    roofArea: 0,
    glazingArea: 1.5,
    hemisphere: { sky: '#eef6f8', ground: '#b9c9c8', intensity: 0.85 },
    bounce: 0.18,
    sun: {
      intensity: 9,
      colour: '#fff4e2',
      elevation: 1.0,
      azimuth: 0.6,
      shafts: 0.05,
    },
    lamps: null,
    bloom: { strength: 0.2, radius: 0.5, threshold: 2.5 },
    ao: { blend: 0.85, radius: 0.9 },
    caustics: 1.6,
    reflected: 0.09,
    grain: 0.035,
    vignette: 0.3,
  },
  unity: {
    title: 'UNITY',
    source: 'After rfsheffer/PoolRooms (Unity HDRP, MIT)',
    exposure: 1.0,
    // Smoothness 0.5 in HDRP: a satin glaze, not glass.
    walls: { roughness: [0.42, 0.55], glaze: 0 },
    deck: { roughness: [0.45, 0.6], glaze: 0 },
    bump: 1.4,
    rooflightGlow: 0.8,
    glazingGlow: 0.8,
    roofArea: 0,
    glazingArea: 0.8,
    hemisphere: { sky: '#e8eef4', ground: '#b4c0c4', intensity: 0.3 },
    bounce: 0.4,
    sun: null,
    // Its ceiling lamps: 933 lm spots, cool (20 000 K), 51.7 % inner cone.
    lamps: { intensity: 75, colour: '#dfe8ff', angle: 1.0 },
    // HDRP blends its bloom in; three's adds it, so a threshold keeps the
    // white walls from glowing.
    bloom: { strength: 0.2, radius: 0.7, threshold: 1.2 },
    ao: { blend: 0.5, radius: 1.5 },
    caustics: 1.3,
    reflected: 0.07,
    grain: 0.03,
    vignette: 0.25,
  },
};

/** The lectern's knobs, each 0 to 1 with its middle the look as given. */
export interface PoolKnobs {
  exposure: number;
  light: number;
  bounce: number;
  bloom: number;
  caustics: number;
  bump: number;
}

export const KNOB_NAMES: readonly (keyof PoolKnobs)[] = [
  'exposure',
  'light',
  'bounce',
  'bloom',
  'caustics',
  'bump',
];

/**
 * What a knob at `share` (0 to 1) multiplies its quantity by: the middle
 * leaves it as the look gives it; exposure turns two stops either way,
 * and the rest from nothing to double.
 */
export function knobFactor(name: keyof PoolKnobs, share: number) {
  const s = Math.max(0, Math.min(1, share));
  return name === 'exposure' ? 2 ** ((s - 0.5) * 4) : s * 2;
}
