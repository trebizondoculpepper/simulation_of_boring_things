import { expect, it } from 'vite-plus/test';
import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
} from 'three';
import { createObjectHandling } from '../../../controls/input/object-handling';
import { createPortableBoard } from '../../../controls/logic/portable-board';
import { createBinTossing } from './bin-tossing';

function fixture() {
  const scene = new Scene();
  const object = new Mesh(
    new BoxGeometry(0.2, 0.2, 0.2),
    new MeshBasicMaterial(),
  );
  object.position.set(0, 1.2, 0);
  const portable = {
    component: createPortableBoard(),
    detach() {},
    flat: 'side' as const,
  };
  object.userData.portable = portable;
  scene.add(object);
  const camera = new PerspectiveCamera(55, 1, 0.01, 100);
  camera.position.set(0, 1.2, 2);
  camera.lookAt(0, 1.2, 0);
  const tossing = createBinTossing({ camera, metre: 1, random: () => 0.5 });
  const group = new Group();
  group.add(new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial()));
  group.position.set(0, 0.5, -1.5);
  scene.add(group);
  const bin = tossing.add({
    name: 'test skip',
    group,
    x: 0,
    z: -1.5,
    footprint: { x: 1, z: 1 },
    shape: {
      halfX: 0.4,
      halfZ: 0.4,
      floor: 0.1,
      rim: 1,
      layer: 0.03,
      heap: 0.2,
    },
  });
  const handling = createObjectHandling(
    scene,
    camera,
    1,
    0,
    undefined,
    tossing.divert,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    tossing.targetFeedback,
  );
  handling.use(0, 0);
  camera.lookAt(0, 0.5, -1.5);
  return { scene, object, portable, camera, tossing, bin, handling };
}

it('shows green and tosses into an aimed skip, with feedback matching the actual placement', () => {
  const f = fixture();
  expect(f.handling.targetFeedback(0, 0)).toBe('accept');
  f.handling.use(0, 0);
  expect(f.handling.holding()).toBe(false);
  expect(f.tossing.incoming(f.bin)).toBe(true);
  expect(f.portable.component.phase.value).toBe('falling');
  f.handling.dispose();
});

it('leaves the normal crosshair for an out-of-range bin and releases normally', () => {
  const f = fixture();
  f.bin.z = -8;
  f.bin.group.position.z = -8;
  f.camera.lookAt(0, 0.5, -8);
  expect(f.handling.targetFeedback(0, 0)).toBeNull();
  f.handling.use(0, 0);
  expect(f.handling.holding()).toBe(false);
  expect(f.tossing.incoming(f.bin)).toBe(false);
  f.handling.dispose();
});

it('keeps magnetic-range feedback when not aimed at the bin, and forgets removed bins', () => {
  const f = fixture();
  f.camera.lookAt(5, 1.2, 0);
  expect(f.handling.targetFeedback(0, 0)).toBe('accept');
  f.tossing.remove(f.bin);
  expect(f.handling.targetFeedback(0, 0)).toBeNull();
  expect(f.bin.group.userData.placementTarget).toBeUndefined();
  f.handling.dispose();
});
