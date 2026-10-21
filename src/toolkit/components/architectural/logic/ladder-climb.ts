/**
 * Climbing a fixed ladder as an action (a game's ladders done the simple
 * way): the walker uses the ladder, is held, and is carried up or down it
 * rung by rung, facing the rungs, then let go on the landing or the floor
 * it was going to. It cannot stop halfway, which suits a short ladder.
 * The room drives it: each frame it asks `climbPose` where the walker is,
 * and stands it there (`place`), its floor at the pose's height. Pure:
 * metres, x east, z south; a yaw as the controls have it (forward is
 * (sin yaw, −cos yaw)).
 *
 * After the caged steel ladders of BS 4211 and BS EN ISO 14122-4: rungs
 * every 250 mm, a cage of hoops above 2.2 m, a self-closing gate where it
 * leaves its gantry.
 */

export const LADDER = {
  /** Rung pitch, and seconds a rung. */
  rung: 0.25,
  perRung: 0.32,
  /** Seconds to step on and off, and how far from the rungs one stands. */
  step: 0.7,
  stand: 0.38,
  /** The ladder's width between stiles, and its cage's reach from the rungs. */
  width: 0.45,
  cage: 0.72,
  cageFrom: 2.2,
} as const;

export interface FixedLadder {
  /** Its rungs' middle line in plan, and the wall behind them. */
  x: number;
  z: number;
  /** The way the walker faces climbing it (toward the rungs). */
  yaw: number;
  /** The floor at its foot, and the landing at its head. */
  bottom: number;
  top: number;
  /** Where the walker stands off it: on the floor, and on the landing. */
  foot: { x: number; z: number; yaw: number };
  head: { x: number; z: number; yaw: number };
}

export interface ClimbPose {
  x: number;
  z: number;
  /** The walker's floor's height: its eye is a standing height above it. */
  y: number;
  yaw: number;
  pitch: number;
  done: boolean;
}

/** How long a climb of `ladder` takes, seconds. */
export const climbTime = (ladder: FixedLadder) =>
  2 * LADDER.step +
  ((ladder.top - ladder.bottom) / LADDER.rung) * LADDER.perRung;

const ease = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** The shorter way from one yaw to another. */
const turnTo = (a: number, b: number, t: number) => {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + d * t;
};

/**
 * Where a walker climbing `ladder` `up` (or down) is, `t` seconds in:
 * stepping from where it got on to in front of the rungs, facing them;
 * climbing, a little bob with each rung, looking up or down the way it
 * goes; then stepping off onto the landing or the floor.
 */
export function climbPose(
  ladder: FixedLadder,
  up: boolean,
  t: number,
): ClimbPose {
  const from = up ? ladder.foot : ladder.head;
  const to = up ? ladder.head : ladder.foot;
  const y0 = up ? ladder.bottom : ladder.top;
  const y1 = up ? ladder.top : ladder.bottom;
  // Standing in front of the rungs, away from them along the facing.
  const onX = ladder.x - Math.sin(ladder.yaw) * LADDER.stand;
  const onZ = ladder.z + Math.cos(ladder.yaw) * LADDER.stand;
  const total = climbTime(ladder);
  const climb = total - 2 * LADDER.step;
  const look = up ? 0.35 : -0.45;
  if (t < LADDER.step) {
    const k = ease(t / LADDER.step);
    return {
      x: lerp(from.x, onX, k),
      z: lerp(from.z, onZ, k),
      y: y0,
      yaw: turnTo(from.yaw, ladder.yaw, k),
      pitch: look * k,
      done: false,
    };
  }
  if (t < LADDER.step + climb) {
    const k = (t - LADDER.step) / climb;
    const rungs = (Math.abs(y1 - y0) / LADDER.rung) * k;
    // Each rung a pull and a pause: a slight bob in the rise.
    const bob = (Math.sin(rungs * Math.PI * 2) * 0.25 * LADDER.rung) / Math.PI;
    return {
      x: onX,
      z: onZ,
      y: lerp(y0, y1, k) + (up ? bob : -bob) * 0.3,
      yaw: ladder.yaw,
      pitch: look,
      done: false,
    };
  }
  const k = ease(Math.min(1, (t - LADDER.step - climb) / LADDER.step));
  return {
    x: lerp(onX, to.x, k),
    z: lerp(onZ, to.z, k),
    y: y1,
    yaw: turnTo(ladder.yaw, to.yaw, k),
    pitch: look * (1 - k),
    done: t >= total,
  };
}

/** Whether a walker at floor height `y` is at the ladder's head (so climbs down). */
export const atHead = (ladder: FixedLadder, y: number) =>
  Math.abs(y - ladder.top) < Math.abs(y - ladder.bottom);
