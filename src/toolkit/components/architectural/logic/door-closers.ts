/**
 * How a single-action door closes itself, two ways. Pure logic: angles in
 * radians from shut (positive, open), lengths in metres, times in seconds.
 *
 * An overhead door closer (after the Dorma TS 83): a spring in an oil-filled
 * body on the door's top rail, its arm to the frame, closes the door at two
 * speeds the installer sets with two valves: a steady sweep from wherever
 * it is let go, then, over the last few degrees, a slower latch that brings
 * it home onto its catch without a bang. Its back check stiffens the last
 * of the opening.
 *
 * Rising butt hinges (helical knuckle hinges, after the common steel rising
 * butt): no spring at all. The knuckles meet on a helix, so opening the door
 * lifts it, a centimetre or so by a right angle; let go, its own weight
 * screws it back down and shut, quickly at first, then slowing as the helix
 * flattens near closed, landing with a soft knock. It cannot hold the door
 * shut against a draught, and the leaf's top is cut back to clear the head.
 */

/** How far either opens, radians. */
export const SINGLE_ACTION_OPEN = (90 * Math.PI) / 180;
/** Seconds to open it when pushed. */
export const DOOR_OPENING_SECONDS = 0.8;

/** The closer's two speeds: the sweep, and the latch over its last angle. */
export const CLOSER = {
  latchAngle: (12 * Math.PI) / 180,
  /** Seconds the sweep takes from fully open to the latch angle. */
  sweepSeconds: 4,
  /** Seconds the latch takes from the latch angle to shut. */
  latchSeconds: 2,
};

/** The rising butt's helix: how far it lifts the door by a right angle. */
export const RISING_BUTT = {
  lift: 0.012,
  /** How hard its weight turns it shut, radians a second squared at most. */
  pull: 2.6,
  /** The knuckles' friction, which slows it. */
  drag: 1.4,
};

/** Events a self-closing door makes, for its sounds. */
export type CloserEvent = 'latch' | 'knock' | null;

function opener() {
  let angle = 0;
  let opening = false;
  let held = false;
  return {
    get angle() {
      return angle;
    },
    set angle(value: number) {
      angle = Math.max(0, Math.min(SINGLE_ACTION_OPEN, value));
    },
    push() {
      opening = true;
    },
    hold(on: boolean) {
      held = on;
    },
    /** Open it on by `dt` while pushed; true while it is opening or held. */
    advance(dt: number) {
      if (opening) {
        angle += (SINGLE_ACTION_OPEN * dt) / DOOR_OPENING_SECONDS;
        if (angle >= SINGLE_ACTION_OPEN) {
          angle = SINGLE_ACTION_OPEN;
          opening = false;
        }
        return true;
      }
      return held;
    },
    get open() {
      return angle > 0 || opening;
    },
  };
}

/** A door on an overhead closer: `push` opens it; it closes on its own. */
export function createOverheadCloser() {
  const door = opener();
  return {
    push: () => door.push(),
    /** Someone stands in the doorway: it waits for them. */
    hold: (on: boolean) => door.hold(on),
    get angle() {
      return door.angle;
    },
    get open() {
      return door.open;
    },
    /** Which speed it is closing at now, if any. */
    get phase(): 'open' | 'sweep' | 'latch' | 'shut' {
      if (door.angle === 0) return 'shut';
      return door.angle > CLOSER.latchAngle ? 'sweep' : 'latch';
    },
    /** Run on `dt` seconds; says when it latches shut. */
    step(dt: number): CloserEvent {
      dt = Math.max(0, dt);
      if (door.advance(dt) || door.angle === 0) return null;
      const sweep =
        (SINGLE_ACTION_OPEN - CLOSER.latchAngle) / CLOSER.sweepSeconds;
      const latch = CLOSER.latchAngle / CLOSER.latchSeconds;
      let left = dt;
      if (door.angle > CLOSER.latchAngle) {
        // The sweep, as far as the latch angle and no further this step.
        const take = Math.min(left, (door.angle - CLOSER.latchAngle) / sweep);
        door.angle = door.angle - sweep * take;
        left -= take;
      }
      if (left > 0) door.angle = door.angle - latch * left;
      return door.angle === 0 ? 'latch' : null;
    },
  };
}

/** A door hung on rising butts: `push` opens it; its weight closes it. */
export function createRisingButtDoor() {
  const door = opener();
  /** How fast it is swinging shut, radians a second. */
  let speed = 0;
  return {
    push: () => {
      speed = 0;
      door.push();
    },
    hold: (on: boolean) => door.hold(on),
    get angle() {
      return door.angle;
    },
    get open() {
      return door.open;
    },
    /** How far the helix has lifted the leaf now, metres. */
    get lift() {
      return (RISING_BUTT.lift * door.angle) / SINGLE_ACTION_OPEN;
    },
    /** Run on `dt` seconds; says when it knocks shut. */
    step(dt: number): CloserEvent {
      dt = Math.max(0, dt);
      if (door.advance(dt)) {
        speed = 0;
        return null;
      }
      if (door.angle === 0) return null;
      // Its weight down the helix, less as it nears shut (the helix
      // flattens), and the knuckles' friction against it.
      const pull =
        RISING_BUTT.pull * (0.35 + 0.65 * (door.angle / SINGLE_ACTION_OPEN));
      speed += (pull - RISING_BUTT.drag * speed) * dt;
      door.angle = door.angle - speed * dt;
      if (door.angle > 0) return null;
      speed = 0;
      return 'knock';
    },
  };
}
