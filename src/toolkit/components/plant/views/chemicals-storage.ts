import {
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
} from 'three';
import type { Object3D } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { brandLivery } from '../../core/views/brand-livery';
import { FINISH, plantTools } from './plant-tools';
import type { Point } from './plant-tools';
import {
  createEmergencySign,
  createHazardLabel,
  createMandatorySign,
  createNotice,
  createTag,
} from './chemicals-signs';

/**
 * A pool's chemical store, in metres, each piece modelled at the size of
 * the commercial product it is after (`doc/research/plant-products-chemicals-dosing.md`)
 * under a maker of the game's own. Floor pieces stand on the floor at
 * their origin, front +z; wall pieces hang with their back in the wall's
 * face at their origin, front +z.
 *
 * Sodium hypochlorite and acid must never meet (together they give off
 * chlorine), so each has its own bund, its own fill point with a coupling
 * that will not fit the other's, and its own colour.
 */

type Tools = ReturnType<typeof plantTools>;

/** Hypochlorite is marked yellow, acid red, on tanks, pipes and couplings. */
export const CHEMICAL_COLOUR = { hypochlorite: '#e8c21c', acid: '#c42b23' };

/** Lay `mesh` at `at`, facing +z (turned `yaw`), and add it to `parent`. */
function put(parent: Object3D, mesh: Object3D, at: Point, yaw = 0) {
  mesh.position.set(...at);
  mesh.rotation.y = yaw;
  parent.add(mesh);
  return mesh;
}

/** An open-topped cylinder wall, seen from inside and out. */
function ring(
  t: Tools,
  parent: Object3D,
  colour: string,
  r: number,
  h: number,
  y: number,
) {
  const material = t.paint(colour, 0.7);
  (material as MeshStandardMaterial).side = DoubleSide;
  const mesh = new Mesh(new CylinderGeometry(r, r, h, 48, 1, true), material);
  mesh.position.y = y;
  parent.add(mesh);
  return mesh;
}

/**
 * A bunded bulk tank: a black polyethylene dosing tank, `r` and `h`, in a
 * bund holding 110 % of it, with its manway, vented fill line, suction
 * lance to the dosing pumps, contents gauge and hazard label. After the
 * Enduramaxx 1000 L chemical dosing tank (Ø1000 × 1600 mm) in its 1100 L
 * bund (Ø1580 × 770 mm).
 */
