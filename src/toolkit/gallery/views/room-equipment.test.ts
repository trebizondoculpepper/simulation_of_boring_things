import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { Box3, Group, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import type { Object3D } from 'three';
import type { PortableObject } from '../../controls/input/object-handling';
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

describe('the engineer’s office’s boxed software', () => {
  const build = () => {
    const built = createRoomEquipment(createPanelKit(), 'engineers_office');
    const group = built.group as Group;
    group.updateMatrixWorld(true);
    const boxes = new Map<string, Object3D>();
    let carton: Object3D | undefined;
    let desk: Object3D | undefined;
    group.traverse((o) => {
      if (o.userData.softwareBox) boxes.set(o.userData.softwareBox, o);
      if (o.name === 'Gateway 3000 carton') carton = o;
      if (o.name === 'Engineer’s desk') desk = o;
    });
    return { built, group, boxes, carton: carton!, desk: desk! };
  };
  const pickUp = (box: Object3D) =>
    (box.userData.portable as PortableObject).component.pickUp();

  it('stands five of its eight boxes on the shelf over the desk, Pool Simulator 97 face out to the room', () => {
    const { built, boxes, desk } = build();
    expect(boxes.size).toBe(8);
    const onShelf = [...boxes].filter(
      ([, box]) => new Box3().setFromObject(box).min.y > 1.6,
    );
    expect(onShelf).toHaveLength(5);
    const star = boxes.get('macrosoft-pool-simulator-97')!;
    expect(onShelf.map(([id]) => id)).toContain('macrosoft-pool-simulator-97');
    // Its front (+z) faces the way the desk's user faces, into the room.
    const front = new Vector3(0, 0, 1).transformDirection(star.matrixWorld);
    const room = new Vector3(0, 0, 1).transformDirection(desk.matrixWorld);
    expect(front.dot(room)).toBeGreaterThan(0.95);
    // Within reach of the eye: its middle a little above standing head height.
    const middle = new Box3().setFromObject(star).getCenter(new Vector3());
    expect(middle.y).toBeGreaterThan(1.7);
    expect(middle.y).toBeLessThan(1.9);
    built.dispose();
  });

  it('lets a box be picked up and put back exactly where it was', () => {
    const { built, boxes } = build();
    const box = boxes.get('macrosoft-pool-simulator-97')!;
    const parent = box.parent;
    const position = box.position.clone();
    const quaternion = box.quaternion.clone();
    expect(built.canRemove(box)).toBe(true);
    pickUp(box);
    // In the hands, as the control scheme carries it.
    built.group.attach(box);
    box.position.set(0, 1.5, 0);
    expect(built.release(box)).toBe(true);
    expect(box.parent).toBe(parent);
    expect(box.position.distanceTo(position)).toBeLessThan(1e-9);
    expect(box.quaternion.angleTo(quaternion)).toBeLessThan(1e-6);
    built.dispose();
  });

  it('leaves the pile’s bottom box while the opened one is on it, and bins what is thrown in the carton', () => {
    const { built, boxes, carton } = build();
    const bottom = boxes.get('coshh-manager-95')!;
    const top = boxes.get('beige-accounting-leisure-centre-ledger')!;
    expect(built.canRemove(bottom)).toBe(false);
    pickUp(top);
    expect(built.release(top, carton.children[0])).toBe(true);
    expect(top.parent).toBe(carton);
    expect(built.canRemove(bottom)).toBe(true);
    pickUp(bottom);
    expect(built.release(bottom, carton)).toBe(true);
    // Resting on the first, inside the carton.
    expect(bottom.position.y).toBeGreaterThan(top.position.y);
    expect(
      new Box3()
        .setFromObject(carton)
        .containsBox(new Box3().setFromObject(bottom)),
    ).toBe(true);
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
