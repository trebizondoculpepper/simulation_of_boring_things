import { markComponent } from '../../core/views/component-identity';
import { createSightGlass } from './sight-glass';
import type { GlassInputs } from '../logic/sight-glass';
import { GAUGE, gaugeBosses } from '../logic/sand-filter';
import {
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
} from 'three';
import type { Material, Object3D } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createBrassPlate } from '../../core/views/plant-signs';
import { createBrandBadge } from '../../core/views/brand-badge';
import { brandLivery } from '../../core/views/brand-livery';
import { SANS } from '../../core/views/fitting-tools';
import type { BrandId } from '../../core/logic/brands';
import { FINISH, PIPE_SIZES, plantTools } from './plant-tools';
import {
  PAIR_DISCHARGE_X,
  PAIR_STRAINER_X,
  PUMP_ALONG,
} from '../logic/pump-pair';
import type { DN, Point } from './plant-tools';
import { dot } from '../../industrial-control/logic/font-5x7';
import {
  FIN_DEPTH,
  MOTOR_RADIUS,
  PUMP_DECK_TOP,
  PUMP_SET_LENGTH,
  PUMP_SHAFT_Y,
  endSuctionPumpLayout,
} from '../logic/end-suction-pump';
import type {
  EndSuctionPumpLayout,
  ShaftSpan,
} from '../logic/end-suction-pump';

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
 * shaft centre at `y`, laid out by `endSuctionPumpLayout`: the smooth
 * drive-end shield, the finned frame with its terminal box and feet, and
 * the fan cowl, each starting where the last ends.
 */
function motor(
  t: Tools,
  parent: Object3D,
  { y, z, r, p }: { y: number; z: number; r: number; p: EndSuctionPumpLayout },
  paint: Material,
  cowl: Material,
) {
  const mid = (s: ShaftSpan) => (s.x0 + s.x1) / 2;
  const len = (s: ShaftSpan) => s.x1 - s.x0;
  // The drive-end shield, smooth (no fins), where the coupling guard meets
  // it.
  t.cyl(parent, paint, r, len(p.shield), mid(p.shield), y, z, 'x', 28);
  // The finned frame.
  t.cyl(parent, paint, r, len(p.frame), mid(p.frame), y, z, 'x', 28);
  for (let x = p.fins.x0; x <= p.fins.x1 + 1e-9; x += 0.05)
    t.cyl(parent, paint, r + FIN_DEPTH, 0.012, x, y, z, 'x', 24);
  // The fan cowl behind, its grille at the end.
  t.cyl(parent, cowl, r * 1.02, len(p.cowl), mid(p.cowl), y, z, 'x', 28);
  t.cyl(
    parent,
    t.paint('#141a1f', 0.7),
    r * 0.8,
    0.005,
    p.cowl.x1 + 0.0025,
    y,
    z,
    'x',
    28,
  );
  // Terminal box on its cast boss on top of the frame (the boss interrupts
  // the fins), cable gland on its side.
  const tx = p.frame.x0 + len(p.frame) * 0.36;
  const boss = 0.05 + FIN_DEPTH;
  t.box(parent, paint, 0.16, boss, 0.16, tx, y + r + FIN_DEPTH - boss / 2, z);
  t.box(parent, paint, 0.2, 0.12, 0.2, tx, y + r + FIN_DEPTH + 0.06, z);
  t.cyl(
    parent,
    t.paint('#2b2b2b', 0.6),
    0.018,
    0.04,
    tx,
    y + r + FIN_DEPTH + 0.06,
    z + 0.12,
    'z',
    12,
  );
  // Feet, cast on the frame, bolted down on fabricated pedestals (in the
  // base frame's colour) that bring the motor up to the pump's shaft height.
  const footTop = y - r * 0.5;
  const footBottom = y - r - 0.03;
  for (const fx of [p.frame.x0 + 0.06, p.frame.x1 - 0.06]) {
    t.box(
      parent,
      paint,
      0.1,
      footTop - footBottom,
      r * 1.6,
      fx,
      (footTop + footBottom) / 2,
      z,
    );
    t.box(
      parent,
      cowl,
      0.14,
      footBottom - PUMP_DECK_TOP,
      r * 1.8,
      fx,
      (footBottom + PUMP_DECK_TOP) / 2,
      z,
    );
  }
}

/**
 * The coupling guard, sheet steel in the maker's accent colour, spanning
 * the gap from the bearing bracket to the motor's drive-end shield round
 * the coupling (`endSuctionPumpLayout`): a box of side `2 · half`,
 * perforated on its faces, on two legs from the deck.
 */
