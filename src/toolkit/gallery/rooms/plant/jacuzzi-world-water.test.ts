import { afterEach, beforeEach, expect, it, vi } from 'vite-plus/test';
import { signal } from '@preact/signals-core';
import { newWorld } from '../../../../game/world';
import { poolDepth } from '../../../../game/plant/pools';
import {
  createPanelKit,
  disposeKit,
} from '../../../components/core/views/eighties-controls';
import { JACUZZI_EXHIBIT } from './pool-amenities';
import { isLive } from './exhibit';

const store = { world: signal(newWorld()), dispatch: vi.fn() };
vi.mock('../../../save/world-store', () => ({ worldStore: () => store }));
beforeEach(() => {
  store.world.value = newWorld();
  vi.stubGlobal('window', { addEventListener: vi.fn() });
  vi.stubGlobal('document', {
    createElement: () => {
      const canvas = { width: 0, height: 0, getContext: () => context };
      const gradient = () => ({ addColorStop() {} });
      const context = new Proxy(
        {
          canvas,
          measureText: (text: string) => ({ width: text.length * 7 }),
          createLinearGradient: gradient,
          createRadialGradient: gradient,
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
it('drains, narrows below the seat, empties and refills the live jacuzzi from world state', () => {
  const kit = createPanelKit();
  const tub = JACUZZI_EXHIBIT.build(kit);
  if (!isLive(tub)) throw new Error('Expected live jacuzzi');
  const water = tub.object.getObjectByName('Jacuzzi water surface')!;
  const setLevel = (fraction: number) => {
    const w = newWorld();
    w.pools.pool_03.level = (fraction - 1) * poolDepth('pool_03');
    store.world.value = w;
    tub.update?.(0.1);
  };
  setLevel(1);
  const fullHeight = water.position.y;
  const fullWidth = water.scale.x;
  setLevel(0.1);
  expect(water.position.y).toBeLessThan(fullHeight);
  expect(water.scale.x).toBeLessThan(fullWidth);
  expect(water.visible).toBe(true);
  setLevel(0);
  expect(water.visible).toBe(false);
  setLevel(0.5);
  expect(water.visible).toBe(true);
  expect(water.position.y).toBeGreaterThan(0.005);
  setLevel(1);
  expect(water.position.y).toBeCloseTo(fullHeight, 6);
  tub.dispose?.();
  disposeKit(kit, tub.object as never);
});