export function createBundedTank(
  kit: PanelKit,
  {
    chemical,
    detail,
    colour,
    tag,
    r = 0.5,
    h = 1.6,
    bundR = 0.79,
    bundH = 0.77,
  }: {
    chemical: string;
    detail: string;
    colour: string;
    tag: string;
    r?: number;
    h?: number;
    bundR?: number;
    bundH?: number;
  },
) {
  const t = plantTools(kit);
  const group = new Group();
  const black = t.paint('#1c1e1f', 0.6);
  // The bund: its floor and open wall.
  t.cyl(group, t.paint('#2a2d2f', 0.7), bundR, 0.02, 0, 0.01, 0, 'y', 48);
  ring(t, group, '#2a2d2f', bundR, bundH, bundH / 2);
  // The tank on the bund's floor, its top a shallow cone to the manway.
  const base = 0.03;
  const wall = h - 0.12;
  t.cyl(group, black, r, wall, 0, base + wall / 2, 0, 'y', 40);
  const shoulder = new Mesh(new CylinderGeometry(0.22, r, 0.12, 40), black);
  shoulder.position.y = base + wall + 0.06;
  group.add(shoulder);
  const top = base + h;
  t.cyl(group, t.paint('#3a3d3f', 0.5), 0.2, 0.05, 0, top + 0.025, 0, 'y', 32);
  // Fill line (DN50) up out of the top and back to the wall's fill point.
  const lineColour = colour;
  t.pipe(group, 50, [
    [0.12, top - 0.02, -0.12],
    [0.12, top + 0.25, -0.12],
    [0.12, top + 0.25, -bundR - 0.05],
  ]);
  t.band(group, 50, [0.12, top + 0.25, -0.5], 'z', lineColour);
  // The vent, a gooseneck with a fume filter.
  t.rod(
    group,
    t.paint(FINISH.pvc, 0.45),
    [-0.12, top, -0.12],
    [-0.12, top + 0.3, -0.12],
    0.025,
  );
  t.rod(
    group,
    t.paint(FINISH.pvc, 0.45),
    [-0.12, top + 0.3, -0.12],
    [-0.12, top + 0.3, 0.02],
    0.025,
  );
  t.cyl(
    group,
    t.paint('#6f7477', 0.6),
    0.045,
    0.12,
    -0.12,
    top + 0.22,
    0.02,
    'y',
    20,
  );
  // The suction lance's tube out over the bund wall, to the dosing pumps.
  const tube = t.paint('#e8e6dc', 0.5);
  t.rod(
    group,
    tube,
    [0.05, top + 0.05, 0.1],
    [0.05, top + 0.15, 0.1],
    0.008,
    8,
  );
  t.rod(
    group,
    tube,
    [0.05, top + 0.15, 0.1],
    [bundR + 0.05, top + 0.15, 0.1],
    0.008,
    8,
  );
  t.rod(
    group,
    tube,
    [bundR + 0.05, top + 0.15, 0.1],
    [bundR + 0.05, 0.3, 0.1],
    0.008,
    8,
  );
  // A contents gauge (a float and pointer on a scale) and the label.
  const gauge = t.printed(
    0.07,
    h * 0.75,
    (c, cw, ch) => {
      c.fillStyle = '#f1f1ec';
      c.fillRect(0, 0, cw, ch);
      c.fillStyle = '#1f2b31';
      for (let i = 0; i <= 10; i++)
        c.fillRect(cw * 0.55, (ch * i) / 10, cw * 0.45, ch * 0.004);
      c.fillStyle = colour;
      c.fillRect(0, ch * 0.42, cw * 0.5, ch * 0.02);
    },
    64,
  ).mesh;
  put(group, gauge, [-r * 0.55, base + h * 0.45, r * 0.84], -0.6);
  put(
    group,
    createHazardLabel(
      t,
      0.4,
      0.3,
      chemical,
      detail,
      chemical.includes('HYPO')
        ? ['corrosive', 'environment']
        : ['corrosive', 'exclamation'],
    ),
    [0.12, base + h * 0.6, r + 0.002],
  );
  put(
    group,
    createTag(
      t,
      `${tag}\n${Math.round((Math.PI * r * r * h * 1000) / 50) * 50} L`,
      0.18,
      { plate: colour },
    ),
    [0.12, base + h * 0.88, r * 0.99],
  );
  put(group, createTag(t, 'BUND 110 %', 0.22), [
    0,
    bundH * 0.55,
    bundR + 0.002,
  ]);
  const maker = brandLivery(kit, 'chlorella');
  put(
    group,
    maker.nameplate(
      ['PE-HD dosing tank, black (UV)', 'Bund 110 %'],
      0.16,
      0.09,
    ),
    [0.3, base + 0.35, r * 0.85],
    0.55,
  );
  return group;
}

/**
 * Acid in a 1000 L IBC on a polyethylene spill pallet: the pallet's sump
 * holds the whole container, under a grid, with a dispensing area in
 * front. After the Denios Classic-line PE pallet for one IBC (1910 ×
 * 1280 × 860 mm) and a standard 1200 × 1000 × 1160 mm IBC.
 */
