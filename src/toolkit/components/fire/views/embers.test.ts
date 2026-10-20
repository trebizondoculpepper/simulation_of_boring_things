import { afterEach, expect, it, vi } from 'vite-plus/test';
import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Raycaster,
  Vector3,
} from 'three';
import { createEmbers } from './embers';

afterEach(() => vi.unstubAllGlobals());

it('never blocks a control ray, whether the embers are hidden or lit', () => {
  const context = {
    createRadialGradient: () => ({ addColorStop() {} }),
    fillRect() {},
    fillStyle: '',
  };
  vi.stubGlobal('document', {
    createElement: () => ({ getContext: () => context }),
  });
  const effect = createEmbers(5);
  const control = new Mesh(
    new BoxGeometry(0.2, 0.2, 0.1),
    new MeshBasicMaterial(),
  );
  control.position.z = -1;
  const root = new Group();
  root.add(effect.group, control);
  const ray = new Raycaster(new Vector3(0, 0, 1), new Vector3(0, 0, -1));
  ray.camera = new PerspectiveCamera();
  for (const strength of [0, 1]) {
    effect.update(0, strength, true);
    // A worst-case opaque-sized picking footprint, directly over the control.
    effect.group.children.forEach((sprite) => {
      sprite.position.set(0, 0, 0);
      sprite.scale.setScalar(1);
    });
    root.updateMatrixWorld(true);
    expect(ray.intersectObject(root, true).map((hit) => hit.object)).toEqual([
      control,
      control,
    ]);
  }
  effect.dispose();
  control.geometry.dispose();
  (control.material as MeshBasicMaterial).dispose();
});
