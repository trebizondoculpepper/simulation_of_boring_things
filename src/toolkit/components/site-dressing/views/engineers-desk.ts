import {
  Box3,
  CanvasTexture,
  Euler,
  Group,
  Mesh,
  Quaternion,
  SRGBColorSpace,
  Vector3,
} from 'three';
import type { Material, MeshStandardMaterial, Object3D, Texture } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import deskUrl from '../../../../../resources/models/office/desk.glb?url';
import type { PortableObject } from '../../../controls/input/object-handling';
import { createDropProfile } from '../../../controls/logic/drop-profile';
import { createPortableBoard } from '../../../controls/logic/portable-board';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createPutBack } from '../logic/put-back';
import type { Pose } from '../logic/put-back';
import { SOFTWARE_TITLES } from '../logic/software-boxes';
import type { BoxSize, SoftwareTitle } from '../logic/software-boxes';
import { createOfficeChair } from './office-chair';
import {
  WALL_SHELF,
  WALL_SHELF_STANDOFF,
  createWallShelf,
} from './office-wall-shelf';
import { createLead, createPcCarton, createPeriodPc } from './period-pc';
import type { PeriodPcOptions } from './period-pc';
import {
  createBoxContents,
  createSoftwareBox,
  softwareBoxSize,
} from './software-box';

/** The desk's size as the room lays it out, metres: width, depth, height to its top. */
export const DESK = { w: 1.6, d: 0.8, h: 0.73 } as const;

/** The PC's carton beside the desk's open end, turned a quarter: its middle, width and depth, metres. */
const CARTON = { x: -1.12, z: -0.08, w: 0.62, d: 0.52 } as const;

/**
 * The wall shelf over the desk (`office-wall-shelf.ts`): its middle along
 * the desk, the height of its board's top (about standing head height),
 * and where Macrosoft Pool Simulator 97 stands face out on it, metres.
 */
export const SHELF = { x: 0.05, top: 1.65, star: 0.27 } as const;

/** The opened box, Beige Accounting's ledger, on top of the desk's pile. */
const LEDGER = 'beige-accounting-leisure-centre-ledger';

const quaternionOf = (x: number, y: number, z: number, order: string) =>
  new Quaternion().setFromEuler(new Euler(x, y, z, order as 'XYZ'));
const poseOf = (position: Vector3, q: Quaternion): Pose => ({
  position: [position.x, position.y, position.z],
  quaternion: [q.x, q.y, q.z, q.w],
});

/** Put `object` at `pose` in its parent's frame. */
function applyPose(object: Object3D, pose: Pose) {
  object.position.set(...pose.position);
  object.quaternion.set(...pose.quaternion);
  object.scale.set(1, 1, 1);
}

/** A box lying on its back, front up, its top to −z, its footprint's middle at (x, z) on y, turned `yaw`. */
function flat(size: BoxSize, x: number, y: number, z: number, yaw: number) {
  const q = quaternionOf(-Math.PI / 2, yaw, 0, 'YXZ');
  const offset = new Vector3(0, size.d / 2, size.h / 2).applyAxisAngle(
    new Vector3(0, 1, 0),
    yaw,
  );
  return poseOf(new Vector3(x, y, z).add(offset), q);
}

/**
 * A box stood like a book, its right-hand spine to +z, its left side at
 * `x`, its back `back` + a centimetre, on y; leaning `lean` radians to −x
 * about its bottom left edge, onto its neighbour.
 */
function spineOut(
  size: BoxSize,
  x: number,
  y: number,
  back: number,
  lean: number,
) {
  const q = quaternionOf(0, -Math.PI / 2, lean, 'ZYX');
  const offset = new Vector3(size.d / 2, 0, 0).applyAxisAngle(
    new Vector3(0, 0, 1),
    lean,
  );
  return poseOf(new Vector3(x, y, back + size.w / 2 + 0.01).add(offset), q);
}

/**
 * A box standing face out to +z, centred on `x`, on y, leaning back
 * `lean` radians about its bottom front edge until its top meets the
 * wall at `back`; turned a little, `yaw`.
 */
function faceOut(
  size: BoxSize,
  x: number,
  y: number,
  back: number,
  lean: number,
  yaw = 0,
) {
  const q = quaternionOf(-lean, yaw, 0, 'YXZ');
  const front =
    back + size.h * Math.sin(lean) + size.d * Math.cos(lean) + 0.002;
  const offset = new Vector3(0, 0, -size.d / 2).applyQuaternion(q);
  return poseOf(new Vector3(x, y, front).add(offset), q);
}

