import { CylinderGeometry, Group, Mesh } from 'three';
import type { Material } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { plantTools } from '../../plant/views/plant-tools';
import { createMicroLabel } from '../../core/views/eighties-controls';
import { createPallet, hazardMaterial } from './dock-parts';

/**
 * What else a loading dock and its goods yard hold (prompt 073; the owner,
 * 2026-10-26: a gallery of it in dev43): handling kit, vehicle safety, the
 * chemical fill cabinet and the generator connection cabinet. Rough,
 * blocked out at true size after the usual UK products, to refine later.
 * Each on the floor at its middle, its front toward +z, unless it says.
 */

type T = ReturnType<typeof plantTools>;

/** A hand pallet truck: forks 1150 mm long, its tiller and handle, its steer wheels. */
export function createPalletTruck(kit: PanelKit) {
  const t = plantTools(kit);
  const g = new Group();
  g.name = 'Hand pallet truck';
  const red = t.paint('#c8261c', 0.5, 0.3);
  const black = t.paint('#1b1b1c', 0.8);
  for (const x of [-0.27, 0.27]) {
    t.box(g, red, 0.16, 0.06, 1.15, x, 0.07, -0.45);
    t.cyl(g, black, 0.04, 0.07, x, 0.04, -0.95, 'x', 12);
  }
  t.box(g, red, 0.7, 0.25, 0.12, 0, 0.18, 0.18);
  t.cyl(g, black, 0.09, 0.08, 0, 0.09, 0.32, 'x', 16);
  t.box(g, red, 0.12, 0.3, 0.12, 0, 0.3, 0.3);
  t.rod(g, red, [0, 0.4, 0.32], [0, 1.15, 0.55], 0.025, 8);
  t.box(g, black, 0.3, 0.05, 0.05, 0, 1.17, 0.56);
  return g;
}

/**
 * A small counterbalance forklift, a 1.5 t electric truck: its chassis
 * and counterweight, overhead guard, mast and forks, seat and steering
 * wheel, its wheels. About 2.9 m long with forks, 1.1 m wide, 2.1 m high.
 */
export function createForklift(kit: PanelKit) {
  const t = plantTools(kit);
  const g = new Group();
  g.name = 'Counterbalance forklift';
  const yellow = t.paint('#e3b51f', 0.5, 0.2);
  const dark = t.paint('#2a2c2e', 0.6, 0.4);
  const black = t.paint('#151617', 0.85);
  // Chassis, counterweight at the back (+z), the mast at the front (-z).
  t.box(g, yellow, 1.05, 0.55, 1.8, 0, 0.5, 0.2);
  t.box(g, dark, 1.08, 0.6, 0.45, 0, 0.7, 1.0);
  for (const [x, z, r] of [
    [-0.45, -0.45, 0.24],
    [0.45, -0.45, 0.24],
    [-0.45, 0.85, 0.2],
    [0.45, 0.85, 0.2],
  ] as const)
    t.cyl(g, black, r, 0.2, x, r, z, 'x', 18);
  // The overhead guard on four posts.
  for (const x of [-0.48, 0.48])
    for (const z of [-0.3, 0.75]) t.box(g, dark, 0.05, 1.4, 0.05, x, 1.47, z);
  t.box(g, dark, 1.0, 0.05, 1.1, 0, 2.15, 0.22);
  // Seat, steering wheel.
  t.box(g, black, 0.45, 0.12, 0.45, 0, 0.9, 0.45);
  t.box(g, black, 0.45, 0.45, 0.08, 0, 1.15, 0.67);
  t.cyl(g, black, 0.16, 0.03, 0, 1.25, -0.05, 'y', 16).rotation.x = -0.6;
  // The mast, its carriage and forks.
  for (const x of [-0.3, 0.3]) t.box(g, dark, 0.08, 2.1, 0.1, x, 1.1, -0.75);
  t.box(g, dark, 0.8, 0.4, 0.05, 0, 0.35, -0.83);
  for (const x of [-0.28, 0.28]) t.box(g, dark, 0.1, 0.04, 1.1, x, 0.1, -1.4);
  return g;
}

/** A stack of `n` empty pallets. */
export function createPalletStack(kit: PanelKit, n = 6) {
  const g = new Group();
  g.name = 'Stack of empty pallets';
  for (let k = 0; k < n; k++) {
    const p = createPallet(kit);
    p.position.y = k * 0.144;
    p.rotation.y = (k % 2) * 0.03 - 0.015;
    g.add(p);
  }
  return g;
}

