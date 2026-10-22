import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
} from 'three';
import type { Material, Object3D } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createMicroLabel } from '../../core/views/eighties-controls';
import { brandLivery } from '../../core/views/brand-livery';
import { SWITCH_FUSE } from '../logic/enclosures';
import {
  blowFuse,
  newSwitchFuse,
  switchFuseOutput,
  workSwitchFuse,
} from '../logic/switch-fuse';
import type {
  SwitchFuseAction,
  SwitchFuseOutcome,
  SwitchFuseState,
} from '../logic/switch-fuse';

/**
 * Voltara's switch-fuse, a room's supply: after the TP&N 63 A switch-fuses
 * of around 2000 (MEM Memshield, Crabtree), 200 × 300 × 150 mm in grey
 * steel (`../logic/switch-fuse.ts` for its workings). Its handle on its
 * right-hand side, up for ON and down for OFF, a hasp to padlock it OFF.
 * Its door, hinged on its left and interlocked with the handle, carries
 * the maker's badge, the rating plate, a SUPPLY ON neon lit while power
 * goes on through, and an engraved legend saying what it feeds. Behind
 * it, on a galvanised plate: the incoming terminals, and a fuse base with
 * three fuse carriers (L1, L2, L3), each holding a BS 88 cartridge fuse,
 * and the neutral link. Its supply enters a gland on its top
 * (`SWITCH_FUSE.glands`). Its back on the wall at z = 0, its middle at
 * y = 0, its front toward +z.
 */
export interface SwitchFuse {
  group: Group;
  /** What to click: its handle, its door, and each fuse carrier. */
  handle: Object3D;
  door: Object3D;
  carriers: readonly Object3D[];
  readonly state: SwitchFuseState;
  readonly on: boolean;
  /** Work it as a person would; says why not, if it will not go. */
  work(action: SwitchFuseAction): SwitchFuseOutcome;
  /** Set its handle from outside (a world that has it switched). */
  set(on: boolean): void;
  toggle(): void;
  /** A fuse blown by a fault downstream. */
  blow(phase: 0 | 1 | 2): void;
  /** Whether power reaches it from upstream. */
  setSupplied(supplied: boolean): void;
  /** Whether power goes on through it. */
  readonly output: boolean;
  update(delta: number): void;
}

