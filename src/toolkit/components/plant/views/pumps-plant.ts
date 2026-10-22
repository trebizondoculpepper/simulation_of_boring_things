import { Group, Mesh, MeshStandardMaterial, SphereGeometry } from 'three';
import type { Material, Object3D } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { SANS } from '../../core/views/fitting-tools';
import { createBrandBadge } from '../../core/views/brand-badge';
import { brandLivery } from '../../core/views/brand-livery';
import type { BrandId } from '../../core/logic/brands';
import { FINISH, PIPE_SIZES, plantTools } from './plant-tools';
import {
  PAIR_DISCHARGE_X,
  PAIR_STRAINER_X,
  PUMP_ALONG,
} from '../logic/pump-pair';
import type { DN, Point } from './plant-tools';
import { dot } from '../../industrial-control/logic/font-5x7';

/**
 * The pool circulation plant (dev_pumps), in metres, each machine at the
 * size of the commercial product it is modelled on
 * (`doc/research/plant-products-pumps-balance.md`), under a maker of the
 * game's own. Floor machines stand on the floor at their origin, their
 * front (gauges, plates, valve handles) toward +z; the drive is a wall
 * unit with its back at z = 0.
 */

type Tools = ReturnType<typeof plantTools>;

/** A maker's nameplate in its livery, facing +z at `at`. */
function nameplate(
  kit: PanelKit,
  parent: Object3D,
  id: BrandId,
  at: Point,
  lines: readonly string[],
  w = 0.16,
  h = 0.09,
) {
  const mesh = brandLivery(kit, id).nameplate(lines, w, h);
  mesh.position.set(...at);
  parent.add(mesh);
  return mesh;
}

/** A maker's badge on a plate, facing +z at `at`. */
function badge(
  kit: PanelKit,
  parent: Object3D,
  id: BrandId,
  at: Point,
  height = 0.035,
  plate = '#e6e7e2',
) {
  const mesh = createBrandBadge(kit, id, { height, plate });
  mesh.position.set(...at);
  parent.add(mesh);
  return mesh;
}

/** A ring of cooling fins round a motor along x, from `x0` to `x1`. */
function fins(
  t: Tools,
  parent: Object3D,
  paint: Material,
  r: number,
  x0: number,
  x1: number,
  y: number,
  z: number,
) {
  for (let x = x0; x <= x1; x += 0.05)
    t.cyl(parent, paint, r + 0.012, 0.012, x, y, z, 'x', 24);
}

/**
 * An IEC foot-mounted induction motor along x, shaft toward −x, its
 * shaft centre at `y`: frame, fins, fan cowl, terminal box and feet.
 */
function motor(
  t: Tools,
  parent: Object3D,
  {
    x,
    y,
    z,
    r,
    length,
  }: { x: number; y: number; z: number; r: number; length: number },
  paint: Material,
  cowl: Material,
) {
  t.cyl(parent, paint, r, length, x, y, z, 'x', 28);
  fins(t, parent, paint, r, x - length / 2 + 0.06, x + length / 2 - 0.12, y, z);
  // Drive-end shield and the fan cowl behind.
  t.cyl(parent, paint, r * 0.92, 0.04, x - length / 2 - 0.02, y, z, 'x', 28);
  t.cyl(parent, cowl, r * 1.02, 0.16, x + length / 2 + 0.08, y, z, 'x', 28);
  t.cyl(
    parent,
    t.paint('#141a1f', 0.7),
    r * 0.8,
    0.005,
    x + length / 2 + 0.162,
    y,
    z,
    'x',
    28,
  );
  // Terminal box on top, cable gland on its side.
  t.box(parent, paint, 0.2, 0.12, 0.2, x - 0.05, y + r + 0.05, z);
  t.cyl(
    parent,
    t.paint('#2b2b2b', 0.6),
    0.018,
    0.04,
    x - 0.05,
    y + r + 0.05,
    z + 0.12,
    'z',
    12,
  );
  // Feet.
  for (const fx of [x - length / 2 + 0.12, x + length / 2 - 0.12])
    t.box(
      parent,
      paint,
      0.1,
      y - r * 0.5,
      r * 1.6,
      fx,
      (y - r * 0.5) / 2 + 0.0,
      z,
    );
}

