/**
 * Hall 0's caustics projector (the owner, 2026-10-28: "the pool is white,
 * but the caustics are being projected from a video projector we can see
 * high on the ceiling"): a large-venue laser projector, modelled on the
 * 10,000-lumen class of installation projectors (Panasonic PT-RZ, Epson
 * EB-PU), hung from the ceiling on a drop pole and pointing straight down,
 * playing a loop of light through water onto the white pool. Pure: its
 * power, its status lamp, and the loop's frame, stepped at no more than
 * 10 Hz so the projection is redrawn only when its frame changes.
 */

/** The projector: its make, size (m) and the throw of its picture. */
export const CAUSTICS_PROJECTOR = {
  maker: 'lumenhaus',
  model: 'LX-10K laser projector',
  lumens: 10_000,
  /** Its body: width across, length along its lens axis, height. */
  body: { w: 0.5, l: 0.59, h: 0.2 },
  /** The drop pole from the ceiling to its bracket. */
  drop: 0.55,
  /** Frames a second of the projected loop: the display rule's ceiling. */
  rate: 10,
  /** The loop's length, seconds: the pattern then repeats seamlessly. */
  loop: 24,
} as const;

export type ProjectorLamp = 'green' | 'amber' | 'off';

export interface ProjectorState {
  /** Is the light source lit and the picture thrown? */
  projecting: boolean;
  /** Its status LED, as its makers' manuals have it: green on, amber standby. */
  lamp: ProjectorLamp;
}

/** What the projector does: it runs while the room is lit and stands by when it is not. */
export function projectorState(
  powered: boolean,
  roomLit: boolean,
): ProjectorState {
  if (!powered) return { projecting: false, lamp: 'off' };
  return roomLit
    ? { projecting: true, lamp: 'green' }
    : { projecting: false, lamp: 'amber' };
}

/** The loop's frame `seconds` after it started: whole frames at its rate, round the loop. */
export function causticsFrame(seconds: number): number {
  const frames = CAUSTICS_PROJECTOR.rate * CAUSTICS_PROJECTOR.loop;
  const f = Math.floor(Math.max(0, seconds) * CAUSTICS_PROJECTOR.rate);
  return f % frames;
}

/** The pattern's phase for a frame, 0 to 1 round the loop. */
export function causticsPhase(frame: number): number {
  return frame / (CAUSTICS_PROJECTOR.rate * CAUSTICS_PROJECTOR.loop);
}

/** A running projector: advance it by `delta` seconds; true when its picture's frame changed and must be redrawn. */
export function createCausticsClock() {
  let t = 0;
  let frame = -1;
  return {
    step(delta: number): boolean {
      t += Math.max(0, delta);
      const next = causticsFrame(t);
      if (next === frame) return false;
      frame = next;
      return true;
    },
    get phase() {
      return causticsPhase(Math.max(0, frame));
    },
  };
}
