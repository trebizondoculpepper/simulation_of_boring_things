import { LOOK_UP, REVEAL, revealFrame } from './skimmer-reveal';

/**
 * Dev53's skimmer cinematic (the owner, 2026-10-29), a trial of the
 * skimmer reveal as a film: the lid comes off and gold caustics rise at
 * once from the skimmer's rim, tapering upward; while the suspense
 * builds, the camera orbits the skimmer's vertical axis, sinking as it
 * goes; then a sudden whip up to a look diagonally up, overshooting and
 * correcting, the fanfare, and a find
 * turning above; then back to the walker as the lid goes back on. Pure:
 * where the eye is and what shows, at a time. Positions are metres from
 * the skimmer's middle at deck level.
 */

export interface CinematicTiming {
  /** The suspense, the orbit's length: the suspense cue's. */
  suspense: number;
  /** The find shown: the big-item cue's. */
  reveal: number;
  /** The lid going back on, the caustics dying. */
  replace: number;
}

export const CINEMATIC: CinematicTiming = {
  suspense: REVEAL.suspense,
  reveal: REVEAL.fanfare,
  replace: 0.9,
};

/** Seconds the lid takes to come off, and the caustics to rise. */
export const LIFT = 0.5;
export const RISE = 0.35;
/** Seconds the eye takes to turn from where the walker looked onto the skimmer. */
export const BLEND = 0.6;
/** How far round the skimmer the orbit goes, radians. */
export const SWEEP = Math.PI * 2;
/** The orbit's end: its radius and the eye's height, metres. */
export const ORBIT_END = { radius: 0.8, height: 0.4 };
/** The orbit's least starting radius, metres. */
export const ORBIT_MIN = 0.6;
/** Where the eye whips to for the reveal: out from the skimmer, and up. */
export const REVEAL_EYE = { radius: 0.9, height: 0.5 };
/** Seconds the whip from the orbit's end up to the reveal takes, overshoot and correction included. */
// Slowed three times at the owner's word (2026-10-29), from 0.35 s.
export const WHIP = 0.8;
/** How far the whip overshoots: a back-out ease's constant (1.70158 is about 10%). */
export const OVERSHOOT = 1.70158;
/**
 * The film's lens (the owner, 2026-10-29): a 50 mm lens's view on a
 * 35 mm frame (24 mm tall), as a vertical field of view, degrees (about
 * 27°); the eye eases to it over `ZOOM` seconds as the film starts, and
 * back to its own as the lid goes on.
 */
export const LENS_50_FOV = (2 * Math.atan(24 / 2 / 50) * 180) / Math.PI;
export const ZOOM = 1;
/** Where the lid lies when off: beside the skimmer, metres along +x. */
export const LID_ASIDE = 0.35;

export type CinematicPhase = 'suspense' | 'reveal' | 'replace' | 'done';

export interface Pose {
  x: number;
  y: number;
  z: number;
  /** Radians; 0 looks north (−z), positive turns east (`first-person.ts`). */
  yaw: number;
  /** Radians up. */
  pitch: number;
}

export interface CinematicFrame {
  phase: CinematicPhase;
  /** The eye, or null for the walker's own (back where it stood). */
  eye: Pose | null;
  /** The eye the reveal's whip comes to rest at, the find before it; null outside the reveal. */
  rest: Pose | null;
  /** How far to the film's lens (`LENS_50_FOV`): 0 the walker's own, 1 the lens. */
  zoom: number;
  /** The lid: 0 on its seat, 1 lying aside. */
  lid: number;
  /** The caustics: how far risen (0–1) and how bright (0–1). */
  rise: number;
  glow: number;
  /** The find above: its size (0 hidden, 1 full) and its turn. */
  size: number;
  spin: number;
  banner: boolean;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Out fast, past the end, and back to it: 0 at 0, 1 at 1, over 1 between. */
export const backOut = (x: number, c = OVERSHOOT) => {
  const u = clamp01(x) - 1;
  return 1 + (c + 1) * u * u * u + c * u * u;
};
/** From angle `a` to `b` the short way round. */
const lerpAngle = (a: number, b: number, t: number) => {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + d * t;
};

/** The yaw and pitch looking from `from` at `to`. */
export function lookAt(
  from: { x: number; y: number; z: number },
  to: { x: number; y: number; z: number },
) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  return {
    yaw: Math.atan2(dx, -dz),
    pitch: Math.atan2(dy, Math.hypot(dx, dz)),
  };
}

/** Where the orbit looks: the skimmer's mouth. */
const MOUTH = { x: 0, y: 0.02, z: 0 };

