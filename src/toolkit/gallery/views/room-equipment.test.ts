import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { Box3, Group } from 'three';
import { createPanelKit } from '../../components/core/views/eighties-controls';
import { EQUIPPED_ROOMS, layoutRoom } from '../logic/room-equipment';
import { createRoomEquipment } from './room-equipment';

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

/** How far a model may stray out of the space its machine takes, metres. */
const SLACK = 0.2;

describe.each(EQUIPPED_ROOMS)('%s, as built', (room) => {
  it('builds each machine inside the space laid out for it', () => {
    const built = createRoomEquipment(createPanelKit(), room);
    const placed = layoutRoom(room)!.placed;
    const group = built.group as Group;
    group.updateMatrixWorld(true);
    const machines = group.children.filter((o) => o.name !== 'pipework');
    expect(machines.length).toBe(placed.length);
    machines.forEach((object, i) => {
      const p = placed[i];
      if (p.item.mount !== 'floor') return;
      const box = new Box3().setFromObject(object);
      const f = p.footprint;
      expect(box.min.x, p.item.label).toBeGreaterThan(f.minX - SLACK);
      expect(box.max.x, p.item.label).toBeLessThan(f.maxX + SLACK);
      expect(box.min.z, p.item.label).toBeGreaterThan(f.minZ - SLACK);
      expect(box.max.z, p.item.label).toBeLessThan(f.maxZ + SLACK);
    });
    built.dispose();
  });
});
