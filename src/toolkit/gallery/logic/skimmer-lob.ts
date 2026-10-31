/**
 * Two more of the skimmer's films (the owner, 2026-10-31), beside the
 * orbit (`skimmer-cinematic.ts`), each filling the suspense jingle
 * exactly and ending where the whip up to the find begins:
 *
 * - The lob: the eye turns at once to the skimmer, tips up along the
 *   launch of a parabola whose end is the dead centre of the skimmer's
 *   mouth, and is lobbed along it, comically slowly and high, looking
 *   along its path (nosing over at the top, tipping down as it falls),
 *   arriving all but inside the skimmer as the jingle ends.
 * - The corkscrew: a whip to 3 m straight over the open skimmer, looking
 *   down into it, then a slow dive straight down, turning three whole
 *   times, to 0.2 m over its mouth as the jingle ends.
 *
 * Pure. Positions are metres from the skimmer's middle at deck level;
 * yaw and pitch as `Pose` (yaw 0 looks north, −z; pitch up).
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface LookPose extends Vec3 {
  yaw: number;
  pitch: number;
}

/** The dead centre of the skimmer's mouth, where the lob comes down. */
export const LOB_TARGET: Vec3 = { x: 0, y: 0.02, z: 0 };
/** How far over the higher of its ends the lob's top rises, metres: high, for comedy. */
export const LOB_RISE = 1.6;
/** Seconds the eye takes to turn onto the skimmer, then to tip up along the launch. */
export const LOB_ALIGN = 0.35;
export const LOB_TILT = 0.9;
/** How far short of the mouth's centre the lob stops, metres: "almost inside". */
export const LOB_SHORT = 0.12;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
/** Slower still at both ends than `smooth`: the slow-motion feel. */
const smoother = (x: number) => {
  const t = clamp01(x);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpAngle = (a: number, b: number, t: number) =>
  a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;

/** Yaw and pitch along a direction. */
export function directionAngles(d: Vec3) {
  return {
    yaw: Math.atan2(d.x, -d.z),
    pitch: Math.atan2(d.y, Math.hypot(d.x, d.z)),
  };
}

/**
 * The lob's parabola from `start` to `target`: straight across in plan,
 * and up and over, its top `rise` over the higher end. `u` runs 0 to 1.
 */
export function lobPath(
  start: Vec3,
  target: Vec3 = LOB_TARGET,
  rise = LOB_RISE,
) {
  const top = Math.max(start.y, target.y) + rise;
  // y(u) = a u² + b u + c through both ends with its greatest value `top`.
  const c = start.y;
  const e = target.y - start.y;
  // y(1) − c = a + b = e, and its top c − b²/(4a) = top (a < 0), so
  // b² − 4hb + 4he = 0 with h = top − c: the larger root puts the top
  // between the ends.
  const h = top - c;
  const b = 2 * h + 2 * Math.sqrt(h * h - h * e);
  const a = e - b;
  return {
    top,
    at(u: number): Vec3 {
      return {
        x: lerp(start.x, target.x, u),
        y: a * u * u + b * u + c,
        z: lerp(start.z, target.z, u),
      };
    },
    /** Which way it is going at `u` (not of unit length). */
    tangent(u: number): Vec3 {
      return {
        x: target.x - start.x,
        y: 2 * a * u + b,
        z: target.z - start.z,
      };
    },
    /** Where along it the top is. */
    apex: -b / (2 * a),
    /** Where along it it comes within `short` metres of the target, falling. */
    arrive(short: number = LOB_SHORT) {
      const gap = (u: number) => {
        const y = a * u * u + b * u + c;
        return Math.hypot(
          (target.x - start.x) * (1 - u),
          target.y - y,
          (target.z - start.z) * (1 - u),
        );
      };
      let lo = -b / (2 * a);
      let hi = 1;
      for (let n = 0; n < 50; n++) {
        const mid = (lo + hi) / 2;
        if (gap(mid) > short) lo = mid;
        else hi = mid;
      }
      return lo;
    },
  };
}

/**
 * The lob's eye `t` seconds into a suspense of `length` seconds, the
 * walker having stood at `start`. Arrives within
 * `LOB_SHORT` of the mouth at exactly `length`.
 */
export function lobEye(t: number, start: LookPose, length: number): LookPose {
  const path = lobPath(start);
  const facing = directionAngles({
    x: LOB_TARGET.x - start.x,
    y: LOB_TARGET.y - start.y,
    z: LOB_TARGET.z - start.z,
  });
  const launch = directionAngles(path.tangent(0));
  if (t < LOB_ALIGN) {
    // At once onto the skimmer's centre.
    const k = smooth(t / LOB_ALIGN);
    return {
      ...start,
      yaw: lerpAngle(start.yaw, facing.yaw, k),
      pitch: lerp(start.pitch, facing.pitch, k),
    };
  }
  if (t < LOB_ALIGN + LOB_TILT) {
    // Up along the launch, and a breath before the off.
    const k = smooth((t - LOB_ALIGN) / LOB_TILT);
    return {
      ...start,
      yaw: lerpAngle(facing.yaw, launch.yaw, k),
      pitch: lerp(facing.pitch, launch.pitch, k),
    };
  }
  const flight = length - LOB_ALIGN - LOB_TILT;
  const u = path.arrive() * smoother((t - LOB_ALIGN - LOB_TILT) / flight);
  return { ...path.at(u), ...directionAngles(path.tangent(u)) };
}

/** The corkscrew's top and bottom: metres over the skimmer's mouth. */
export const CORKSCREW = {
  top: 3,
  bottom: 0.2,
  /** Whole turns in the dive. */
  turns: 3,
  /** Seconds the whip up over the skimmer takes. */
  whip: 0.6,
  /** Looking down, not quite plumb, so the turning shows (radians, about 86°). */
  pitch: -1.5,
} as const;

/** Out fast, past the end, and back: a whip's ease. */
const backOut = (x: number, c = 1.70158) => {
  const u = clamp01(x) - 1;
  return 1 + (c + 1) * u * u * u + c * u * u;
};

/** How far down and round the dive is, `k` (0–1) of its time: an ease, slow to start and slow to land. */
export function corkscrewDive(k: number) {
  const e = smoother(k);
  return {
    height: lerp(CORKSCREW.top, CORKSCREW.bottom, e),
    turned: CORKSCREW.turns * 2 * Math.PI * e,
  };
}

/**
 * The corkscrew's eye `t` seconds into a suspense of `length` seconds:
 * whipped up over the skimmer, then down, turning, to land 0.2 m over its
 * mouth at exactly `length`.
 */
export function corkscrewEye(
  t: number,
  start: LookPose,
  length: number,
): LookPose {
  const over = { x: 0, y: LOB_TARGET.y + CORKSCREW.top, z: 0 };
  if (t < CORKSCREW.whip) {
    const k = backOut(t / CORKSCREW.whip);
    return {
      x: lerp(start.x, over.x, k),
      y: lerp(start.y, over.y, k),
      z: lerp(start.z, over.z, k),
      yaw: start.yaw,
      // The whip's overshoot never past plumb, where the view would flip.
      pitch: Math.max(-1.55, lerp(start.pitch, CORKSCREW.pitch, k)),
    };
  }
  const d = corkscrewDive((t - CORKSCREW.whip) / (length - CORKSCREW.whip));
  return {
    x: 0,
    y: LOB_TARGET.y + d.height,
    z: 0,
    yaw: start.yaw + d.turned,
    pitch: CORKSCREW.pitch,
  };
}
