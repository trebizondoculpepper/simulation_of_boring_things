import { Texture } from 'three';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { devPortals, devWalls } from '../logic/dev-room-links';
import { slide } from '../../controls/logic/walk-collision';
import { createPortals } from './portals';

vi.mock('../../components/core/views/screens', () => {
  // Labels' canvases are made, but nothing is drawn on them.
  const context = new Proxy(
    { measureText: (text: string) => ({ width: text.length * 7 }) },
    {
      get: (target, key) =>
        key in target ? Reflect.get(target, key) : () => {},
    },
  );
  return {
    createLabelTexture: () => ({
      texture: new Texture(),
      width: 256,
      height: 48,
    }),
    createCanvasTexture: (width: number, height: number) => ({
      canvas: { width, height },
      context,
      texture: new Texture(),
    }),
  };
});
afterEach(() => vi.unstubAllGlobals());

const bounds = { minX: -5, maxX: 5, minZ: -5, maxZ: 5 };

describe('portals', () => {
  it('open a spring door with a use, and send whoever walks through it to its room, once', () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal('window', { dispatchEvent });
    const links = devPortals('dev1', bounds, 1);
    const portals = createPortals('dev1', links, 0, 1);
    const [west] = links;
    // Walk west until the wall stops the walker: the door is shut.
    const stop = slide(devWalls(bounds, 1, 3.2), -3, west.z, -3, 0, 0.25);
    portals.update(0.1, stop.x, west.z);
    expect(dispatchEvent).not.toHaveBeenCalled();
    // A use pushes it open; it does not travel by itself.
    const [push] = [...portals.uses.values()];
    push();
    expect(dispatchEvent).not.toHaveBeenCalled();
    portals.update(0.1, -3, west.z);
    expect(dispatchEvent).not.toHaveBeenCalled();
    // Through it while it is open.
    portals.update(0.1, stop.x, west.z);
    expect(dispatchEvent).toHaveBeenCalledOnce();
    expect(dispatchEvent.mock.calls[0][0].detail).toEqual({
      to: 'dev_corridor',
      from: 'dev1',
    });
    portals.update(0.1, stop.x, west.z);
    expect(dispatchEvent).toHaveBeenCalledOnce();
    portals.dispose();
  });

  it('let the door swing shut again on its spring, and come back to it shut', () => {
    const dispatchEvent = vi.fn();
    // Its spring settles it with a sound, which waits for the first input.
    vi.stubGlobal('window', {
      dispatchEvent,
      addEventListener() {},
      removeEventListener() {},
    });
    const links = devPortals('dev1', bounds, 1);
    const portals = createPortals('dev1', links, 0, 1);
    const [push] = [...portals.uses.values()];
    push();
    // Away from the doorway it closes, in a few seconds.
    for (let t = 0; t < 10; t += 0.1) portals.update(0.1, 0, 0);
    const stop = slide(devWalls(bounds, 1, 3.2), -3, links[0].z, -3, 0, 0.25);
    portals.update(0.1, stop.x, links[0].z);
    expect(dispatchEvent).not.toHaveBeenCalled();
    portals.dispose();
  });

  it('do nothing beside the patch, along the same wall', () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal('window', { dispatchEvent });
    const links = devPortals('dev1', bounds, 1);
    const portals = createPortals('dev1', links, 0, 1);
    portals.update(0.1, -4.6, links[0].z - 2);
    expect(dispatchEvent).not.toHaveBeenCalled();
  });

  it('stand an arrival clear of the way out, facing into the room', () => {
    const links = devPortals('dev1', bounds, 1);
    const portals = createPortals('dev1', links, 0, 1);
    const pose = portals.arrival('dev_corridor')!;
    expect(pose.x).toBeCloseTo(-5 + 0.15 + 1.2);
    expect(pose.z).toBeCloseTo(links[0].z);
    expect(Math.sin(pose.yaw)).toBeCloseTo(1);
    expect(portals.arrival('dev3')).toBeNull();
  });
});
