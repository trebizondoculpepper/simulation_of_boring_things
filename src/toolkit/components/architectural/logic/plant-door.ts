/**
 * A plant room door: an FD60 steel fire doorset between a pool hall and
 * its plant room (Ironside Doorsets), the same at every plant room. It is
 * self-closing, by an overhead closer, and opens from either side: the
 * card reader beside it is there to be seen, not worked. Pure.
 *
 * The closer, as such closers are adjusted: the leaf is held open while
 * someone is passing, then swings shut at the sweep speed, slows over the
 * last few degrees, and is pulled through them into its latch by the
 * latch action, with the latch's click.
 */

/** The doorset: a standard UK fire-door leaf, and its steel frame. */
export const PLANT_DOOR = {
  leaf: { w: 0.926, h: 2.04, thick: 0.054 },
  frame: 0.05,
  /** How far it opens, radians (90 degrees), and how long it is held there. */
  open: Math.PI / 2,
  held: 2.5,
  /** The closer's sweep, radians a second; its latch action below `latchFrom`. */
  sweep: 0.35,
  latch: 1.4,
  latchFrom: 0.17,
  /** How fast it opens when pulled or pushed, radians a second. */
  opening: 2.2,
} as const;

export interface PlantDoorState {
  /** The leaf's angle from shut, radians; whether it is latched shut. */
  angle: number;
  latched: boolean;
  /** What is happening to it: opening, held open, or the closer at work. */
  phase: 'shut' | 'opening' | 'held' | 'closing';
  /** Seconds left of the current phase's hold. */
  timer: number;
}

export const initialPlantDoor = (): PlantDoorState => ({
  angle: 0,
  latched: true,
  phase: 'shut',
  timer: 0,
});

/** The handle worked, from either side: it opens, or, open, is caught and held again. */
export const workDoor = (s: PlantDoorState): PlantDoorState => ({
  ...s,
  latched: false,
  phase: 'opening',
  timer: 0,
});

/** The door `dt` seconds on, and whether it latched shut in that time. */
export function stepPlantDoor(
  s: PlantDoorState,
  dt: number,
): { state: PlantDoorState; latchedNow: boolean } {
  const D = PLANT_DOOR;
  if (s.phase === 'opening') {
    const angle = Math.min(D.open, s.angle + D.opening * dt);
    return {
      state: {
        ...s,
        angle,
        phase: angle >= D.open ? 'held' : 'opening',
        timer: angle >= D.open ? D.held : 0,
      },
      latchedNow: false,
    };
  }
  if (s.phase === 'held') {
    const timer = s.timer - dt;
    return {
      state: { ...s, timer, phase: timer <= 0 ? 'closing' : 'held' },
      latchedNow: false,
    };
  }
  if (s.phase === 'closing') {
    const speed = s.angle > D.latchFrom ? D.sweep : D.latch;
    const angle = Math.max(0, s.angle - speed * dt);
    const shut = angle <= 0;
    return {
      state: {
        ...s,
        angle,
        latched: shut,
        phase: shut ? 'shut' : 'closing',
      },
      latchedNow: shut,
    };
  }
  return { state: s, latchedNow: false };
}

/**
 * Someone standing in the doorway: an open door is held open, its closer
 * waiting, until they are clear; it never closes on them.
 */
export function holdDoorOpen(s: PlantDoorState): PlantDoorState {
  if (s.angle <= 0.05 || s.phase === 'opening') return s;
  return { ...s, latched: false, phase: 'held', timer: PLANT_DOOR.held };
}
