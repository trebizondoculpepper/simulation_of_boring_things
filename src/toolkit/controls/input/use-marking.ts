import { Vector3 } from 'three';
import type { Camera, Object3D } from 'three';
import { knobAnswer } from '../logic/use-cue';
import type { Turnable, UseAnswer } from '../logic/use-cue';

/**
 * Things that say what a use on them would do (prompt 115, part two,
 * `doc/plans/115/push-pull-cue.md`), for the crosshair's cue. A component
 * marks the object a use lands on with a function that answers, when the
 * aim finds it, which gesture a use makes (turn, push, pull, or some other
 * way) and whether it will have a consequence now. The mark lives on the
 * object (`userData.usable`) and goes with it; the controls find it by
 * walking up from the first mesh the aim meets.
 */

/** Where the aim found a marked thing, and how. */
export interface UseQuery {
  /** The marked object (a knob's shaft, a button's cap). */
  object: Object3D;
  /** The world point the aim met. */
  point: Vector3;
  camera: Camera;
  /** The aim's normalised screen x, -1 to 1. */
  x: number;
  /** A gamepad's use: no pointer side. */
  pad: boolean;
}

/**
 * What a use would do now, or null for nothing. Called by the probe at
 * most ten times a second: it must be cheap and change nothing.
 */
export type Usable = (at: UseQuery) => UseAnswer | null;

/** Mark `object` as usable; returns the unmarking, for its disposal. */
export function markUsable(object: Object3D, usable: Usable) {
  object.userData.usable = usable;
  return () => {
    if (object.userData.usable === usable) delete object.userData.usable;
  };
}

/** The marked thing `object` is part of (itself or an ancestor), or null. */
export function usableOf(
  object: Object3D,
): { object: Object3D; usable: Usable } | null {
  for (let o: Object3D | null = object; o; o = o.parent) {
    const usable = o.userData.usable as Usable | undefined;
    if (usable) return { object: o, usable };
  }
  return null;
}

/** Whether neither `object` nor anything above it is hidden. */
export function visibleAll(object: Object3D) {
  for (let o: Object3D | null = object; o; o = o.parent)
    if (!o.visible) return false;
  return true;
}

const centre = new Vector3();

/** A knob's answer where the aim falls on it: the side it turns, and both ways. */
export function turnAt(at: UseQuery, knob: Turnable): UseAnswer {
  const x = at.object.getWorldPosition(centre).project(at.camera).x;
  return knobAnswer(knob, at.x, x);
}