/** A roll cage: mesh sides and a base on four castors, 0.8 × 0.7 × 1.7 m. */
export function createRollCage(kit: PanelKit) {
  const t = plantTools(kit);
  const g = new Group();
  g.name = 'Roll cage';
  const zinc = t.paint('#b9bec0', 0.4, 0.7);
  const black = t.paint('#151617', 0.8);
  const W = 0.8;
  const D = 0.7;
  const H = 1.7;
  t.box(g, zinc, W, 0.04, D, 0, 0.16, 0);
  for (const x of [-W / 2 + 0.05, W / 2 - 0.05])
    for (const z of [-D / 2 + 0.05, D / 2 - 0.05])
      t.cyl(g, black, 0.05, 0.04, x, 0.06, z, 'x', 12);
  // Three mesh sides: bars every 0.1 m.
  for (const side of [-1, 1]) {
    for (let y = 0.2; y <= H; y += 0.15)
      t.box(g, zinc, 0.012, 0.012, D, side * (W / 2), y, 0);
    for (let z = -D / 2; z <= D / 2 + 1e-6; z += 0.1)
      t.box(
        g,
        zinc,
        0.012,
        H - 0.2,
        0.012,
        side * (W / 2),
        0.2 + (H - 0.2) / 2,
        z,
      );
  }
  for (let y = 0.2; y <= H; y += 0.15)
    t.box(g, zinc, W, 0.012, 0.012, 0, y, -D / 2);
  return g;
}

/** A sack truck, its nose plate on the floor, leaned back on its wheels. */
export function createSackTruck(kit: PanelKit) {
  const t = plantTools(kit);
  const g = new Group();
  g.name = 'Sack truck';
  const blue = t.paint('#1d4f9e', 0.5, 0.3);
  const black = t.paint('#151617', 0.85);
  const frame = new Group();
  for (const x of [-0.18, 0.18]) t.box(frame, blue, 0.03, 1.2, 0.03, x, 0.6, 0);
  for (const y of [0.4, 0.8, 1.15])
    t.box(frame, blue, 0.36, 0.025, 0.025, 0, y, 0);
  t.box(frame, blue, 0.4, 0.01, 0.2, 0, 0.005, -0.1);
  for (const x of [-0.24, 0.24])
    t.cyl(frame, black, 0.12, 0.06, x, 0.12, 0.08, 'x', 16);
  frame.rotation.x = 0.12;
  g.add(frame);
  return g;
}

/** A yellow steel bollard, 168 mm, 1.2 m high on its base plate. */
export function createBollard(kit: PanelKit) {
  const t = plantTools(kit);
  const g = new Group();
  g.name = 'Steel bollard';
  const yellow = t.paint('#e3b51f', 0.5, 0.3);
  t.cyl(g, yellow, 0.084, 1.2, 0, 0.6, 0, 'y', 20);
  t.cyl(g, t.paint('#151617', 0.8), 0.086, 0.08, 0, 1.0, 0, 'y', 20);
  t.box(g, t.paint('#8d9392', 0.5, 0.6), 0.3, 0.012, 0.3, 0, 0.006, 0);
  return g;
}

/** A convex safety mirror on its pole, 600 mm across. */
export function createSafetyMirror(kit: PanelKit) {
  const t = plantTools(kit);
  const g = new Group();
  g.name = 'Convex safety mirror';
  t.cyl(g, t.paint('#9da3a3', 0.5, 0.6), 0.03, 2.4, 0, 1.2, 0, 'y', 10);
  const rim = t.cyl(
    g,
    t.paint('#c8261c', 0.5),
    0.32,
    0.06,
    0,
    2.6,
    0.08,
    'z',
    28,
  );
  void rim;
  const glass = t.paint('#d9e2e6', 0.05, 1.0);
  t.cyl(g, glass, 0.29, 0.03, 0, 2.6, 0.12, 'z', 28);
  return g;
}

/** A length of steel pedestrian barrier, yellow, 2 m. */
export function createBarrier(kit: PanelKit, length = 2) {
  const t = plantTools(kit);
  const g = new Group();
  g.name = 'Pedestrian barrier';
  const yellow = t.paint('#e3b51f', 0.5, 0.3);
  for (const x of [-length / 2, length / 2]) {
    t.box(g, yellow, 0.08, 1.1, 0.08, x, 0.55, 0);
    t.box(g, t.paint('#8d9392', 0.5, 0.6), 0.2, 0.01, 0.2, x, 0.005, 0);
  }
  for (const y of [0.5, 1.05]) t.box(g, yellow, length, 0.08, 0.06, 0, y, 0);
  return g;
}