export function createIbcOnSpillPallet(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  const pallet = brandLivery(kit, 'pepperdyne');
  const pe = pallet.paint.casing;
  const L = 1.91,
    W = 1.28,
    H = 0.86;
  // The sump: base and four walls, with the grid on top.
  t.box(group, pe, L, 0.06, W, 0, 0.03, 0);
  for (const z of [-W / 2 + 0.03, W / 2 - 0.03])
    t.box(group, pe, L, H, 0.06, 0, H / 2, z);
  for (const x of [-L / 2 + 0.03, L / 2 - 0.03])
    t.box(group, pe, 0.06, H, W - 0.12, x, H / 2, 0);
  const grid = pallet.paint.shade;
  for (let i = 0; i < 18; i++)
    t.box(
      group,
      grid,
      L - 0.12,
      0.03,
      0.025,
      0,
      H - 0.02,
      -W / 2 + 0.1 + i * 0.065,
    );
  // The IBC at the back of the pallet, its tap over the dispensing area.
  const ibc = new Group();
  ibc.position.set(-0.3, H, 0);
  group.add(ibc);
  t.box(ibc, t.paint('#3a3c3d', 0.7), 1.2, 0.15, 1.0, 0, 0.075, 0);
  t.box(ibc, t.paint('#e9ecea', 0.35), 1.12, 0.96, 0.94, 0, 0.15 + 0.48, 0);
  const cage = t.paint(FINISH.galvanised, 0.4, 0.6);
  for (const x of [-0.58, -0.29, 0, 0.29, 0.58])
    for (const z of [-0.49, 0.49])
      t.rod(ibc, cage, [x, 0.15, z], [x, 1.16, z], 0.01, 8);
  for (const z of [-0.33, 0, 0.33])
    for (const x of [-0.59, 0.59])
      t.rod(ibc, cage, [x, 0.15, z], [x, 1.16, z], 0.01, 8);
  for (const y of [0.15, 0.48, 0.82, 1.16]) {
    for (const z of [-0.49, 0.49])
      t.rod(ibc, cage, [-0.59, y, z], [0.59, y, z], 0.01, 8);
    for (const x of [-0.59, 0.59])
      t.rod(ibc, cage, [x, y, -0.49], [x, y, 0.49], 0.01, 8);
  }
  t.cyl(ibc, t.paint('#d0d2cf', 0.4), 0.08, 0.04, 0, 1.13, 0, 'y', 24);
  // The bottom outlet: a DN50 butterfly valve, red handle.
  t.cyl(ibc, t.paint('#d0d2cf', 0.4), 0.035, 0.1, 0.62, 0.22, 0, 'x', 16);
  t.box(
    ibc,
    t.paint(CHEMICAL_COLOUR.acid, 0.5),
    0.02,
    0.08,
    0.02,
    0.66,
    0.29,
    0,
  );
  put(
    ibc,
    createHazardLabel(
      t,
      0.4,
      0.3,
      'HYDROCHLORIC ACID',
      '32–33 % · pH correction · UN 1789',
      ['corrosive', 'exclamation'],
    ),
    [0, 0.7, 0.505],
  );
  put(
    ibc,
    createTag(t, 'ACID · DO NOT MIX\nWITH HYPOCHLORITE', 0.3, {
      plate: CHEMICAL_COLOUR.acid,
      ink: '#ffffff',
    }),
    [0, 1.0, 0.505],
  );
  put(group, createTag(t, 'SPILL PALLET 1100 L', 0.28), [
    0.5,
    H * 0.55,
    W / 2 + 0.001,
  ]);
  put(
    group,
    pallet.nameplate(['Spill pallet, 1 IBC', 'Sump 1100 L'], 0.2, 0.11),
    [-0.45, H * 0.55, W / 2 + 0.001],
  );
  put(
    ibc,
    brandLivery(kit, 'chlorella').nameplate(
      ['Hydrochloric acid 32 %', '1000 L IBC'],
      0.18,
      0.1,
    ),
    [0.35, 0.35, 0.505],
  );
  return group;
}

/**
 * The delivery fill cabinet on the outside wall, its door open: a
 * lockable stainless cabinet with each chemical's fill point on its own
 * coupling (2" for hypochlorite, 1½" for acid, so a tanker's hose for one
 * will not fit the other), a drip tray to the bund, and the tank-full
 * alarm the driver watches. After the bunded fill cabinets UK tank makers
 * sell for pool chemical deliveries.
 */
