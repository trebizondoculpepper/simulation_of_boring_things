import { describe, expect, it } from 'vite-plus/test';
import {
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
} from 'three';
import type { WebGLRenderer } from 'three';
import {
  LABEL_REACH,
  labelOpacity,
  projectedLabelHeight,
  reachedLabelHeight,
} from './label-visibility';

describe('printed label visibility', () => {
  it('fades continuously across its readable screen-size range', () => {
    expect(labelOpacity(4)).toBe(0);
    expect(labelOpacity(5)).toBe(0);
    expect(labelOpacity(8.5)).toBeCloseTo(0.5);
    expect(labelOpacity(12)).toBe(1);
    expect(labelOpacity(20)).toBe(1);
  });

  it('stays readable 1.5 m further off: judged as if that much nearer', () => {
    expect(LABEL_REACH).toBe(1.5);
    // A label that would just fade out at 3 m now fades out at 4.5 m.
    const atThree = 5;
    const sizeAt = (d: number) => (atThree * 3) / d;
    expect(labelOpacity(reachedLabelHeight(sizeAt(4.5), 4.5))).toBe(0);
    expect(labelOpacity(reachedLabelHeight(sizeAt(4.4), 4.4))).toBeGreaterThan(
      0,
    );
    // Within the reach, always clear.
    expect(labelOpacity(reachedLabelHeight(1, 1.2))).toBe(1);
  });

  it('responds to camera zoom as well as distance', () => {
    const mesh = new Mesh(
      new PlaneGeometry(0.2, 0.02),
      new MeshBasicMaterial(),
    );
    mesh.updateMatrixWorld();
    const camera = new PerspectiveCamera(60, 16 / 9, 0.1, 100);
    camera.position.z = 4;
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();
    const renderer = { domElement: { height: 1080 } } as WebGLRenderer;
    const normal = projectedLabelHeight(mesh, camera, renderer, 0.02);
    camera.zoom = 0.5;
    camera.updateProjectionMatrix();
    expect(projectedLabelHeight(mesh, camera, renderer, 0.02)).toBeCloseTo(
      normal / 2,
    );
    camera.zoom = 1;
    camera.position.z = 8;
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();
    expect(projectedLabelHeight(mesh, camera, renderer, 0.02)).toBeCloseTo(
      normal / 2,
    );
  });
});
