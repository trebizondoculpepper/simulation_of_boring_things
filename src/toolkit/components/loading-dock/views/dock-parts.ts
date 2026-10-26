import {
  BoxGeometry,
  DoubleSide,
  Euler,
  ExtrudeGeometry,
  InstancedMesh,
  Matrix4,
  Quaternion,
  Shape,
  TorusGeometry,
  Vector3,
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
import { createBrandBadge } from '../../core/views/brand-badge';

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
 * insulated shutter, HAG Armourguard, Hörmann SB Decotherm), made by
 * Ironside: a curtain of double-skinned, foam-filled steel laths, each
 * 100 mm and curved, interlocking, finished in goosewing grey; it rolls
 * onto a barrel in a curved hood over the opening, its end plates on wall
 * brackets; U-section guides each side with brush seals; an extruded
 * aluminium bottom rail with its rubber seal and safety edge and two lift
 * handles; on the right end plate a geared three-phase motor, its
 * gearbox and terminal box, and an endless hand chain on its sprocket for
 * when the power is off, its loop tied off on a chain keep on the wall.
 * `setOpen` rolls the curtain from shut (0) to fully up (1). Origin at the
 * middle of the opening's head on the wall's inside face, facing +z; the
 * opening `w` wide and `h` tall below the head.
 */