/** A flanged nozzle of size `dn` from `a` to `b`, flanged at `b`. */
function nozzle(
  t: Tools,
  parent: Object3D,
  paint: Material,
  dn: DN,
  a: Point,
  b: Point,
  axis: 'x' | 'y' | 'z',
) {
  t.rod(parent, paint, a, b, PIPE_SIZES[dn].od / 2 + 0.01, 24);
  t.flanges(parent, dn, b, axis, '#2d3a4a');
}

/**
 * A long-coupled end-suction pump set, after the Grundfos NK 150-315
 * with a 30 kW four-pole motor: a cast-iron volute with axial DN200
 * suction and radial DN150 discharge, bearing bracket, coupling guard and
 * motor on a fabricated base frame, about 1.9 m long. Suction toward −x.
 */
export function createEndSuctionPump(kit: PanelKit, x0 = 0) {
  const t = plantTools(kit);
  const group = new Group();
  group.position.x = x0;
  // Grundflow's livery: its casing colour for the iron, its shade for the base.
  const livery = brandLivery(kit, 'grundflow');
  const base = livery.paint.shade;
  const iron = livery.paint.casing;
  const L = 1.9;
  // Base frame: two channels and a deck plate, grouted to a plinth.
  t.box(group, t.paint(FINISH.concrete, 0.85), L + 0.2, 0.1, 0.8, 0, 0.05, 0);
  for (const z of [-0.25, 0.25]) t.box(group, base, L, 0.12, 0.08, 0, 0.16, z);
  t.box(group, base, L, 0.012, 0.58, 0, 0.226, 0);
  const shaftY = 0.68;
  // The volute, at the suction end, its axis along x.
  const vx = -L / 2 + 0.38;
  t.cyl(group, iron, 0.36, 0.26, vx, shaftY, 0, 'x', 36);
  t.cyl(group, iron, 0.3, 0.06, vx - 0.16, shaftY, 0, 'x', 32);
  // Casing foot.
  t.box(
    group,
    iron,
    0.2,
    shaftY - 0.36 - 0.23,
    0.4,
    vx,
    (shaftY - 0.36 + 0.23) / 2,
    0,
  );
  // Axial suction toward −x, radial discharge straight up.
  nozzle(
    t,
    group,
    iron,
    200,
    [vx - 0.2, shaftY, 0],
    [-L / 2 - 0.05, shaftY, 0],
    'x',
  );
  nozzle(
    t,
    group,
    iron,
    150,
    [vx, shaftY + 0.3, 0.12],
    [vx, shaftY + 0.58, 0.12],
    'y',
  );
  // Bearing bracket and coupling guard.
  t.cyl(group, iron, 0.12, 0.36, vx + 0.31, shaftY, 0, 'x', 24);
  t.box(group, livery.paint.accent, 0.3, 0.3, 0.3, vx + 0.64, shaftY, 0);
  // The motor (frame 200L): shaft height to the base deck.
  motor(
    t,
    group,
    { x: L / 2 - 0.5, y: shaftY, z: 0, r: 0.2, length: 0.62 },
    livery.paint.main,
    livery.paint.shade,
  );
  badge(kit, group, 'grundflow', [vx, shaftY + 0.05, 0.37], 0.05);
  nameplate(
    kit,
    group,
    'grundflow',
    [L / 2 - 0.55, shaftY + 0.08, 0.205],
    ['NKC 150-315  30 kW  1475 min⁻¹', 'Q 300 m³/h  H 18 m', 'DN200/150  PN10'],
    0.16,
    0.08,
  );
  // Gauges on suction (a compound gauge: it can pull below atmospheric)
  // and discharge, live: `gauges` drives them.
  const suction = t.pressureGauge(group, [vx - 0.32, shaftY + 0.25, 0.08], {
    kind: 'compound',
    min: -1,
    max: 1.5,
    dia: 0.1,
    legend: 'SUCTION',
  });
  const discharge = t.pressureGauge(group, [vx, shaftY + 0.7, 0.24], {
    max: 4,
    dia: 0.1,
    legend: 'DISCHARGE',
    red: { from: 3.4, to: 4 },
  });
  return Object.assign(group, { gauges: { suction, discharge } });
}

/**
 * A hair-and-lint strainer ahead of a pump, after the AstralPool Aral
 * cast-iron strainer (Ø330, DN150/150): a vertical body with a basket
 * under a bolted lid with a clear sight window and lifting handles.
 */