export function createFillCabinet(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  const steel = t.paint(FINISH.stainless, 0.3, 0.85);
  const W = 0.7,
    H = 0.9,
    D = 0.3;
  t.box(group, steel, W, H, 0.01, 0, 0, 0.005);
  t.box(group, steel, W, 0.01, D, 0, H / 2, D / 2);
  t.box(group, steel, W, 0.01, D, 0, -H / 2, D / 2);
  for (const x of [-W / 2, W / 2]) t.box(group, steel, 0.01, H, D, x, 0, D / 2);
  // The door, swung open about its right hinge.
  const door = new Group();
  door.position.set(W / 2, 0, D);
  door.rotation.y = 1.75;
  group.add(door);
  t.box(door, steel, W, H, 0.015, -W / 2, 0, 0);
  put(
    door,
    createNotice(t, 0.5, 0.3, [
      'CHEMICAL DELIVERY POINT',
      'Authorised persons only',
      'Check the coupling',
      'before connecting',
    ]),
    [-W / 2, 0.15, -0.009],
    Math.PI,
  );
  t.cyl(
    door,
    t.paint('#3a3d3f', 0.4),
    0.012,
    0.02,
    -W + 0.06,
    0,
    -0.01,
    'z',
    12,
  );
  // A drip tray across the bottom.
  t.box(
    group,
    t.paint('#2a2d2f', 0.7),
    W - 0.04,
    0.05,
    D - 0.04,
    0,
    -H / 2 + 0.03,
    D / 2,
  );
  // The two fill points: a pipe up from below, a valve, a coupling and cap.
  for (const [x, colour, name] of [
    [-0.17, CHEMICAL_COLOUR.hypochlorite, 'SODIUM HYPOCHLORITE\n2" CAMLOCK'],
    [0.17, CHEMICAL_COLOUR.acid, 'HYDROCHLORIC ACID\n1½" CAMLOCK'],
  ] as const) {
    const small = colour === CHEMICAL_COLOUR.acid;
    const r = small ? 0.024 : 0.032;
    t.rod(
      group,
      t.paint(FINISH.pvc, 0.45),
      [x, -H / 2, 0.12],
      [x, 0.1, 0.12],
      r,
      16,
    );
    t.box(
      group,
      t.paint('#d9dad6', 0.4),
      r * 2.6,
      0.07,
      r * 2.6,
      x,
      -0.05,
      0.12,
    );
    t.box(
      group,
      t.paint(colour, 0.5),
      0.12,
      0.02,
      0.02,
      x + 0.04,
      -0.05,
      0.12 + r * 1.4,
    );
    t.rod(
      group,
      t.paint(FINISH.brass, 0.35, 0.7),
      [x, 0.1, 0.12],
      [x, 0.14, 0.12],
      r * 1.25,
      20,
    );
    t.cyl(group, t.paint(colour, 0.5), r * 1.3, 0.03, x, 0.16, 0.12, 'y', 20);
    t.band(group, 50, [x, -0.25, 0.12], 'y', colour);
    put(
      group,
      createTag(t, name, 0.26, {
        plate: colour,
        ink: small ? '#ffffff' : '#111111',
      }),
      [x, 0.3, 0.02],
    );
  }
  // Above it: the tank-full alarm beacon and its acknowledge button.
  t.cyl(
    group,
    t.paint('#d48a1a', 0.3),
    0.04,
    0.1,
    -0.15,
    H / 2 + 0.2,
    0.06,
    'y',
    20,
  );
  t.box(
    group,
    t.paint('#3a3d3f', 0.5),
    0.1,
    0.06,
    0.06,
    -0.15,
    H / 2 + 0.12,
    0.04,
  );
  t.box(
    group,
    t.paint('#e8e8e2', 0.5),
    0.12,
    0.12,
    0.06,
    0.15,
    H / 2 + 0.15,
    0.03,
  );
  t.cyl(
    group,
    t.paint('#2a6fb0', 0.4),
    0.025,
    0.02,
    0.15,
    H / 2 + 0.15,
    0.065,
    'z',
    20,
  );
  put(group, createTag(t, 'TANK FULL\nSTOP DELIVERY', 0.2), [
    -0.15,
    H / 2 + 0.33,
    0.02,
  ]);
  put(
    group,
    brandLivery(kit, 'chlorella').nameplate(
      ['Delivery cabinet', 'Hypochlorite · acid'],
      0.16,
      0.09,
    ),
    [-0.14, -H / 2 + 0.12, 0.012],
  );
  return group;
}

/**
 * A chemical spill kit in a yellow 120 L wheeled bin: absorbent pads,
 * socks and neutraliser, gloves and goggles. After the Ecospill
 * C1220120 (about 470 × 540 × 950 mm).
 */
