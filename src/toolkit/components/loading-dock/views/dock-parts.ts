import {
  BoxGeometry,
  CanvasTexture,
  CircleGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';
import type { Material, Object3D } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';

/**
 * The loading dock's components (prompt 073; the owner, 2026-10-26: each
 * modelled in its dev room, dev43, before the dock uses it), rough where
 * the dock only needs them blocked out, refined later. Metres; each
 * built with its origin and facing as its function says.
 */

const paint = (
  kit: PanelKit,
  color: string,
  roughness = 0.7,
  metalness = 0,
) => {
  const m = new MeshStandardMaterial({ color, roughness, metalness });
  kit.materials.push(m);
  return m;
};
const box = (
  parent: Object3D,
  m: Material,
  sx: number,
  sy: number,
  sz: number,
  x: number,
  y: number,
  z: number,
) => {
  const mesh = new Mesh(new BoxGeometry(sx, sy, sz), m);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};

/** Yellow and black hazard striping, repeated `repeat` times along. */
export function hazardMaterial(kit: PanelKit, repeat = 8) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 32;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#e0b81c';
  g.fillRect(0, 0, 256, 32);
  g.fillStyle = '#151515';
  for (let x = -32; x < 256; x += 32) {
    g.beginPath();
    g.moveTo(x, 32);
    g.lineTo(x + 16, 32);
    g.lineTo(x + 32, 0);
    g.lineTo(x + 16, 0);
    g.fill();
  }
  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  map.wrapS = map.wrapT = RepeatWrapping;
  map.repeat.set(repeat, 1);
  kit.textures.push(map);
  const m = new MeshStandardMaterial({ map, roughness: 0.7 });
  kit.materials.push(m);
  return m;
}

/**
 * An insulated roller shutter after the UK goods-yard type (Bolton Gate's
 * insulated shutter, HAG Armourguard, Hörmann SB Decotherm): double-skinned
 * 100 mm laths rolling onto a barrel in its box over the opening, guides
 * each side reaching down to `sill`, a bottom rail, a geared motor on the
 * right-hand end plate and a hand chain. `setOpen` rolls the curtain from
 * shut (0) to fully up (1). Origin at the middle of the opening's head on
 * the wall's inside face, facing +z; the opening `w` wide and `h` tall
 * above `sill` (0 for the head's floor... the sill's height below the head).
 */
export function createRollerShutter(
  kit: PanelKit,
  { w, h }: { w: number; h: number },
) {
  const group = new Group();
  group.name = 'Insulated roller shutter';
  const grey = paint(kit, '#8f969b', 0.55, 0.4);
  const galv = paint(kit, '#a9aeae', 0.45, 0.6);
  // The curtain's laths: a ribbed grey, drawn on a canvas.
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 64;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#9aa1a6';
  g.fillRect(0, 0, 32, 64);
  g.fillStyle = '#6f767b';
  g.fillRect(0, 60, 32, 4);
  g.fillStyle = '#b7bec2';
  g.fillRect(0, 0, 32, 3);
  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  map.wrapS = map.wrapT = RepeatWrapping;
  kit.textures.push(map);
  const lath = new MeshStandardMaterial({
    map,
    roughness: 0.5,
    metalness: 0.3,
  });
  kit.materials.push(lath);
  const motorBlue = paint(kit, '#2c4f7c', 0.5, 0.3);
  const chain = paint(kit, '#4a4d50', 0.5, 0.7);
  // Barrel box and end plates, over the head.
  box(group, grey, w + 0.5, 0.65, 0.65, 0, 0.6, 0.33);
  for (const s of [-1, 1]) {
    box(group, galv, 0.04, 0.75, 0.75, s * (w / 2 + 0.27), 0.6, 0.33);
    // Guides, from the head down to the sill.
    box(
      group,
      galv,
      0.1,
      h + 0.25,
      0.14,
      s * (w / 2 + 0.07),
      -h / 2 + 0.125,
      0.07,
    );
  }
  const motor = new Mesh(new CylinderGeometry(0.13, 0.13, 0.35, 16), motorBlue);
  motor.rotation.z = Math.PI / 2;
  motor.position.set(w / 2 + 0.47, 0.6, 0.33);
  group.add(motor);
  for (const dz of [0.42, 0.5])
    box(
      group,
      chain,
      0.02,
      h - 1.2,
      0.02,
      w / 2 + 0.47,
      -(h - 1.2) / 2 + 0.28,
      dz,
    );
  // The curtain: hangs from the box down to its bottom rail.
  const curtain = new Mesh(new BoxGeometry(w, 1, 0.06), lath);
  curtain.userData.live = true;
  group.add(curtain);
  const rail = box(group, galv, w, 0.1, 0.09, 0, 0, 0.1);
  rail.userData.live = true;
  let open = 1;
  const setOpen = (k: number) => {
    open = Math.max(0, Math.min(1, k));
    const hang = Math.max(0.02, h * (1 - open));
    curtain.scale.y = hang;
    curtain.position.set(0, -hang / 2 + 0.25, 0.1);
    map.repeat.set(1, hang / 0.1);
    rail.position.y = -hang + 0.25 - 0.05;
  };
  setOpen(1);
  return {
    group,
    setOpen,
    get open() {
      return open;
    },
  };
}

