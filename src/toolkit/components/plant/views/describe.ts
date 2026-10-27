import type { Object3D } from 'three';
import { markComponent } from '../../core/views/component-identity';

/**
 * Give a component inside a bigger model its own mouse-over description
 * (the owner, 2026-10-27: every bit says what it is): its name and, where
 * it has one, its live state. The innermost marked owner wins, so pointing
 * at a valve on a tank describes the valve, not the tank. Kept out of the
 * still-geometry merge, which would lose the mark.
 */
export function describe<T extends Object3D>(
  object: T,
  name: string,
  status?: () => string | undefined,
): T {
  object.userData.live = true;
  return markComponent(object, { name, status });
}
