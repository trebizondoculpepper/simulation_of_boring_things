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
  intensity: 60,
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