/** The carton's `slot`th box thrown in (0 at the bottom), lying on what is under it, in the carton's frame. */
function inBin(size: BoxSize, slot: number) {
  const x = ((slot % 3) - 1) * 0.07;
  const z = ((slot % 2) - 0.5) * 0.08;
  return flat(size, x, 0.07 + slot * 0.052, z, ((slot * 7) % 5) * 0.15 - 0.3);
}

/** Beech-effect laminate, the late 1990s' office finish, for the model's dark wood. */
const BEECH: [number, number, number] = [200, 172, 130];
/** Brushed aluminium, for its drawer handles. */
const ALUMINIUM: [number, number, number] = [176, 180, 182];

/**
 * The model's palette texture, recoloured once: its dark wood to beech and
 * its blue-grey handles to aluminium, so a period mahogany desk becomes the
 * beech-effect desk of a 1990s council office.
 */
function beechTexture(map: Texture): Texture | null {
  const image = map.image as CanvasImageSource & {
    width: number;
    height: number;
  };
  if (!image || !image.width) return null;
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.drawImage(image, 0, 0);
  const data = context.getImageData(0, 0, canvas.width, canvas.height);
  const p = data.data;
  for (let i = 0; i < p.length; i += 4) {
    const [r, g, b] = [p[i], p[i + 1], p[i + 2]];
    const light = (r + g + b) / 3;
    let to: [number, number, number] | null = null;
    // Brown: red above green above blue, and not bright.
    if (r > g && g >= b && r - b > 18 && light < 140) to = BEECH;
    // Slate blue-grey.
    else if (b > r + 15 && light < 150) to = ALUMINIUM;
    if (!to) continue;
    const shade = 0.82 + (light / 140) * 0.3;
    p[i] = Math.min(255, to[0] * shade);
    p[i + 1] = Math.min(255, to[1] * shade);
    p[i + 2] = Math.min(255, to[2] * shade);
  }
  context.putImageData(data, 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.flipY = map.flipY;
  return texture;
}

/** `object` stretched to `size` (width, height, depth), centred, standing on y = 0. */
function fitTo(object: Object3D, size: Vector3) {
  const holder = new Group();
  holder.add(object);
  holder.updateMatrixWorld(true);
  const box = new Box3().setFromObject(holder);
  const s = box.getSize(new Vector3());
  object.scale.multiply(new Vector3(size.x / s.x, size.y / s.y, size.z / s.z));
  holder.updateMatrixWorld(true);
  box.setFromObject(holder);
  const c = box.getCenter(new Vector3());
  object.position.sub(new Vector3(c.x, box.min.y, c.z));
  return holder;
}

export interface EngineersDeskOptions extends PeriodPcOptions {
  /** Which titles, by id, stand on it: by default all of them. */
  titles?: readonly string[];
}

/**
 * The engineer's desk (the owner, 2026-10-31), late 1990s: a pedestal desk
 * from a free model library (CreativeTrio's "Desk", CC0, `resources/models/
 * office/`), in beech-effect laminate, with its Gateway 3000 PC
 * (`period-pc.ts`), its boxed software (`software-box.ts`) on a wall
 * shelf over it (`office-wall-shelf.ts`) and on the desk, one box opened
 * with its manual and disks out, the PC's cow-spotted carton beside it,
 * and a chair. Set decoration, outside the plant model; only the PC has a
 * little life of its own, and the boxes can be picked up, turned over and
 * put back, or thrown in the carton. Its origin is the middle of its
 * footprint on the floor, its user's side facing +z, its back on the wall.
 */
export function createEngineersDesk(
  kit: PanelKit,
  options: EngineersDeskOptions = {},
) {
  const group = new Group();
  group.name = 'Engineer’s desk';
  const top = DESK.h;
  // The desk itself, once its model is in.
  const ready = new GLTFLoader()
    .loadAsync(deskUrl)
    .then((gltf) => {
      const scene = gltf.scene;
      scene.traverse((o) => {
        if (!(o instanceof Mesh)) return;
        const material = o.material as MeshStandardMaterial;
        const map = material.map ? beechTexture(material.map) : null;
        if (map) {
          material.map = map;
          kit.textures.push(map);
        }
        material.metalness = 0;
        material.roughness = 0.6;
        kit.materials.push(material as Material);
      });
      const desk = fitTo(scene, new Vector3(DESK.w, DESK.h, DESK.d));
      desk.name = 'Desk';
      group.add(desk);
    })
    .catch(() => {});

  const pc = createPeriodPc(kit, options);
  pc.monitor.position.set(-0.22, top, -0.02);
  pc.monitor.rotation.y = 0.08;
  pc.tower.position.set(-0.6, top, -0.13);
  pc.tower.rotation.y = 0.05;
  pc.keyboard.position.set(-0.2, top, 0.24);
  pc.keyboard.rotation.y = -0.04;
  pc.mouse.position.set(0.17, top, 0.24);
  pc.mouse.rotation.y = 0.1;
  group.add(pc.monitor, pc.tower, pc.keyboard, pc.mouse);
  // The leads behind: tower to monitor, keyboard and mouse.
  group.add(
    createLead(kit, [
      new Vector3(-0.6, top + 0.2, -0.36),
      new Vector3(-0.45, top + 0.01, -0.38),
      new Vector3(-0.25, top + 0.01, -0.36),
      new Vector3(-0.22, top + 0.12, -0.3),
    ]),
    createLead(kit, [
      new Vector3(-0.6, top + 0.15, -0.36),
      new Vector3(-0.42, top + 0.005, -0.3),
      new Vector3(-0.2, top + 0.005, 0.12),
      new Vector3(-0.2, top + 0.015, 0.145),
    ]),
    createLead(
      kit,
      [
        new Vector3(-0.58, top + 0.12, -0.36),
        new Vector3(0.02, top + 0.004, -0.2),
        new Vector3(0.18, top + 0.004, 0.1),
        new Vector3(0.19, top + 0.02, 0.18),
      ],
      0.0022,
    ),
  );

  // Over the desk, on the wall at about head height: a cantilever shelf
  // on twin-slot uprights, the boxed software on it like books (the
  // owner, 2026-10-31).
  const shelf = createWallShelf(kit);
  shelf.position.set(SHELF.x, SHELF.top, -DESK.d / 2);
  group.add(shelf);
  const shelfBack = -DESK.d / 2 + WALL_SHELF_STANDOFF;

  // The PC's carton beside the desk's open end, empty, kept in case it
  // ever goes back, and used as a bin. It stands on the floor between the
  // desk, the wall and the cupboard, so its flaps on those sides stand up,
  // leaning a little in, and only its flap to the room splays out.
  const carton = createPcCarton(
    kit,
    CARTON.w,
    0.5,
    CARTON.d,
    [-0.06, -0.05, -0.06, 0.42],
  );
  carton.position.set(CARTON.x, 0, CARTON.z);
  carton.rotation.y = Math.PI / 2 + 0.04;
  // Beside the desk, not on it: outside its footprint, a solid of its own.
  carton.userData.beside = true;
  group.add(carton);

  // The boxed software: three on the shelf, spines out, and a fourth
  // leaning on them; Macrosoft Pool Simulator 97 face out on the shelf's
  // right, leaning back on the wall, the first thing seen; and on the
  // desk's far end, a pile of two lying flat, the top one opened, and one
  // standing by the monitor. Each can be picked up, turned over and put
  // back, or thrown in the carton (`logic/put-back.ts`).
  const wanted = options.titles ?? SOFTWARE_TITLES.map((t) => t.id);
  const titles = SOFTWARE_TITLES.filter((t) => wanted.includes(t.id));
  const byId = (id: string) => titles.find((t) => t.id === id);
  const things = createPutBack<string>();
  const boxes = new Map<Object3D, string>();
  /** Set a title's box out on the desk at `pose`, resting on `restsOn`. */
  const setOut = (
    t: SoftwareTitle | undefined,
    pose: Pose,
    restsOn?: string,
  ) => {
    if (!t) return;
    const box = createSoftwareBox(kit, t);
    box.userData.softwareBox = t.id;
    const portable = createPortableBoard(
      createDropProfile('box', softwareBoxSize(t).h, 'board'),
    );
    portable.onEvent((event) => {
      if (event === 'pick-up') things.pickUp(t.id);
    });
    box.userData.portable = {
      component: portable,
      flat: 'face',
      detach: () => {},
    } satisfies PortableObject;
    applyPose(box, pose);
    group.add(box);
    boxes.set(box, t.id);
    things.home(t.id, pose, restsOn && byId(restsOn) ? restsOn : undefined);
  };
  // The shelf: books standing from its left end, the last leaning.
  let x = SHELF.x - WALL_SHELF.w / 2 + 0.04;
  let last: SoftwareTitle | undefined;
  for (const id of ['deep-end', 'lido-tycoon', 'bookit-pro-4-for-workgroups']) {
    const t = byId(id);
    if (!t) continue;
    const size = softwareBoxSize(t);
    setOut(t, spineOut(size, x, SHELF.top, shelfBack, 0));
    x += size.d + 0.003;
    last = t;
  }
  const leaning = byId('chlorine-quest-ii-the-shallow-end');
  if (leaning) {
    const size = softwareBoxSize(leaning);
    const lean = 0.2;
    // Its top edge on the last one's side, or on its top corner if shorter.
    const gap = last
      ? Math.min(
          size.h * Math.sin(lean),
          softwareBoxSize(last).h * Math.tan(lean),
        )
      : 0;
    setOut(
      leaning,
      spineOut(size, x + gap, SHELF.top, shelfBack, last ? lean : 0),
      last?.id,
    );
  }
  const star = byId('macrosoft-pool-simulator-97');
  if (star)
    setOut(
      star,
      faceOut(softwareBoxSize(star), SHELF.star, SHELF.top, shelfBack, 0.07),
    );
  // The desk: the pile, and one standing by the monitor.
  const pile = { x: 0.6, z: -0.25 };
  const coshh = byId('coshh-manager-95');
  let y: number = top;
  if (coshh) {
    setOut(coshh, flat(softwareBoxSize(coshh), pile.x, y, pile.z, 0.05));
    y += softwareBoxSize(coshh).d;
  }
  const opened = byId(LEDGER);
  if (opened)
    setOut(
      opened,
      flat(softwareBoxSize(opened), pile.x, y, pile.z - 0.01, -0.12),
      coshh?.id,
    );
  const standing = byId('doseright-gold-2-1');
  if (standing)
    setOut(
      standing,
      faceOut(softwareBoxSize(standing), 0.24, top, -DESK.d / 2, 0.08, -0.06),
    );
  // The opened one's manual and disks out in front.
  if (opened) {
    const contents = createBoxContents(kit, opened);
    contents.position.set(0.47, top, 0.2);
    contents.rotation.y = 0.15;
    group.add(contents);
  }

  /** Whether `target` is the carton, or part of it. */
  const inCarton = (target: Object3D) => {
    for (let o: Object3D | null = target; o; o = o.parent)
      if (o === carton) return true;
    return false;
  };
  const handling = {
    /** Null if `object` is not one of the desk's boxes, else whether it may be picked up now. */
    canPickUp(object: Object3D) {
      const id = boxes.get(object);
      return id === undefined ? null : things.canPickUp(id);
    },
    /**
     * Let go of a held box: aimed at the carton (`target`), into it, to
     * rest on what is in it; otherwise back where it was. Null if it is
     * not one of the desk's boxes; 'refuse' if it has nowhere to go back to.
     */
    release(object: Object3D, target?: Object3D): boolean | 'refuse' | null {
      const id = boxes.get(object);
      if (id === undefined || things.held() !== id) return null;
      const portable = object.userData.portable as PortableObject;
      const size = softwareBoxSize(byId(id)!);
      if (target && inCarton(target)) {
        const slot = things.bin(id)!;
        carton.add(object);
        applyPose(object, inBin(size, slot));
        portable.component.reset();
        return true;
      }
      const pose = things.putBack(id);
      if (!pose) return 'refuse';
      group.add(object);
      applyPose(object, pose);
      portable.component.reset();
      return true;
    },
    /** What is in the carton, bottom first, by title id. */
    binned: () => things.binned(),
  };

  // A chair, pushed back a little.
  const chair = createOfficeChair(1);
  chair.group.position.set(-0.15, 0, 0.75);
  chair.group.rotation.y = 0.25;
  chair.group.userData.beside = true;
  group.add(chair.group);

  return {
    group,
    /** The PC's uses: its power button, keyboard, mouse and screen. */
    uses: pc.uses,
    /** Resolves once the desk's model is in. */
    ready,
    /** Its boxes' picking up, putting back and binning. */
    handling,
    /** What stands on the floor beyond the desk's footprint, in the desk's frame: the carton, and the chair's base. */
    footprints: [
      {
        minX: CARTON.x - CARTON.d / 2 - 0.02,
        maxX: CARTON.x + CARTON.d / 2 + 0.02,
        minZ: CARTON.z - CARTON.w / 2 - 0.02,
        maxZ: CARTON.z + CARTON.w / 2 + 0.02,
      },
      { minX: -0.45, maxX: 0.15, minZ: 0.45, maxZ: 1.0 },
    ],
    update: (delta: number) => pc.update(delta),
  };
}