/**
 * A dock traffic light: red over green in a black housing, after the
 * loading-bay type; `set` lights one. Origin at its back's middle on the
 * wall, facing +z.
 */
export function createDockLight(kit: PanelKit) {
  const group = new Group();
  group.name = 'Dock traffic light';
  box(group, paint(kit, '#151617', 0.8), 0.18, 0.4, 0.1, 0, 0, 0.05);
  const lenses = (['#ff2a1e', '#2ee05a'] as const).map((on, i) => {
    const m = new MeshBasicMaterial({ color: on });
    kit.materials.push(m);
    const lens = new Mesh(new CircleGeometry(0.055, 20), m);
    lens.position.set(0, i === 0 ? 0.09 : -0.09, 0.101);
    lens.userData.live = true;
    group.add(lens);
    return { m, on, off: i === 0 ? '#3d0f0c' : '#0f3016' };
  });
  const set = (signal: 'red' | 'green' | 'off') =>
    lenses.forEach((l, i) =>
      l.m.color.set(
        (signal === 'red' && i === 0) || (signal === 'green' && i === 1)
          ? l.on
          : l.off,
      ),
    );
  set('red');
  return { group, set };
}

/** A wheel chock: a yellow rubber wedge. Origin on the ground at its middle. */
export function createWheelChock(kit: PanelKit) {
  const group = new Group();
  group.name = 'Wheel chock';
  const m = paint(kit, '#d8b41c', 0.85);
  // A wedge: a box cut by its slope, as two boxes for roughness.
  const base = box(group, m, 0.2, 0.06, 0.3, 0, 0.03, 0);
  void base;
  const slope = box(group, m, 0.2, 0.04, 0.34, 0, 0.1, 0.02);
  slope.rotation.x = -0.55;
  box(group, m, 0.2, 0.18, 0.06, 0, 0.09, -0.12);
  return group;
}

/** A removable edge post, hazard-striped, on its socket. Origin on the floor. */
export function createEdgePost(kit: PanelKit, hazard = hazardMaterial(kit, 1)) {
  const group = new Group();
  group.name = 'Removable edge post';
  const post = new Mesh(new CylinderGeometry(0.03, 0.03, 1.15, 8), hazard);
  post.position.y = 0.575;
  group.add(post);
  box(group, paint(kit, '#151617', 0.8), 0.14, 0.03, 0.14, 0, 0.015, 0);
  return group;
}

/** A length of yellow chain from (x1, z1) to (x2, z2) at height `y`. */
export function createChainRun(
  kit: PanelKit,
  a: { x: number; z: number },
  b: { x: number; z: number },
  y: number,
  material: Material = paint(kit, '#e3b51f', 0.5, 0.4),
) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz);
  const link = new Mesh(new CylinderGeometry(0.008, 0.008, len, 4), material);
  link.position.set((a.x + b.x) / 2, y - 0.04, (a.z + b.z) / 2);
  link.rotation.z = Math.PI / 2;
  link.rotation.y = -Math.atan2(dz, dx);
  link.rotation.order = 'YZX';
  return link;
}

/** A wheel guide: a striped kerb `length` long along z. Origin on the ground. */
export function createWheelGuide(
  kit: PanelKit,
  length: number,
  hazard = hazardMaterial(kit, length / 0.6),
) {
  const g = new Group();
  g.name = 'Wheel guide';
  box(g, hazard, 0.2, 0.15, length, 0, 0.075, 0);
  return g;
}

