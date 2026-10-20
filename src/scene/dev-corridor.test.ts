import { PerspectiveCamera, Scene } from 'three';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import {
  LOOP_DOORS,
  LOOP_HALF,
  LOOP_ZONES,
  onSide,
  visibleZones,
} from '../game/dev-corridor-plan';
import { countDraws } from '../toolkit/components/core/views/draw-count';
import { createPanelKit } from '../toolkit/components/core/views/eighties-controls';
import { EYE_HEIGHT_METRES } from '../toolkit/controls/input/first-person';
import { LOOP_ROOMS, createDevCorridor } from './dev-corridor';
import { createDevCourtyard } from './dev-courtyard';
import { anchor } from '../game/courtyard-join';
import { doorway } from '../game/dev-corridor-plan';

beforeEach(() => {
  // Label canvases are made, but nothing is drawn.
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

/** The views the room offers, facing along the corridor or round a turn. */
const VIEWS = {
  side: { ...onSide('north', -20), yaw: Math.PI / 2 },
  middle: { ...onSide('east', 0), yaw: Math.PI },
  corner: { x: -LOOP_HALF, z: -LOOP_HALF, yaw: (3 * Math.PI) / 4 },
};

describe('dev_corridor', () => {
  it.each(Object.entries(VIEWS))(
    'draws within the budget from a %s, only the zones in view',
    (_name, { x, z, yaw }) => {
      const corridor = createDevCorridor(createPanelKit());
      const scene = new Scene();
      scene.add(corridor.group);
      const seen = visibleZones(x, z);
      for (const id of LOOP_ZONES)
        corridor.zones.get(id)!.group.visible = seen.has(id);
      const camera = new PerspectiveCamera(62, 16 / 9, 0.05, 90);
      camera.position.set(x, EYE_HEIGHT_METRES, z);
      camera.lookAt(x + Math.sin(yaw), EYE_HEIGHT_METRES, z - Math.cos(yaw));
      scene.updateMatrixWorld();
      const draws = countDraws(scene, camera);
      expect(draws.total, JSON.stringify(draws)).toBeLessThanOrEqual(1000);
      corridor.parts.dispose();
    },
  );

  it.each([
    ['the corridor', -1.5],
    ['the courtyard', 2.5],
  ] as const)(
    'draws within the budget with the courtyard’s door open, looking through it from %s',
    (_name, along) => {
      // Both rooms drawn, each its own scene, the courtyard behind the
      // south side's inner door; the courtyard's sun draws it twice.
      const corridor = createDevCorridor(createPanelKit());
      const courtyard = createDevCourtyard(createPanelKit());
      const a = anchor('south');
      courtyard.group.position.set(a.x, 0, a.z);
      courtyard.group.rotation.y = a.yaw;
      const d = doorway({ side: 'south', t: 0, wall: 'inner' });
      const x = d.x + d.out.x * along;
      const z = d.z + d.out.z * along;
      const seen = visibleZones(d.x - d.out.x, d.z - d.out.z);
      for (const id of LOOP_ZONES)
        corridor.zones.get(id)!.group.visible = seen.has(id);
      const look = along < 0 ? 1 : -1;
      const camera = new PerspectiveCamera(62, 16 / 9, 0.05, 400);
      camera.position.set(x, EYE_HEIGHT_METRES, z);
      camera.lookAt(x + d.out.x * look, EYE_HEIGHT_METRES, z + d.out.z * look);
      const rooms = [new Scene(), new Scene()];
      rooms[0].add(corridor.group);
      rooms[1].add(courtyard.group);
      for (const room of rooms) room.updateMatrixWorld();
      const total =
        countDraws(rooms[0], camera).total +
        2 * countDraws(rooms[1], camera).total;
      expect(total).toBeLessThanOrEqual(1000);
      corridor.parts.dispose();
      courtyard.parts.dispose();
    },
  );

  it('has a spring door for every room, the courtyard from each side, and a few stores', () => {
    const corridor = createDevCorridor(createPanelKit());
    expect(corridor.doors).toHaveLength(LOOP_DOORS.length);
    const rooms = LOOP_ROOMS.filter(Boolean);
    expect(rooms).toContain('facility');
    expect(rooms).toContain('dev0');
    expect(rooms).toContain('dev_pumps');
    expect(rooms).not.toContain('dev_corridor');
    expect(new Set(rooms).size).toBe(rooms.length);
    corridor.parts.dispose();
  });

  it('opens a door, which swings shut again on its own', () => {
    const corridor = createDevCorridor(createPanelKit());
    const { door } = corridor.doors[0].part;
    door.push(1);
    for (let t = 0; t < 2; t += 0.1) corridor.parts.update(0.1);
    expect(door.open).toBe(true);
    for (let t = 0; t < 10; t += 0.1) corridor.parts.update(0.1);
    expect(door.open).toBe(false);
    corridor.parts.dispose();
  });
});