export function createSpillKit(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  const guard = brandLivery(kit, 'poolguard');
  t.box(group, guard.paint.casing, 0.47, 0.88, 0.54, 0, 0.07 + 0.44, 0);
  t.box(group, guard.paint.main, 0.5, 0.04, 0.58, 0, 0.97, 0.01);
  t.rod(
    group,
    guard.paint.shade,
    [-0.22, 0.95, -0.3],
    [0.22, 0.95, -0.3],
    0.015,
    10,
  );
  for (const x of [-0.2, 0.2])
    t.cyl(
      group,
      t.paint(FINISH.rubber, 0.8),
      0.1,
      0.05,
      x,
      0.1,
      -0.25,
      'x',
      20,
    );
  put(
    group,
    createNotice(t, 0.38, 0.22, [
      'CHEMICAL SPILL KIT',
      'Absorbs 120 L',
      'Acids, alkalis',
      'and hypochlorite',
    ]),
    [0, 0.65, 0.272],
  );
  put(
    group,
    guard.nameplate(['Chemical spill kit', '120 L'], 0.16, 0.09),
    [0, 0.36, 0.272],
  );
  return group;
}

/**
 * An emergency safety shower with an eye and face wash, plumbed in,
 * with its signs and a clear zone on the floor. After the Hughes
 * EXP-18GS/45G (464 × 748 × 2237 mm; nozzle at 2131 mm, eyewash nozzles
 * at 1124 mm; 76 L/min shower, 12 L/min eyewash; EN 15154).
 */
export function createSafetyShower(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  const steel = t.paint(FINISH.stainless, 0.3, 0.85);
  const r = 0.021;
  const back = -0.3;
  // Base plate and the 1¼" riser.
  t.box(group, steel, 0.15, 0.01, 0.15, 0, 0.005, back);
  t.rod(group, steel, [0, 0, back], [0, 2.237, back], r, 16);
  // The arm to the shower head, its stay-open valve and pull rod.
  t.rod(group, steel, [0, 2.2, back], [0, 2.2, 0.35], r, 16);
  t.rod(group, steel, [0, 2.2, 0.35], [0, 2.15, 0.35], r, 16);
  const head = new Mesh(
    new CylinderGeometry(0.13, 0.05, 0.05, 32),
    t.paint('#e8e8e2', 0.4),
  );
  head.position.set(0, 2.131, 0.35);
  group.add(head);
  t.box(group, steel, 0.06, 0.06, 0.06, 0, 2.2, 0.05);
  t.rod(group, steel, [0, 2.17, 0.05], [0, 1.75, 0.05], 0.005, 8);
  const handle = t.paint('#0a8a3e', 0.5);
  t.rod(group, handle, [-0.08, 1.7, 0.05], [0.08, 1.7, 0.05], 0.01, 8);
  t.rod(group, handle, [-0.08, 1.7, 0.05], [0, 1.78, 0.05], 0.01, 8);
  t.rod(group, handle, [0.08, 1.7, 0.05], [0, 1.78, 0.05], 0.01, 8);
  // The eye/face wash: an arm out to a closed green bowl, its lid up.
  const bowlAt: Point = [0.2, 1.05, 0.15];
  t.rod(group, steel, [0, 0.98, back], [0.2, 0.98, back], r * 0.8, 12);
  t.rod(group, steel, [0.2, 0.98, back], [0.2, 0.98, 0.15], r * 0.8, 12);
  const green = t.paint('#2e8b43', 0.45);
  const bowl = new Mesh(new CylinderGeometry(0.15, 0.1, 0.09, 32), green);
  bowl.position.set(...bowlAt);
  group.add(bowl);
  for (const x of [-0.05, 0.05])
    t.cyl(
      group,
      t.paint(FINISH.brass, 0.3, 0.7),
      0.018,
      0.04,
      0.2 + x,
      1.12,
      0.15,
      'y',
      16,
    );
  const lid = t.cyl(group, green, 0.15, 0.015, 0.2, 1.2, 0.0, 'y', 32);
  lid.rotation.x = -1.2;
  // Its signs, on a plate on the riser, and the clear zone on the floor.
  put(group, createEmergencySign(t, 0.4, 0.13, 'shower', 'EMERGENCY\nSHOWER'), [
    0,
    1.85,
    back + 0.03,
  ]);
  put(group, createEmergencySign(t, 0.4, 0.13, 'eyewash', 'EYE WASH'), [
    0,
    1.7,
    back + 0.03,
  ]);
  t.box(group, t.paint('#e8c21c', 0.6), 1.2, 0.004, 1.2, 0, 0.002, 0.05);
  t.box(group, t.paint('#f2f2ec', 0.7), 1.1, 0.005, 1.1, 0, 0.003, 0.05);
  put(
    group,
    brandLivery(kit, 'poolguard').nameplate(
      ['Safety shower and eyewash', 'EN 15154 · 76 + 12 L/min'],
      0.2,
      0.1,
    ),
    [0, 1.52, back + 0.025],
  );
  return group;
}