/**
 * The film `t` seconds after the lid is pulled, the walker having stood
 * at `start` (its eye, relative to the skimmer).
 */
export function cinematicFrame(
  t: number,
  start: Pose,
  timing: CinematicTiming = CINEMATIC,
): CinematicFrame {
  const { suspense, reveal, replace } = timing;
  // Round the skimmer from where the walker stands.
  const from = Math.atan2(start.x, start.z);
  const r0 = Math.max(ORBIT_MIN, Math.hypot(start.x, start.z));
  const end = from + SWEEP;
  /** The orbit's eye `t` seconds in. */
  const orbit = (t: number): Pose => {
    const k = ease(t / suspense);
    const a = from + SWEEP * k;
    const at = {
      x: Math.sin(a) * lerp(r0, ORBIT_END.radius, k),
      y: lerp(start.y, ORBIT_END.height, k),
      z: Math.cos(a) * lerp(r0, ORBIT_END.radius, k),
    };
    const look = lookAt(at, MOUTH);
    const b = ease(t / BLEND);
    return {
      ...at,
      yaw: lerpAngle(start.yaw, look.yaw, b),
      pitch: lerp(start.pitch, look.pitch, b),
    };
  };
  if (t < suspense) {
    return {
      phase: 'suspense',
      eye: orbit(t),
      rest: null,
      zoom: ease(t / ZOOM),
      lid: ease(t / LIFT),
      rise: ease(t / RISE),
      glow: 1,
      size: 0,
      spin: 0,
      banner: false,
    };
  }
  const shown = t - suspense;
  if (shown < reveal) {
    // A sudden whip from where the orbit ended, out from the skimmer and
    // up to look across it, overshooting a little and correcting. The
    // find pops and turns as the reveal's does.
    const f = revealFrame(REVEAL.suspense + shown, 0);
    const was = orbit(suspense);
    const to = {
      x: Math.sin(end) * REVEAL_EYE.radius,
      y: REVEAL_EYE.height,
      z: Math.cos(end) * REVEAL_EYE.radius,
    };
    const rest = { ...to, yaw: lookAt(to, MOUTH).yaw, pitch: LOOK_UP };
    const k = backOut(shown / WHIP);
    return {
      phase: 'reveal',
      eye: {
        x: lerp(was.x, to.x, k),
        y: lerp(was.y, to.y, k),
        z: lerp(was.z, to.z, k),
        yaw: lerpAngle(was.yaw, rest.yaw, k),
        pitch: lerp(was.pitch, LOOK_UP, k),
      },
      rest,
      zoom: 1,
      lid: 1,
      rise: 1,
      glow: 1,
      size: f.size,
      spin: f.spin,
      // Up once the whip has settled.
      banner: shown >= WHIP,
    };
  }
  const back = shown - reveal;
  if (back < replace) {
    const k = ease(back / replace);
    return {
      phase: 'replace',
      eye: null,
      rest: null,
      zoom: 1 - k,
      lid: 1 - k,
      rise: 1,
      glow: 1 - k,
      size: 0,
      spin: 0,
      banner: false,
    };
  }
  return {
    phase: 'done',
    eye: null,
    rest: null,
    zoom: 0,
    lid: 0,
    rise: 0,
    glow: 0,
    size: 0,
    spin: 0,
    banner: false,
  };
}

/** The lid on its way off, `k` from 0 (on) to 1 (aside): up, over and down, tipping. */
export function lidPose(k: number) {
  return {
    x: LID_ASIDE * k,
    y: 0.22 * Math.sin(Math.PI * k),
    tilt: -0.5 * Math.sin(Math.PI * k),
  };
}

/** A random pick of `count` things, never `last` again when there is a choice. */
export function pickAnother(count: number, last: number, random: () => number) {
  if (count < 2) return 0;
  const k = Math.floor(random() * (count - 1));
  return last >= 0 && k >= last ? k + 1 : k;
}

/**
 * The next find, by index into `ids`, at random but never `last` again:
 * one with a prerequisite (`after`: more hair after the hair) only once
 * that has been `found` (the owner, 2026-10-29).
 */
export function pickFind(
  ids: readonly string[],
  last: number,
  found: ReadonlySet<string>,
  random: () => number,
  after: Readonly<Record<string, string>> = { 'more-hair': 'hair-clump' },
) {
  const open = ids
    .map((id, i) => ({ id, i }))
    .filter(({ id }) => !after[id] || found.has(after[id]));
  const at = open.findIndex(({ i }) => i === last);
  return open[pickAnother(open.length, at, random)].i;
}
