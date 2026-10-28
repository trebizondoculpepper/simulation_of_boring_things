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

/** One lane line in the projected picture, in its 0 to 1 coordinates (u along the pool's length, v across it). */
export interface ProjectedLane {
  /** The line's middle across the pool. */
  v: number;
  /** Where its T ends stand along the pool. */
  u0: number;
  u1: number;
}

/**
 * The lane lines the projector draws on the plain white pool (the owner,
 * 2026-10-28: "the pool lines are also part of the projection"), as a real
 * pool's floor markings (FINA / Sport England): 0.2 m wide, stopping 2 m
 * short of each end wall, each ended by a 1 m cross-bar (the T), between
 * `lanes` + 1 lanes across a pool `w` by `d` m. All in the picture's uv.
 */
export function projectedLanes(
  w: number,
  d: number,
  lanes: number,
): {
  lines: ProjectedLane[];
  /** Half the line's width, and the T bar's half length, across (v). */
  halfWidthV: number;
  tHalfV: number;
  /** Half the line's width along (u), for the T bar. */
  halfWidthU: number;
} {
  const end = Math.min(2, w / 4);
  const lines: ProjectedLane[] = [];
  for (let k = 1; k <= lanes; k++)
    lines.push({ v: k / (lanes + 1), u0: end / w, u1: 1 - end / w });
  return {
    lines,
    halfWidthV: 0.1 / d,
    tHalfV: 0.5 / d,
    halfWidthU: 0.1 / w,
  };
}

/** How the projector goes out when the walker leaves Hall 0, and comes back on (the owner, 2026-10-28). */
export const PROJECTOR_FADE = {
  /** Seconds it carries on projecting after the walker crosses out. */
  hold: 5,
  /** Seconds it then takes to fade to black, before switching off. */
  fadeOut: 5,
  /** Seconds it takes to fade up again when the walker comes back (our choice). */
  fadeIn: 1,
} as const;

export interface ProjectorPresence {
  /** Is the picture thrown at all (else standby, its texture not redrawn)? */
  projecting: boolean;
  /** The picture's brightness, 0 to 1. */
  brightness: number;
}

/**
 * What the projector shows, `seconds` since the walker last crossed in or
 * out of Hall 0 (`inHall0`): full while in it (after a fade up), then held
 * `hold` s after leaving, faded out linearly over `fadeOut` s, then off.
 */
export function projectorPresence(
  inHall0: boolean,
  seconds: number,
): ProjectorPresence {
  const s = Math.max(0, seconds);
  const F = PROJECTOR_FADE;
  if (inHall0)
    return { projecting: true, brightness: Math.min(1, s / F.fadeIn) };
  if (s < F.hold) return { projecting: true, brightness: 1 };
  if (s < F.hold + F.fadeOut)
    return { projecting: true, brightness: 1 - (s - F.hold) / F.fadeOut };
  return { projecting: false, brightness: 0 };
}

/**
 * Where the walker is, as the projector knows it, kept across the hand-over
 * between hall scenes (one per page): which hall they are in and when (s,
 * on any steady clock) they last crossed in or out of Hall 0. Starts in
 * Hall 0 fully lit, as if long since arrived.
 */
export function createWalkerWhereabouts() {
  let inHall0 = true;
  let since = -Infinity;
  return {
    /** The walker is in hall `hall` at time `t`. */
    walkerIn(hall: string, t: number) {
      const now = hall === 'museum0';
      if (now === inHall0) return;
      inHall0 = now;
      since = t;
    },
    /** What the projector shows at time `t`. */
    presence(t: number): ProjectorPresence {
      return projectorPresence(inHall0, t - since);
    },
  };
}