export function createStrainer(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  const iron = brandLivery(kit, 'grundflow').paint.casing;
  const y = 0.68;
  t.cyl(group, iron, 0.165, 0.62, 0, 0.46, 0, 'y', 32);
  t.cyl(group, iron, 0.2, 0.05, 0, 0.17, 0, 'y', 32);
  // The lid: a flange, a clear window, clamp screws and handles.
  t.cyl(group, iron, 0.2, 0.04, 0, 0.79, 0, 'y', 32);
  t.cyl(group, t.paint('#9fc1c9', 0.1), 0.12, 0.012, 0, 0.815, 0, 'y', 32);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    t.cyl(
      group,
      t.paint('#c9a43b', 0.4, 0.6),
      0.016,
      0.06,
      Math.cos(a) * 0.17,
      0.83,
      Math.sin(a) * 0.17,
      'y',
      10,
    );
  }
  for (const x of [-0.12, 0.12])
    t.box(group, iron, 0.03, 0.08, 0.03, x, 0.85, 0);
  t.box(group, iron, 0.27, 0.025, 0.03, 0, 0.9, 0);
  // Inlet from −x, outlet to +x into the pump.
  nozzle(t, group, iron, 200, [-0.1, y - 0.15, 0], [-0.36, y - 0.15, 0], 'x');
  nozzle(t, group, iron, 200, [0.1, y, 0], [0.36, y, 0], 'x');
  // A drain plug.
  t.cyl(
    group,
    t.paint(FINISH.brass, 0.35, 0.7),
    0.02,
    0.04,
    0,
    0.2,
    0.18,
    'z',
    10,
  );
  return group;
}

/**
 * Duty and standby circulation pumps, each with its strainer ahead of it
 * and a butterfly valve either side: two sets side by side.
 */
export function createPumpPair(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  const pumps: ReturnType<typeof createEndSuctionPump>[] = [];
  for (const [z, name] of [
    [-0.75, 'P-101A DUTY'],
    [0.75, 'P-101B STANDBY'],
  ] as const) {
    const set = new Group();
    set.position.z = z;
    group.add(set);
    const pump = createEndSuctionPump(kit, PUMP_ALONG);
    pumps.push(pump);
    set.add(pump);
    // The strainer hard up against the pump's suction flange.
    const strainer = createStrainer(kit);
    strainer.position.x = PAIR_STRAINER_X;
    set.add(strainer);
    // Isolating valve on the discharge, and a short riser, straight up off
    // the pump's discharge nozzle.
    t.pipe(set, 150, [
      [PAIR_DISCHARGE_X, 1.28, 0.12],
      [PAIR_DISCHARGE_X, 1.75, 0.12],
    ]);
    t.butterflyValve(set, 150, [PAIR_DISCHARGE_X, 1.5, 0.12], 'y');
    const tag = t.printed(
      0.3,
      0.06,
      (c, w, h) => {
        c.fillStyle = '#f2d34a';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#1a1a1a';
        c.font = `bold ${h * 0.55}px ${SANS}`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(name, w / 2, h / 2);
      },
      256,
    );
    tag.mesh.position.set(-0.4, 0.3, 0.42);
    set.add(tag.mesh);
  }
  return Object.assign(group, { pumps });
}

/**
 * A variable-speed drive for a 30 kW pump, after the Danfoss VLT AQUA
 * Drive FC 202 in its IP55 B2 enclosure (about 243 × 664 × 261 mm): a
 * wall unit with its keypad and display, and a rotary isolator beside it.
 */
