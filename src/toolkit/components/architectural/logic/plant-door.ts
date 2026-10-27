/**
 * A plant room door: an FD60 steel fire doorset between a pool hall and
 * its plant room (Ironside Doorsets), the same at every plant room. It is
 * self-closing, by an overhead closer, and opens from either side: the
 * card reader beside it is there to be seen, not worked. Pure.
 *
 * The leaf is held open while someone is passing, then eases into its
 * closing sweep and slows again before the latch clicks shut.
 */

/** The doorset: a standard UK fire-door leaf, and its steel frame. */
export const PLANT_DOOR = {
  leaf: { w: 0.926, h: 2.04, thick: 0.054 },
  frame: 0.05,
  /** How far it opens, radians (90 degrees), and how long it is held there. */
  open: Math.PI / 2,
  held: 2.5,
  /** Average closing speed, radians a second. */
  sweep: 0.35,
  /**
   * Once whoever opened it has walked away from its doorway (beyond the
   * proximity's release, `door-proximity.ts`; the owner, 2026-10-27: "If
   * you open a door and then walk away from it, it should close more or
   * less immediately"): its hold cut to this, seconds, and its closer
   * sweeping at this average speed, radians a second.
   */
  awayHold: 0.3,
  awaySweep: 1.6,
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
  /** Angle and elapsed time when this closing sweep began. */
  closeFrom: number;
  closeElapsed: number;
}

export const initialPlantDoor = (): PlantDoorState => ({
  angle: 0,
  latched: true,
  phase: 'shut',
  timer: 0,
  closeFrom: 0,
  closeElapsed: 0,
});

/** The handle worked, from either side: it opens, or, open, is caught and held again. */
export const workDoor = (s: PlantDoorState): PlantDoorState => ({
  ...s,
  latched: false,
  phase: 'opening',
  timer: 0,
  closeFrom: 0,
  closeElapsed: 0,
});

/**
 * Someone near the doorway (`door-proximity.ts`), taken before the door
 * moves: a shut door stays shut (it is opened by its handle, as ever); an
 * opening door goes on opening; one held fully open waits a full hold
 * again; and one its closer has begun to sweep, or one stood part open,
 * opens again from where it is, at its opening speed, without a snap,
 * however near shut it has come, so long as it has not latched.
 */
export function keepDoorOpen(s: PlantDoorState): PlantDoorState {
  if (s.latched || s.phase === 'shut' || s.phase === 'opening') return s;
  if (s.phase === 'held' && s.angle >= PLANT_DOOR.open)
    return { ...s, timer: PLANT_DOOR.held };
  return { ...s, phase: 'opening', timer: 0, closeFrom: 0, closeElapsed: 0 };
}

/**
 * Stood open at `angle` (handed over from the other side of its doorway,
 * the walker just through it): held there for a full hold before its
 * closer takes it, not set closing at once; shut if `angle` is 0.
 */
export function standDoorOpen(angle: number): PlantDoorState {
  const open = Math.min(PLANT_DOOR.open, Math.abs(angle));
  return open > 0
    ? {
        ...initialPlantDoor(),
        angle: open,
        latched: false,
        phase: 'held',
        timer: PLANT_DOOR.held,
      }
    : initialPlantDoor();
}

/**
 * The door `dt` seconds on, and whether it latched shut in that time.
 * `nearby` is whether someone is near its doorway, where its room tells
 * it: true, it is kept open (`keepDoorOpen`), applied before it moves, so
 * it can never take a last closing step and latch beside them; false,
 * everyone has walked away, and it closes at once and briskly (its
 * `awayHold` and `awaySweep`); left out, no one is watching for walkers,
 * and it keeps its ordinary hold and sweep.
 */
export function stepPlantDoor(
  s: PlantDoorState,
  dt: number,
  nearby?: boolean,
): { state: PlantDoorState; latchedNow: boolean } {
  const D = PLANT_DOOR;
  const away = nearby === false;
  if (nearby) s = keepDoorOpen(s);
  if (away && s.phase === 'held' && s.timer > D.awayHold)
    s = { ...s, timer: D.awayHold };
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
      state: {
        ...s,
        timer,
        phase: timer <= 0 ? 'closing' : 'held',
        closeFrom: timer <= 0 ? s.angle : s.closeFrom,
        closeElapsed: timer <= 0 ? 0 : s.closeElapsed,
      },
      latchedNow: false,
    };
  }
  if (s.phase === 'closing') {
    const from = s.closeFrom || s.angle;
    // Walked away from, its closer sweeps faster from where it is: the
    // same eased sweep, run on quicker, so it never jumps.
    const elapsed =
      s.closeElapsed + Math.max(0, dt) * (away ? D.awaySweep / D.sweep : 1);
    const duration = Math.max(0.4, from / D.sweep);
    const t = Math.min(1, elapsed / duration);
    const eased = t * t * (3 - 2 * t);
    const angle = from * (1 - eased);
    const shut = angle <= 0;
    return {
      state: {
        ...s,
        angle,
        closeFrom: from,
        closeElapsed: elapsed,
        latched: shut,
        phase: shut ? 'shut' : 'closing',
      },
      latchedNow: shut,
    };
  }
  return { state: s, latchedNow: false };
}

/**
 * Held where it stands, its closer waiting a full hold: the pair's other
 * leaf caught as this one is opened (`equipment-doors.ts`), and a gate
 * held while someone climbs below it. Someone near the doorway is
 * `stepPlantDoor`'s `nearby`, which opens it again.
 */
export function holdDoorOpen(s: PlantDoorState): PlantDoorState {
  if (s.angle <= 0.05 || s.phase === 'opening') return s;
  return {
    ...s,
    latched: false,
    phase: 'held',
    timer: PLANT_DOOR.held,
    closeFrom: 0,
    closeElapsed: 0,
  };
}
