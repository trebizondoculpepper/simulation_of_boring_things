import { pcbMaterials } from './pcb-textures';
import { createElectrolyticCapacitorView } from './electrolytic-capacitor';
import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
} from 'three';
import { createCanvasTexture } from '../../core/views/screens';
import type { BufferGeometry, Material, Object3D } from 'three';
import { createBrandBadge } from '../../core/views/brand-badge';
import {
  createMicroLabel,
  kitGlow,
  kitPaint,
} from '../../core/views/eighties-controls';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createNameplate } from './industrial-controls';

/**
 * The working parts of a 1990s motor control unit, for their pedestals:
 * a unit (bucket) with its door, operating handle and moulded-case
 * breaker; a contactor; a thermal overload relay; a fuse holder; a drive's
 * power board with its electrolytic capacitors; and an induction motor.
 * Real size in metres. Views only: each shows a component's state.
 */

const add = (
  parent: Object3D,
  geometry: BufferGeometry,
  material: Material | Material[],
  x = 0,
  y = 0,
  z = 0,
) => {
  const mesh = new Mesh(geometry, material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
const box = (
  parent: Object3D,
  w: number,
  h: number,
  d: number,
  material: Material,
  x = 0,
  y = 0,
  z = 0,
) => add(parent, new BoxGeometry(w, h, d), material, x, y, z);
/** A cylinder lying along x, y or z. */
const rod = (
  parent: Object3D,
  radius: number,
  length: number,
  material: Material,
  axis: 'x' | 'y' | 'z',
  x = 0,
  y = 0,
  z = 0,
  segments = 16,
) => {
  const mesh = add(
    parent,
    new CylinderGeometry(radius, radius, length, segments),
    material,
    x,
    y,
    z,
  );
  if (axis === 'x') mesh.rotation.z = Math.PI / 2;
  if (axis === 'z') mesh.rotation.x = Math.PI / 2;
  return mesh;
};
const ease = (from: number, to: number, delta: number, rate = 12) =>
  from + (to - from) * Math.min(1, delta * rate);

export interface MotorUnitView {
  group: Group;
  /** The door, which takes a click to open or shut. */
  door: Object3D;
  /** The operating handle, which takes a click. */
  handle: Object3D;
  setDoor(open: boolean): void;
  setHandle(position: 'off' | 'on' | 'tripped'): void;
  update(delta: number): void;
}

/**
 * A motor control unit, the drawer of a motor control centre: a grey
 * steel box with its door hinged on the left, a nameplate, and the
 * flange-mounted operating handle on the door's right, up for ON, down for
 * OFF, midway when tripped. Behind the door, a black moulded-case breaker
 * whose toggle follows the handle. Its front is at z = 0, centred.
 */
export function createMotorUnit(
  kit: PanelKit,
  name = 'UNIT 1A\nCONVEYOR M1',
): MotorUnitView {
  const group = new Group();
  const w = 0.508;
  const h = 0.3302;
  const d = 0.508;
  const grey = kitPaint(kit, '#a5aaa6', 0.15);
  const inside = kitPaint(kit, '#bfc1b9');
  // The box, open at the front.
  box(group, w, h, 0.01, grey, 0, 0, -d);
  box(group, 0.01, h, d, grey, -w / 2, 0, -d / 2);
  box(group, 0.01, h, d, grey, w / 2, 0, -d / 2);
  box(group, w, 0.01, d, grey, 0, h / 2, -d / 2);
  box(group, w, 0.01, d, grey, 0, -h / 2, -d / 2);
  box(group, w - 0.02, h - 0.02, 0.004, inside, 0, 0, -d + 0.008);
  // The breaker on its back plate, with its toggle.
  const breaker = new Group();
  breaker.position.set(0.1, 0, -d + 0.01);
  group.add(breaker);
  const bakelite = kitPaint(kit, '#1c1c1d');
  box(breaker, 0.1, 0.16, 0.08, bakelite, 0, 0, 0.04);
  box(breaker, 0.07, 0.05, 0.02, kitPaint(kit, '#2a2a2c'), 0, 0, 0.09);
  const toggle = box(
    breaker,
    0.018,
    0.04,
    0.014,
    kitPaint(kit, '#3a3a3d'),
    0,
    0,
    0.1,
  );
  toggle.geometry.translate(0, 0.016, 0);
  const rating = createMicroLabel(kit, '15 A\n480 V', {
    height: 0.006,
    ink: '#e9e5da',
  });
  rating.position.set(0, -0.05, 0.0805);
  breaker.add(rating);
  // Terminals and three load leads down to a terminal strip.
  for (const sx of [-0.03, 0, 0.03]) {
    rod(
      breaker,
      0.004,
      0.12,
      kitPaint(kit, '#202020'),
      'y',
      sx,
      -0.14,
      0.03,
      6,
    );
    box(
      breaker,
      0.012,
      0.012,
      0.012,
      kitPaint(kit, '#c9a34c', 0.6),
      sx,
      0.08,
      0.04,
    );
  }
  box(
    group,
    0.3,
    0.025,
    0.03,
    kitPaint(kit, '#2e2f31'),
    -0.06,
    -0.15,
    -d + 0.03,
  );
  // The door, hinged at its left edge.
  const hinge = new Group();
  hinge.position.set(-w / 2, 0, 0.004);
  group.add(hinge);
  const door = box(hinge, w, h, 0.012, grey, w / 2, 0, 0);
  door.name = 'Unit door';
  const plate = createNameplate(kit, name, { width: 0.12, height: 0.04 });
  plate.position.set(w / 2 - 0.14, h / 2 - 0.05, 0.006);
  hinge.add(plate);
  // The line-up's maker, on the door's top corner by the hinge.
  const maker = createBrandBadge(kit, 'hartwell-bligh', { height: 0.016 });
  maker.position.set(0.11, h / 2 - 0.05, 0.0062);
  hinge.add(maker);
  // The quarter-turn latches.
  for (const y of [h / 2 - 0.04, -h / 2 + 0.04])
    rod(
      hinge,
      0.008,
      0.008,
      kitPaint(kit, '#3b3d3e', 0.4),
      'z',
      w - 0.025,
      y,
      0.01,
    );
  // The operating handle: a mounting plate and a lever on a hub.
  const handleBase = new Group();
  handleBase.position.set(w - 0.09, 0, 0.006);
  hinge.add(handleBase);
  box(handleBase, 0.08, 0.17, 0.008, kitPaint(kit, '#26272a'), 0, 0, 0.004);
  const on = createMicroLabel(kit, 'ON', { height: 0.007, ink: '#f1eee4' });
  on.position.set(0, 0.07, 0.0085);
  handleBase.add(on);
  const off = createMicroLabel(kit, 'OFF', { height: 0.007, ink: '#f1eee4' });
  off.position.set(0, -0.07, 0.0085);
  handleBase.add(off);
  const tripMark = createMicroLabel(kit, 'TRIPPED', {
    height: 0.0045,
    ink: '#e6b13a',
  });
  tripMark.position.set(-0.022, 0, 0.0085);
  tripMark.rotation.z = Math.PI / 2;
  handleBase.add(tripMark);
  const hub = new Group();
  hub.position.z = 0.012;
  handleBase.add(hub);
  rod(hub, 0.016, 0.012, kitPaint(kit, '#1a1a1b'), 'z');
  const lever = box(
    hub,
    0.024,
    0.09,
    0.014,
    kitPaint(kit, '#b3231a'),
    0,
    0.04,
    0.012,
  );
  lever.name = 'Operating handle';
  // The padlock hasp under the hub.
  box(
    handleBase,
    0.012,
    0.016,
    0.01,
    kitPaint(kit, '#8f9293', 0.6),
    0,
    -0.035,
    0.012,
  );
  const angles = { on: 0, tripped: Math.PI / 2, off: Math.PI };
  const toggleAngles = { on: -0.5, tripped: 0, off: 0.5 };
  let doorTarget = 0;
  let handleTarget: 'off' | 'on' | 'tripped' = 'off';
  hub.rotation.z = angles.off;
  toggle.rotation.x = toggleAngles.off;
  return {
    group,
    door,
    handle: lever,
    setDoor(open) {
      doorTarget = open ? -1.9 : 0;
    },
    setHandle(position) {
      handleTarget = position;
    },
    update(delta) {
      hinge.rotation.y = ease(hinge.rotation.y, doorTarget, delta, 5);
      hub.rotation.z = ease(hub.rotation.z, angles[handleTarget], delta, 18);
      toggle.rotation.x = ease(
        toggle.rotation.x,
        toggleAngles[handleTarget],
        delta,
        18,
      );
    },
  };
}

export interface ContactorView {
  group: Group;
  /** The armature tab, which a hand can push in to test. */
  body: Object3D;
  set(closed: boolean): void;
  update(delta: number): void;
}

/**
 * A three-pole contactor: a grey moulded body with line terminals along
 * the top and load terminals along the bottom, the coil's rating on the
 * front, an auxiliary contact block clipped to its side, and the white
 * armature tab in its window that drops when it pulls in.
 */
export function createContactorView(kit: PanelKit): ContactorView {
  const group = new Group();
  const body = box(
    group,
    0.045,
    0.077,
    0.065,
    kitPaint(kit, '#5f6366'),
    0,
    0,
    0.0325,
  );
  body.name = 'Contactor body';
  box(group, 0.045, 0.03, 0.02, kitPaint(kit, '#4a4d50'), 0, 0, 0.073);
  box(group, 0.016, 0.07, 0.06, kitPaint(kit, '#6c7073'), 0.013, -0.004, 0.03);
  const brass = kitPaint(kit, '#c9a34c', 0.6);
  for (const x of [-0.014, 0, 0.014])
    for (const y of [0.036, -0.036]) {
      box(group, 0.01, 0.006, 0.012, brass, x, y, 0.07);
      rod(
        group,
        0.0028,
        0.004,
        kitPaint(kit, '#b8bbbd', 0.7),
        'z',
        x,
        y,
        0.078,
        8,
      );
    }
  const label = createMicroLabel(kit, 'COIL 120V 60Hz', {
    height: 0.0015,
    maxWidth: 0.032,
    ink: '#e9e5da',
  });
  label.position.set(0, 0.02, 0.0831);
  group.add(label);
  const maker = createBrandBadge(kit, 'hartwell-bligh', {
    form: 'wordmark',
    height: 0.003,
    ink: '#d6d3ca',
  });
  maker.position.set(0, -0.009, 0.0831);
  group.add(maker);
  const window = box(
    group,
    0.016,
    0.012,
    0.002,
    kitPaint(kit, '#141415'),
    0,
    0,
    0.084,
  );
  window.name = 'Armature window';
  const tab = box(
    group,
    0.012,
    0.005,
    0.003,
    kitPaint(kit, '#efece2'),
    0,
    0.003,
    0.0845,
  );
  // The armature tab moves: not merged with the still parts (`mergeTree`).
  tab.userData.live = true;
  let target = 0.003;
  return {
    group,
    body,
    set(closed) {
      target = closed ? -0.003 : 0.003;
    },
    update(delta) {
      tab.position.y = ease(tab.position.y, target, delta, 40);
    },
  };
}

export interface OverloadRelayView {
  group: Group;
  dial: Object3D;
  reset: Object3D;
  test: Object3D;
  /** The dial's share of its travel, and whether it has tripped. */
  set(dial: number, tripped: boolean): void;
  pressReset(): void;
  pressTest(): void;
  update(delta: number): void;
}

/**
 * A thermal overload relay: a grey block with three load terminals, a
 * full-load-current dial with a slotted pointer, a blue RESET button, a
 * small red TEST button and a trip flag window that shows orange once it
 * has tripped. `scale` is printed round the dial.
 */
export function createOverloadRelayView(
  kit: PanelKit,
  scale = '1   2   3   4   5 A',
): OverloadRelayView {
  const group = new Group();
  box(group, 0.045, 0.066, 0.062, kitPaint(kit, '#6a6e71'), 0, 0, 0.035);
  const brass = kitPaint(kit, '#c9a34c', 0.6);
  for (const x of [-0.014, 0, 0.014])
    box(group, 0.01, 0.006, 0.012, brass, x, -0.022, 0.066);
  const legend = createMicroLabel(kit, scale, {
    height: 0.0018,
    ink: '#f0ede3',
  });
  legend.position.set(-0.008, 0.019, 0.0705);
  group.add(legend);
  const dial = new Group();
  dial.position.set(-0.008, 0.006, 0.07);
  group.add(dial);
  rod(dial, 0.007, 0.004, kitPaint(kit, '#e4e1d6'), 'z', 0, 0, 0.002);
  box(dial, 0.0014, 0.011, 0.002, kitPaint(kit, '#202021'), 0, 0, 0.0045);
  dial.name = 'Overload dial';
  const reset = rod(
    group,
    0.0055,
    0.008,
    kitPaint(kit, '#1f53a8'),
    'z',
    0.013,
    0.008,
    0.074,
  );
  reset.name = 'Overload RESET';
  const test = rod(
    group,
    0.003,
    0.005,
    kitPaint(kit, '#c8261c'),
    'z',
    0.013,
    -0.008,
    0.0725,
  );
  test.name = 'Overload TEST';
  const flag = kitGlow(kit, '#2e5a33');
  box(group, 0.01, 0.005, 0.002, flag, -0.008, -0.01, 0.071);
  const resetRest = reset.position.z;
  const testRest = test.position.z;
  let resetHeld = 0;
  let testHeld = 0;
  let dialTarget = 0;
  return {
    group,
    dial,
    reset,
    test,
    set(share, tripped) {
      dialTarget = (Math.PI * 2) / 3 - share * ((Math.PI * 4) / 3);
      (flag as unknown as { color: Color }).color.set(
        tripped ? '#ff7a1a' : '#2e5a33',
      );
    },
    pressReset() {
      resetHeld = 0.18;
    },
    pressTest() {
      testHeld = 0.18;
    },
    update(delta) {
      resetHeld = Math.max(0, resetHeld - delta);
      testHeld = Math.max(0, testHeld - delta);
      reset.position.z = ease(
        reset.position.z,
        resetRest - (resetHeld > 0 ? 0.003 : 0),
        delta,
        30,
      );
      test.position.z = ease(
        test.position.z,
        testRest - (testHeld > 0 ? 0.002 : 0),
        delta,
        30,
      );
      dial.rotation.z = ease(dial.rotation.z, dialTarget, delta, 20);
    },
  };
}

export interface FuseHolderView {
  group: Group;
  /** The cartridge, which a hand pulls to replace. */
  cartridge: Object3D;
  removable: Group;
  detachCartridge(): void;
  restoreCartridge(): void;
  set(blown: boolean): void;
  update(delta: number): void;
}

/**
 * A fuse holder: a black base with brass clips holding a cartridge fuse,
 * its rating on its tan barrel and a small window at one end that turns
 * from silver to black when the element blows.
 */
export function createFuseHolderView(
  kit: PanelKit,
  rating = '2 A',
): FuseHolderView {
  const group = new Group();
  box(group, 0.06, 0.03, 0.02, kitPaint(kit, '#1d1d1e'), 0, 0, 0.01);
  const brass = kitPaint(kit, '#c9a34c', 0.65);
  for (const x of [-0.0158, 0.0158])
    box(group, 0.012, 0.022, 0.018, brass, x, 0, 0.028);
  const cartridge = new Group();
  cartridge.position.z = 0.03;
  group.add(cartridge);
  // It is pulled out: not to be merged with the still parts.
  cartridge.userData.live = true;
  const barrel = rod(cartridge, 0.00515, 0.0251, kitPaint(kit, '#c9b48a'), 'x');
  barrel.name = 'Fuse cartridge';
  for (const x of [-0.0158, 0.0158])
    rod(cartridge, 0.00515, 0.0065, kitPaint(kit, '#d8d9da', 0.7), 'x', x);
  const label = createMicroLabel(kit, rating, {
    height: 0.0035,
    ink: '#2a2418',
  });
  label.position.set(-0.004, 0, 0.0056);
  cartridge.add(label);
  const window = kitGlow(kit, '#c9cdd0');
  box(cartridge, 0.006, 0.003, 0.002, window, 0.015, 0, 0.0055);
  let pulled = 0;
  let installed = true;
  return {
    group,
    cartridge: barrel,
    removable: cartridge,
    detachCartridge() {
      installed = false;
    },
    restoreCartridge() {
      installed = true;
      pulled = 0;
    },
    set(blown) {
      (window as unknown as { color: Color }).color.set(
        blown ? '#0a0a0a' : '#c9cdd0',
      );
      if (!blown) pulled = 0.4;
    },
    update(delta) {
      if (!installed) return;
      pulled = Math.max(0, pulled - delta);
      cartridge.position.z = ease(
        cartridge.position.z,
        0.03 + (pulled > 0 ? 0.03 : 0),
        delta,
        10,
      );
    },
  };
}

export interface CapacitorBoardView {
  group: Group;
  /** The capacitors' cans, which a hand replaces. */
  cans: Object3D[];
  set(
    index: number,
    health: 'good' | 'bulging' | 'vented',
    smoke: number,
    age?: number,
    embers?: number,
  ): void;
  update(seconds: number, delta: number, reducedMotion: boolean): void;
  /** Clean the soot off the board. */
  clean(): void;
  dispose(): void;
}

/**
 * Soot blown over a board (`width` by `depth`, metres, its top face) round
 * a capacitor that has vented: a canvas over the whole board of dark blots
 * and streaks, thickest at the can's foot, flung out further one way than
 * another, different every time, and never off the board's edge.
 * `blacken(x, z)` adds another blow's worth round (x, z) on the board; it
 * stays (the board is damaged) until `clean()`.
 */
function createSoot(kit: PanelKit, width: number, depth: number) {
  /** Canvas pixels to a metre. */
  const scale = 1200;
  const w = Math.round(width * scale);
  const h = Math.round(depth * scale);
  const { context, texture } = createCanvasTexture(w, h);
  kit.textures.push(texture);
  context.clearRect(0, 0, w, h);
  texture.needsUpdate = true;
  const material = new MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
  kit.materials.push(material);
  const decal = new Mesh(new PlaneGeometry(width, depth), material);
  decal.rotation.x = -Math.PI / 2;
  decal.name = 'Capacitor soot';
  // It appears and is cleaned away: never merged.
  decal.userData.live = true;
  decal.visible = false;
  const blot = (x: number, y: number, r: number, alpha: number) => {
    const g = context.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(18, 13, 9, ${alpha})`);
    g.addColorStop(0.6, `rgba(28, 20, 14, ${alpha * 0.55})`);
    g.addColorStop(1, 'rgba(30, 22, 16, 0)');
    context.fillStyle = g;
    context.fillRect(x - r, y - r, 2 * r, 2 * r);
  };
  return {
    decal,
    blacken(x: number, z: number, random: () => number = Math.random) {
      // The can's foot on the canvas: x across, z down it.
      const cx = (x / width + 0.5) * w;
      const cy = (z / depth + 0.5) * h;
      // Thick round the can's foot, then flung out, more one way.
      const lean = random() * Math.PI * 2;
      blot(cx, cy, 44 + 10 * random(), 0.97);
      for (let i = 0; i < 44; i++) {
        const a = lean + (random() - 0.5) * (i % 3 === 0 ? 6.3 : 2.2);
        const out = 16 + random() * 44;
        blot(
          cx + Math.cos(a) * out,
          cy + Math.sin(a) * out,
          4 + random() * 14,
          0.5 + 0.45 * random(),
        );
      }
      // Streaks where the blast ran across the board.
      context.lineCap = 'round';
      for (let i = 0; i < 14; i++) {
        const a = lean + (random() - 0.5) * 2.8;
        const from = 16 + random() * 8;
        const to = 40 + random() * 22;
        context.strokeStyle = `rgba(20, 15, 11, ${0.4 + 0.4 * random()})`;
        context.lineWidth = 1.5 + random() * 4;
        context.beginPath();
        context.moveTo(cx + Math.cos(a) * from, cy + Math.sin(a) * from);
        context.lineTo(cx + Math.cos(a) * to, cy + Math.sin(a) * to);
        context.stroke();
      }
      texture.needsUpdate = true;
      decal.visible = true;
    },
    clean() {
      context.clearRect(0, 0, w, h);
      texture.needsUpdate = true;
      decal.visible = false;
    },
  };
}

/**
 * A drive's power board: green fibreglass with its copper, two big
 * electrolytic capacitors in blue sleeves with scored aluminium tops,
 * and smaller parts round them. A stressed capacitor's top domes; a
 * vented one bursts its score with a pop, a spray of sparks and a cloud
 * of soot blown over the board round it, and stands blackened, smoking.
 * A new can is fitted clean, but the soot stays on the board.
 */
export function createCapacitorBoardView(kit: PanelKit): CapacitorBoardView {
  const group = new Group();
  const pcb = new Mesh(
    new BoxGeometry(0.2, 0.004, 0.15),
    pcbMaterials(kit, 'power', 'y'),
  );
  pcb.name = 'Textured green power board';
  pcb.position.y = 0.002;
  group.add(pcb);
  // Stand-offs.
  for (const x of [-0.092, 0.092])
    for (const z of [-0.067, 0.067])
      rod(
        group,
        0.003,
        0.012,
        kitPaint(kit, '#c8c9ca', 0.6),
        'y',
        x,
        -0.006,
        z,
        6,
      );
  // Small parts: resistors, a relay, a heatsink, a terminal block.
  for (let i = 0; i < 6; i++)
    rod(
      group,
      0.002,
      0.012,
      kitPaint(kit, '#c7a679'),
      'x',
      0.04 + (i % 3) * 0.018,
      0.007,
      0.03 + Math.floor(i / 3) * 0.012,
      6,
    );
  box(group, 0.024, 0.018, 0.016, kitPaint(kit, '#2c3c6c'), 0.06, 0.013, -0.04);
  for (let i = 0; i < 6; i++)
    box(
      group,
      0.003,
      0.03,
      0.04,
      kitPaint(kit, '#9ea1a3', 0.6),
      -0.08 + i * 0.006,
      0.019,
      0.045,
    );
  box(group, 0.06, 0.016, 0.014, kitPaint(kit, '#3b6b46'), -0.02, 0.012, 0.062);
  // The soot of a vented can, over the whole board's top.
  const soot = createSoot(kit, 0.2, 0.15);
  soot.decal.position.y = 0.0042;
  group.add(soot.decal);
  const cans = [0, 1].map((i) => {
    const view = createElectrolyticCapacitorView(kit, 0.05);
    view.group.position.set(-0.05 + i * 0.07, 0.004, -0.02);
    group.add(view.group);
    return {
      view,
      at: { x: -0.05 + i * 0.07, z: -0.02 },
      health: 'good' as 'good' | 'bulging' | 'vented',
      smoke: 0,
      age: Infinity,
      embers: 0,
    };
  });
  return {
    group,
    cans: cans.map((can) => can.view.group),
    set(index, health, smoke, age = Infinity, embers = 0) {
      const can = cans[index];
      // The moment it vents, soot is blown over the board.
      if (health === 'vented' && can.health !== 'vented' && age < 0.5)
        soot.blacken(can.at.x, can.at.z);
      Object.assign(can, { health, smoke, age, embers });
    },
    clean() {
      soot.clean();
    },
    update(_seconds, _delta, reducedMotion) {
      for (const can of cans)
        can.view.set(can.health, can.smoke, can.age, can.embers, reducedMotion);
    },
    dispose() {
      for (const can of cans) can.view.dispose();
    },
  };
}

export interface MotorView {
  group: Group;
  set(rpm: number): void;
  update(delta: number): void;
}

/**
 * A totally enclosed fan-cooled induction motor on its feet: a finned
 * frame, end bells, a fan cover with its grille at the back, a conduit
 * box on top and a nameplate, its keyed shaft carrying a coupling half
 * with a white mark so its turning shows. The shaft points along +x;
 * it stands on its feet at y = 0.
 */
export function createMotorView(
  kit: PanelKit,
  plate = '2 HP  1750 RPM\n460 V  3.4 A',
): MotorView {
  const group = new Group();
  const frame = kitPaint(kit, '#b9bdbf', 0.55);
  const dark = kitPaint(kit, '#4c5054', 0.3);
  const r = 0.07;
  const cy = 0.09;
  rod(group, r, 0.24, frame, 'x', 0, cy, 0, 24);
  for (let i = 0; i < 12; i++) {
    const fin = box(group, 0.22, 0.008, 0.012, frame, 0, cy, 0);
    fin.geometry.translate(0, r + 0.004, 0);
    fin.rotation.x = (i / 12) * Math.PI * 2;
  }
  rod(group, r * 0.95, 0.03, frame, 'x', 0.135, cy, 0, 24);
  rod(group, r * 0.97, 0.07, dark, 'x', -0.155, cy, 0, 24);
  rod(group, r * 0.6, 0.004, kitPaint(kit, '#e3ddd0'), 'x', -0.191, cy, 0, 24);
  // The motor's maker's mark on the end of its fan cowl.
  const badge = createBrandBadge(kit, 'bonk-industries', {
    form: 'mark',
    height: 0.07,
  });
  badge.position.set(-0.194, cy, 0);
  badge.rotation.y = -Math.PI / 2;
  group.add(badge);
  // Feet and base.
  for (const x of [-0.08, 0.08])
    box(group, 0.05, 0.03, 0.2, frame, x, 0.015, 0);
  // The conduit box and nameplate.
  box(group, 0.07, 0.04, 0.06, frame, 0.02, cy + r + 0.03, 0);
  const name = createNameplate(kit, plate, {
    width: 0.08,
    height: 0.03,
    colour: '#c8c9c6',
    ink: '#1a1a1a',
  });
  name.position.set(-0.03, cy + 0.02, r + 0.004);
  group.add(name);
  // The shaft and a coupling half with its mark.
  const spin = new Group();
  spin.position.set(0.15, cy, 0);
  group.add(spin);
  rod(spin, 0.012, 0.08, kitPaint(kit, '#d6d8d9', 0.8), 'x', 0.04, 0, 0);
  rod(spin, 0.035, 0.03, kitPaint(kit, '#3b3e42', 0.4), 'x', 0.07, 0, 0, 20);
  box(spin, 0.031, 0.024, 0.006, kitPaint(kit, '#f0eee6'), 0.07, 0.02, 0);
  let rpm = 0;
  return {
    group,
    set(value) {
      rpm = value;
    },
    update(delta) {
      // Shown at a slow stroboscopic fraction, so the mark reads as turning.
      spin.rotation.x += ((rpm / 60) * Math.PI * 2 * delta) / 12;
    },
  };
}
