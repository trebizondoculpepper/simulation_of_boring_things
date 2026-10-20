import { expect, it } from 'vite-plus/test';
import { Box3, LineCurve3, Mesh, Raycaster, Vector3 } from 'three';
import { createPanelKit, disposeKit } from '../../core/views/eighties-controls';
import { createFloorCableProtector } from './floor-cable-protector';

it('keeps the 83×14 mm profile 1 mm above the floor, with a genuine underside channel', () => {
  const kit = createPanelKit();
  const cover = createFloorCableProtector(
    kit,
    new LineCurve3(new Vector3(0, 0, 0), new Vector3(0, 0, 1)),
  );
  cover.updateMatrixWorld(true);
  const box = new Box3().setFromObject(cover);
  expect(box.min.y).toBeCloseTo(0.001);
  expect(box.max.y).toBeCloseTo(0.015);
  expect(box.max.x - box.min.x).toBeCloseTo(0.083);
  // A cable sits below the internal roof, rather than inside solid rubber.
  const ray = new Raycaster(new Vector3(0, 0.005, 0.5), new Vector3(0, 1, 0));
  const mesh = cover.children[0] as Mesh;
  expect(new Box3().setFromObject(mesh).containsPoint(ray.ray.origin)).toBe(
    true,
  );
  const top = new Raycaster(
    new Vector3(0, 0.1, 0.5),
    new Vector3(0, -1, 0),
  ).intersectObject(cover, true)[0];
  expect(top.point.y).toBeCloseTo(0.015);
  expect(top.face!.normal.y).toBeGreaterThan(0);
  disposeKit(kit, cover);
});
