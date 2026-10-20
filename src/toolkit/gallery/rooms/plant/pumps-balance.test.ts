import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { Box3 } from 'three';
import {
  createPanelKit,
  disposeKit,
} from '../../../components/core/views/eighties-controls';
import { isLive } from './exhibit';
import { EXHIBITS as PUMPS } from './pumps';
import { EXHIBITS as BALANCE } from './balance';

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

/** How far a model may stray outside its declared size, metres. */
const SLACK = 0.15;

describe.each([
  ['dev_pumps', PUMPS],
  ['dev_balance', BALANCE],
])('the %s exhibits', (_, exhibits) => {
  it.each(exhibits.map((e) => [e.title, e] as const))(
    'builds %s inside its declared size',
    (_title, exhibit) => {
      const kit = createPanelKit();
      const built = exhibit.build(kit);
      const model = isLive(built) ? built.object : built;
      model.updateMatrixWorld(true);
      const box = new Box3().setFromObject(model);
      const { w, d, h, mount } = exhibit.size;
      expect(box.min.x).toBeGreaterThan(-w / 2 - SLACK);
      expect(box.max.x).toBeLessThan(w / 2 + SLACK);
      if (mount === 'floor') {
        expect(box.min.z).toBeGreaterThan(-d / 2 - SLACK);
        expect(box.max.z).toBeLessThan(d / 2 + SLACK);
        expect(box.min.y).toBeGreaterThan(-SLACK);
        expect(box.max.y).toBeLessThan(h + SLACK);
      } else {
        expect(box.min.z).toBeGreaterThan(-SLACK);
        expect(box.max.z).toBeLessThan(d + SLACK);
        expect(box.min.y).toBeGreaterThan(-h / 2 - SLACK);
        expect(box.max.y).toBeLessThan(h / 2 + SLACK);
      }
      disposeKit(kit, model as never);
    },
  );
});

it('isolates and restores the pump drive supply with its rotary handle', () => {
  const kit = createPanelKit();
  const exhibit = PUMPS.find((e) => e.title === 'Variable-speed drive')!;
  const built = exhibit.build(kit);
  expect(isLive(built)).toBe(true);
  if (!isLive(built)) return;
  const display = built.object.getObjectByName('drive display')!;
  const [handle, operate] = [...built.parts!.uses.entries()][0];
  built.update?.(0);
  expect(display.visible).toBe(true);
  operate();
  built.parts!.update(1);
  built.update?.(1);
  expect(display.visible).toBe(false);
  const off = handle.parent!.rotation.z;
  operate();
  built.parts!.update(1);
  built.update?.(1);
  expect(display.visible).toBe(true);
  expect(handle.parent!.rotation.z).not.toBe(off);
  built.parts!.dispose();
  disposeKit(kit, built.object as never);
});