/**
 * A wall cabinet of protective equipment for handling the chemicals,
 * its door glazed: gauntlets, a face visor and an apron, under the signs
 * that say to wear them. After the small yellow PPE cabinets sold for
 * chemical stores (about 500 × 300 × 700 mm).
 */
export function createPpeCabinet(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  const cabinet = brandLivery(kit, 'poolguard');
  const yellow = cabinet.paint.casing;
  const W = 0.5,
    H = 0.7,
    D = 0.3,
    y = 0.25;
  t.box(group, yellow, W, H, 0.01, 0, y, 0.005);
  t.box(group, yellow, W, 0.02, D, 0, y + H / 2, D / 2);
  t.box(group, yellow, W, 0.02, D, 0, y - H / 2, D / 2);
  for (const x of [-W / 2, W / 2])
    t.box(group, yellow, 0.02, H, D, x, y, D / 2);
  t.box(group, yellow, W, 0.015, D - 0.02, 0, y - 0.05, D / 2);
  // Inside: a visor on its hook, a pair of gauntlets, a folded apron.
  const black = t.paint('#1d1d1d', 0.7);
  t.box(
    group,
    t.paint('#b9d6e0', 0.15),
    0.22,
    0.2,
    0.01,
    -0.1,
    y + 0.15,
    0.15,
  ).rotation.x = -0.2;
  t.box(group, black, 0.22, 0.02, 0.05, -0.1, y + 0.26, 0.12);
  for (const x of [0.07, 0.15])
    t.box(group, black, 0.07, 0.03, 0.3, x, y + 0.04, 0.13);
  t.box(group, black, 0.36, 0.05, 0.22, 0, y - 0.27, 0.14);
  // The glazed door.
  const glass = new MeshStandardMaterial({
    color: '#cfe3ea',
    transparent: true,
    opacity: 0.25,
    roughness: 0.05,
  });
  kit.materials.push(glass);
  t.box(group, glass, W - 0.08, H - 0.12, 0.004, 0, y, D);
  for (const x of [-W / 2 + 0.02, W / 2 - 0.02])
    t.box(group, yellow, 0.04, H, 0.015, x, y, D);
  for (const yy of [y - H / 2 + 0.03, y + H / 2 - 0.03])
    t.box(group, yellow, W, 0.06, 0.015, 0, yy, D);
  put(
    group,
    createMandatorySign(
      t,
      0.5,
      0.22,
      ['gloves', 'visor', 'apron', 'boots'],
      'WEAR PPE TO HANDLE CHEMICALS',
    ),
    [0, y - H / 2 - 0.15, 0.012],
  );
  put(group, cabinet.badge(0.025), [0, y + H / 2 - 0.03, D + 0.009]);
  return group;
}

/**
 * The store's ventilation and gas detection: chlorine is heavier than
 * air, so the extract draws from a grille near the floor through a
 * Ø150 mm duct to an in-line fan and out; a chlorine detector watches
 * the low air and sounds a beacon over the door. After the Vent-Axia
 * ACM150 in-line fan (350 × 256 × 200 mm, 522 m³/h) and the Crowcon
 * Xgard Type 1 detector for Cl₂ (156 × 166 × 111 mm). The origin is the
 * middle of the exhibit, 1.1 m above its lowest point.
 */
