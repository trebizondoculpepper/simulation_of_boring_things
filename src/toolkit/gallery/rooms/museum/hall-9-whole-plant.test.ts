import { afterEach, beforeEach, expect, it, vi } from 'vite-plus/test';
import { createPanelKit } from '../../../components/core/views/eighties-controls';
import { componentOf } from '../../../components/core/views/component-identity';
import { TAGS } from '../../../../game/plant/museum-9-plant';
import { buildHallExhibit } from './hall-9-whole-plant';

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

it('builds Hall 9’s exhibit, binds a thing to each machine, and runs from its reset state', () => {
  const hall = buildHallExhibit(createPanelKit());
  hall.reset(9 * 3600);
  hall.update?.(0);
  for (let k = 0; k < 10; k++) hall.update?.(1 / 60);
  expect(hall.status?.()).toBe('running normally');
  const names: string[] = [];
  hall.object.traverse((o) => {
    const id = componentOf(o);
    if (id?.name) names.push(id.name);
  });
  for (const id of [
    'boiler',
    'hx',
    'balanceTank',
    'strainer',
    'poolPump',
    'filter',
    'sampleCell',
    'hypoPump',
    'pool',
  ])
    expect(
      names.some((n) => n.startsWith(`${TAGS[id]} `)),
      id,
    ).toBe(true);
  expect(hall.solids?.({ x: 0, z: 0 }).length).toBeGreaterThan(10);
});

it('stands everything on the floor or on a wall: nothing floats, nothing sinks', async () => {
  const { Box3 } = await import('three');
  const { interior, POINTS } = await import('../../logic/museum-9-layout');
  const hall = buildHallExhibit(createPanelKit());
  hall.reset(9 * 3600);
  hall.update?.(1 / 60);
  hall.object.updateMatrixWorld(true);
  const floating: string[] = [];
  for (const child of hall.object.children) {
    const id = componentOf(child);
    const model = (
      id as
        | { model?: { node?: string; fitting?: string; link?: string } }
        | undefined
    )?.model;
    // Pipes, the fittings in them and the points of the lines are carried by the pipework.
    if (
      model?.link ||
      model?.fitting ||
      (model?.node && (POINTS as readonly string[]).includes(model.node))
    )
      continue;
    const b = new Box3().setFromObject(child);
    if (b.isEmpty()) continue;
    const near = 0.25;
    const onWall =
      b.min.x < interior.minX + near ||
      b.max.x > interior.maxX - near ||
      b.min.z < interior.minZ + near ||
      b.max.z > interior.maxZ - near;
    expect(b.min.y, `${child.name}: sunk in the floor`).toBeGreaterThan(-0.05);
    if (b.min.y > 0.1 && !onWall)
      floating.push(`${id?.name ?? child.name} at ${b.min.y.toFixed(2)} m`);
  }
  expect(floating).toEqual([]);
});