export function createDriveView(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  const w = 0.243,
    h = 0.664,
    d = 0.261;
  const livery = brandLivery(kit, 'torvald');
  const case_ = livery.paint.casing;
  t.box(group, case_, w, h, d, 0, 0, d / 2);
  t.box(
    group,
    livery.paint.tint,
    w - 0.02,
    h * 0.55,
    0.004,
    0,
    h * 0.12,
    d + 0.002,
  );
  // Keypad and display.
  t.box(group, livery.paint.shade, 0.12, 0.17, 0.012, 0, h * 0.22, d + 0.008);
  const screen = t.printed(
    0.09,
    0.05,
    (c, cw, ch) => {
      c.fillStyle = '#183a2a';
      c.fillRect(0, 0, cw, ch);
      c.fillStyle = '#9ff0b9';
      c.font = `${ch * 0.28}px monospace`;
      c.fillText('42.6 Hz', cw * 0.08, ch * 0.4);
      c.fillText('288 m3/h', cw * 0.08, ch * 0.8);
    },
    128,
  );
  screen.mesh.position.set(0, h * 0.27, d + 0.015);
  screen.mesh.name = 'drive display';
  screen.mesh.userData.live = true;
  group.add(screen.mesh);
  for (let i = 0; i < 6; i++)
    t.cyl(
      group,
      t.paint('#5b6166', 0.5),
      0.008,
      0.006,
      -0.03 + (i % 3) * 0.03,
      h * 0.17 - Math.floor(i / 3) * 0.03,
      d + 0.016,
      'z',
      10,
    );
  // Vents and cable glands below.
  for (let i = 0; i < 6; i++)
    t.box(
      group,
      t.paint('#16181a', 0.7),
      w - 0.06,
      0.006,
      0.004,
      0,
      -h / 2 + 0.06 + i * 0.016,
      d + 0.002,
    );
  for (const x of [-0.07, 0, 0.07])
    t.cyl(
      group,
      t.paint('#202020', 0.6),
      0.014,
      0.04,
      x,
      -h / 2 - 0.02,
      d / 2,
      'y',
      12,
    );
  badge(kit, group, 'torvald', [0, -h * 0.25, d + 0.003], 0.025);
  // The rotary isolator: a grey box with a red and yellow handle.
  const iso = new Group();
  iso.position.set(w / 2 + 0.16, 0.1, 0);
  group.add(iso);
  const isolator = brandLivery(kit, 'voltara');
  t.box(iso, isolator.paint.casing, 0.15, 0.2, 0.12, 0, 0, 0.06);
  const isolatorFace = new Group();
  isolatorFace.position.z = 0.12;
  iso.add(isolatorFace);
  return {
    group,
    isolatorFace,
    setPowered(on: boolean) {
      screen.mesh.visible = on;
    },
  };
}

/**
 * A vertical pressure sand filter of diameter `dia` and shell height
 * `shell`, after the Waterco SMDD commercial range (fibreglass, 1.2 m bed,
 * double-yoke lid, sight glass, service hatch, flanged face piping): the
 * vessel on its base ring, the lid on top, and the five-valve battery on
 * its face (inlet, outlet, backwash in and out, rinse), with gauges.
 */
