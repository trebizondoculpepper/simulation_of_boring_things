import { afterEach, beforeEach, expect, it, vi } from 'vite-plus/test';
import { createPanelKit } from '../../../components/core/views/eighties-controls';
import { componentOf } from '../../../components/core/views/component-identity';
import { TAGS } from '../../../../game/plant/museum-2-clean-water';
import { buildHallExhibit } from './hall-2-clean-water';

beforeEach(() => {
  vi.stubGlobal('document', {
    createElement: () => {
      const canvas = { width: 0, height: 0, getContext: () => context };
      const context = new Proxy(
        {
          canvas,
          measureText: (text: string) => ({ width: text.length * 7 }),
          createLinearGradient: () => ({ addColorStop() {} }),
          createRadialGradient: () => ({ addColorStop() {} }),
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

it('builds Hall 2’s exhibit, binds a thing to each machine, and runs from its reset state', () => {
  const hall = buildHallExhibit(createPanelKit());
  hall.reset(9 * 3600);
  hall.update?.(0);
  for (let k = 0; k < 10; k++) hall.update?.(1 / 60);
  expect(hall.status?.()).toBe('circulating');
  const names: string[] = [];
  hall.object.traverse((o) => {
    const id = componentOf(o);
    if (id?.name) names.push(id.name);
  });
  for (const id of [
    'tank',
    'pump',
    'filter',
    'generator',
    'contact',
    'carbon',
    'uv',
    'pool',
  ])
    expect(
      names.some((n) => n.startsWith(`${TAGS[id]} `)),
      id,
    ).toBe(true);
  expect(hall.solids?.({ x: 0, z: 0 }).length).toBeGreaterThan(10);
});
