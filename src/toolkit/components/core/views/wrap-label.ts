import { CylinderGeometry, Mesh, PlaneGeometry } from 'three';
import type { Object3D } from 'three';

/**
 * A flat label (a badge, nameplate or printed sign, and whatever plate it
 * is printed on) rebuilt as part of a cylinder's surface: wrapped round
 * the upright axis at (`ax`, `az`) at `radius`, centred on the bearing of
 * where it was placed, its print following the curve, so it lies on the
 * shell rather than standing off it as a flat card.
 */
export function wrapOnto(
  label: Object3D,
  [ax, az]: readonly [number, number],
  radius: number,
) {
  const bearing = Math.atan2(label.position.x - ax, label.position.z - az);
  label.position.set(ax, label.position.y, az);
  label.rotation.set(0, 0, 0);
  // The label, and anything laid on it (a badge on its plate), each a
  // little proud of the one under it.
  const wrap = (part: Object3D, r: number) => {
    if (part instanceof Mesh && part.geometry instanceof PlaneGeometry) {
      const { width, height } = part.geometry.parameters;
      const old = part.geometry;
      part.geometry = new CylinderGeometry(
        r,
        r,
        height,
        Math.max(4, Math.ceil((width / r) * 12)),
        1,
        true,
        bearing - width / (2 * r),
        width / r,
      );
      old.dispose();
    }
    for (const child of part.children) {
      const lift = child.position.z;
      child.position.set(0, child.position.y, 0);
      child.rotation.set(0, 0, 0);
      wrap(child, r + lift);
    }
  };
  wrap(label, radius);
  return label;
}