/** A 205 L drum on a two-drum spill pallet. */
export function createDrumOnSpillPallet(kit: PanelKit) {
  const t = plantTools(kit);
  const g = new Group();
  g.name = 'Drum on a spill pallet';
  const yellow = t.paint('#e3b51f', 0.6);
  t.box(g, yellow, 1.25, 0.3, 0.7, 0, 0.15, 0);
  t.box(g, t.paint('#2f3436', 0.7, 0.5), 1.2, 0.02, 0.66, 0, 0.31, 0);
  const blue = t.paint('#1d4f9e', 0.45, 0.4);
  t.cyl(g, blue, 0.29, 0.88, -0.3, 0.32 + 0.44, 0, 'y', 24);
  return g;
}

/** A dock leveller, out of its pit: deck, lip and pit frame. Origin on the floor at its middle. */
export function createDockLeveller(kit: PanelKit) {
  const t = plantTools(kit);
  const g = new Group();
  g.name = 'Dock leveller';
  const plate = t.paint('#6e7275', 0.6, 0.6);
  const yellow = t.paint('#d8b41c', 0.6);
  t.box(g, plate, 2.0, 0.04, 2.5, 0, 0.02, 0);
  for (const s of [-1, 1])
    t.box(g, yellow, 0.08, 0.041, 2.5, s * 1.04, 0.0205, 0);
  const lip = t.box(g, plate, 2.0, 0.025, 0.45, 0, 0.02, -1.45);
  lip.rotation.x = 0.25;
  t.box(g, hazardMaterial(kit, 6), 2.0, 0.006, 0.08, 0, 0.043, 1.21);
  return g;
}

/** A dock shelter: a padded frame for the opening's sides and head. Origin at the wall at its foot's middle. */
export function createDockShelter(kit: PanelKit, w = 3.5, h = 4.5) {
  const t = plantTools(kit);
  const g = new Group();
  g.name = 'Dock shelter';
  const pad = t.paint('#2a2c2e', 0.95);
  const stripe = t.paint('#e3b51f', 0.7);
  for (const s of [-1, 1]) {
    t.box(g, pad, 0.3, h, 0.5, s * (w / 2 + 0.15), h / 2, 0.25);
    t.box(g, stripe, 0.08, h - 0.4, 0.005, s * (w / 2 + 0.15), h / 2, 0.503);
  }
  t.box(g, pad, w + 0.6, 0.6, 0.5, 0, h + 0.3, 0.25);
  return g;
}

/**
 * A wall cabinet with a door that opens: its box `w` × `h` × `d`, the door
 * hinged on its left. Origin on the wall at its back's middle, facing +z.
 * `door` is the hinge group, its turn opening it.
 */
function wallCabinet(t: T, colour: string, w: number, h: number, d: number) {
  const g = new Group();
  const body = t.paint(colour, 0.5, 0.3);
  const inside = t.paint('#3a3d3f', 0.8);
  // Back, sides, top and bottom: an open box.
  t.box(g, body, w, h, 0.02, 0, 0, 0.01);
  for (const s of [-1, 1])
    t.box(g, body, 0.02, h, d, s * (w / 2 - 0.01), 0, d / 2);
  for (const s of [-1, 1])
    t.box(g, body, w, 0.02, d, 0, s * (h / 2 - 0.01), d / 2);
  t.box(g, inside, w - 0.04, h - 0.04, 0.005, 0, 0, 0.023);
  const door = new Group();
  door.position.set(-w / 2, 0, d);
  t.box(door, body, w, h, 0.02, w / 2, 0, 0.01);
  t.box(door, t.paint('#1b1b1c', 0.6), 0.03, 0.15, 0.04, w - 0.08, 0, 0.04);
  g.add(door);
  return { g, door };
}

/**
 * The chemical delivery fill cabinet (prompt 080): stainless, lockable,
 * both inlets in it, segregated, each on its own bunded tray: acid on a
 * 2 inch dry-break coupling, red; sodium hypochlorite on a 1½ inch
 * coupling of another type, yellow, so neither hose fits the other's.
 */
