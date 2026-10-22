import { BoxGeometry, CylinderGeometry, Group, Mesh } from 'three';
import type { Material } from 'three';
import { disconnectHandle } from '../../core/parts/parts';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createMicroLabel, kitPaint } from '../../core/views/eighties-controls';

/** Steel enclosure after the Square D HU365: 50.25 × 27.63 × 10.13 inches. */
const W = 0.702;
const H = 1.276;
const D = 0.257;
const Y = 1.45;
const FACE_Z = -0.3;
const POST_X = 0.25;

/**
 * Pool Plant's adaptations (`doc/reuse-inventory.md`): the handle may be
 * bound to the world; the rating and warning may be the UK's; and the
 * outgoing branch into MAIN INCOMING may be left out, where the cables
 * leave another way.
 */
export interface IsolatorOptions {
  bound?: Parameters<typeof disconnectHandle>[1]['bound'];
  rating?: string;
  danger?: string;
  branch?: boolean;
}

/** Floor-fed steel safety switch on a bolted channel stand, beside MAIN INCOMING. */
export function createIncomingIsolator(
  kit: PanelKit,
  initial: 'off' | 'on' = 'off',
  options: IsolatorOptions = {},
) {
  const group = new Group();
  group.name = 'Incoming supply isolator';
  const add = (
    material: Material,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
  ) => {
    const mesh = new Mesh(new BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  };
  const label = (
    text: string,
    x: number,
    y: number,
    options: Parameters<typeof createMicroLabel>[2],
  ) => {
    const mesh = createMicroLabel(kit, text, options);
    mesh.position.set(x, y, FACE_Z + 0.0015);
    group.add(mesh);
    return mesh;
  };
  const galvanised = kitPaint(kit, '#9ea3a4', 0.6);
  const trunking = kitPaint(kit, '#a7abab', 0.7);
  const grey = kitPaint(kit, '#4a4d50');
  const back = FACE_Z - D;
  // Two unistrut posts from the floor, the channels across them, and the
  // box bolted to the channels.
  for (const x of [-POST_X, POST_X]) {
    add(galvanised, 0.041, 2.3, 0.041, x, 1.15, back - 0.021);
    add(galvanised, 0.14, 0.012, 0.22, x, 0.006, back - 0.021);
    for (const dz of [-0.075, 0.075])
      add(grey, 0.018, 0.012, 0.018, x, 0.018, back - 0.021 + dz);
  }
  for (const y of [Y - H / 2 + 0.08, Y + H / 2 - 0.08])
    add(galvanised, 2 * POST_X + 0.06, 0.041, 0.041, 0, y, back - 0.021);
  // Folded steel case and slightly inset front door.
  add(
    kitPaint(kit, '#929697', 0.45),
    W,
    H,
    D - 0.012,
    0,
    Y,
    FACE_Z - D / 2 - 0.006,
  );
  add(
    kitPaint(kit, '#a5a8a8', 0.42),
    W - 0.004,
    H - 0.004,
    0.012,
    0,
    Y,
    FACE_Z - 0.006,
  );
  for (const sx of [-1, 1])
    for (const sy of [-1, 1]) {
      const screw = new Mesh(
        new CylinderGeometry(0.006, 0.006, 0.003, 12),
        grey,
      );
      screw.rotation.x = Math.PI / 2;
      screw.position.set(
        sx * (W / 2 - 0.014),
        Y + sy * (H / 2 - 0.014),
        FACE_Z + 0.0015,
      );
      group.add(screw);
    }
  // Exposed hinge knuckles on the folded steel door's left edge.
  for (const y of [Y - 0.4, Y + 0.4]) {
    const hinge = new Mesh(
      new CylinderGeometry(0.008, 0.008, 0.065, 12),
      galvanised,
    );
    hinge.position.set(-W / 2 + 0.008, y, FACE_Z + 0.004);
    group.add(hinge);
  }
  // Heavy-duty throw handle on the door's free edge.
  const handle = disconnectHandle(kit, {
    name: 'INCOMING ISOLATOR handle',
    initial,
    style: 'heavy-throw',
    sound: 'soft-click',
    bound: options.bound,
  });
  handle.object.position.set(W / 2 - 0.07, Y + 0.18, FACE_Z);
  group.add(handle.object);
  // What it is, its rating and a warning, printed on the lid.
  const ink = '#151515';
  label('INCOMING SUPPLY\nISOLATOR', 0, Y + H / 2 - 0.12, {
    height: 0.024,
    ink,
  });
  label('MAIN SWITCH', 0, Y - 0.078, { height: 0.014, ink });
  label(options.rating ?? '100 A FEED  480 VAC  3 PH  60 Hz', 0, Y - 0.094, {
    height: 0.012,
    ink,
    bold: false,
  });
  label(options.danger ?? 'DANGER  480 V', 0, Y - H / 2 + 0.13, {
    height: 0.014,
    ink: '#ffffff',
    plate: '#c42a1e',
  });
  label('VOLTARA', 0, Y + H / 2 - 0.04, { height: 0.01, ink });
  // A lock-out notice on the channel below.
  const lockout = createMicroLabel(
    kit,
    'LOCK OUT BEFORE\nWORKING ON EQUIPMENT',
    {
      height: 0.014,
      ink,
      plate: '#f2c618',
    },
  );
  lockout.position.set(0, Y - H / 2 - 0.06, back + 0.001);
  group.add(lockout);
  // 100 × 100 mm galvanised box trunking, after Legrand Salamandre.
  // Feed rises from the floor; the outgoing branch enters MAIN INCOMING.
  const bottom = Y - H / 2;
  const z = FACE_Z - D / 2;
  const riser = add(trunking, 0.1, bottom + 0.01, 0.1, 0, bottom / 2, z);
  riser.name = 'Floor supply trunking';
  add(galvanised, 0.16, 0.018, 0.16, 0, 0.009, z);
  add(galvanised, 0.14, 0.02, 0.14, 0, bottom, z);
  add(galvanised, 0.104, bottom, 0.003, 0, bottom / 2, z + 0.052);
  for (const y of [0.09, bottom - 0.09])
    add(grey, 0.009, 0.009, 0.004, 0, y, z + 0.055);
  if (options.branch === false) return { group, handle };
  const end = ISOLATOR.width / 2 + ISOLATOR.gap;
  const length = end - W / 2 + 0.02;
  const branchY = Y + 0.5;
  const branch = add(
    trunking,
    length,
    0.1,
    0.1,
    W / 2 + length / 2 - 0.01,
    branchY,
    z,
  );
  branch.name = 'Machine supply trunking';
  add(
    galvanised,
    length,
    0.104,
    0.003,
    W / 2 + length / 2 - 0.01,
    branchY,
    z + 0.052,
  );
  for (const x of [W / 2 + 0.015, end - 0.015]) {
    add(galvanised, 0.025, 0.114, 0.114, x, branchY, z);
    add(grey, 0.009, 0.009, 0.004, x, branchY, z + 0.06);
  }
  return { group, handle };
}

/**
 * Where the isolator stands beside the line-up, in its coordinates: `x`
 * its middle, `gap` between its side and the line-up's, and its footprint
 * from the line-up's front, for walking into it.
 */
export const ISOLATOR = {
  width: W,
  gap: 0.15,
  front: FACE_Z + 0.12,
  back: FACE_Z - D - 0.14,
};