export function createSwitchFuse(
  kit: PanelKit,
  {
    on = true,
    rating = 'TP&N 63A',
    legend = 'ROOM SUPPLY',
  }: { on?: boolean; rating?: string; legend?: string } = {},
): SwitchFuse {
  const { w, h, d, glands } = SWITCH_FUSE;
  const group = new Group();
  group.name = 'switch-fuse';
  group.userData.sound = 'isolator';
  const livery = brandLivery(kit, 'voltara');
  const paint = (color: string, roughness = 0.5, metalness = 0.3) => {
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
  const label = (
    parent: Object3D,
    text: string,
    height: number,
    x: number,
    y: number,
    z: number,
    ink = '#1d1e1f',
    plate: string | null = null,
  ) => {
    const mesh = createMicroLabel(kit, text, { height, ink, plate });
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  const grey = paint('#a9aca6', 0.55, 0.35);
  const dark = paint('#2b2c2d', 0.6, 0.2);
  const brass = paint('#b08d3a', 0.35, 0.8);

  // The case: a steel box open at its front, its back on the wall.
  const t = 0.003;
  const depth = d - 0.01;
  box(group, grey, w, h, t, 0, 0, t / 2);
  box(group, grey, t, h, depth, -w / 2 + t / 2, 0, depth / 2);
  box(group, grey, t, h, depth, w / 2 - t / 2, 0, depth / 2);
  box(group, grey, w, t, depth, 0, h / 2 - t / 2, depth / 2);
  box(group, grey, w, t, depth, 0, -h / 2 + t / 2, depth / 2);
  // Inside, drawn only while the door is open: the galvanised mounting
  // plate, the incoming terminals at its top (the supply in from the
  // gland), the fuse base below them.
  const inside = new Group();
  inside.name = 'switch-fuse internals';
  inside.userData.live = true;
  inside.visible = false;
  group.add(inside);
  box(
    inside,
    paint('#c3c8c6', 0.4, 0.6),
    w - 0.02,
    h - 0.02,
    0.003,
    0,
    0,
    0.02,
  );
  for (const x of [-0.054, -0.018, 0.018, 0.054])
    box(inside, brass, 0.016, 0.014, 0.018, x, h / 2 - 0.04, 0.03);
  label(inside, 'L1  L2  L3  N', 0.009, 0, h / 2 - 0.058, 0.0215);
  const base = paint('#1c1c1d', 0.7, 0.05);
  box(inside, base, 0.17, 0.15, 0.025, 0, -0.03, 0.034);
  // The neutral link: a fixed bar, on the right.
  box(
    inside,
    paint('#1f4fa8', 0.5, 0.1),
    0.016,
    0.12,
    0.022,
    0.066,
    -0.03,
    0.058,
  );
  label(inside, 'N', 0.012, 0.066, 0.042, 0.047, '#ffffff');

  // The fuse carriers: white mouldings with a black grip, each holding a
  // cartridge fuse; pulled out toward the front, a carrier sits 9 cm out.
  const moulding = paint('#e9e6dc', 0.6, 0.05);
  const scorched = paint('#4a3a2c', 0.8, 0.05);
  const capWhole = brass;
  const capBlown = paint('#2a2522', 0.7, 0.2);
  const ceramic = paint('#f2f0ea', 0.5, 0.02);
  const carrierX = [-0.054, -0.018, 0.018] as const;
  const carriers = carrierX.map((x, i) => {
    const carrier = new Group();
    carrier.name = `fuse carrier L${i + 1}`;
    carrier.userData.live = true;
    carrier.position.set(x, -0.03, 0.06);
    inside.add(carrier);
    const body = box(carrier, moulding, 0.03, 0.13, 0.026, 0, 0, 0);
    box(carrier, dark, 0.02, 0.05, 0.018, 0, 0, 0.022);
    // Its fuse, seen through the moulding's side window.
    const fuse = new Mesh(
      new CylinderGeometry(0.008, 0.008, 0.07, 14),
      ceramic,
    );
    fuse.position.set(0, 0, -0.004);
    carrier.add(fuse);
    const caps = [-1, 1].map((k) => {
      const cap = new Mesh(
        new CylinderGeometry(0.009, 0.009, 0.012, 14),
        capWhole,
      );
      cap.position.set(0, k * 0.04, -0.004);
      carrier.add(cap);
      return cap;
    });
    label(carrier, `L${i + 1}`, 0.008, 0, 0.055, 0.0135);
    return { carrier, body, caps };
  });

  // The door, hinged on its left edge, swinging out to the left.
  const door = new Group();
  door.name = 'switch-fuse door';
  door.userData.live = true;
  door.position.set(-w / 2, 0, d - 0.01);
  group.add(door);
  const dw = w - 0.004;
  const dh = h - 0.004;
  box(
    door,
    paint('#b4b7b1', 0.5, 0.35),
    dw,
    dh,
    0.01,
    dw / 2 + 0.002,
    0,
    0.005,
  );
  const front = 0.01;
  // Its face, measured from the hinge.
  const at = (x: number) => x + w / 2;
  for (const [x, y] of [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ])
    box(
      door,
      dark,
      0.008,
      0.008,
      0.003,
      at(x * (w / 2 - 0.018)),
      y * (h / 2 - 0.018),
      front + 0.0015,
    );
  const badge = livery.badge(0.022);
  badge.position.set(at(-w / 2 + 0.05), h / 2 - 0.04, front + 0.001);
  door.add(badge);
  label(
    door,
    `SWITCH-FUSE\n${rating}  400V`,
    0.008,
    at(-0.02),
    h / 2 - 0.085,
    front + 0.001,
    '#1d1e1f',
    '#e9e6dc',
  );
  const lens = new MeshStandardMaterial({
    color: '#1f4a2a',
    emissive: '#3bd16a',
    emissiveIntensity: 0,
    roughness: 0.3,
  });
  kit.materials.push(lens);
  const neon = new Mesh(new CylinderGeometry(0.009, 0.009, 0.008, 18), lens);
  neon.rotation.x = Math.PI / 2;
  neon.position.set(at(0), -0.01, front + 0.004);
  door.add(neon);
  label(door, 'SUPPLY ON', 0.007, at(0), -0.032, front + 0.001);
  label(
    door,
    legend,
    0.016,
    at(0),
    -h / 2 + 0.05,
    front + 0.001,
    '#ffffff',
    '#141414',
  );

  // Its supply gland on its top.
  for (const x of glands.x) {
    const gland = new Mesh(
      new CylinderGeometry(0.017, 0.019, glands.h, 6),
      brass,
    );
    gland.position.set(x, h / 2 + glands.h / 2, glands.z);
    group.add(gland);
  }

  // The handle, on its right-hand side: up for ON, down for OFF; the hasp
  // under it, where it is padlocked OFF.
  const side = w / 2;
  box(group, dark, 0.006, 0.05, 0.05, side + 0.003, 0, d * 0.55);
  box(group, dark, 0.012, 0.012, 0.02, side + 0.008, -0.07, d * 0.55);
  const handle = new Group();
  handle.name = 'switch-fuse handle';
  handle.position.set(side + 0.014, 0, d * 0.55);
  handle.userData.live = true;
  group.add(handle);
  const red = paint('#c42b23', 0.45, 0.1);
  box(handle, dark, 0.012, 0.03, 0.03, 0, 0, 0);
  box(handle, red, 0.014, 0.11, 0.022, 0.004, 0.06, 0);
  box(handle, red, 0.018, 0.03, 0.03, 0.005, 0.115, 0);
  for (const [text, y] of [
    ['ON', 0.12],
    ['OFF', -0.12],
  ] as const) {
    const mark = createMicroLabel(kit, text, { height: 0.012, ink: '#1d1e1f' });
    mark.rotation.y = Math.PI / 2;
    mark.position.set(side + 0.001, y, d * 0.82);
    group.add(mark);
  }

  // Up, a little toward the front, for ON; down for OFF. The door open,
  // swung out 110°; a carrier out, 9 cm forward of its base.
  const ON = 0.35;
  const OFF = Math.PI - 0.35;
  const OPEN = -1.9;
  const OUT = 0.09;
  let state = newSwitchFuse(on);
  let supplied = true;
  const angles = { handle: on ? ON : OFF, door: 0, out: [0, 0, 0] };
  const show = () => {
    lens.emissiveIntensity = switchFuseOutput(state, supplied) ? 1.4 : 0;
    state.carriers.forEach((c, i) => {
      const blown = c === 'blown';
      carriers[i].body.material = blown ? scorched : moulding;
      for (const cap of carriers[i].caps)
        cap.material = blown ? capBlown : capWhole;
    });
  };
  const ease = (from: number, to: number, delta: number, rate: number) =>
    from + (to - from) * Math.min(1, delta * rate);
  show();
  const fuse: SwitchFuse = {
    group,
    handle,
    door,
    carriers: carriers.map((c) => c.carrier),
    get state() {
      return state;
    },
    get on() {
      return state.on;
    },
    get output() {
      return switchFuseOutput(state, supplied);
    },
    work(action) {
      const outcome = workSwitchFuse(state, action);
      state = outcome.state;
      show();
      return outcome;
    },
    set(value) {
      if (value === state.on) return;
      state = { ...state, on: value };
      show();
    },
    toggle() {
      fuse.work({ kind: 'handle' });
    },
    blow(phase) {
      state = blowFuse(state, phase);
      show();
    },
    setSupplied(value) {
      if (value === supplied) return;
      supplied = value;
      show();
    },
    update(delta) {
      angles.handle = ease(angles.handle, state.on ? ON : OFF, delta, 10);
      handle.rotation.x = angles.handle;
      angles.door = ease(angles.door, state.doorOpen ? OPEN : 0, delta, 6);
      door.rotation.y = angles.door;
      // Its internals drawn only once the door is off its seat.
      inside.visible = state.doorOpen || angles.door < -0.01;
      state.carriers.forEach((c, i) => {
        angles.out[i] = ease(angles.out[i], c === 'out' ? OUT : 0, delta, 8);
        carriers[i].carrier.position.z = 0.06 + angles.out[i];
      });
    },
  };
  return fuse;
}

/**
 * A switch-fuse's handle, door and fuse carriers as parts to click, in
 * `uses`: each works it as a person would (`work`); the handle by
 * `handle`, if given (a room's, which also switches its feeder).
 */
export function useSwitchFuse(
  fuse: SwitchFuse,
  uses: Map<Object3D, (direction?: number) => void>,
  handle: () => void = () => fuse.work({ kind: 'handle' }),
) {
  fuse.handle.traverse((o) => uses.set(o, handle));
  fuse.door.traverse((o) => uses.set(o, () => fuse.work({ kind: 'door' })));
  fuse.carriers.forEach((carrier, i) =>
    carrier.traverse((o) =>
      uses.set(o, () => fuse.work({ kind: 'carrier', phase: i as 0 | 1 | 2 })),
    ),
  );
}
