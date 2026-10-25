import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { Mesh, Vector3 } from 'three';
import { createPanelKit } from '../../core/views/eighties-controls';
import { markPipe, type Vec3 } from './pipe-markers';

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
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('pipe sign suspension', () => {
  for (const axis of ['x', 'z'] as const)
    for (const flow of [-1, 1] as const)
      it(`joins both upper fasteners to pipe loops on ${axis}, flow ${flow}`, () => {
        const end: Vec3 = axis === 'x' ? [4, 2, 1] : [1, 2, 4];
        const markings = markPipe(createPanelKit(), [[1, 2, 1], end], {
          radius: 0.1,
          service: 'pool water',
          text: 'FEED',
          flow,
        });
        markings.updateMatrixWorld(true);
        const plate = markings.children.find((c) =>
          c.name.startsWith('Engraved plate:'),
        )!;
        const wires = markings.children.filter(
          (c) => c.name === 'Pipe sign suspension wire',
        ) as Mesh[];
        const loops = markings.children.filter(
          (c) => c.name === 'Pipe sign suspension loop',
        );
        expect(wires).toHaveLength(2);
        expect(loops).toHaveLength(2);
        for (const [i, wire] of wires.entries()) {
          wire.geometry.computeBoundingBox();
          const bounds = wire.geometry.boundingBox!;
          const start = wire.localToWorld(new Vector3(0, bounds.min.y, 0));
          const end = wire.localToWorld(new Vector3(0, bounds.max.y, 0));
          const fastener = plate.localToWorld(
            new Vector3((i === 0 ? -1 : 1) * 0.3 * 0.46, 0.07 * 0.3, 0.0045),
          );
          expect(end.distanceTo(fastener)).toBeLessThan(1e-6);
          const loopBottom = loops[i].position
            .clone()
            .add(new Vector3(0, -0.1045, 0));
          expect(start.distanceTo(loopBottom)).toBeLessThan(1e-6);
        }
      });
  it('does not add hanging supports to stencil lettering or vertical runs', () => {
    for (const [end, lettering] of [
      [[3, 2, 1], 'stencil'],
      [[1, 5, 1], 'plate'],
    ] as const) {
      const markings = markPipe(createPanelKit(), [[1, 2, 1], end], {
        radius: 0.1,
        service: 'pool water',
        text: 'FEED',
        lettering,
      });
      expect(markings.children.some((c) => c.name.includes('suspension'))).toBe(
        false,
      );
    }
  });
});
