import { LOOK_UP, REVEAL, revealFrame } from './skimmer-reveal';

/**
 * Dev53's skimmer cinematic (the owner, 2026-10-29), a trial of the
 * skimmer reveal as a film: the lid comes off and gold caustics rise at
 * once from the skimmer's rim, tapering upward; while the suspense
 * builds, the camera orbits the skimmer's vertical axis, sinking as it
 * goes; then a jump cut to a look diagonally up, the fanfare, and a find
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
/** Where the eye is cut to for the reveal: out from the skimmer, and up. */
export const REVEAL_EYE = { radius: 0.9, height: 0.5 };
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
  if (t < suspense) {
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
      phase: 'suspense',
      eye: {
        ...at,
        yaw: lerpAngle(start.yaw, look.yaw, b),
        pitch: lerp(start.pitch, look.pitch, b),
      },
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
    // A jump cut: out from the skimmer where the orbit ended, looking up
    // across it. The find pops and turns as the reveal's does.
    const f = revealFrame(REVEAL.suspense + shown, 0);
    const at = {
      x: Math.sin(end) * REVEAL_EYE.radius,
      y: REVEAL_EYE.height,
      z: Math.cos(end) * REVEAL_EYE.radius,
    };
    return {
      phase: 'reveal',
      eye: { ...at, yaw: lookAt(at, MOUTH).yaw, pitch: LOOK_UP },
      lid: 1,
      rise: 1,
      glow: 1,
      size: f.size,
      spin: f.spin,
      banner: true,
    };
  }
  const back = shown - reveal;
  if (back < replace) {
    const k = ease(back / replace);
    return {
      phase: 'replace',
      eye: null,
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
