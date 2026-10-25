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
import { buildPlantRoomContents } from '../rooms/plant-room-shell-room';
import { shellPlan } from '../logic/shell-plan';
import { POOL_HALLS } from '../logic/pool-halls';

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

/**
 * Working things not yet in any model, awaiting the owner's ruling
 * (prompt 063): the rooms' doors. Listed here so that nothing else can
 * join them unnoticed.
 */
const AWAITING_RULING = ['Equipment doors', 'Plant room door'];

describe('everything the scene draws is in the model (prompt 064)', () => {
  it('the jacuzzi plant room’s machines and services: every mesh bound, or decorative', () => {
    expect(unboundInScene('plant_pool_03', built('plant_pool_03'))).toEqual([]);
  });

  it('the whole jacuzzi plant room, shell and all: only its doors await a ruling', () => {
    const size = POOL_HALLS.pool_03.plantDoor!.size;
    const room = buildPlantRoomContents(
      shellPlan(size),
      1,
      size,
      'pool_03',
      {},
    );
    room.rooms.updateMatrixWorld(true);
    expect(unboundInScene('plant_pool_03', room.rooms)).toEqual(
      AWAITING_RULING,
    );
  });

  it('the jacuzzi’s own room, the pool hall: every mesh bound, or decorative', () => {
    const hall = buildPoolHallContents('pool_03', 1, { gallery: false });
    hall.rooms.updateMatrixWorld(true);
    // The corridor drawn on beyond its door is the corridor's, checked with it.
    expect(
      unboundInScene(
        'plant_pool_03',
        hall.rooms,
        (o) => o.name === 'corridor run',
      ),
    ).toEqual([]);
  });

  it('names what is not bound, in a room not yet built from its model', () => {
    const unbound = unboundInScene('plant_pool_04', built('plant_pool_04'));
    expect(unbound.length).toBeGreaterThan(0);
    expect(unbound).toContain('PL4-CAB1');
  });
});