export function createStoreVentilation(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  const galv = t.paint(FINISH.galvanised, 0.4, 0.6);
  const lo = -1.1;
  // The low-level grille and the duct up from it.
  t.box(
    group,
    t.paint('#d8d9d4', 0.5),
    0.32,
    0.17,
    0.03,
    -0.3,
    lo + 0.3,
    0.015,
  );
  for (let i = 0; i < 6; i++)
    t.box(
      group,
      t.paint('#3a3d3f', 0.6),
      0.28,
      0.008,
      0.01,
      -0.3,
      lo + 0.24 + i * 0.024,
      0.032,
    );
  t.rod(group, galv, [-0.3, lo + 0.38, 0.12], [-0.3, 0.35, 0.12], 0.075, 24);
  t.rod(group, galv, [-0.3, lo + 0.3, 0.03], [-0.3, lo + 0.3, 0.12], 0.075, 24);
  // The in-line fan, its terminal box and a run lamp.
  const fan = brandLivery(kit, 'bonk-industries');
  t.cyl(group, fan.paint.casing, 0.128, 0.35, -0.3, 0.55, 0.12, 'y', 32);
  t.box(group, fan.paint.main, 0.08, 0.1, 0.06, -0.15, 0.55, 0.12);
  t.rod(group, galv, [-0.3, 0.73, 0.12], [-0.3, 0.98, 0.12], 0.075, 24);
  t.rod(group, galv, [-0.3, 0.98, 0.12], [-0.3, 0.98, 0], 0.075, 24);
  put(
    group,
    createTag(t, 'EXTRACT FAN EF-801\nTO OUTSIDE ↑', 0.22),
    [-0.3, 0.3, 0.205],
  );
  put(group, fan.badge(0.025), [-0.3, 0.55, 0.25]);
  // The chlorine detector, low, sensor pointing down.
  const det = new Group();
  det.position.set(0.3, lo + 0.55, 0);
  group.add(det);
  const detector = brandLivery(kit, 'warden');
  t.box(det, detector.paint.casing, 0.156, 0.166, 0.111, 0, 0, 0.0555);
  t.cyl(det, t.paint('#9a9fa2', 0.4, 0.5), 0.03, 0.06, 0, -0.11, 0.06, 'y', 20);
  t.cyl(det, t.paint('#3a7d3f', 0.4), 0.006, 0.004, 0.05, 0.05, 0.112, 'z', 12);
  put(det, createTag(t, 'GD-801\nCl₂ 0–5 ppm', 0.14), [0, 0.03, 0.112]);
  put(det, detector.badge(0.02), [0, -0.05, 0.112]);
  // The beacon and sounder over the door, and its warning.
  t.box(group, t.paint('#d9dad6', 0.5), 0.12, 0.1, 0.08, 0.3, 0.75, 0.04);
  t.cyl(group, t.paint('#d48a1a', 0.3), 0.045, 0.1, 0.3, 0.85, 0.05, 'y', 20);
  put(
    group,
    createNotice(t, 0.36, 0.18, [
      'CHLORINE GAS ALARM',
      'When flashing',
      'do not enter',
    ]),
    [0.3, 0.5, 0.005],
  );
  return group;
}

/**
 * The store's signs: what is kept here and the rule that keeps it safe,
 * on a board. Wall exhibit, `w` 1.6 m.
 */
export function createStoreSigns(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  t.box(group, t.paint('#d7dad3', 0.8), 1.6, 1.0, 0.02, 0, 0, 0.01);
  put(
    group,
    createNotice(t, 0.7, 0.32, [
      'DANGER · NEVER MIX',
      'Acid and hypochlorite together',
      'give off chlorine gas',
      'Separate bunds · separate fills',
    ]),
    [-0.4, 0.22, 0.021],
  );
  put(
    group,
    createNotice(t, 0.6, 0.32, [
      'NO ENTRY',
      'Authorised persons only',
      'Extract fan must be running',
      'COSHH sheets at the office',
    ]),
    [0.42, 0.22, 0.021],
  );
  put(
    group,
    createHazardLabel(
      t,
      0.42,
      0.32,
      'SODIUM HYPOCHLORITE',
      '14–15 % available chlorine · UN 1791',
      ['corrosive', 'environment'],
    ),
    [-0.5, -0.22, 0.021],
  );
  put(
    group,
    createHazardLabel(t, 0.42, 0.32, 'HYDROCHLORIC ACID', '32–33 % · UN 1789', [
      'corrosive',
      'exclamation',
    ]),
    [0.0, -0.22, 0.021],
  );
  put(
    group,
    createMandatorySign(
      t,
      0.42,
      0.32,
      ['gloves', 'visor', 'apron'],
      'PPE BEYOND THIS POINT',
    ),
    [0.5, -0.22, 0.021],
  );
  return group;
}