export function createSandFilter(
  kit: PanelKit,
  {
    dia,
    shell,
    dn,
    label,
  }: { dia: number; shell: number; dn: DN; label: string },
) {
  const t = plantTools(kit);
  const group = new Group() as Group & {
    /** Its inlet (top) and outlet (bottom) gauges, bar. */
    show(s: { inlet: number; outlet: number }, delta: number): void;
  };
  const livery = brandLivery(kit, 'lidoluxe');
  const glass = livery.paint.casing;
  const r = dia / 2;
  const base = 0.3;
  const zc = -0.35; // the vessel sits back, its face piping in front.
  // Base ring and the vessel's straight shell with domed ends.
  t.cyl(group, livery.paint.shade, r * 0.8, base, 0, base / 2, zc, 'y', 40);
  const cy = base + r * 0.35 + shell / 2;
  t.cyl(group, glass, r, shell, 0, cy, zc, 'y', 48);
  for (const [y, s] of [
    [cy + shell / 2, 1],
    [cy - shell / 2, -1],
  ] as const) {
    const dome = new Mesh(
      new SphereGeometry(r, 48, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      glass,
    );
    dome.scale.set(1, 0.35 * s, 1);
    dome.position.set(0, y, zc);
    group.add(dome);
  }
  // Winding bands, a darker resin line every 0.4 m.
  for (let y = cy - shell / 2 + 0.2; y < cy + shell / 2; y += 0.4)
    t.cyl(group, livery.paint.main, r + 0.003, 0.02, 0, y, zc, 'y', 48);
  // The lid: a round hatch with its double yoke and lifting eye.
  const top = cy + shell / 2 + r * 0.35;
  const steel = t.paint(FINISH.galvanised, 0.4, 0.6);
  t.cyl(group, glass, 0.3, 0.08, 0, top - 0.02, zc, 'y', 32);
  for (const a of [0, Math.PI / 2]) {
    const yoke = t.box(group, steel, 0.7, 0.06, 0.06, 0, top + 0.05, zc);
    yoke.rotation.y = a;
  }
  t.cyl(group, steel, 0.04, 0.12, 0, top + 0.12, zc, 'y', 16);
  // Service hatch low on the face, sight glass at the bed's top.
  const face = zc + r;
  t.cyl(
    group,
    glass,
    0.22,
    0.06,
    0,
    cy - shell / 2 + 0.35,
    face - 0.01,
    'z',
    28,
  );
  t.cyl(
    group,
    t.paint('#aab2b4', 0.4, 0.5),
    0.2,
    0.02,
    0,
    cy - shell / 2 + 0.35,
    face + 0.025,
    'z',
    28,
  );
  // Seat the sight glass outside the curved shell at its offset position.
  // A fixed fraction of the front radius buried most of the disc in the vessel.
  const sightX = -r * 0.45;
  const sightZ = Math.sqrt(r * r - sightX * sightX);
  const sightMount = new Group();
  sightMount.position.set(sightX, cy + 0.15, zc + sightZ);
  sightMount.rotation.y = Math.atan2(sightX, sightZ);
  group.add(sightMount);
  t.cyl(sightMount, livery.paint.shade, 0.115, 0.025, 0, 0, 0.018, 'z', 24);
  t.cyl(sightMount, t.paint('#9fc1c9', 0.1), 0.095, 0.01, 0, 0, 0.036, 'z', 24);
  // Air bleed pipe from the top down the face.
  t.rod(
    group,
    t.paint('#e8e8e3', 0.4),
    [r * 0.3, top - 0.05, zc + r * 0.4],
    [r * 0.3, top - 0.05, face + 0.05],
    0.012,
  );
  t.rod(
    group,
    t.paint('#e8e8e3', 0.4),
    [r * 0.3, top - 0.05, face + 0.05],
    [r * 0.3, 1.0, face + 0.05],
    0.012,
  );
  // The two gauges belong to the vessel. Its water nozzles and all pipework
  // are placed from the shared machine-port data by the room.
  const s = PIPE_SIZES[dn];
  const [inletGauge, outletGauge] = [cy + shell / 2 - 0.15, base + 0.45].map(
    (y) =>
      t.pressureGauge(group, [0, y + s.od / 2 + 0.12, face + 0.04], {
        max: 4,
        dia: 0.1,
      }),
  );
  group.show = ({ inlet, outlet }, delta) => {
    inletGauge.set(inlet);
    outletGauge.set(outlet);
    inletGauge.update(delta);
    outletGauge.update(delta);
  };
  badge(kit, group, 'lidoluxe', [0, cy + 0.45, face + 0.005], 0.08);
  nameplate(
    kit,
    group,
    'lidoluxe',
    [r * 0.35, cy + 0.2, face + 0.004],
    [label, '4 bar  40 °C', 'Bed depth 1.2 m'],
    0.16,
    0.08,
  );
  return group;
}

/**
 * A medium-pressure UV unit, after the VGE Pro type 2000-219 (316L
 * stainless chamber Ø219 mm, DN200 flanges, one 2 kW lamp): the chamber
 * on two stands, the lamp's end housing with its cable, the wiper drive,
 * the UV intensity sensor, and its control panel on a stand behind.
 */
export function createUvUnit(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group() as Group & {
    /** Its lamp on (water flowing) or off, its screen and lamps showing it. */
    show(s: { on: boolean; flowing: boolean }): void;
  };
  const ss = t.paint(FINISH.stainless, 0.25, 0.85);
  const y = 0.8,
    L = 1.1;
  t.cyl(group, ss, 0.1095, L, 0, y, 0, 'x', 32);
  for (const x of [-L / 2, L / 2])
    t.flanges(group, 200, [x, y, 0], 'x', FINISH.stainless);
  // Inlet and outlet tees down to floor level runs.
  t.pipe(group, 200, [
    [-L / 2 - 0.25, y, 0],
    [-L / 2, y, 0],
  ]);
  t.pipe(group, 200, [
    [L / 2, y, 0],
    [L / 2 + 0.25, y, 0],
  ]);
  // Lamp end housing (the lamp lies across the flow) and its cable.
  t.cyl(group, ss, 0.07, 0.22, 0.2, y, 0.2, 'z', 24);
  t.cyl(group, t.paint('#2b2b2b', 0.6), 0.075, 0.08, 0.2, y, 0.33, 'z', 24);
  t.rod(
    group,
    t.paint('#1d1d1d', 0.7),
    [0.2, y, 0.37],
    [0.2, 1.35, 0.6],
    0.012,
    8,
  );
  // Wiper drive and UV sensor.
  t.cyl(
    group,
    brandLivery(kit, 'lidoluxe').paint.main,
    0.05,
    0.14,
    -0.25,
    y + 0.17,
    0,
    'y',
    20,
  );
  t.cyl(group, ss, 0.025, 0.08, -0.05, y + 0.14, 0.04, 'y', 12);
  for (const x of [-0.35, 0.35]) {
    t.rod(
      group,
      t.paint(FINISH.galvanised, 0.4, 0.6),
      [x, 0, 0],
      [x, y - 0.11, 0],
      0.02,
    );
    t.box(
      group,
      t.paint(FINISH.galvanised, 0.4, 0.6),
      0.2,
      0.01,
      0.2,
      x,
      0.005,
      0,
    );
  }
  // Control panel on a stand.
  const panel = new Group();
  panel.position.set(0.2, 0, 0.6);
  group.add(panel);
  t.rod(
    panel,
    t.paint(FINISH.galvanised, 0.4, 0.6),
    [0, 0, 0],
    [0, 1.1, 0],
    0.025,
  );
  t.box(
    panel,
    brandLivery(kit, 'lidoluxe').paint.casing,
    0.4,
    0.5,
    0.2,
    0,
    1.3,
    0,
  );
  // Self-lit, as a VFD module is.
  const screen = t.printed(0.14, 0.06, () => {}, 256, true);
  screen.mesh.position.set(0, 1.38, 0.101);
  panel.add(screen.mesh);
  let shown = '';
  const draw = (lines: [string, string]) => {
    const key = lines.join('|');
    if (key === shown) return;
    shown = key;
    const c = screen.context;
    const cw = c.canvas.width;
    const ch = c.canvas.height;
    c.fillStyle = '#10243a';
    c.fillRect(0, 0, cw, ch);
    // A dot-matrix module: each character a 5 × 7 grid of dots from the
    // controller's character set (`font-5x7.ts`), the unlit dots faint.
    const columns = 12;
    const pitch = (cw - 16) / (columns * 6);
    const rowHeight = pitch * 9;
    const top = (ch - rowHeight * 2) / 2 + pitch;
    lines.forEach((line, r) => {
      for (let k = 0; k < columns; k++) {
        const letter = line[k] ?? ' ';
        const x0 = 8 + k * pitch * 6;
        const y0 = top + r * rowHeight;
        for (let dy = 0; dy < 7; dy++)
          for (let dx = 0; dx < 5; dx++) {
            c.fillStyle =
              letter !== ' ' && dot(letter, dx, dy) ? '#7fd4ff' : '#152f45';
            c.fillRect(
              x0 + dx * pitch,
              y0 + dy * pitch,
              pitch * 0.8,
              pitch * 0.8,
            );
          }
      }
    });
    screen.texture.needsUpdate = true;
  };
  // Its lamps: green LAMP ON, red UV FAIL (water flowing past an unlit lamp).
  const lampLit = (colour: string) => {
    const m = new MeshStandardMaterial({
      color: colour,
      emissive: colour,
      emissiveIntensity: 0,
      roughness: 0.3,
    });
    kit.materials.push(m);
    return m;
  };
  const green = lampLit('#3fbf4f');
  const red = lampLit('#c42b23');
  for (const [m, x] of [
    [green, -0.1],
    [red, -0.06],
  ] as const) {
    const lamp = t.cyl(panel, m, 0.012, 0.01, x, 1.2, 0.101, 'z', 12);
    lamp.userData.live = true;
  }
  badge(kit, panel, 'lidoluxe', [0.1, 1.17, 0.102], 0.03);
  screen.mesh.userData.live = true;
  group.show = ({ on, flowing }) => {
    draw(on ? ['UV 87 W/m2', 'LAMP 6120 h'] : ['UV  0 W/m2', 'LAMP OFF']);
    green.emissiveIntensity = on ? 1.2 : 0;
    red.emissiveIntensity = flowing && !on ? 1.2 : 0;
  };
  group.show({ on: true, flowing: true });
  return group;
}

/**
 * A gasketed plate heat exchanger, after the Alfa Laval M10-BFG (frame
 * 1084 mm high, 470 mm wide): the frame plate with its four DN100 ports,
 * the plate pack, the pressure plate, carrying and guide bars, tie bolts
 * and the end support. Pool water one side, LTHW the other.
 */
export function createPlateHeatExchanger(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  const blue = brandLivery(kit, 'neumann-dynamik').paint.casing;
  const ss = t.paint(FINISH.stainless, 0.3, 0.85);
  const H = 1.084,
    W = 0.47;
  // Frame plate at x = 0, pressure plate at the plate pack's end, support at the far end.
  t.box(group, blue, 0.06, H, W, 0, H / 2, 0);
  const pack = 0.42;
  t.box(group, ss, pack, H * 0.86, W * 0.9, 0.03 + pack / 2, H * 0.47, 0);
  for (let x = 0.04; x < pack; x += 0.012)
    t.box(
      group,
      t.paint('#9ea4a7', 0.4, 0.6),
      0.003,
      H * 0.86,
      W * 0.91,
      0.03 + x,
      H * 0.47,
      0,
    );
  t.box(group, blue, 0.05, H * 0.9, W, 0.06 + pack, H * 0.47, 0);
  const end = 1.05;
  t.box(group, blue, 0.06, H, 0.12, end, H / 2, 0);
  t.box(group, ss, end, 0.06, 0.05, end / 2, H - 0.03, 0);
  t.box(group, ss, end, 0.05, 0.04, end / 2, 0.06, 0);
  // Tie bolts either side.
  for (const y of [0.25, 0.55, 0.85])
    for (const z of [-W / 2 - 0.02, W / 2 + 0.02])
      t.rod(
        group,
        t.paint('#6b6f72', 0.4, 0.8),
        [-0.05, y, z],
        [pack + 0.2, y, z],
        0.012,
        8,
      );
  // Four ports on the frame plate, out toward −x, with flanges.
  for (const y of [0.22, H - 0.2])
    for (const z of [-0.12, 0.12]) {
      t.rod(group, ss, [-0.03, y, z], [-0.22, y, z], 0.057, 20);
      t.flanges(group, 100, [-0.2, y, z], 'x', FINISH.stainless);
    }
  badge(kit, group, 'neumann-dynamik', [0.03, H * 0.75, W / 2 + 0.003], 0.04);
  nameplate(
    kit,
    group,
    'neumann-dynamik',
    [0.4, H * 0.75, (W / 2) * 0.9 + 0.003],
    ['PHE M10-B  62 plates', 'LTHW 80/60 °C', 'Pool 28/30 °C'],
    0.15,
    0.08,
  );
  return group;
}

/**
 * An electromagnetic flow meter on a DN150 spool, after the
 * Endress+Hauser Proline Promag W 400 (flanged, compact transmitter with
 * display): the meter body between flanges, its transmitter on a neck,
 * on a short run of pipe on stands, with straight lengths either side.
 */
export function createFlowMeter(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  const y = 0.85;
  t.pipe(group, 150, [
    [-0.75, y, 0],
    [0.75, y, 0],
  ]);
  const livery = brandLivery(kit, 'splashonomics');
  const body = livery.paint.main;
  t.cyl(group, body, 0.15, 0.3, 0, y, 0, 'x', 32);
  for (const x of [-0.15, 0.15]) t.flanges(group, 150, [x, y, 0], 'x');
  t.cyl(group, body, 0.035, 0.14, 0, y + 0.2, 0, 'y', 16);
  const head = livery.paint.casing;
  t.box(group, head, 0.2, 0.14, 0.16, 0, y + 0.33, 0);
  t.cyl(group, head, 0.07, 0.03, 0, y + 0.33, 0.09, 'z', 24);
  const display = t.printed(
    0.09,
    0.05,
    (c, cw, ch) => {
      c.fillStyle = '#e9f2ea';
      c.fillRect(0, 0, cw, ch);
      c.fillStyle = '#152015';
      c.font = `bold ${ch * 0.38}px monospace`;
      c.fillText('288.4', cw * 0.08, ch * 0.5);
      c.font = `${ch * 0.24}px monospace`;
      c.fillText('m3/h  FT-101', cw * 0.08, ch * 0.85);
    },
    128,
  );
  display.mesh.position.set(0, y + 0.33, 0.106);
  group.add(display.mesh);
  badge(kit, group, 'splashonomics', [0, y + 0.25, 0.081], 0.022);
  for (const x of [-0.55, 0.55])
    t.rod(
      group,
      t.paint(FINISH.galvanised, 0.4, 0.6),
      [x, 0, 0],
      [x, y - 0.08, 0],
      0.02,
    );
  return group;
}

/**
 * The spa's jet pump, after the Speck BADU 90/40 (2.2 kW, close-coupled
 * with its own pre-filter, 795 mm long, 90 mm connections): a
 * self-priming pump with a clear-lidded strainer pot, on a plinth.
 */
export function createJetPump(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  const livery = brandLivery(kit, 'grundflow');
  const body = livery.paint.casing;
  t.box(group, t.paint(FINISH.concrete, 0.85), 0.9, 0.12, 0.4, 0, 0.06, 0);
  const y = 0.3;
  // Pre-filter pot with clear lid, then the pump casing, then the motor.
  t.cyl(group, body, 0.1, 0.24, -0.27, y + 0.02, 0, 'y', 28);
  t.cyl(
    group,
    t.paint('#a9cbd3', 0.1),
    0.095,
    0.03,
    -0.27,
    y + 0.15,
    0,
    'y',
    28,
  );
  t.cyl(group, body, 0.11, 0.14, -0.1, y, 0, 'x', 28);
  t.box(group, body, 0.16, y - 0.12, 0.2, -0.15, (y + 0.12) / 2 - 0.0, 0);
  const paint = livery.paint.main;
  t.cyl(group, paint, 0.085, 0.3, 0.13, y, 0, 'x', 24);
  fins(t, group, paint, 0.085, 0.0, 0.25, y, 0);
  t.cyl(group, livery.paint.shade, 0.09, 0.08, 0.32, y, 0, 'x', 24);
  // Suction into the pot, discharge up from the casing.
  t.rod(
    group,
    t.paint(FINISH.pvc, 0.45),
    [-0.45, y + 0.05, 0],
    [-0.37, y + 0.05, 0],
    0.045,
  );
  t.rod(
    group,
    t.paint(FINISH.pvc, 0.45),
    [-0.1, y + 0.1, 0],
    [-0.1, y + 0.4, 0],
    0.045,
  );
  badge(kit, group, 'grundflow', [0.12, y + 0.04, 0.087], 0.03);
  return group;
}

/**
 * The spa's air blower, after a 2.2 kW side-channel blower (Siemens
 * Elmo-G 2BH6 class: 430 × 370 mm footprint, 380 mm high): a ribbed
 * aluminium impeller housing on its motor, with silencers on both ports
 * and a non-return valve and loop above the spa's water line.
 */
export function createAirBlower(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  const livery = brandLivery(kit, 'pepperdyne');
  const alu = livery.paint.casing;
  const y = 0.25;
  t.cyl(group, alu, 0.19, 0.12, 0, y, -0.06, 'z', 36);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const rib = t.box(
      group,
      alu,
      0.012,
      0.06,
      0.12,
      Math.cos(a) * 0.17,
      y + Math.sin(a) * 0.17,
      -0.06,
    );
    rib.rotation.z = a;
  }
  // Motor behind, feet below.
  const paint = livery.paint.main;
  t.cyl(group, paint, 0.09, 0.22, 0, y, -0.25, 'z', 24);
  t.box(group, paint, 0.32, y - 0.12, 0.3, 0, (y - 0.12) / 2, -0.15);
  // Two ports up, each with a silencer, joined into the air line.
  for (const x of [-0.08, 0.08]) {
    t.cyl(group, alu, 0.035, 0.08, x, y + 0.22, -0.04, 'y', 16);
    t.cyl(
      group,
      t.paint('#4a4e52', 0.6),
      0.05,
      0.22,
      x,
      y + 0.37,
      -0.04,
      'y',
      20,
    );
  }
  t.rod(
    group,
    t.paint(FINISH.pvc, 0.45),
    [0.08, y + 0.48, -0.04],
    [0.08, 1.4, -0.04],
    0.03,
  );
  t.rod(
    group,
    t.paint(FINISH.pvc, 0.45),
    [0.08, 1.4, -0.04],
    [0.4, 1.4, -0.04],
    0.03,
  );
  t.cyl(group, t.paint('#c9cdcf', 0.4), 0.045, 0.08, 0.25, 1.4, -0.04, 'x', 16);
  badge(kit, group, 'pepperdyne', [0, y, 0.002], 0.03);
  return group;
}