export function createFillCabinet(kit: PanelKit) {
  const t = plantTools(kit);
  const { g, door } = wallCabinet(t, '#b9bec0', 1.1, 1.1, 0.45);
  g.name = 'Chemical delivery fill cabinet';
  const inlets: [string, string, number, number][] = [
    ['ACID', '#c8261c', -0.26, 0.032],
    ['SODIUM\\nHYPOCHLORITE', '#e3b51f', 0.26, 0.026],
  ];
  for (const [name, colour, x, r] of inlets) {
    const paint = t.paint(colour, 0.5, 0.3);
    t.box(g, t.paint('#2f3436', 0.7), 0.42, 0.04, 0.38, x, -0.5, 0.21);
    t.rod(
      g,
      t.paint('#8d9392', 0.4, 0.6),
      [x, -0.55, 0.05],
      [x, 0.0, 0.05],
      r,
      12,
    );
    t.rod(
      g,
      t.paint('#8d9392', 0.4, 0.6),
      [x, 0.0, 0.05],
      [x, 0.0, 0.3],
      r,
      12,
    );
    t.cyl(g, paint, r + 0.02, 0.08, x, 0.0, 0.33, 'z', 16);
    t.cyl(g, paint, r + 0.03, 0.03, x, 0.0, 0.38, 'z', 16);
    const l = createMicroLabel(kit, name.replace('\\n', '\n'), {
      height: 0.025,
      ink: '#ffffff',
      plate: colour === '#e3b51f' ? '#8a6d0c' : colour,
    });
    l.position.set(x, 0.3, 0.03);
    g.add(l);
  }
  t.box(g, t.paint('#9da3a3', 0.5), 0.02, 1.06, 0.4, 0, 0, 0.22);
  return { group: g, door };
}

/**
 * The generator connection cabinet (prompt 080): heavy steel, a door that
 * opens, inside it single-pole connectors of the Powerlock kind, L1 L2 L3
 * in brown, black and grey and earth in green and yellow (a neutral, blue,
 * to be settled in 077), each under its cover, on a backboard.
 */
export function createGeneratorCabinet(kit: PanelKit) {
  const t = plantTools(kit);
  const { g, door } = wallCabinet(t, '#5d6a72', 1.0, 1.3, 0.4);
  g.name = 'Generator connection cabinet';
  const poles: [string, string][] = [
    ['L1', '#6b3f1d'],
    ['L2', '#1b1b1c'],
    ['L3', '#8d9294'],
    ['E', '#2f8f3a'],
  ];
  poles.forEach(([name, colour], i) => {
    const x = -0.33 + i * 0.22;
    const m: Material = t.paint(colour, 0.45, 0.2);
    t.cyl(g, m, 0.045, 0.14, x, -0.1, 0.1, 'z', 16);
    t.cyl(g, t.paint('#26282a', 0.6), 0.055, 0.03, x, -0.1, 0.04, 'z', 16);
    if (name === 'E')
      t.box(g, t.paint('#e3c81f', 0.5), 0.092, 0.025, 0.142, x, -0.1, 0.1);
    const l = createMicroLabel(kit, name, {
      height: 0.03,
      ink: '#ffffff',
      plate: '#26282a',
    });
    l.position.set(x, 0.05, 0.03);
    g.add(l);
  });
  const warn = createMicroLabel(kit, 'DANGER 400 V\nGENERATOR CONNECTION', {
    height: 0.022,
    ink: '#111111',
    plate: '#e3b51f',
  });
  warn.position.set(0, 0.4, 0.03);
  g.add(warn);
  return { group: g, door };
}

// ---- The goods yard's dressing (prompt 083; the owner, 2026-10-26) -------

/** An 1100 L four-wheeled steel bin, its lid's colour its stream's. */
export function createWheelieBin(
  kit: PanelKit,
  lid = '#2f6b33',
  label = 'GENERAL WASTE',
) {
  const t = plantTools(kit);
  const g = new Group();
  g.name = `1100 L bin: ${label}`;
  const steel = t.paint('#8d9392', 0.5, 0.6);
  const black = t.paint('#151617', 0.85);
  t.box(g, steel, 1.24, 1.0, 0.98, 0, 0.66, 0);
  // Its domed lid in two halves.
  for (const s of [-1, 1]) {
    const half = t.box(g, t.paint(lid, 0.6), 0.62, 0.06, 1.0, s * 0.31, 1.2, 0);
    half.rotation.z = s * 0.06;
  }
  for (const x of [-0.5, 0.5])
    for (const z of [-0.38, 0.38])
      t.cyl(g, black, 0.1, 0.05, x, 0.1, z, 'x', 14);
  const l = createMicroLabel(kit, label, {
    height: 0.06,
    ink: '#ffffff',
    plate: lid,
  });
  l.position.set(0, 0.85, 0.492);
  g.add(l);
  return g;
}