function couplingGuard(
  t: Tools,
  parent: Object3D,
  { y, z, p }: { y: number; z: number; p: EndSuctionPumpLayout },
  paint: Material,
) {
  const { guard, guardHalf: h } = p;
  const len = guard.x1 - guard.x0;
  const mid = (guard.x0 + guard.x1) / 2;
  t.box(parent, paint, len, 2 * h, 2 * h, mid, y, z);
  // Perforations: rows of dark slots on the front, back and top.
  const hole = t.paint('#1b1b1b', 0.8);
  const cols = 5;
  const rows = [-0.5, 0, 0.5];
  const pitch = len / (cols + 1);
  for (let i = 1; i <= cols; i++) {
    const x = guard.x0 + i * pitch;
    for (const k of rows) {
      for (const s of [-1, 1])
        t.box(
          parent,
          hole,
          0.014,
          0.03,
          0.002,
          x,
          y + k * h,
          z + s * (h + 0.001),
        );
      t.box(parent, hole, 0.014, 0.002, 0.03, x, y + h + 0.001, z + k * h);
    }
  }
  // Two legs (folded straps) down to the base frame's deck.
  const legH = y - h - PUMP_DECK_TOP;
  for (const s of [-1, 1])
    t.box(
      parent,
      paint,
      0.04,
      legH,
      0.04,
      mid,
      PUMP_DECK_TOP + legH / 2,
      z + s * (h - 0.03),
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
  const L = PUMP_SET_LENGTH;
  const p = endSuctionPumpLayout();
  // Base frame: two channels and a deck plate, grouted to a plinth.
  t.box(group, t.paint(FINISH.concrete, 0.85), L + 0.2, 0.1, 0.8, 0, 0.05, 0);
  for (const z of [-0.25, 0.25]) {
    const channel = t.box(group, base, L, 0.12, 0.08, 0, 0.16, z);
    channel.name = 'Pump base channel';
  }
  t.box(group, base, L, 0.012, 0.58, 0, 0.226, 0);
  const shaftY = PUMP_SHAFT_Y;
  // The volute, at the suction end, its axis along x.
  const vx = (p.volute.x0 + p.volute.x1) / 2;
  t.cyl(group, iron, 0.36, p.volute.x1 - p.volute.x0, vx, shaftY, 0, 'x', 36);
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
  // Bearing bracket, coupling guard and motor, each ending where the next
  // begins (`endSuctionPumpLayout`).
  t.cyl(
    group,
    iron,
    0.12,
    p.bracket.x1 - p.bracket.x0,
    (p.bracket.x0 + p.bracket.x1) / 2,
    shaftY,
    0,
    'x',
    24,
  );
  couplingGuard(t, group, { y: shaftY, z: 0, p }, livery.paint.accent);
  // The motor (frame 200L): shaft height to the base deck.
  motor(
    t,
    group,
    { y: shaftY, z: 0, r: MOTOR_RADIUS, p },
    livery.paint.main,
    livery.paint.shade,
  );
  badge(kit, group, 'grundflow', [vx, shaftY + 0.05, 0.37], 0.05);
  nameplate(
    kit,
    group,
    'grundflow',
    [L / 2 - 0.55, shaftY + 0.08, MOTOR_RADIUS + FIN_DEPTH + 0.003],
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
export function createPumpPair(
  kit: PanelKit,
  dischargeValves = true,
  /** Its pumps' tags, duty then standby: the Olympic's by default. */
  tags: readonly [string, string] = ['P-101A', 'P-101B'],
) {
  const t = plantTools(kit);
  const group = new Group();
  const pumps: ReturnType<typeof createEndSuctionPump>[] = [];
  for (const [z, tagOf, role] of [
    [-0.75, tags[0], 'DUTY'],
    [0.75, tags[1], 'STANDBY'],
  ] as const) {
    const name = `${tagOf} ${role}`;
    const set = new Group();
    set.position.z = z;
    // One pump set, solid to walk round (the way between the two is not).
    set.userData.solid = true;
    group.add(set);
    const pump = createEndSuctionPump(kit, PUMP_ALONG);
    // Each pump its own component, within its pump set (prompt 061).
    markComponent(pump, tagOf);
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
    if (dischargeValves)
      t.butterflyValve(set, 150, [PAIR_DISCHARGE_X, 1.5, 0.12], 'y');
    // Fixed to the flat front channel of this pump's fabricated base,
    // rather than standing beyond the plinth as an unsupported label.
    const tag = createBrassPlate(kit, 'grundflow', [name], {
      width: 0.3,
      height: 0.09,
    });
    tag.position.set(0, 0.16, 0.29);
    const backing = t.box(
      tag,
      t.paint(FINISH.brass, 0.35, 0.75),
      0.3,
      0.09,
      0.003,
      0,
      0,
      0.0015,
    );
    backing.name = 'Pump identification plate backing';
    pump.add(tag);
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
    label,
    sightSide = 'left',
  }: {
    dia: number;
    shell: number;
    /** Its nozzles' bore: the room's pipework is sized by it. */
    dn: DN;
    label: string;
    /** Small filter banks can keep the sight glass clear of their nozzle bank. */
    sightSide?: 'left' | 'right';
  },
) {
  const t = plantTools(kit);
  const group = new Group() as Group & {
    /** Its inlet (top) and outlet (bottom) gauges, bar. */
    show(s: { inlet: number; outlet: number }, delta: number): void;
    /** Its sight glass's view of the bed, as the filter's state has it. */
    showGlass(inputs: GlassInputs, delta: number): void;
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
  // Its cover: a galvanised blank flange on a ring of studs and nuts,
  // with a lifting handle across it, as a filter's manway has.
  const hatchY = cy - shell / 2 + 0.35;
  const cover = t.paint('#aab2b4', 0.4, 0.5);
  t.cyl(group, cover, 0.2, 0.02, 0, hatchY, face + 0.025, 'z', 28);
  const nut = t.paint('#5b6164', 0.45, 0.6);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    t.cyl(
      group,
      nut,
      0.014,
      0.018,
      Math.cos(a) * 0.175,
      hatchY + Math.sin(a) * 0.175,
      face + 0.044,
      'z',
      6,
    );
  }
  // The handle: two feet and a bar across, standing off the cover.
  for (const x of [-0.08, 0.08])
    t.cyl(group, steel, 0.008, 0.05, x, hatchY, face + 0.06, 'z', 8);
  t.cyl(group, steel, 0.009, 0.18, 0, hatchY, face + 0.085, 'x', 8);
  // Seat the sight glass outside the curved shell at its offset position.
  // A fixed fraction of the front radius buried most of the disc in the vessel.
  const sightX = (sightSide === 'right' ? 1 : -1) * r * 0.68;
  const sightZ = Math.sqrt(r * r - sightX * sightX);
  const sightMount = new Group();
  sightMount.position.set(
    sightX,
    cy + Math.max(0.28, shell * 0.22),
    zc + sightZ,
  );
  sightMount.rotation.y = Math.atan2(sightX, sightZ);
  group.add(sightMount);
  t.cyl(sightMount, livery.paint.shade, 0.115, 0.025, 0, 0, 0.018, 'z', 24);
  // The glass itself: a view of the bed's top, live (`sight-glass.ts`).
  const sightGlass = createSightGlass(kit, { radius: 0.095 });
  sightGlass.group.position.z = 0.032;
  sightMount.add(sightGlass.group);
  // Air bleed pipe follows the rear of the vessel, clear of its inspection face.
  t.rod(
    group,
    t.paint('#e8e8e3', 0.4),
    [0, top - 0.05, zc],
    [0, top - 0.05, zc - r - 0.05],
    0.012,
  );
  t.rod(
    group,
    t.paint('#e8e8e3', 0.4),
    [0, top - 0.05, zc - r - 0.05],
    [0, 1.0, zc - r - 0.05],
    0.012,
  );
  // The two gauges, each on a boss in the vessel's wall
  // (`gaugeBosses`): a reinforcing pad on the shell, a ½" nipple standing
  // square out of it, the gauge cock and its lever, and the gauge on its
  // back connection, facing out. The inlet's high over the bed, the
  // outlet's low at the underdrain.
  const brass = t.paint('#b08d3c', 0.4, 0.7);
  const bosses = gaugeBosses(dia, shell);
  const [inletGauge, outletGauge] = [bosses.inlet, bosses.outlet].map((b) => {
    const mount = new Group();
    mount.position.set(b.on[0], b.on[1], b.on[2]);
    mount.rotation.y = b.yaw;
    group.add(mount);
    // In the mount's frame, +z is straight out of the shell.
    t.cyl(mount, livery.paint.shade, GAUGE.pad, 0.012, 0, 0, 0.004, 'z', 20);
    t.cyl(mount, brass, 0.011, GAUGE.nipple, 0, 0, GAUGE.nipple / 2, 'z', 10);
    t.cyl(
      mount,
      brass,
      0.014,
      GAUGE.cock,
      0,
      0,
      GAUGE.nipple + GAUGE.cock / 2,
      'z',
      8,
    );
    t.box(
      mount,
      t.paint('#202020', 0.6),
      0.006,
      0.045,
      0.006,
      0.016,
      -0.018,
      GAUGE.nipple + GAUGE.cock / 2,
    );
    return t.pressureGauge(mount, [0, 0, GAUGE.off], {
      max: 4,
      dia: GAUGE.dia,
      entry: 'back',
    });
  });
  group.showGlass = (inputs, delta) => sightGlass.update(inputs, delta);
  group.show = ({ inlet, outlet }, delta) => {
    inletGauge.set(inlet);
    outletGauge.set(outlet);
    inletGauge.update(delta);
    outletGauge.update(delta);
  };
  // The maker and rating are ink on the curved shell, not floating plates.
  const logo = createBrandBadge(kit, 'lidoluxe', {
    form: 'wordmark',
    height: 0.065,
    maxWidth: 0.25,
    ink: '#063c44',
  });
  const logoWidth = (logo.geometry as PlaneGeometry).parameters.width;
  const curvedLogo = new Mesh(
    new CylinderGeometry(
      r + 0.004,
      r + 0.004,
      0.065,
      24,
      1,
      true,
      -0.5 - logoWidth / (2 * r),
      logoWidth / r,
    ),
    logo.material,
  );
  curvedLogo.position.set(0, cy + 0.43, zc);
  curvedLogo.raycast = () => {};
  group.add(curvedLogo);
  logo.geometry.dispose();
  const specWidth = Math.min(0.24, r * 0.7);
  const spec = t.printed(
    specWidth,
    0.095,
    (c, w, h) => {
      c.fillStyle = '#d9e9e9';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#173d43';
      c.font = `bold ${h * 0.23}px ${SANS}`;
      c.fillText(label, w * 0.06, h * 0.28, w * 0.88);
      c.font = `${h * 0.21}px ${SANS}`;
      c.fillText('4 bar  ·  40 °C', w * 0.06, h * 0.56);
      c.fillText('Bed depth 1.2 m', w * 0.06, h * 0.83);
    },
    512,
  );
  const curvedSpec = new Mesh(
    new CylinderGeometry(
      r + 0.004,
      r + 0.004,
      0.095,
      24,
      1,
      true,
      0.5 - specWidth / (2 * r),
      specWidth / r,
    ),
    spec.mesh.material,
  );
  curvedSpec.position.set(0, cy + 0.4, zc);
  curvedSpec.raycast = () => {};
  group.add(curvedSpec);
  spec.mesh.geometry.dispose();
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
/** A length of a machine's own pipework, in its frame: from, to, radius. */
export interface OwnPipe {
  from: readonly [number, number, number];
  to: readonly [number, number, number];
  r: number;
}

/** The jet pump's own stubs: suction into its pot, discharge up from its casing. */
export const JET_PUMP_STUBS: readonly OwnPipe[] = [
  { from: [-0.45, 0.35, 0], to: [-0.37, 0.35, 0], r: 0.045 },
  { from: [-0.1, 0.4, 0], to: [-0.1, 0.7, 0], r: 0.045 },
];

/** The air blower's own air line: up from its silencers to its loop, and along to its non-return valve. */
export const AIR_BLOWER_PIPES: readonly OwnPipe[] = [
  { from: [0.08, 0.73, -0.04], to: [0.08, 1.4, -0.04], r: 0.03 },
  { from: [0.08, 1.4, -0.04], to: [0.4, 1.4, -0.04], r: 0.03 },
];

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
  for (const p of JET_PUMP_STUBS)
    t.rod(group, t.paint(FINISH.pvc, 0.45), [...p.from], [...p.to], p.r);
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
  for (const p of AIR_BLOWER_PIPES)
    t.rod(group, t.paint(FINISH.pvc, 0.45), [...p.from], [...p.to], p.r);
  t.cyl(group, t.paint('#c9cdcf', 0.4), 0.045, 0.08, 0.25, 1.4, -0.04, 'x', 16);
  badge(kit, group, 'pepperdyne', [0, y, 0.002], 0.03);
  return group;
}
