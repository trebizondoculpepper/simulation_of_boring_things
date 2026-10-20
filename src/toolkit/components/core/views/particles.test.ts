import {
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  Mesh,
  BoxGeometry,
  MeshBasicMaterial,
  PerspectiveCamera,
  PointsMaterial,
  Raycaster,
  SpriteMaterial,
  Vector3,
} from 'three';
import { expect, it } from 'vite-plus/test';
import { ParticlePoints, ParticleSprite } from './particles';

it.each([false, true])(
  'lets use rays pass through sprites and point clouds when visible=%s',
  (visible) => {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute([0, 0, 0], 3));
    const sprite = new ParticleSprite(new SpriteMaterial({ opacity: 0 }));
    const points = new ParticlePoints(
      geometry,
      new PointsMaterial({ size: 1 }),
    );
    const control = new Mesh(
      new BoxGeometry(0.1, 0.1, 0.1),
      new MeshBasicMaterial(),
    );
    control.position.z = -1;
    const root = new Group();
    root.add(sprite, points, control);
    sprite.visible = points.visible = visible;
    root.updateMatrixWorld(true);
    const ray = new Raycaster(new Vector3(0, 0, 1), new Vector3(0, 0, -1));
    ray.camera = new PerspectiveCamera();
    expect(
      ray.intersectObject(root, true).every((hit) => hit.object === control),
    ).toBe(true);
    expect(ray.intersectObject(root, true).length).toBeGreaterThan(0);
    expect(sprite.userData.noCollision).toBe(true);
    expect(points.userData.noCollision).toBe(true);
    geometry.dispose();
    sprite.material.dispose();
    (points.material as PointsMaterial).dispose();
    control.geometry.dispose();
    (control.material as MeshBasicMaterial).dispose();
  },
);
