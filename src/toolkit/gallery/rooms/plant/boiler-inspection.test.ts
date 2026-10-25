import { afterEach, beforeEach, expect, it, vi } from 'vite-plus/test';
import { Group, Mesh, PerspectiveCamera } from 'three';
import {
  createPanelKit,
  disposeKit,
} from '../../../components/core/views/eighties-controls';
import {
  markComponent,
  owningComponent,
} from '../../../components/core/views/component-identity';
import { inspectComponent } from '../../../../game/plant/component-inspection';
import { SCHEMATICS } from '../../../../game/plant/schematics';
import { createInspector } from '../../views/inspect-pick';
import { createLiveBoilerCascade } from './boiler';

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

it('inspects all six boiler bodies and their labels separately from their pairs', () => {
  const seen = new Set<string>();
  for (const first of [0, 2, 4]) {
    const kit = createPanelKit();
    const pair = createLiveBoilerCascade(kit, first);
    if (!(pair.object instanceof Group))
      throw new Error('Expected a boiler group');
    markComponent(pair.object, `BH-B${first / 2 + 1}`);
    const boilers = pair.object.children.filter(
      (o) => o.name === 'Condensing boiler',
    );
    expect(boilers).toHaveLength(2);
    for (const [offset, boiler] of boilers.entries()) {
      const tag = `B-50${first + offset + 1}`;
      const body = boiler.children.find((o) => o instanceof Mesh)!;
      const label = boiler.children.at(-1)!;
      for (const target of [body, label]) {
        const owner = owningComponent(target)!;
        expect(owner.object).toBe(boiler);
        expect(owner.identity).toMatchObject({ tag, model: { node: tag } });
        const info = inspectComponent(owner.identity)!;
        expect(info.key).toBe(tag);
        expect(info.title).toBe(
          `${tag} (Hamwarmy Heating HW 300 boiler) - ${owner.identity.status!()}`,
        );
        expect(info.detail).toContain('boiler in the boiler house');
        expect(owner.identity.status?.()).toBeTruthy();
      }
      expect(
        SCHEMATICS.boiler_house.nodes.some(
          (n) => n.id === tag && n.kind === 'boiler',
        ),
      ).toBe(true);
      pair.object.updateMatrixWorld(true);
      const camera = new PerspectiveCamera(60, 1, 0.01, 100);
      camera.position.set(boiler.position.x, 0.8, 2);
      camera.lookAt(boiler.position.x, 0.8, 0.1);
      camera.updateMatrixWorld(true);
      const inspect = createInspector({ root: pair.object, camera, metre: 1 });
      expect(inspect(0, 0)?.key).toBe(tag);
      seen.add(tag);
    }
    pair.dispose?.();
    disposeKit(kit, pair.object);
  }
  expect(seen.size).toBe(6);
});