export function createRollerShutter(
  kit: PanelKit,
  { w, h }: { w: number; h: number },
) {
  const group = new Group();
  group.name = 'Ironside insulated roller shutter';
  const goosewing = paint(kit, '#9aa3a8', 0.42, 0.35);
  const lathEdge = paint(kit, '#7d858a', 0.5, 0.35);
  const galv = paint(kit, '#b1b6b6', 0.4, 0.65);
  const hoodGrey = paint(kit, '#8a9196', 0.5, 0.4);
  const black = paint(kit, '#141516', 0.8);
  const ali = paint(kit, '#c9cdcf', 0.3, 0.8);
  const motorBlue = paint(kit, '#24466e', 0.45, 0.35);
  const chainSteel = paint(kit, '#5b5f62', 0.4, 0.8);

  // The lath: its profile across, a shallow curve, its two skins and the
  // hook and bead that interlock it with the next; extruded to the width.
  const LATH = 0.1;
  const profile = new Shape();
  const depth = 0.02;
  profile.moveTo(0, 0);
  profile.quadraticCurveTo(depth * 1.2, LATH / 2, 0, LATH);
  profile.lineTo(-0.004, LATH);
  profile.lineTo(-0.004, LATH - 0.008);
  profile.lineTo(-depth * 0.4, LATH - 0.01);
  profile.quadraticCurveTo(-depth * 0.2, LATH / 2, -depth * 0.4, 0.01);
  profile.lineTo(-0.004, 0.008);
  profile.lineTo(-0.004, 0);
  profile.lineTo(0, 0);
  const lathGeo = new ExtrudeGeometry(profile, {
    depth: w,
    bevelEnabled: false,
    curveSegments: 6,
  });
  // Extruded along z; turned so it runs along x, its face toward +z.
  lathGeo.rotateY(Math.PI / 2);
  lathGeo.translate(-w / 2, 0, 0);
  const maxLaths = Math.ceil(h / LATH) + 1;
  const laths = new InstancedMesh(lathGeo, [goosewing, lathEdge], maxLaths);
  laths.name = 'Shutter curtain laths';
  laths.userData.live = true;
  group.add(laths);
  const place = new Matrix4();

  // The hood over the barrel: a curved sheet from under its front, round
  // over its top to the wall (turned onto x, its arc lies in y-z).
  const hoodR = 0.33;
  const hood = new Mesh(
    new CylinderGeometry(
      hoodR,
      hoodR,
      w + 0.5,
      24,
      1,
      true,
      -Math.PI * 0.25,
      Math.PI * 0.75,
    ),
    hoodGrey,
  );
  hood.rotation.z = Math.PI / 2;
  hood.position.set(0, 0.62, 0.33);
  hood.material.side = DoubleSide;
  group.add(hood);
  box(group, hoodGrey, w + 0.5, 0.04, 0.66, 0, 0.95, 0.33);
  box(group, hoodGrey, w + 0.5, 0.62, 0.02, 0, 0.64, 0.01);
  for (const s of [-1, 1]) {
    box(group, galv, 0.012, 0.75, 0.7, s * (w / 2 + 0.26), 0.6, 0.35);
    // The wall bracket under each end plate, bolted.
    box(group, galv, 0.12, 0.012, 0.6, s * (w / 2 + 0.26), 0.22, 0.3);
    for (const dz of [0.08, 0.5])
      box(group, black, 0.02, 0.02, 0.02, s * (w / 2 + 0.24), 0.235, dz);
    // The barrel's bearing, a boss on the plate.
    const boss = new Mesh(new CylinderGeometry(0.06, 0.06, 0.04, 16), galv);
    boss.rotation.z = Math.PI / 2;
    boss.position.set(s * (w / 2 + 0.28), 0.6, 0.33);
    group.add(boss);
  }
  // The barrel's roll of curtain, seen under the hood's lip: its laths'
  // joints drawn round it, so it is seen to turn as it winds; the bare
  // barrel, 0.12 m, when the curtain is down, 0.27 m when wound up (the
  // owner, 2026-10-26).
  const joints = document.createElement('canvas');
  joints.width = 256;
  joints.height = 8;
  const jg = joints.getContext('2d')!;
  jg.fillStyle = '#9aa3a8';
  jg.fillRect(0, 0, 256, 8);
  jg.fillStyle = '#5f676c';
  for (let x = 0; x < 256; x += 16) jg.fillRect(x, 0, 3, 8);
  const jointMap = new CanvasTexture(joints);
  jointMap.colorSpace = SRGBColorSpace;
  kit.textures.push(jointMap);
  const rollPaint = new MeshStandardMaterial({
    map: jointMap,
    roughness: 0.45,
    metalness: 0.35,
  });
  kit.materials.push(rollPaint);
  const ROLL = 0.27;
  const BARREL = 0.12;
  const roll = new Mesh(new CylinderGeometry(ROLL, ROLL, w, 32), rollPaint);
  roll.rotation.z = Math.PI / 2;
  roll.rotation.order = 'ZYX';
  roll.position.set(0, 0.6, 0.33);
  roll.userData.live = true;
  group.add(roll);
  let turned = 0;
  // The curtain's run from the opening's head up to the roll, leaving it
  // on the wall side of the barrel: laths seen climbing onto it (the
  // owner, 2026-10-26: they vanished in the gap). A length of the same
  // laths' face, tilted as the roll swells and shrinks.
  const runCanvas = document.createElement('canvas');
  runCanvas.width = 8;
  runCanvas.height = 64;
  const rg = runCanvas.getContext('2d')!;
  rg.fillStyle = '#9aa3a8';
  rg.fillRect(0, 0, 8, 64);
  rg.fillStyle = '#6d757a';
  rg.fillRect(0, 60, 8, 4);
  const runMap = new CanvasTexture(runCanvas);
  runMap.colorSpace = SRGBColorSpace;
  runMap.wrapS = runMap.wrapT = RepeatWrapping;
  kit.textures.push(runMap);
  const runPaint = new MeshStandardMaterial({
    map: runMap,
    roughness: 0.45,
    metalness: 0.35,
  });
  kit.materials.push(runPaint);
  const run = new Mesh(new BoxGeometry(w, 1, 0.025), runPaint);
  run.name = 'Shutter curtain, winding onto the barrel';
  run.userData.live = true;
  group.add(run);

  // The guides: a U-channel each side, its brush seal, down to the sill.
  for (const s of [-1, 1]) {
    const gx = s * (w / 2 + 0.04);
    const len = h + 0.3;
    box(group, galv, 0.1, len, 0.012, gx + s * 0.02, -len / 2 + 0.3, 0.006);
    box(group, galv, 0.012, len, 0.11, gx - s * 0.035, -len / 2 + 0.3, 0.06);
    box(group, galv, 0.012, len, 0.11, gx + s * 0.065, -len / 2 + 0.3, 0.06);
    box(group, black, 0.02, len, 0.01, gx - s * 0.03, -len / 2 + 0.3, 0.115);
  }

  // The bottom rail: an aluminium T, its rubber seal and safety edge, two
  // lift handles on the inside face.
  const rail = new Group();
  rail.name = 'Shutter bottom rail';
  box(rail, ali, w, 0.07, 0.05, 0, 0.035, 0.0);
  box(rail, ali, w, 0.012, 0.09, 0, 0.006, 0.0);
  const seal = new Mesh(new CylinderGeometry(0.022, 0.022, w, 10), black);
  seal.rotation.z = Math.PI / 2;
  seal.position.set(0, -0.018, 0);
  rail.add(seal);
  for (const x of [-w / 3, w / 3]) {
    box(rail, black, 0.12, 0.025, 0.02, x, 0.05, 0.045);
    for (const dx of [-0.05, 0.05])
      box(rail, black, 0.02, 0.025, 0.03, x + dx, 0.05, 0.03);
  }
  rail.userData.live = true;
  group.add(rail);

  // The drive on the right end plate: gearbox, motor with its cooling
  // fins and fan cowl, terminal box with its gland.
  const dx = w / 2 + 0.3;
  box(group, motorBlue, 0.14, 0.22, 0.2, dx + 0.07, 0.6, 0.33);
  const motor = new Mesh(new CylinderGeometry(0.11, 0.11, 0.32, 20), motorBlue);
  motor.rotation.z = Math.PI / 2;
  motor.position.set(dx + 0.3, 0.6, 0.33);
  group.add(motor);
  for (let k = 0; k < 8; k++) {
    const fin = new Mesh(
      new CylinderGeometry(0.122, 0.122, 0.008, 20),
      motorBlue,
    );
    fin.rotation.z = Math.PI / 2;
    fin.position.set(dx + 0.18 + k * 0.03, 0.6, 0.33);
    group.add(fin);
  }
  const cowl = new Mesh(new CylinderGeometry(0.1, 0.115, 0.08, 20), black);
  cowl.rotation.z = Math.PI / 2;
  cowl.position.set(dx + 0.5, 0.6, 0.33);
  group.add(cowl);
  box(group, motorBlue, 0.1, 0.08, 0.1, dx + 0.3, 0.74, 0.33);
  const gland = new Mesh(new CylinderGeometry(0.012, 0.012, 0.03, 10), black);
  gland.position.set(dx + 0.3, 0.795, 0.33);
  group.add(gland);

  // The hand chain: its sprocket wheel under the gearbox, an endless loop
  // of links down to the chain keep on the wall, 1.1 m up.
  const sprocket = new Mesh(
    new CylinderGeometry(0.07, 0.07, 0.02, 16),
    chainSteel,
  );
  sprocket.rotation.z = Math.PI / 2;
  sprocket.position.set(dx + 0.07, 0.42, 0.33);
  group.add(sprocket);
  const link = new TorusGeometry(0.008, 0.002, 4, 8);
  const keepY = -h + 1.1;
  const runs = [0.26, 0.4];
  const linksPer = Math.floor((0.42 - keepY) / 0.014);
  const chainLinks = new InstancedMesh(
    link,
    chainSteel,
    runs.length * linksPer,
  );
  const q = new Quaternion();
  const e = new Euler();
  let n = 0;
  for (const z of runs)
    for (let k = 0; k < linksPer; k++) {
      e.set(0, k % 2 ? Math.PI / 2 : 0, 0);
      q.setFromEuler(e);
      chainLinks.setMatrixAt(
        n++,
        place.compose(
          new Vector3(dx + 0.07, 0.42 - k * 0.014, z),
          q,
          new Vector3(1, 1.6, 1),
        ),
      );
    }
  chainLinks.instanceMatrix.needsUpdate = true;
  group.add(chainLinks);
  box(group, galv, 0.04, 0.12, 0.05, dx + 0.07, keepY - 0.05, 0.025);

  // Its maker's badge on the hood.
  const badge = createBrandBadge(kit, 'ironside', {
    height: 0.05,
    plate: '#e3e1d6',
  });
  badge.position.set(-w / 2 + 0.35, 0.72, 0.665);
  group.add(badge);

  let open = 1;
  let last = 1;
  const setOpen = (k: number) => {
    open = Math.max(0, Math.min(1, k));
    // Hung below the hood: as many laths as reach down, from the head.
    const hang = h * (1 - open);
    // The bottom rail is the curtain's lowest piece, its seal on the sill
    // when shut, and never wound up: fully open, it hangs just under the
    // hood (the owner, 2026-10-26); the laths stand on it.
    const RAIL = 0.08;
    const count = Math.min(
      maxLaths,
      Math.max(0, Math.ceil((hang - RAIL) / LATH)),
    );
    for (let i = 0; i < count; i++)
      laths.setMatrixAt(
        i,
        place.makeTranslation(0, -hang + RAIL + i * LATH, 0.06),
      );
    laths.count = count;
    laths.instanceMatrix.needsUpdate = true;
    rail.position.set(0, -hang + 0.04, 0.06);
    // The roll swells as the curtain winds onto it, and turns: the
    // curtain's travel over its radius.
    const radius = BARREL + (ROLL - BARREL) * open;
    const swell = radius / ROLL;
    turned += ((open - last) * h) / radius;
    last = open;
    roll.scale.set(swell, 1, swell);
    roll.rotation.y = turned;
    // From the head (y 0, the curtain's plane) to where it meets the roll
    // on the wall side, at the barrel's height.
    const fromZ = 0.06;
    const toZ = 0.33 - radius;
    const rise = 0.6;
    const len = Math.hypot(rise, toZ - fromZ);
    run.scale.y = len;
    run.position.set(0, rise / 2, (fromZ + toZ) / 2);
    run.rotation.x = Math.atan2(toZ - fromZ, rise);
    // Its laths' joints slide up it as the curtain winds.
    runMap.repeat.set(1, len / LATH);
    runMap.offset.y = (open * h) / LATH;
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
