import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { Box3, Mesh } from 'three';
import { createPanelKit, disposeKit } from '../../core/views/eighties-controls';
import { createPumpPair } from './pumps-plant';
import { createControllerPanel } from './dosing-equipment';

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

describe('plant identification and enclosures', () => {
  it('fastens each pump’s brass identification to its own flat base channel', () => {
    const kit = createPanelKit();
    const pair = createPumpPair(kit, true, ['P-201A', 'P-201B']);
    pair.updateMatrixWorld(true);
    for (const [i, pump] of pair.pumps.entries()) {
      const plate = pump.children.find((c) =>
        c.name.startsWith('Brass plate:'),
      )!;
      expect(plate.name).toContain(i === 0 ? 'P-201A DUTY' : 'P-201B STANDBY');
      const backing = plate.getObjectByName(
        'Pump identification plate backing',
      ) as Mesh;
      const support = pump.children.find(
        (c) => c.name === 'Pump base channel' && c.position.z > 0,
      )!;
      const p = new Box3().setFromObject(backing);
      const b = new Box3().setFromObject(support);
      expect(p.min.z).toBeCloseTo(b.max.z);
      expect(p.min.x).toBeGreaterThan(b.min.x);
      expect(p.max.x).toBeLessThan(b.max.x);
      expect(p.min.y).toBeGreaterThan(b.min.y);
      expect(p.max.y).toBeLessThan(b.max.y);
    }
    disposeKit(kit, pair);
  });
  it('fits the controller lid above its housing without overlapping top faces', () => {
    const kit = createPanelKit();
    const controller = createControllerPanel(kit);
    controller.updateMatrixWorld(true);
    const body = new Box3().setFromObject(
      controller.getObjectByName('Water controller housing')!,
    );
    const lid = new Box3().setFromObject(
      controller.getObjectByName('Water controller lid')!,
    );
    expect(body.max.y).toBeCloseTo(lid.min.y);
    expect(lid.max.y - body.max.y).toBeCloseTo(0.03);
    expect(body.min.y).toBeCloseTo(0.305);
    expect(lid.max.y).toBeCloseTo(0.595);
    disposeKit(kit, controller);
  });
});
