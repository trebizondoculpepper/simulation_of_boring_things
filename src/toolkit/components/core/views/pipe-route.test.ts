import { describe, expect, it } from 'vite-plus/test';
import {
  BoxGeometry,
  Mesh,
  MeshBasicMaterial,
  Raycaster,
  Vector3,
} from 'three';
import { pipeGeometries } from './pipe-route';
import type { Vec3 } from '../logic/pipe-route';

describe('fire-collar fixing tabs', () => {
  const normals: Vec3[] = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ];
  it.each(normals.map((normal) => [normal]))(
    'shows the raised outer face rather than the back against the wall (%j)',
    (xyz) => {
      const normal = new Vector3(...xyz);
      const point = (distance: number): Vec3 =>
        normal.clone().multiplyScalar(distance).toArray() as Vec3;
      const parts = pipeGeometries([point(-1), point(1)], {
        od: 0.05,
        joint: 'none',
        through: [
          { at: [0, 0, 0], normal: xyz, thickness: 0.2, kind: 'fire-collar' },
        ],
      });
      const material = new MeshBasicMaterial();
      const tabs = parts.bolt.filter((g) => g instanceof BoxGeometry);
      expect(tabs).toHaveLength(4);
      for (const tab of tabs) {
        tab.computeBoundingBox();
        const centre = tab.boundingBox!.getCenter(new Vector3());
        const ray = new Raycaster(
          centre.clone().add(normal),
          normal.clone().negate(),
        );
        const hits = ray.intersectObject(new Mesh(tab, material), false);
        // The 3 mm tab's outer face is 1.5 mm nearer than its centre.
        // Mirroring its geometry instead exposed the wall-contacting face.
        expect(hits[0]?.distance).toBeCloseTo(1 - 0.0015, 6);
      }
      material.dispose();
      for (const geometries of Object.values(parts))
        for (const geometry of geometries) geometry.dispose();
    },
  );
});
