import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { Group } from 'three';
import { createPanelKit } from '../../components/core/views/eighties-controls';
import { createRoomEquipment } from './room-equipment';
import { cabinetServices } from './cabinet-services';
import { unboundInScene } from './world-in-model-scene';
import { buildPoolHallContents } from '../rooms/pool-hall-room';

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

/** A room's plant as its scene builds it: its equipment, pipework and services, and a packaged cabinet's. */
function built(room: string) {
  const kit = createPanelKit();
  const root = new Group();
  root.add(createRoomEquipment(kit, room).group);
  const services = cabinetServices(kit, room, 0);
  if (services) root.add(services.group);
  root.updateMatrixWorld(true);
  return root;
}

describe('everything the scene draws is in the model (prompt 064)', () => {
  it('the jacuzzi plant room: every mesh bound to its model, or decorative', () => {
    expect(unboundInScene('plant_pool_03', built('plant_pool_03'))).toEqual([]);
  });

  it('the jacuzzi’s own room, the pool hall: every mesh bound, or decorative', () => {
    const hall = buildPoolHallContents('pool_03', 1, { gallery: false });
    hall.rooms.updateMatrixWorld(true);
    expect(unboundInScene('plant_pool_03', hall.rooms)).toEqual([]);
  });

  it('names what is not bound, in a room not yet built from its model', () => {
    const unbound = unboundInScene('plant_pool_04', built('plant_pool_04'));
    expect(unbound.length).toBeGreaterThan(0);
    expect(unbound).toContain('PL4-CAB1');
  });
});
