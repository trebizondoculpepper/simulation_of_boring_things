import { CatmullRomCurve3, Mesh, TubeGeometry, Vector3 } from 'three';
import type { Material, Object3D } from 'three';

type Point = readonly [number, number, number];

/**
 * A flexible hose (the owner, 2026-10-27: a dosing pump is fed by a soft
 * PVC hose, not a rigid pipe): a smooth tube of `radius` through `points`,
 * each span sagging `sag` metres at its middle, as a hose hangs between
 * its ends. Added to `parent`; metres.
 */
export function hose(
  parent: Object3D,
  material: Material,
  points: readonly Point[],
  radius: number,
  sag = 0.04,
): Mesh {
  const through: Vector3[] = [];
  points.forEach((p, i) => {
    through.push(new Vector3(...p));
    const next = points[i + 1];
    if (next)
      through.push(
        new Vector3(
          (p[0] + next[0]) / 2,
          (p[1] + next[1]) / 2 - sag,
          (p[2] + next[2]) / 2,
        ),
      );
  });
  const curve = new CatmullRomCurve3(through, false, 'centripetal');
  const mesh = new Mesh(
    new TubeGeometry(curve, Math.max(24, through.length * 12), radius, 10),
    material,
  );
  parent.add(mesh);
  return mesh;
}
