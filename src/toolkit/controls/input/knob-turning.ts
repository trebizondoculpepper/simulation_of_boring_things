import { Vector3 } from 'three';
import type { Camera, Object3D } from 'three';
import { turnSide } from '../logic/turn-cue';
import type { Turnable } from '../logic/turn-cue';

/**
 * The control scheme's part of turning a knob: which way a use turns the
 * knob it lands on. A click or tap on a knob's left half turns it down, on
 * its right half up; a gamepad's LB and RB turn whatever knob is aimed at
 * down or up. Knobs themselves (`rotary-knob.ts` in the components) only
 * ask `knobDirection` which way to go.
 */

/** A direction a gamepad's shoulder button gives a knob, while it uses one. */
let given: -1 | 1 | null = null;

/**
 * Use something with a knob's direction given, as a gamepad's LB and RB
 * do: inside `act`, every knob turns `direction`, wherever it was aimed.
 */
export function turningKnobs(direction: -1 | 1, act: () => void) {
  given = direction;
  try {
    act();
  } finally {
    given = null;
  }
}

/**
 * Whether this use is a knob turn (a gamepad's LB or RB) rather than the
 * use itself (a click, E, a tap or A), for a room whose use is not a
 * knob's and should answer only the use itself.
 */
export const turningKnob = () => given !== null;

/** Screen left/right stays correct even when the panel or knob is rotated. */
export function knobDirection(shaft: Object3D, point: Vector3, camera: Camera) {
  if (given) return given;
  const centre = shaft.getWorldPosition(new Vector3()).project(camera);
  return turnSide(point.clone().project(camera).x, centre.x);
}

/**
 * Knobs that say whether they would turn (prompt 115), for the crosshair's
 * cue: each is the object a use lands on, which is also its shaft for
 * `knobDirection`. Components mark their knobs; the controls look them up.
 */
const turnables = new Set<Object3D>();

/** Mark `object` as a knob; returns the unmarking, for its disposal. */
export function markTurnable(object: Object3D, turnable: Turnable) {
  object.userData.turnable = turnable;
  turnables.add(object);
  return () => {
    turnables.delete(object);
    delete object.userData.turnable;
  };
}

const rootOf = (object: Object3D) => {
  let o = object;
  while (o.parent) o = o.parent;
  return o;
};

/** The marked knobs now in `scene`, seen (no hidden ancestor). */
export function turnablesIn(scene: Object3D): Object3D[] {
  const found: Object3D[] = [];
  for (const object of turnables)
    if (rootOf(object) === scene && visibleAll(object)) found.push(object);
  return found;
}

/** Whether neither `object` nor anything above it is hidden. */
export function visibleAll(object: Object3D) {
  for (let o: Object3D | null = object; o; o = o.parent)
    if (!o.visible) return false;
  return true;
}

/** The marked knob `object` is part of, or null. */
export function turnableOf(
  object: Object3D,
): { shaft: Object3D; turnable: Turnable } | null {
  for (let o: Object3D | null = object; o; o = o.parent) {
    const turnable = o.userData.turnable as Turnable | undefined;
    if (turnable) return { shaft: o, turnable };
  }
  return null;
}
