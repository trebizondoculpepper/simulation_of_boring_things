import { describe, expect, it } from 'vite-plus/test';
import { applyAction, newWorld } from '../../../game/world';
import type { World, WorldAction } from '../../../game/world';
import { createTrioWorldHost } from './aqualis-room-cabinet';

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
