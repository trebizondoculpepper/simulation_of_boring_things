import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { PerspectiveCamera, Vector3 } from 'three';
import type { Mesh, Object3D, PlaneGeometry } from 'three';
import { applyAction, newWorld } from '../../../game/world';
import type { World, WorldAction } from '../../../game/world';
import { createPanelKit } from '../../components/core/views/eighties-controls';
import { SCREEN } from '../../../game/plant/aqualis-types';
import { tabRects } from '../../components/plant/logic/aqualis-display';
import type { Page } from '../../components/plant/logic/aqualis-display';
import { useOnHit } from '../../controls/input/touch-point';
import { createRoomTrio, createTrioWorldHost } from './aqualis-room-cabinet';

/** A host on a world of its own, every action it sends applied. */
function hosted(pool: 'pool_01' | 'pool_02') {
  let world: World = newWorld();
  const sent: WorldAction[] = [];
  const host = createTrioWorldHost(pool, {
    world: () => world,
    dispatch: (a) => {
      sent.push(a);
      world = applyAction(world, a);
    },
  });
  return { host, sent, world: () => world };
}

describe('a plant room’s Trio, bound to the world (mission 114)', () => {
  it('turns its knob and its power switch in the world', () => {
    const { host, world } = hosted('pool_01');
    expect(host.selector()).toBe('auto');
    host.setSelector('off');
    expect(world().aqualis.pool_01.selector).toBe('off');
    expect(host.selector()).toBe('off');
    host.setMainSwitch(false);
    expect(world().aqualis.pool_01.mainSwitch).toBe(false);
    expect(host.mainSwitchOn!()).toBe(false);
  });

  it('works its sample inlet valve as the world’s PL1-CP2-IV1', () => {
    const { host, sent } = hosted('pool_01');
    expect(host.sampleValveOpen!()).toBe(true);
    host.setSampleValve(false);
    expect(sent.at(-1)).toEqual({
      type: 'plant/valve',
      id: 'PL1.dosing.sampleIn.iso',
      open: false,
    });
    expect(host.sampleValveOpen!()).toBe(false);
  });

  it('shows its lamps from the world: power on, no alarm', () => {
    const { host } = hosted('pool_02');
    host.step(0.1);
    expect(host.leds().power).toBe(true);
    expect(host.powered()).toBe(true);
    expect(host.booting()).toBe(false);
  });

  it('sends a touch on its running screen to the world', () => {
    const { host, sent } = hosted('pool_02');
    host.step(0.1);
    host.screenTouch(10, 10);
    expect(sent).toContainEqual({
      type: 'aqualis',
      pool: 'pool_02',
      action: { act: 'touch' },
    });
  });
});

describe('a plant room’s Trio, touched through the room (the owner’s bug)', () => {
  beforeEach(() => {
    vi.stubGlobal('document', {
      createElement: () => {
        const canvas = { width: 0, height: 0, getContext: () => context };
        const context = new Proxy(
          {
            canvas,
            measureText: (text: string) => ({ width: text.length * 7 }),
            createLinearGradient: () => ({ addColorStop: () => {} }),
            createRadialGradient: () => ({ addColorStop: () => {} }),
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

  const named = (root: Object3D, name: string) => {
    let found: Object3D | null = null;
    root.traverse((o) => {
      if (!found && o.name === name) found = o;
    });
    return found as unknown as Mesh;
  };

  for (const pool of ['pool_01', 'pool_02'] as const)
    it(`${pool}: a touch on a tab, delivered as a room delivers a ray's hit, changes its page`, () => {
      let world: World = newWorld();
      const sent: WorldAction[] = [];
      const trio = createRoomTrio(createPanelKit(), pool, {
        world: () => world,
        dispatch: (a) => {
          sent.push(a);
          world = applyAction(world, a);
        },
      });
      trio.update!(0.1);
      trio.object.updateMatrixWorld(true);
      const screen = named(trio.object, 'Aqualis touch screen');
      const overlay = named(trio.object, 'Aqualis touch screen (Dr Aqualis)');
      const camera = new PerspectiveCamera();
      camera.position.copy(screen.localToWorld(new Vector3(0, 0, 0.6)));
      camera.lookAt(screen.getWorldPosition(new Vector3()));
      camera.updateMatrixWorld();
      const { width, height } = (screen.geometry as PlaneGeometry).parameters;
      // What the room does with its ray's hit on the tab: the use found
      // from the mesh struck up, done through `useOnHit`.
      const touchTab = (page: Page) => {
        const r = tabRects().find((t) => t.page === page)!.rect;
        const [x, y] = [r.x + r.w / 2, r.y + r.h / 2];
        const uv = { x: x / SCREEN.w, y: 1 - y / SCREEN.h };
        const point = screen.localToWorld(
          new Vector3((uv.x - 0.5) * width, (uv.y - 0.5) * height, 0),
        );
        let work: ((direction?: number) => void) | undefined;
        for (let o: Object3D | null = screen; o && !work; o = o.parent)
          work = trio.parts!.uses.get(o);
        expect(work).toBeDefined();
        useOnHit({ object: screen, uv, point }, screen, work!, camera)();
        trio.update!(0.1);
      };
      touchTab('doctor');
      expect(sent).toContainEqual({
        type: 'aqualis',
        pool,
        action: { act: 'touch' },
      });
      expect(overlay.visible).toBe(true);
      touchTab('water');
      expect(overlay.visible).toBe(false);
      touchTab('doctor');
      expect(overlay.visible).toBe(true);
      trio.dispose?.();
    });
});
