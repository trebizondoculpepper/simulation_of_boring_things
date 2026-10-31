import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { Box3, Group, Mesh, MeshBasicMaterial } from 'three';
import { createPanelKit } from '../../components/core/views/eighties-controls';
import { EQUIPPED_ROOMS, layoutRoom } from '../logic/room-equipment';
import {
  MODELS,
  SIMULATOR_DOOR_SWING,
  createRoomEquipment,
} from './room-equipment';
import { bindRoomPower } from './room-power';

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
      // Less what stands beside it on the floor by design, a solid of its
      // own (the engineer's desk's carton and chair, `userData.beside`).
      const box = new Box3();
      object.traverse((o) => {
        for (let up: typeof o | null = o; up && up !== object; up = up.parent)
          if (up.userData.beside) return;
        if (o instanceof Mesh) box.expandByObject(o, false);
      });
      const f = p.footprint;
      expect(box.min.x, p.item.label).toBeGreaterThan(f.minX - SLACK);
      expect(box.max.x, p.item.label).toBeLessThan(f.maxX + SLACK);
      expect(box.min.z, p.item.label).toBeGreaterThan(f.minZ - SLACK);
      expect(box.max.z, p.item.label).toBeLessThan(f.maxZ + SLACK);
    });
    built.dispose();
  });
});

describe('the engineer’s office’s scenario simulator', () => {
  it('opens its door without the door going through a wall or into anything', () => {
    const built = createRoomEquipment(createPanelKit(), 'engineers_office');
    const group = built.group as Group;
    const layout = layoutRoom('engineers_office')!;
    const sim = layout.placed.find((p) => p.item.key === 'scenario-simulator')!;
    // The door's hinge: the group its pull hangs on, swung fully open.
    let hinge: Group | undefined;
    group.traverse((o) => {
      if (o.name === 'Scenario simulator door pull') hinge = o.parent as Group;
    });
    expect(hinge).toBeDefined();
    hinge!.rotation.y = -SIMULATOR_DOOR_SWING;
    group.updateMatrixWorld(true);
    const box = new Box3().setFromObject(hinge!);
    // Inside the room's walls…
    const { w, d } = layout.box;
    expect(box.min.x, 'west wall').toBeGreaterThan(-w / 2);
    expect(box.max.x, 'east wall').toBeLessThan(w / 2);
    expect(box.min.z, 'north wall').toBeGreaterThan(-d / 2);
    expect(box.max.z, 'south wall').toBeLessThan(d / 2);
    // …and clear of everything else in it.
    for (const p of layout.placed) {
      if (p === sim) continue;
      const f = p.footprint;
      const clash =
        box.min.x < f.maxX &&
        box.max.x > f.minX &&
        box.min.z < f.maxZ &&
        box.max.z > f.minZ;
      expect(clash, p.item.label).toBe(false);
    }
    built.dispose();
  });
});

it('keeps passive cupboard labels and glazing unchanged when office power is cut', () => {
  const built = createRoomEquipment(createPanelKit(), 'engineers_office');
  const cupboard = built.group.children.find((o) =>
    o.name.includes('Parts stores cupboard'),
  )!;
  const materials = new Set<MeshBasicMaterial>();
  cupboard.traverse((object) => {
    if (object instanceof Mesh && object.material instanceof MeshBasicMaterial)
      materials.add(object.material);
  });
  expect(materials.size).toBeGreaterThan(0);
  const colours = [...materials].map((material) => material.color.getHex());
  const roomPower = bindRoomPower(cupboard, () => false);
  roomPower.update(0.1);
  expect([...materials].map((material) => material.color.getHex())).toEqual(
    colours,
  );
  built.dispose();
});

describe('the rooms’ machines and their models', () => {
  it('draws every machine with a model as that model, never a placeholder for want of room', () => {
    const misfits: string[] = [];
    for (const room of EQUIPPED_ROOMS)
      for (const p of layoutRoom(room)?.placed ?? []) {
        const model = MODELS[p.item.key.split(':')[0]];
        if (!model) continue;
        if (model.size.w > p.item.w + 0.05 || model.size.d > p.item.d + 0.05)
          misfits.push(`${room} ${p.item.label}: ${model.title}`);
      }
    expect(misfits).toEqual([]);
  });
});
