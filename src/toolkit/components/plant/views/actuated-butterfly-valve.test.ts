import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { Quaternion, Vector3 } from 'three';
import { createPanelKit } from '../../core/views/eighties-controls';
import { createActuatedButterflyValve } from './actuated-butterfly-valve';

beforeEach(() => {
  vi.stubGlobal('document', {
    createElement: () => {
      const canvas = { width: 0, height: 0, getContext: () => context };
      const context = new Proxy(
        { canvas, measureText: (text: string) => ({ width: text.length * 7 }) },
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

describe('actuated butterfly valve', () => {
  it('keeps an upright pipe’s override facing horizontally and operable', () => {
    const valve = createActuatedButterflyValve(
      createPanelKit(),
      150,
      'y',
      'Filter backwash out',
    );
    const override = valve.uses.keys().next().value;
    expect(override).toBeDefined();
    valve.object.updateMatrixWorld(true);
    const outward = new Vector3(0, 0, 1).applyQuaternion(
      override!.parent!.getWorldQuaternion(new Quaternion()),
    );
    expect(outward.z).toBeCloseTo(1);
    expect(outward.y).toBeCloseTo(0);
    valve.uses.get(override!)!();
    expect(valve.open).toBe(false);
    valve.dispose();
  });
});
