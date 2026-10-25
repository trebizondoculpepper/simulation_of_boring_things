import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { Box3 } from 'three';
import { createPanelKit, disposeKit } from '../../core/views/eighties-controls';
import { createPumpPair } from './pumps-plant';
import { machinePorts } from '../../../gallery/logic/machine-ports';
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
  it('screws each pump’s laminate identification to its motor’s terminal box', () => {
    // The owner, 2026-10-25: on a flat surface at the top, where it is seen.
    const kit = createPanelKit();
    const pair = createPumpPair(kit, ['P-201A', 'P-201B']);
    pair.updateMatrixWorld(true);
    for (const [i, pump] of pair.pumps.entries()) {
      const plate = pump.children.find((c) =>
        c.name.startsWith('Pump identification plate:'),
      )!;
      expect(plate.name).toContain(i === 0 ? 'P-201A DUTY' : 'P-201B STANDBY');
      const box = pump.getObjectByName('Motor terminal box')!;
      const p = new Box3().setFromObject(plate);
      const b = new Box3().setFromObject(box);
      // On the box's face away from its cable gland, within its edges.
      expect(p.max.z).toBeLessThanOrEqual(b.min.z + 1e-6);
      expect(b.min.z - p.max.z).toBeLessThan(0.006);
      expect(p.min.x).toBeGreaterThan(b.min.x);
      expect(p.max.x).toBeLessThan(b.max.x);
      expect(p.min.y).toBeGreaterThan(b.min.y);
      expect(p.max.y).toBeLessThan(b.max.y);
    }
    disposeKit(kit, pair);
  });
  it('brings each pump’s supply down onto the gland on its terminal box', () => {
    // The owner, 2026-10-25: a gland on the box's top, the cable into it.
    const kit = createPanelKit();
    const pair = createPumpPair(kit, ['P-201A', 'P-201B']);
    pair.updateMatrixWorld(true);
    const ports = machinePorts({
      key: 'pump-pair',
      label: 'Pumps',
      w: 3.2,
      d: 2.4,
      h: 1.9,
      mount: 'floor',
    });
    for (const [i, pump] of pair.pumps.entries()) {
      const b = new Box3().setFromObject(
        pump.getObjectByName('Motor terminal box')!,
      );
      const at = ports.find((q) => q.name === `power${'AB'[i]}`)!.at;
      expect(at[0]).toBeCloseTo((b.min.x + b.max.x) / 2, 2);
      expect(at[2]).toBeCloseTo((b.min.z + b.max.z) / 2, 2);
      expect(at[1]).toBeCloseTo(b.max.y + 0.03, 3);
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
