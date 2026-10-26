import { afterEach, beforeEach, expect, it, vi } from 'vite-plus/test';
import { Mesh, Raycaster, Vector3 } from 'three';
import { createPanelKit, disposeKit } from '../../core/views/eighties-controls';
import { ladderGate } from '../../architectural/parts/ladder-gate';
import { createPipeBellmouth } from './pipe-bellmouth';
import { tankDrain } from '../parts/tank-drain';
beforeEach(() => {
  vi.stubGlobal('document', {
    createElement: () => {
      const canvas = { width: 0, height: 0, getContext: () => context };
      const gradient = () => ({ addColorStop() {} });
      const context = new Proxy(
        {
          canvas,
          measureText: (text: string) => ({ width: text.length * 7 }),
          createRadialGradient: gradient,
          createLinearGradient: gradient,
        },
        {
          get: (target, key) =>
            key in target ? Reflect.get(target, key) : () => {},
        },
      );
      return canvas;
    },
  });
});
afterEach(() => vi.unstubAllGlobals());

it('opens the ladder gate through shared Use, holds it near a walker, then self-closes with its sign attached', () => {
  const kit = createPanelKit();
  const gate = ladderGate(kit, 0.55);
  expect(gate.angle()).toBe(0);
  const sign = gate.object.children.find((o) => o.position.z === 0.03)!;
  expect(sign).toBeTruthy();
  gate.uses.get(gate.object)!();
  for (let i = 0; i < 10; i++) {
    gate.update(0.1);
    gate.holdOpen();
  }
  expect(gate.angle()).toBeCloseTo(Math.PI / 2);
  expect(sign.parent).toBe(gate.object);
  for (let i = 0; i < 100; i++) {
    gate.holdOpen();
    gate.update(0.1);
  }
  expect(gate.angle()).toBeCloseTo(Math.PI / 2);
  for (let i = 0; i < 100; i++) gate.update(0.1);
  expect(gate.angle()).toBe(0);
  gate.dispose();
  disposeKit(kit, gate.object);
});
it('leaves the bellmouth bore open and gives its rim a single annular surface', () => {
  const kit = createPanelKit();
  const material = kit.materials[0] ?? new Mesh().material;
  const mouth = createPipeBellmouth(material, 0.2, 0.18, 0.08);
  mouth.updateMatrixWorld(true);
  const ray = new Raycaster(new Vector3(0, 1, 0), new Vector3(0, -1, 0));
  expect(ray.intersectObject(mouth, true)).toHaveLength(0);
  ray.ray.origin.x = 0.176;
  expect(ray.intersectObject(mouth, true)).toHaveLength(1);
  disposeKit(kit, mouth);
});
it('works the floor drain from its gantry handwheel and shows the bound position', () => {
  const kit = createPanelKit();
  let open = false;
  const drain = tankDrain(kit, 4.5, {
    get: () => open,
    set: (v) => {
      open = v;
    },
  });
  const [wheel, use] = [...drain.uses][0];
  expect(wheel.position.y).toBe(1);
  use();
  drain.update(0);
  expect(open).toBe(true);
  expect(wheel.rotation.y).toBeCloseTo(Math.PI / 3);
  use();
  drain.update(0);
  expect(open).toBe(false);
  expect(wheel.rotation.y).toBe(0);
  drain.dispose();
  disposeKit(kit, drain.object);
});