/** A laminated rubber dock buffer. Origin at its back's middle, facing +z. */
export function createDockBuffer(kit: PanelKit) {
  const g = new Group();
  g.name = 'Dock buffer';
  const rubber = paint(kit, '#161718', 0.9);
  box(g, paint(kit, '#5a5e60', 0.5, 0.6), 0.34, 0.5, 0.012, 0, 0, 0.006);
  for (let k = 0; k < 5; k++)
    box(g, rubber, 0.3, 0.08, 0.12, 0, -0.2 + k * 0.1, 0.072);
  return g;
}

/**
 * A wooden pallet: the UK standard four-way pallet, 1200 × 1000 mm and
 * 144 mm high (BS ISO 6780): seven top boards, three stringer boards on
 * nine blocks, three bottom boards; in pale sawn softwood, a little weathered.
 * Origin on the floor at its middle; its 1200 mm along x.
 */
export const PALLET = { w: 1.2, d: 1.0, h: 0.144 };
export function createPallet(kit: PanelKit, wood?: Material) {
  const g = new Group();
  g.name = 'Wooden pallet';
  const m = wood ?? paint(kit, '#b48d5c', 0.95);
  const dark = paint(kit, '#9a7447', 0.95);
  const board = 0.022;
  const block = 0.078;
  // Bottom boards, across the blocks' rows, along x.
  for (const z of [-0.45, 0, 0.45])
    box(g, dark, PALLET.w, board, 0.1, 0, board / 2, z);
  // Nine blocks.
  for (const x of [-0.55, 0, 0.55])
    for (const z of [-0.45, 0, 0.45])
      box(
        g,
        m,
        x === 0 ? 0.145 : 0.1,
        block,
        z === 0 ? 0.145 : 0.1,
        x,
        board + block / 2,
        z,
      );
  // Stringer boards, along z, over each column of blocks.
  for (const x of [-0.55, 0, 0.55])
    box(g, dark, 0.1, board, PALLET.d, x, board + block + board / 2, 0);
  // Seven top boards, along x, gaps between.
  const tops = [-0.45, -0.3, -0.15, 0, 0.15, 0.3, 0.45];
  tops.forEach((z, i) =>
    box(
      g,
      m,
      PALLET.w,
      board,
      i === 0 || i === 6 || i === 3 ? 0.145 : 0.1,
      0,
      PALLET.h - board / 2,
      z,
    ),
  );
  return g;
}

/**
 * A pallet of goods: shrink-wrapped cartons `h` high on a pallet, the
 * film's sheen, a label on the long face (+z) saying what it is.
 * Origin on the floor at its middle.
 */
export function createPalletOfGoods(
  kit: PanelKit,
  { colour, h, label }: { colour: string; h: number; label: string },
) {
  const g = new Group();
  g.name = `Pallet of goods: ${label}`;
  g.add(createPallet(kit));
  // The cartons, a slightly lighter band at each layer.
  const layers = Math.max(1, Math.round(h / 0.3));
  const carton = paint(kit, colour, 0.6);
  for (let k = 0; k < layers; k++)
    box(
      g,
      carton,
      PALLET.w - 0.06,
      h / layers - 0.01,
      PALLET.d - 0.06,
      0,
      PALLET.h + (k + 0.5) * (h / layers),
      0,
    );
  // The film round them.
  const film = new MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.15,
    metalness: 0,
    transparent: true,
    opacity: 0.18,
  });
  kit.materials.push(film);
  box(
    g,
    film,
    PALLET.w - 0.02,
    h + 0.02,
    PALLET.d - 0.02,
    0,
    PALLET.h + h / 2,
    0,
  );
  // Its label.
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 256, 96);
  c.fillStyle = '#111111';
  c.font = 'bold 22px sans-serif';
  c.textAlign = 'center';
  const words = label.split(' · ');
  words.forEach((w, k) =>
    c.fillText(w, 128, 40 + k * 28 - (words.length - 1) * 14),
  );
  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  kit.textures.push(map);
  const lm = new MeshStandardMaterial({ map, roughness: 0.8 });
  kit.materials.push(lm);
  box(g, lm, 0.5, 0.19, 0.004, 0, PALLET.h + h * 0.6, PALLET.d / 2 - 0.005);
  return g;
}