/** A tired planter: a square tub and a half-dead shrub. */
export function createSadPlanter(kit: PanelKit, seed = 1) {
  const t = plantTools(kit);
  const g = new Group();
  g.name = 'Planter';
  t.box(g, t.paint('#3a3d3f', 0.8), 0.6, 0.55, 0.6, 0, 0.275, 0);
  t.box(g, t.paint('#4a3a2a', 1), 0.54, 0.02, 0.54, 0, 0.55, 0);
  // A thin shrub, brown more than green, a few leaves left.
  let r = seed * 9301 + 49297;
  const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  const brown = t.paint('#6b5236', 0.9);
  const leaf = t.paint('#6f7a3a', 0.9);
  for (let k = 0; k < 5; k++) {
    const a = rnd() * Math.PI * 2;
    const len = 0.4 + rnd() * 0.5;
    t.rod(
      g,
      brown,
      [0, 0.55, 0],
      [Math.cos(a) * 0.2, 0.55 + len, Math.sin(a) * 0.2],
      0.012,
      6,
    );
    if (rnd() < 0.6)
      t.box(
        g,
        leaf,
        0.12,
        0.08,
        0.1,
        Math.cos(a) * 0.18,
        0.5 + len,
        Math.sin(a) * 0.18,
      );
  }
  return g;
}

/** A yellow grit bin, its lid shut. */
export function createGritBin(kit: PanelKit) {
  const t = plantTools(kit);
  const g = new Group();
  g.name = 'Grit bin';
  const yellow = t.paint('#e3b51f', 0.6);
  t.box(g, yellow, 0.9, 0.6, 0.6, 0, 0.3, 0);
  t.box(g, yellow, 0.94, 0.08, 0.66, 0, 0.64, 0);
  const l = createMicroLabel(kit, 'GRIT', { height: 0.1, ink: '#111111' });
  l.position.set(0, 0.35, 0.302);
  g.add(l);
  return g;
}

/** A traffic cone, 750 mm. */
export function createCone(kit: PanelKit) {
  const t = plantTools(kit);
  const g = new Group();
  g.name = 'Traffic cone';
  const m = new Mesh(
    new CylinderGeometry(0.035, 0.17, 0.72, 16),
    t.paint('#e8561a', 0.6),
  );
  m.position.y = 0.39;
  g.add(m);
  t.box(g, t.paint('#151617', 0.8), 0.38, 0.03, 0.38, 0, 0.015, 0);
  const band = new Mesh(
    new CylinderGeometry(0.1, 0.12, 0.1, 16),
    t.paint('#e9e6dc', 0.4),
  );
  band.position.y = 0.45;
  g.add(band);
  return g;
}

/** A strapped stack of flattened cardboard on a pallet. */
export function createCardboardStack(kit: PanelKit) {
  const g = new Group();
  g.name = 'Flattened cardboard';
  g.add(createPallet(kit));
  const t = plantTools(kit);
  const card = t.paint('#a88654', 0.9);
  for (let k = 0; k < 8; k++) {
    const sheet = t.box(
      g,
      card,
      1.15,
      0.06,
      0.95,
      (k % 2) * 0.03 - 0.015,
      0.144 + 0.03 + k * 0.06,
      (k % 3) * 0.02 - 0.02,
    );
    sheet.rotation.y = (k % 2) * 0.03;
  }
  for (const x of [-0.3, 0.3])
    t.box(g, t.paint('#1d4f9e', 0.5), 0.03, 0.52, 0.97, x, 0.42, 0);
  return g;
}

/** A stack of returnable plastic crates, `n` high. */
export function createCrateStack(kit: PanelKit, n = 5, colour = '#2a6fa8') {
  const t = plantTools(kit);
  const g = new Group();
  g.name = 'Returned crates';
  const m = t.paint(colour, 0.6);
  for (let k = 0; k < n; k++) {
    const c = t.box(g, m, 0.6, 0.3, 0.4, 0, 0.15 + k * 0.29, 0);
    c.rotation.y = (k % 2) * 0.05;
  }
  return g;
}

/** A wall-mounted cigarette bin, stainless. Origin at its back, facing +z. */
export function createCigaretteBin(kit: PanelKit) {
  const t = plantTools(kit);
  const g = new Group();
  g.name = 'Cigarette bin';
  t.cyl(g, t.paint('#b9bec0', 0.3, 0.8), 0.07, 0.45, 0, 0, 0.08, 'y', 18);
  t.cyl(g, t.paint('#2a2c2e', 0.6), 0.072, 0.06, 0, 0.23, 0.08, 'y', 18);
  return g;
}
