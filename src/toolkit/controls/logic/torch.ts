/**
 * The torch: the player's own last-ditch light, held in the right hand as
 * Half-Life's flashlight is, switched on and off by one control
 * (`controls.ts`) in every room, and kept on from room to room. Its beam
 * goes where the player looks, but a moment late: it eases after the eye
 * (`followAim`), so a quick turn leaves the light a little behind. Pure.
 */

export const TORCH = {
  /** How long the beam takes to catch up with the eye: its time constant, seconds. */
  lag: 0.07,
  /** The beam's half-angle, radians, and how soft its edge is (0 hard, 1 all soft). */
  angle: 0.33,
  penumbra: 0.55,
  /** How far it reaches, metres, and its brightness (candela, at a metre). */
  range: 22,
  intensity: 85,
  /** A warm white, an incandescent bulb's. */
  colour: '#fff0d4',
  /** Where it is held, from the eye, metres: to the right, below and ahead. */
  hand: { right: 0.18, down: 0.22, forward: 0.2 },
} as const;

/** Which way something points: turned (yaw, clockwise from -z) and tipped up (pitch), radians. */
export interface Aim {
  yaw: number;
  pitch: number;
}

/** The difference `to - from` of two angles, taken the short way round. */
export function angleBetween(from: number, to: number) {
  const d = (to - from) % (2 * Math.PI);
  return d > Math.PI ? d - 2 * Math.PI : d < -Math.PI ? d + 2 * Math.PI : d;
}

/**
 * The beam's aim `dt` seconds on, easing after the eye's `target`: each
 * moment it closes the same share of the gap, so it never overshoots and
 * a turn left half done is caught up within a few tenths of a second.
 */
export function followAim(
  aim: Aim,
  target: Aim,
  dt: number,
  lag: number = TORCH.lag,
): Aim {
  if (lag <= 0) return { ...target };
  const k = 1 - Math.exp(-Math.max(0, dt) / lag);
  return {
    yaw: aim.yaw + angleBetween(aim.yaw, target.yaw) * k,
    pitch: aim.pitch + (target.pitch - aim.pitch) * k,
  };
}

/** Whether the torch is on, for every room: on until switched off. */
export const torch = {
  on: false,
  toggle() {
    torch.on = !torch.on;
    return torch.on;
  },
};

/**
 * How bright the beam's pool of light is at `r`, from its middle (0) to
 * its rim (1), on average round it: a little dark in the very middle,
 * where the bulb shades the reflector; a bright core round that; a
 * brighter ring where the reflector's rim focuses; then a dim halo,
 * fading out. 0 to 1.
 */
export function beamProfile(r: number, ringAt = 0.47): number {
  if (r >= 1) return 0;
  const core = 0.56 + 0.16 * (1 - Math.exp(-((r / 0.09) ** 2)));
  const body = r < 0.5 ? core : core * (1 - (r - 0.5) / 0.5) ** 0.6;
  const ring = 0.22 * Math.exp(-(((r - ringAt) / 0.07) ** 2));
  const halo = 0.22 * (1 - r) * (r > 0.5 ? 1 : 0);
  return Math.max(0, Math.min(1, body + ring + halo));
}

/**
 * A cheap torch's pool of light at (x, y), each from -1 to 1 across it:
 * not a perfect circle. Its bulb sits a little off centre in its
 * reflector, so the pool is brighter to one side and its ring out of
 * round; dents in the reflector leave soft blotches. Always the same
 * torch. 0 to 1.
 */
export function beamAt(x: number, y: number): number {
  const r = Math.hypot(x, y);
  if (r >= 1) return 0;
  const a = Math.atan2(y, x);
  // The ring wanders in and out round the pool.
  const ringAt =
    0.47 + 0.045 * Math.sin(2 * a + 0.7) + 0.025 * Math.sin(3 * a + 2.1);
  // Brighter toward one side, as from a bulb off centre.
  const lean = 1 + 0.2 * r * Math.cos(a - 0.9);
  let v = beamProfile(r, ringAt) * lean;
  // Soft blotches from a dented reflector.
  for (const [bx, by, size, depth] of BLOTCHES)
    v *= 1 + depth * Math.exp(-(((x - bx) ** 2 + (y - by) ** 2) / size ** 2));
  return Math.max(0, Math.min(1, v));
}

/** The reflector's dents: where, how big, and how much lighter or darker. */
const BLOTCHES: readonly (readonly [number, number, number, number])[] = [
  [0.35, -0.2, 0.22, 0.14],
  [-0.4, 0.25, 0.25, -0.16],
  [0.1, 0.55, 0.18, 0.1],
  [-0.15, -0.5, 0.2, -0.12],
  [0.6, 0.3, 0.15, -0.1],
];
