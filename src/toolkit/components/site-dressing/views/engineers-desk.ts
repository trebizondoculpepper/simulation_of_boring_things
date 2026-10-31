import {
  Box3,
  CanvasTexture,
  Group,
  Mesh,
  SRGBColorSpace,
  Vector3,
} from 'three';
import type { Material, MeshStandardMaterial, Object3D, Texture } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import deskUrl from '../../../../../resources/models/office/desk.glb?url';
import type { PanelKit } from '../../core/views/eighties-controls';
import { SOFTWARE_TITLES } from '../logic/software-boxes';
import type { SoftwareTitle } from '../logic/software-boxes';
import { createOfficeChair } from './office-chair';
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
 * (`period-pc.ts`), its stack of boxed software, one box opened with its
 * manual and disks out (`software-box.ts`), the PC's cow-spotted carton
 * beside it, and a chair. Set decoration, outside the plant model; only the
 * PC has a little life of its own. Its origin is the middle of its
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

  // The boxed software, at the desk's far end against the wall: a pile
  // lying flat, a row standing behind, leaning, and one opened.
  const wanted = options.titles ?? SOFTWARE_TITLES.map((t) => t.id);
  const titles = SOFTWARE_TITLES.filter((t) => wanted.includes(t.id));
  const byId = (id: string) => titles.find((t) => t.id === id);
  /** A box lying on its back on the pile at height `y`, its front up, its top to the wall; the pile's new height. */
  const flat = (
    t: SoftwareTitle | undefined,
    x: number,
    z: number,
    y: number,
    yaw: number,
  ) => {
    if (!t) return y;
    const { h, d } = softwareBoxSize(t);
    const box = createSoftwareBox(kit, t);
    // Rotated back a quarter turn about x, its height runs to −z and its
    // depth stands up, centred on y = 0: lifted and drawn forward to sit.
    box.rotation.x = -Math.PI / 2;
    box.position.set(0, d / 2, h / 2);
    const holder = new Group();
    holder.add(box);
    holder.position.set(x, y, z);
    holder.rotation.y = yaw;
    group.add(holder);
    return y + d;
  };
  let y: number = top;
  y = flat(byId('coshh-manager-95'), 0.6, -0.25, y, 0.05);
  y = flat(byId('bookit-pro-4-for-workgroups'), 0.6, -0.26, y, -0.06);
  y = flat(byId('macrosoft-pool-simulator-97'), 0.62, -0.27, y, 0.14);
  y = flat(
    byId('beige-accountings-leisure-centre-simulator'),
    0.6,
    -0.25,
    y,
    -0.12,
  );
  // Standing, fronts out, leaning back against the wall: two between the
  // monitor and the pile, two more stood up on the pile.
  const stand = (
    t: SoftwareTitle | undefined,
    x: number,
    y: number,
    lean: number,
    yaw: number,
  ) => {
    if (!t) return;
    const { d } = softwareBoxSize(t);
    const box = createSoftwareBox(kit, t);
    box.position.set(x, y, -DESK.d / 2 + d / 2 + 0.012);
    box.rotation.set(-lean, yaw, 0);
    group.add(box);
  };
  stand(byId('lido-tycoon'), 0.12, top, 0.05, -0.04);
  stand(byId('chlorine-quest-ii-the-shallow-end'), 0.31, top, 0.09, 0.03);
  stand(byId('deep-end'), 0.53, y, 0.06, 0.05);
  stand(byId('doseright-gold-2-1'), 0.69, y, 0.1, -0.08);
  // The opened one: Beige Accounting's, its manual and disks out in front.
  const opened = byId('beige-accountings-leisure-centre-simulator');
  if (opened) {
    const contents = createBoxContents(kit, opened);
    contents.position.set(0.47, top, 0.2);
    contents.rotation.y = 0.15;
    group.add(contents);
  }

  // Beside the desk's open end: the PC's carton, empty, kept in case it
  // ever goes back. It stands on the floor, so it is walked round.
  const carton = createPcCarton(kit);
  carton.position.set(CARTON.x, 0, CARTON.z);
  carton.rotation.y = Math.PI / 2 + 0.04;
  // Beside the desk, not on it: outside its footprint, a solid of its own.
  carton.userData.beside = true;
  group.add(carton);
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
