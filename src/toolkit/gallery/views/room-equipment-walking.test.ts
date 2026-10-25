import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { createPanelKit } from '../../components/core/views/eighties-controls';
import { createRoomEquipment } from './room-equipment';
import { layoutRoom } from '../logic/room-equipment';

beforeEach(() => {
  // Enough of a browser for the rooms' builders: canvases to paint labels
  // on, and listeners that hear nothing.
  const listen = { addEventListener() {}, removeEventListener() {} };
  vi.stubGlobal('window', { ...listen, setTimeout, clearTimeout });
  const element = () => {
    const canvas = {
      ...listen,
      width: 0,
      height: 0,
      style: {},
      getContext: () => context,
    };
    const gradient = () => ({ addColorStop() {} });
    const context = new Proxy(
      {
        canvas,
        measureText: (text: string) => ({ width: text.length * 7 }),
        createRadialGradient: gradient,
        createLinearGradient: gradient,
        getImageData: () => ({ data: new Uint8ClampedArray(4) }),
      },
      {
        get: (target, key) =>
          key in target ? Reflect.get(target, key) : () => {},
      },
    );
    return canvas;
  };
  vi.stubGlobal('document', {
    ...listen,
    createElement: element,
    createElementNS: element,
    hidden: false,
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('walking round plant', () => {
  // The owner, 2026-10-25: the walker is 0.35 m wide, but ways between
  // machines are designed 0.5 m clear.
  it.each(['plant_pool_01', 'plant_pool_02'])(
    'leaves a way at least 0.5 m clear between %s’s duty and standby pumps',
    (room) => {
      const pair = layoutRoom(room)?.placed.find(
        (p) => p.item.key === 'pump-pair',
      );
      if (!pair) return;
      const { solids } = createRoomEquipment(createPanelKit(), room);
      const inside = solids.filter(
        (s) =>
          s.minX >= pair.footprint.minX - 0.01 &&
          s.maxX <= pair.footprint.maxX + 0.01 &&
          s.minZ >= pair.footprint.minZ - 0.01 &&
          s.maxZ <= pair.footprint.maxZ + 0.01,
      );
      const sets = inside
        .filter(
          (s) =>
            s.maxX - s.minX < pair.footprint.maxX - pair.footprint.minX - 0.1 ||
            s.maxZ - s.minZ < pair.footprint.maxZ - pair.footprint.minZ - 0.1,
        )
        .slice(0, 2);
      expect(sets).toHaveLength(2);
      const [a, b] = sets;
      const gap = Math.max(
        b.minX - a.maxX,
        a.minX - b.maxX,
        b.minZ - a.maxZ,
        a.minZ - b.maxZ,
      );
      expect(gap).toBeGreaterThanOrEqual(0.5);
    },
  );
});
