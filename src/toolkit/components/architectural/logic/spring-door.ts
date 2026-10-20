/**
 * A double-action spring door, as between a corridor and the rooms off it:
 * pushed, it swings open away from whoever pushes it, either way; let go,
 * its spring (a floor spring or spring hinges) eases it back to closed,
 * slowly, and it settles shut without banging. While someone stands in
 * its doorway it is held open. It can also be snapped shut at once,
 * silently: the trick that keeps only one door open at a time when doors
 * lead to rooms that are drawn only while their door is open. Pure logic.
 */

/** How far it opens, radians. */
export const DOOR_OPEN_ANGLE = (95 * Math.PI) / 180;
/** Seconds to swing open when pushed. */
export const DOOR_OPEN_SECONDS = 0.7;
/** Seconds it stays open after it is let go, before the spring takes it. */
export const DOOR_DWELL_SECONDS = 1.2;
/** Seconds the spring takes to close it from fully open. */
export const DOOR_CLOSE_SECONDS = 4;

export function createSpringDoor() {
  /** Its angle: positive one way, negative the other; 0 shut. */
  let angle = 0;
  /** Which way it is opening (+1 or −1), or 0 if it is not being pushed. */
  let pushing = 0;
  let dwell = 0;
  return {
    /** Push it open, away from whoever pushes: `direction` +1 or −1. */
    push(direction: 1 | -1) {
      if (Math.sign(angle) !== 0 && Math.sign(angle) !== direction) return;
      pushing = direction;
      dwell = DOOR_DWELL_SECONDS;
    },
    /**
     * Stand it at `value` (radians, either way) at once, as if just
     * pushed there: a door handed over from the other side of a doorway.
     */
    swingTo(value: number) {
      angle = Math.max(-DOOR_OPEN_ANGLE, Math.min(DOOR_OPEN_ANGLE, value));
      pushing = 0;
      dwell = DOOR_DWELL_SECONDS;
    },
    /** Shut it at once, silently. */
    snapShut() {
      angle = 0;
      pushing = 0;
      dwell = 0;
    },
    /** Advance `dt` seconds; `held` while someone stands in the doorway. */
    step(dt: number, held = false) {
      dt = Math.max(0, dt);
      if (pushing) {
        angle += (pushing * DOOR_OPEN_ANGLE * dt) / DOOR_OPEN_SECONDS;
        if (Math.abs(angle) >= DOOR_OPEN_ANGLE) {
          angle = Math.sign(angle) * DOOR_OPEN_ANGLE;
          pushing = 0;
        }
        return angle;
      }
      if (held) {
        dwell = DOOR_DWELL_SECONDS;
        return angle;
      }
      if (dwell > 0) {
        dwell -= dt;
        return angle;
      }
      // The spring: quick at first, easing as it closes (its damper).
      const rate = DOOR_OPEN_ANGLE / DOOR_CLOSE_SECONDS;
      const ease = 0.3 + 0.7 * Math.min(1, Math.abs(angle) / DOOR_OPEN_ANGLE);
      const next = Math.abs(angle) - rate * ease * dt * 1.6;
      angle = next <= 0.002 ? 0 : Math.sign(angle) * next;
      return angle;
    },
    get angle() {
      return angle;
    },
    /** Whether it is open at all (anything behind it may be seen). */
    get open() {
      return angle !== 0 || pushing !== 0;
    },
  };
}
