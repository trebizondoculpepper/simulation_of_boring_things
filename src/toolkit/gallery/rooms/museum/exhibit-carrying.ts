import type { Object3D, Vector3 } from 'three';
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
 * The visitor's eye, for an exhibit that takes it over a moment (the
 * skimmer's reveal, the owner, 2026-10-29): the walker held still
 * (`first-person.ts`'s `hold`), its look set, then let go.
 */
export interface ExhibitView {
  /** How far up it looks, radians. */
  pitch(): number;
  /** Hold the walker still, or let go. */
  hold(on: boolean): void;
  /** Look `pitch` radians up, facing as it does, where it stands. */
  look(pitch: number): void;
  /**
   * Take the camera for a film (the skimmer's, dev53's, the owner,
   * 2026-10-29), each frame it is wanted: the eye at `from`, looking at
   * `to`, both in the world's frame, with a vertical field of view of
   * `fov` degrees. Given each frame after the walker has placed the
   * camera, it wins; not given, the walker's own eye comes back.
   */
  film?(shot: { from: Vector3; to: Vector3; fov: number }): void;
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
  bind(hands: ExhibitHands, view?: ExhibitView): void;
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
