import { Vector3 } from 'three';
import type { Camera, Object3D } from 'three';

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
  return point.clone().project(camera).x < centre.x ? -1 : 1;
}
