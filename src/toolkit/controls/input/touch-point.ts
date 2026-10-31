import type { Camera, Object3D, Vector3 } from 'three';
import { knobDirection } from './knob-turning';

/**
 * The control scheme's part of touching a screen: where on a touch
 * surface a use landed. A room that delivers a use from a ray's hit calls
 * the use inside `touchingAt`, and a touch-screen component asks
 * `touchPoint` where on its own surface it was touched (its texture's
 * coordinates, u right, v up, each 0 to 1). Components never read an
 * input themselves; outside a touch they are told nothing.
 */

/** Where a use landed: the object struck, its texture's coordinates, and the point in the world. */
export interface Touch {
  /** NaN where the surface struck has no texture coordinates. */
  u: number;
  v: number;
  point: { x: number; y: number; z: number } | null;
}

let touched: (Touch & { object: Object3D }) | null = null;

/** What a ray's hit gives: the object struck and, on a textured surface, its uv. */
export interface SurfaceHit {
  object: Object3D;
  uv?: { x: number; y: number } | null;
  point?: { x: number; y: number; z: number };
}

/** Use something with the hit that aimed it known, so a touch surface can ask where. */
export function touchingAt(hit: SurfaceHit, act: () => void) {
  touched =
    hit.uv || hit.point
      ? {
          object: hit.object,
          u: hit.uv?.x ?? Number.NaN,
          v: hit.uv?.y ?? Number.NaN,
          point: hit.point
            ? { x: hit.point.x, y: hit.point.y, z: hit.point.z }
            : null,
        }
      : null;
  try {
    act();
  } finally {
    touched = null;
  }
}

/**
 * Where on `surface` (or a mesh within it) this use touched it, in its
 * texture's coordinates; null outside a touch, or for a touch elsewhere.
 */
export function touchPoint(surface: Object3D): Touch | null {
  if (!touched) return null;
  for (let o: Object3D | null = touched.object; o; o = o.parent)
    if (o === surface)
      return { u: touched.u, v: touched.v, point: touched.point };
  return null;
}

/**
 * A room's use of what its ray struck: `work`, the use found on `at` (the
 * object struck or one of its parents), done with the hit known, so a
 * touch surface can ask where it was touched (`touchPoint`) and a knob
 * which way it turns (`knobDirection`). A room that hands a use to its
 * equipment from a ray's hit does it through this, or a touch screen in it
 * is told nothing of where it was touched and does nothing.
 */
export function useOnHit(
  hit: SurfaceHit & { point: Vector3 },
  at: Object3D,
  work: (direction?: number) => void,
  camera: Camera,
) {
  return () =>
    touchingAt(hit, () => work(knobDirection(at, hit.point, camera)));
}
