import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { Box3, Mesh, Vector3 } from 'three';
import { createPanelKit } from '../../../components/core/views/eighties-controls';
import { isLive } from './exhibit';
import { JACUZZI_PACK_EXHIBIT, SPA_PACK_EXHIBIT } from './spa-pack';
import { cabinetPorts } from '../../logic/cabinet-pipes';

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

describe.each([
  ['footbath', SPA_PACK_EXHIBIT, false],
  ['jacuzzi', JACUZZI_PACK_EXHIBIT, true],
] as const)('the %s cabinet', (_, exhibit, jets) => {
  it('has a stub through its back panel at each of its ports', () => {
    const built = exhibit.build(createPanelKit());
    const object = isLive(built) ? built.object : built;
    object.updateMatrixWorld(true);
    const boxes: Box3[] = [];
    object.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      // Only small pieces, a stub's pipe, valve or cap: not the panel it is in.
      const box = new Box3().setFromObject(o);
      const size = box.getSize(new Vector3());
      if (
        Math.min(size.x, size.y) < 0.25 &&
        Math.min(size.y, size.z) < 0.25 &&
        Math.min(size.x, size.z) < 0.25 &&
        Math.max(size.x, size.y, size.z) < 1.5
      )
        boxes.push(box);
    });
    for (const port of cabinetPorts(jets)) {
      const at = new Vector3(...port.at);
      const near = boxes.some((b) => b.distanceToPoint(at) < 0.03);
      expect(near, port.name).toBe(true);
    }
  });
});
