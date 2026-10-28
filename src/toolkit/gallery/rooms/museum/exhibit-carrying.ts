import type { Object3D } from 'three';
import type { PortableObject } from '../../../controls/input/object-handling';
import type { HallExhibit } from './exhibits';

/**
 * The visitor's hands in a museum hall: the control scheme's own pick-up,
 * carry and drop (`createObjectHandling`), shared with every other room.
 */
export interface ExhibitHands {
  /** Put a portable object (in the scene, `userData.portable`) straight into the hands. */
  give(object: Object3D): boolean;
  /** Let go of an object without dropping it, as RESET puts things back. */
  forget(object: Object3D): void;
  /** What is held, if anything. */
  holding(): Object3D | null;
}

/**
 * An exhibit's carrying (107f): its portable objects are any part of its
 * model with `userData.portable` (a `PortableObject`), its drop targets any
 * with `userData.placementTarget` (`placement-target.ts`), as in any room;
 * the hall picks them up, carries and drops them through the control
 * scheme, only while the hall is the one walked in. Here, what more the
 * exhibit needs: the hands, to hand things over, and a room's `divert`
 * and target feedback (a skip's toss, `bin-tossing.ts`).
 */
export interface ExhibitCarrying {
  /** Called once, when the exhibit is loaded into the hall walked in. */
  bind(hands: ExhibitHands): void;
  divert?(object: Object3D, portable: PortableObject): boolean;
  nearbyTargetFeedback?(
    object: Object3D,
    portable: PortableObject,
  ): 'accept' | 'reject' | null;
}

/** A hall exhibit that may carry things. */
export type CarryingExhibit = HallExhibit & { carrying?: ExhibitCarrying };

/** Whether `object` is part of `root`. */
export function partOf(object: Object3D, root: Object3D) {
  for (let o: Object3D | null = object; o; o = o.parent)
    if (o === root) return true;
  return false;
}
