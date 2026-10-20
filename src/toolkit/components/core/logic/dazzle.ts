/**
 * Being dazzled by a bright discharge: the flash fills the eye for a frame
 * or two, then leaves dark afterimages where it was, stuck to the eye (so
 * they stay put on the screen however the player looks about), fading over
 * a few seconds. A comical, subjective effect; nobody is hurt. No two pops
 * look alike: each is one to four circles of light round where it went
 * off, of different sizes, each blooming out within three frames and
 * leaving its own afterimage (`popPattern`).
 *
 * How long the afterimage lasts is normally distributed, `GHOST_MEAN`
 * seconds give or take `GHOST_SD`, never under `GHOST_MIN`.
 */
export const FLASH_FRAMES = 2;
export const GHOST_MEAN = 7;
export const GHOST_SD = 2;
export const GHOST_MIN = 1.5;

/** Seconds an afterimage lasts, from two uniform random numbers. */
export function ghostSeconds(random: () => number = Math.random) {
  const u = Math.max(random(), 1e-9);
  const normal = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random());
  return Math.max(GHOST_MIN, GHOST_MEAN + GHOST_SD * normal);
}

/**
 * How dark an afterimage is, `age` seconds after the flash, out of one:
 * darkest at once, fading slowly at first and then away, gone at
 * `seconds`.
 */
export function ghostLevel(age: number, seconds: number) {
  if (age <= 0) return 1;
  if (age >= seconds) return 0;
  const k = age / seconds;
  return (1 - k) * (1 - k * k);
}

/** One of a pop's circles of light. */
export interface PopCircle {
  /** Where it is from the discharge, as shares of the screen's height. */
  dx: number;
  dy: number;
  /** Its radius when fully out, as a share of the screen's height. */
  radius: number;
  /** How many frames it takes to bloom out to it: one to three. */
  frames: number;
}

/** The most circles a pop makes, and how far they stray from its middle. */
export const POP_CIRCLES = 4;
export const POP_SPREAD = 0.09;

/**
 * A pop's circles: one to four, the first on the discharge and the rest
 * strewn round it, each its own size (smaller the further out), each
 * blooming out in one to three frames. `strength` (0 to 1) sizes them.
 */
export function popPattern(
  strength = 1,
  random: () => number = Math.random,
): PopCircle[] {
  const count =
    1 + Math.min(POP_CIRCLES - 1, Math.floor(random() * POP_CIRCLES));
  const scale = 0.6 + 0.4 * Math.max(0, Math.min(1, strength));
  return Array.from({ length: count }, (_, i) => {
    const angle = random() * Math.PI * 2;
    const out = i === 0 ? 0 : POP_SPREAD * (0.35 + 0.65 * random());
    return {
      dx: out && Math.cos(angle) * out,
      dy: out && Math.sin(angle) * out,
      radius:
        scale * (i === 0 ? 0.08 + 0.05 * random() : 0.03 + 0.06 * random()),
      frames: 1 + Math.min(2, Math.floor(random() * 3)),
    };
  });
}

/** How far out a circle has bloomed, out of one, `frame` frames in (from 1). */
export function bloom(frame: number, frames: number) {
  const k = Math.max(0, Math.min(1, frame / frames));
  // Quick at first, as a flash is.
  return 1 - (1 - k) * (1 - k);
}
