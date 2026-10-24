import {
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
} from 'three';
import type { Material, Object3D } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { SANS } from '../../core/views/fitting-tools';
import { createBrandBadge } from '../../core/views/brand-badge';
import { brandLivery } from '../../core/views/brand-livery';
import type { BrandId } from '../../core/logic/brands';
import { BS1710_BASIC, BS1710_CODE, FINISH, plantTools } from './plant-tools';
import type { Point } from './plant-tools';

/**
 * The boiler room's plant, in metres, each modelled at the size of a
 * referenced commercial product under a maker's name of our own
 * (`doc/research/plant-products-boiler-air.md`). Floor plant stands with
 * its origin on the floor at the middle of its footprint, front to +z;
 * wall plant has its origin in the wall's face, front to +z.
 *
 * Heating pipework is steel painted in BS 1710 green with a crimson code
 * band (LTHW); gas pipework is yellow ochre.
 */

type Tools = ReturnType<typeof plantTools>;

/** Steel pipe outside diameters, metres (EN 10255 / EN 10220). */
const STEEL_OD = {
  20: 0.0269,
  25: 0.0337,
  50: 0.0603,
  65: 0.0761,
  80: 0.0889,
  200: 0.2191,
  250: 0.273,
  300: 0.3239,
} as const;

/** A maker's badge laid on a face at `at`, facing +z, turned `yaw`. */
function badge(
  kit: PanelKit,
  parent: Object3D,
  id: BrandId,
  at: Point,
  height = 0.035,
  ink?: string,
  yaw = 0,
) {
  const mesh = createBrandBadge(kit, id, { height, ink });
  mesh.position.set(...at);
  mesh.rotation.y = yaw;
  parent.add(mesh);
  return mesh;
}

/**
 * A flat label (a badge, nameplate or printed sign, and whatever plate it
 * is printed on) rebuilt as part of a cylinder's surface: wrapped round
 * the upright axis at (`ax`, `az`) at `radius`, centred on the bearing of
 * where it was placed, its print following the curve, so it lies on the
 * shell rather than standing off it as a flat card.
 */
function wrapOnto(
  label: Object3D,
  [ax, az]: readonly [number, number],
  radius: number,
) {
  const bearing = Math.atan2(label.position.x - ax, label.position.z - az);
  label.position.set(ax, label.position.y, az);
  label.rotation.set(0, 0, 0);
  // The label, and anything laid on it (a badge on its plate), each a
  // little proud of the one under it.
  const wrap = (part: Object3D, r: number) => {
    if (part instanceof Mesh && part.geometry instanceof PlaneGeometry) {
      const { width, height } = part.geometry.parameters;
      const old = part.geometry;
      part.geometry = new CylinderGeometry(
        r,
        r,
        height,
        Math.max(4, Math.ceil((width / r) * 12)),
        1,
        true,
        bearing - width / (2 * r),
        width / r,
      );
      old.dispose();
    }
    for (const child of part.children) {
      const lift = child.position.z;
      child.position.set(0, child.position.y, 0);
      child.rotation.set(0, 0, 0);
      wrap(child, r + lift);
    }
  };
  wrap(label, radius);
  return label;
}

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

/** A printed label, `w` × `h`, facing +z at `at`. */
function sign(
  t: Tools,
  parent: Object3D,
  text: string,
  at: Point,
  w: number,
  h: number,
  { ink = '#141414', ground = '#e9e9e2', yaw = 0 } = {},
) {
  const lines = text.split('\n');
  const label = t.printed(
    w,
    h,
    (c, cw, ch) => {
      c.fillStyle = ground;
      c.fillRect(0, 0, cw, ch);
      c.fillStyle = ink;
      c.font = `bold ${(ch / lines.length) * 0.5}px ${SANS}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      lines.forEach((line, i) =>
        c.fillText(line, cw / 2, (ch / lines.length) * (i + 0.5)),
      );
    },
    256,
  );
  label.mesh.position.set(...at);
  label.mesh.rotation.y = yaw;
  parent.add(label.mesh);
  return label.mesh;
}

/** A steel flange pair on a pipe of outside diameter `od` at `at`, along `axis`. */
function steelFlanges(
  t: Tools,
  parent: Object3D,
  od: number,
  at: Point,
  axis: 'x' | 'y' | 'z',
  material: Material,
) {
  const f = t.cyl(parent, material, od * 1.25, 0.04, ...at, 'y', 20);
  if (axis === 'x') f.rotation.z = Math.PI / 2;
  if (axis === 'z') f.rotation.x = Math.PI / 2;
  return f;
}

// ---- Condensing boilers ----------------------------------------------------

/**
 * A floor-standing gas condensing boiler, after the Remeha Gas 220 Ace
 * (160–300 kW): a cabinet 800 wide, 1662 high and 657 deep, its controls
 * behind a hinged flap at the top of the front, flow, return and gas
 * connections and the flue spigot on top at the back, a condensate trap
 * below. Ours is Hamwarmy's.
 */
export function createCondensingBoiler(
  kit: PanelKit,
  output = 300,
  panel?: Object3D,
) {
  const t = plantTools(kit);
  const group = new Group();
  group.name = 'Condensing boiler';
  const W = 0.8,
    H = 1.662,
    D = 0.657;
  const livery = brandLivery(kit, 'hamwarmy').paint;
  const cabinet = livery.casing;
  const dark = livery.shade;
  // The plinth frame, the cabinet, and its dark top band and side seams.
  t.box(group, dark, W - 0.02, 0.06, D - 0.04, 0, 0.03, 0);
  t.box(group, cabinet, W, H - 0.16, D, 0, 0.06 + (H - 0.16) / 2, 0);
  t.box(group, dark, W, 0.1, D, 0, H - 0.05, 0);
  for (const y of [0.55, 1.05])
    t.box(group, dark, W + 0.002, 0.004, D + 0.002, 0, y, 0);
  // The control panel, set into the front's top: the working one
  // (`boiler-controls.ts`) when given, else a still likeness of it.
  if (panel) {
    panel.position.set(0, H - 0.22, D / 2);
    group.add(panel);
  } else {
    t.box(group, livery.main, 0.5, 0.18, 0.02, 0, H - 0.22, D / 2 + 0.005);
    t.box(
      group,
      t.paint('#3b6b4a', 0.3),
      0.12,
      0.05,
      0.004,
      -0.12,
      H - 0.21,
      D / 2 + 0.016,
    );
    for (let i = 0; i < 4; i++)
      t.cyl(
        group,
        livery.accent,
        0.011,
        0.01,
        0.04 + i * 0.045,
        H - 0.21,
        D / 2 + 0.018,
        'z',
        12,
      );
  }
  badge(kit, group, 'hamwarmy', [0, 0.9, D / 2 + 0.002], 0.05);
  // The rating plate on the side.
  nameplate(
    kit,
    group,
    'hamwarmy',
    [W / 2 + 0.002, 0.5, 0],
    [
      `HW ${output} condensing boiler`,
      `${output} kW  G20  PMS 6 bar`,
      'PIN 0063CU3507  IP X4D',
    ],
    0.16,
    0.09,
  ).rotation.y = Math.PI / 2;
  // Connections on top at the back: flue (Ø250), flow and return (DN65), gas (R2).
  const steel = t.paint('#3e6d45', 0.5);
  const flue = t.paint(FINISH.stainless, 0.3, 0.8);
  t.cyl(group, flue, 0.125, 0.14, 0, H + 0.07, -D / 2 + 0.2, 'y', 28).name =
    'Flue port';
  for (const [x, name] of [
    [-0.27, 'Flow port'],
    [0.27, 'Return port'],
  ] as const)
    t.rod(
      group,
      steel,
      [x, H, -D / 2 + 0.12],
      [x, H + 0.12, -D / 2 + 0.12],
      STEEL_OD[65] / 2,
      16,
    ).name = name;
  t.rod(
    group,
    t.paint(BS1710_BASIC.gases, 0.5),
    [0.2, H, -D / 2 + 0.28],
    [0.2, H + 0.1, -D / 2 + 0.28],
    STEEL_OD[50] / 2,
    14,
  ).name = 'Gas port';
  // The condensate trap and its drain.
  const plastic = t.paint('#e3e3df', 0.5);
  t.cyl(group, plastic, 0.04, 0.16, W / 2 - 0.12, 0.2, -D / 2 - 0.05, 'y', 16);
  return group;
}

/**
 * Two boilers on their plinth. Their top connections terminate at the
 * boiler ports so room-level pipe routing can supply the flue, LTHW and
 * gas runs. The condensate drains still run below to a tundish.
 */
export function createBoilerCascade(
  kit: PanelKit,
  live: {
    panels?: Object3D[];
    /** The first of its two boilers' numbers in the house (B-501 is 1). */
    first?: number;
  } = {},
) {
  const t = plantTools(kit);
  const group = new Group();
  group.name = 'Boiler cascade';
  const first = live.first ?? 1;
  const gap = 0.25,
    W = 0.8,
    D = 0.657,
    H = 1.662;
  t.box(
    group,
    t.paint(FINISH.concrete, 0.85),
    2 * W + gap + 0.3,
    0.1,
    D + 0.3,
    0,
    0.05,
    0.1,
  );
  const xs = [-(W + gap) / 2, (W + gap) / 2];
  xs.forEach((x, i) => {
    const boiler = createCondensingBoiler(kit, 300, live.panels?.[i]);
    boiler.position.set(x, 0.1, 0.1);
    group.add(boiler);
    sign(
      t,
      group,
      `B-50${first + i}`,
      [x, 0.1 + H - 0.4, 0.1 + D / 2 + 0.003],
      0.14,
      0.05,
      { ground: '#f2d23a' },
    );
  });
  const back = 0.1 - D / 2;
  // Condensate drains to a tundish.
  const pvc = t.paint('#e3e3df', 0.5);
  for (const x of xs)
    t.rod(
      group,
      pvc,
      [x + W / 2 - 0.12, 0.22, back - 0.05],
      [x + W / 2 - 0.12, 0.22, back - 0.2],
      0.016,
      10,
    );
  t.rod(
    group,
    pvc,
    [xs[0] + W / 2 - 0.12, 0.22, back - 0.2],
    [xs[1] + W / 2 + 0.1, 0.22, back - 0.2],
    0.016,
    10,
  );
  t.cyl(group, pvc, 0.05, 0.12, xs[1] + W / 2 + 0.1, 0.3, back - 0.2, 'y', 16);
  return group;
}

// ---- Low-loss header ------------------------------------------------------

/**
 * A low-loss header, after Hamworthy's sizing (length four times the
 * diameter, under 0.5 m/s): a vertical DN200 steel header 1.2 m long on
 * legs, the boilers' flow and return on one side and the system's on the
 * other (DN80), an automatic air vent on top and a drain with a magnetic
 * dirt separator below.
 */
export function createLowLossHeader(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  group.name = 'Low-loss header';
  const black = brandLivery(kit, 'gorskiy').paint.casing;
  const green = t.paint(BS1710_BASIC.water, 0.5);
  const r = STEEL_OD[200] / 2;
  const bottom = 0.45,
    top = bottom + 1.0;
  t.rod(group, black, [0, bottom, 0], [0, top, 0], r, 28);
  t.cyl(group, black, r, 0.02, 0, top + 0.01, 0, 'y', 28);
  t.cyl(group, black, r, 0.02, 0, bottom - 0.01, 0, 'y', 28);
  for (const x of [-0.12, 0.12])
    t.rod(group, black, [x, 0, 0.1], [x, bottom, r * 0.4], 0.02, 10);
  t.rod(group, black, [0, 0, -0.14], [0, bottom, -r * 0.5], 0.02, 10);
  // Connections: boilers on the left (flow high, return low), system on the right.
  const ys = [top - 0.15, bottom + 0.2];
  for (const side of [-1, 1])
    for (const y of ys) {
      t.rod(
        group,
        green,
        [side * r, y, 0],
        [side * (r + 0.32), y, 0],
        STEEL_OD[80] / 2,
        18,
      );
      steelFlanges(
        t,
        group,
        STEEL_OD[80],
        [side * (r + 0.32), y, 0],
        'x',
        t.paint(FINISH.steel, 0.4, 0.4),
      );
    }
  // Air vent on top, sensor pocket, drain valve and dirt separator below.
  t.rod(
    group,
    t.paint(FINISH.brass, 0.35, 0.7),
    [0, top + 0.02, 0],
    [0, top + 0.12, 0],
    0.012,
    10,
  );
  t.cyl(
    group,
    t.paint(FINISH.brass, 0.35, 0.7),
    0.03,
    0.06,
    0,
    top + 0.15,
    0,
    'y',
    14,
  );
  t.rod(
    group,
    t.paint(FINISH.stainless, 0.3, 0.8),
    [0, top - 0.4, r],
    [0, top - 0.4, r + 0.08],
    0.008,
    8,
  );
  t.cyl(
    group,
    t.paint('#2e5f8f', 0.4),
    0.05,
    0.22,
    0,
    bottom - 0.2,
    0,
    'y',
    20,
  );
  wrapOnto(
    sign(t, group, 'LOW LOSS HEADER\nLLH-501', [0, top - 0.6, r], 0.2, 0.08, {
      ground: '#f2d23a',
    }),
    [0, 0],
    r + 0.002,
  );
  wrapOnto(
    nameplate(
      kit,
      group,
      'gorskiy',
      [0, bottom + 0.45, r],
      ['LLH 200/1000', 'PN6  110 °C', 'max 45 m³/h'],
      0.16,
      0.09,
    ),
    [0, 0],
    r + 0.002,
  );
  return group;
}

// ---- Twin-head circulator ---------------------------------------------------

/**
 * A twin-head variable-speed circulator on the LTHW flow, after the
 * Grundfos MAGNA3 D 65-120 F: DN65 flanges 340 mm apart, two wet-rotor
 * heads (one duty, one standby) each with its control box and display,
 * between isolating valves with gauges, on a short run of pipe. Ours is
 * Grundflow's.
 */
export function createTwinHeadPump(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group() as Group & {
    /** Its duty head running (its display lit) or both standing. */
    show(running: boolean): void;
    /** Its duty head, where its sound comes from. */
    duty: Object3D;
  };
  group.name = 'Twin-head circulator';
  const displays: MeshStandardMaterial[] = [];
  const heads: Object3D[] = [];
  const y = 0.75;
  const green = t.paint(BS1710_BASIC.water, 0.5);
  const iron = t.paint('#3a3f45', 0.5, 0.3);
  const od = STEEL_OD[65];
  // The pipe run, its supports and isolating valves.
  t.rod(group, green, [-0.75, y, 0], [-0.17, y, 0], od / 2, 16);
  t.rod(group, green, [0.17, y, 0], [0.75, y, 0], od / 2, 16);
  t.cyl(
    group,
    t.paint(BS1710_CODE.crimson, 0.6),
    od / 2 + 0.002,
    0.08,
    -0.55,
    y,
    0,
    'x',
    16,
  );
  for (const x of [-0.65, 0.65]) {
    t.rod(
      group,
      t.paint(FINISH.galvanised, 0.4, 0.6),
      [x, 0, 0],
      [x, y - od / 2, 0],
      0.02,
      10,
    );
    t.butterflyValve(group, 65, [x * 0.62, y, 0], 'x');
  }
  // The pump body: the volute between the flanges, port to port 340 mm.
  for (const x of [-0.17, 0.17])
    steelFlanges(t, group, od, [x, y, 0], 'x', iron);
  t.box(group, iron, 0.3, 0.16, 0.2, 0, y, 0);
  // Two heads, angled out to either side, each a motor can and a control box.
  const pump = brandLivery(kit, 'grundflow').paint;
  const head = pump.main;
  const box = pump.casing;
  for (const side of [-1, 1]) {
    const unit = new Group();
    unit.position.set(0, y, side * 0.1);
    unit.rotation.x = side * 0.5;
    group.add(unit);
    t.cyl(unit, head, 0.085, 0.24, 0, 0, side * 0.12, 'z', 24);
    t.box(unit, box, 0.17, 0.16, 0.06, 0, 0.11, side * 0.16);
    const display = new MeshStandardMaterial({
      color: '#1d3a28',
      emissive: '#58d07a',
      emissiveIntensity: 0,
      roughness: 0.3,
    });
    kit.materials.push(display);
    displays.push(display);
    heads.push(unit);
    const lit = t.box(unit, display, 0.06, 0.03, 0.004, 0, 0.13, side * 0.193);
    lit.userData.live = true;
    lit.rotation.y = side > 0 ? 0 : Math.PI;
    if (side > 0) badge(kit, unit, 'grundflow', [0, 0.06, 0.193], 0.03);
  }
  nameplate(
    kit,
    group,
    'grundflow',
    [0, y - 0.1, 0.101],
    ['TWIN 65-120 F  DN65 PN6/10', '230 V 2 × 3.4 A  45 m³/h  12 m'],
    0.16,
    0.07,
  );
  // Its tag on the run's front, between the volute and the left valve.
  sign(t, group, 'P-501A/B  LTHW', [-0.29, y, od / 2 + 0.003], 0.14, 0.035, {
    ground: '#f2d23a',
  });
  // Its duty head the second (facing the room), its standby the first.
  group.duty = heads[1];
  group.show = (running) => {
    displays[1].emissiveIntensity = running ? 1.2 : 0;
    displays[0].emissiveIntensity = 0;
  };
  group.show(true);
  return group;
}

// ---- Pressurisation -------------------------------------------------------

/**
 * Pressurisation: a 300 litre diaphragm expansion vessel, after the
 * Reflex G 300 (Ø634 mm, 1272 mm high, grey), and beside it a
 * pressurisation unit, after the Stuart Turner Mikrofill MIDI (504 × 415
 * × 270 mm), its break tank and pump refilling the sealed LTHW system.
 * Ours are Hamwarmy's.
 */
export function createPressurisation(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  group.name = 'Pressurisation unit and expansion vessel';
  const hw = brandLivery(kit, 'hamwarmy').paint;
  const grey = hw.casing;
  const R = 0.317,
    H = 1.272;
  const vessel = new Group();
  vessel.position.set(-0.35, 0, 0);
  group.add(vessel);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    t.rod(
      vessel,
      grey,
      [Math.cos(a) * R * 0.75, 0, Math.sin(a) * R * 0.75],
      [Math.cos(a) * R * 0.6, 0.2, Math.sin(a) * R * 0.6],
      0.015,
      8,
    );
  }
  t.rod(vessel, grey, [0, 0.22, 0], [0, H - 0.22, 0], R, 32);
  const dome = t.cyl(vessel, grey, R * 0.98, 0.2, 0, H - 0.12, 0, 'y', 32);
  dome.scale.set(1, 1, 1);
  t.cyl(vessel, grey, R * 0.9, 0.06, 0, H - 0.01, 0, 'y', 32);
  t.cyl(vessel, grey, R * 0.98, 0.18, 0, 0.27, 0, 'y', 32);
  wrapOnto(
    badge(kit, vessel, 'hamwarmy', [0, 0.85, R], 0.06),
    [0, 0],
    R + 0.003,
  );
  wrapOnto(
    nameplate(
      kit,
      vessel,
      'hamwarmy',
      [0, 0.55, R],
      ['G 300  300 l  PN6', 'pre-charge 1.5 bar', '-10 … 70 °C'],
      0.14,
      0.07,
    ),
    [0, 0],
    R + 0.003,
  );
  // The pressurisation unit on its stand.
  const unit = new Group();
  unit.position.set(0.42, 0, 0);
  group.add(unit);
  const white = hw.casing;
  t.box(unit, hw.shade, 0.45, 0.5, 0.3, 0, 0.25, 0);
  t.box(unit, white, 0.415, 0.504, 0.27, 0, 0.5 + 0.252, 0);
  t.box(unit, t.paint('#1d2022', 0.5), 0.16, 0.08, 0.005, 0, 0.88, 0.137);
  t.box(unit, t.paint('#58d07a', 0.3), 0.08, 0.03, 0.004, 0, 0.89, 0.141);
  badge(kit, unit, 'hamwarmy', [0, 0.62, 0.137], 0.04);
  t.pressureGauge(unit, [0.13, 0.95, 0.12], { dia: 0.063, max: 6 });
  // Cold feed in, and the pumped line to the vessel's base.
  const copper = t.paint('#b87333', 0.35, 0.8);
  t.rod(group, copper, [0.55, 0.52, 0], [0.55, 1.5, 0], 0.011, 10);
  t.rod(group, copper, [0.3, 0.55, 0], [-0.35, 0.12, 0], 0.011, 10);
  // Its label on its cabinet's front, between the badge and the display.
  sign(
    t,
    unit,
    'PRESSURISATION UNIT\nSET 1.5 bar',
    [0, 0.73, 0.137],
    0.2,
    0.06,
  );
  return group;
}

// ---- Dosing pot -----------------------------------------------------------

/**
 * A dosing pot, after the Flamco 11 litre (Ø215 × 935 mm, ¾" connections,
 * 16 bar), wall-mounted on brackets, for dosing the LTHW system with
 * inhibitor: a funnel and cap on top, and inlet, outlet and drain valves.
 * Ours is Gorskiy's.
 */
export function createDosingPot(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  group.name = 'Dosing pot';
  const black = brandLivery(kit, 'gorskiy').paint.casing;
  const R = 0.1075,
    z = 0.17;
  t.rod(group, black, [0, -0.45, z], [0, 0.4, z], R, 24);
  t.cyl(group, black, 0.04, 0.05, 0, 0.44, z, 'y', 16);
  t.cyl(
    group,
    brandLivery(kit, 'gorskiy').paint.accent,
    0.05,
    0.03,
    0,
    0.48,
    z,
    'y',
    16,
  );
  for (const y of [0.25, -0.3])
    t.box(
      group,
      t.paint(FINISH.galvanised, 0.4, 0.6),
      0.03,
      0.04,
      z,
      0,
      y,
      z / 2,
    );
  const brass = t.paint(FINISH.brass, 0.35, 0.7);
  const copper = t.paint('#b87333', 0.35, 0.8);
  for (const [y, side] of [
    [0.32, -1],
    [-0.38, 1],
  ] as const) {
    t.rod(group, copper, [side * R, y, z], [side * 0.3, y, z], 0.011, 10);
    t.rod(
      group,
      copper,
      [side * 0.3, y, z],
      [side * 0.3, side > 0 ? -0.6 : 0.6, z],
      0.011,
      10,
    );
    t.box(
      group,
      t.paint('#c42b23', 0.5),
      0.07,
      0.012,
      0.012,
      side * 0.2,
      y + 0.03,
      z,
    );
    t.cyl(group, brass, 0.018, 0.05, side * 0.2, y, z, 'x', 10);
  }
  t.cyl(group, brass, 0.016, 0.05, 0, -0.5, z, 'y', 10);
  wrapOnto(
    badge(kit, group, 'gorskiy', [0, 0.05, z + R], 0.03, '#e9e9e2'),
    [0, z],
    R + 0.002,
  );
  wrapOnto(
    sign(t, group, 'INHIBITOR DOSING', [0, -0.1, z + R], 0.15, 0.04),
    [0, z],
    R + 0.002,
  );
  return group;
}

// ---- Calorifier -----------------------------------------------------------

/**
 * A hot-water calorifier, after the ICS Cool Energy Calorifier 1000
 * (overall Ø1000 × 1850 mm, its cylinder Ø900): a vertical storage
 * cylinder in white cladding with a domed top, an LTHW coil's flanged
 * flow and return low on its side, cold feed at the base, hot draw-off at
 * the top, secondary return, a temperature and pressure relief valve, a
 * thermometer, and a manway. Stored at 60 °C against legionella. Ours is
 * Hamwarmy's.
 */
export function createCalorifier(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  group.name = 'Calorifier';
  const R = 0.5,
    H = 1.85;
  const cal = brandLivery(kit, 'hamwarmy').paint;
  const clad = cal.casing;
  const band = cal.main;
  t.box(group, t.paint(FINISH.concrete, 0.85), 1.1, 0.1, 1.1, 0, 0.05, 0);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
    t.rod(
      group,
      band,
      [Math.cos(a) * 0.35, 0.1, Math.sin(a) * 0.35],
      [Math.cos(a) * 0.35, 0.3, Math.sin(a) * 0.35],
      0.03,
      8,
    );
  }
  t.rod(group, clad, [0, 0.3, 0], [0, H - 0.2, 0], R, 40);
  const dome = t.cyl(group, clad, R, 0.2, 0, H - 0.1, 0, 'y', 40);
  dome.scale.set(1, 1, 1);
  t.cyl(group, clad, R * 0.75, 0.06, 0, H, 0, 'y', 40);
  for (const y of [0.4, H - 0.28])
    t.cyl(group, band, R + 0.004, 0.04, 0, y, 0, 'y', 40);
  // The manway, the coil's flanges, and the connections.
  t.cyl(
    group,
    t.paint(FINISH.steel, 0.4, 0.5),
    0.17,
    0.06,
    0,
    0.62,
    R + 0.02,
    'z',
    28,
  );
  const green = t.paint(BS1710_BASIC.water, 0.5);
  const crimson = t.paint(BS1710_CODE.crimson, 0.6);
  for (const y of [0.85, 0.55]) {
    t.rod(group, green, [R, y, 0], [R + 0.3, y, 0], STEEL_OD[50] / 2, 14);
    steelFlanges(
      t,
      group,
      STEEL_OD[50],
      [R + 0.02, y, 0],
      'x',
      t.paint(FINISH.steel, 0.4, 0.4),
    );
    t.cyl(
      group,
      crimson,
      STEEL_OD[50] / 2 + 0.002,
      0.06,
      R + 0.2,
      y,
      0,
      'x',
      14,
    );
  }
  const copper = t.paint('#b87333', 0.35, 0.8);
  t.rod(group, copper, [-R, 0.4, 0], [-R - 0.3, 0.4, 0], 0.027, 14);
  t.rod(group, copper, [0, H + 0.03, 0], [0, H + 0.4, 0], 0.027, 14);
  t.rod(group, copper, [-R, 1.2, 0], [-R - 0.3, 1.2, 0], 0.017, 12);
  // T&P relief valve and its discharge, the thermometer.
  t.rod(
    group,
    t.paint(FINISH.brass, 0.35, 0.7),
    [R * 0.6, H - 0.05, 0.25],
    [R * 0.6, H + 0.12, 0.25],
    0.02,
    12,
  );
  t.rod(
    group,
    copper,
    [R * 0.6, H + 0.12, 0.25],
    [R + 0.25, H + 0.12, 0.25],
    0.011,
    8,
  );
  t.rod(
    group,
    copper,
    [R + 0.25, H + 0.12, 0.25],
    [R + 0.25, 0.3, 0.25],
    0.011,
    8,
  );
  t.pressureGauge(group, [-0.25, 1.4, R * 0.87], {
    dia: 0.08,
    max: 120,
    unit: '°C',
    yaw: -0.5,
  });
  wrapOnto(
    badge(kit, group, 'hamwarmy', [0, 1.25, R], 0.08),
    [0, 0],
    R + 0.003,
  );
  wrapOnto(
    nameplate(
      kit,
      group,
      'hamwarmy',
      [0.22, 1.0, R * 0.95],
      ['CAL 1000  1000 l  6 bar', 'coil 120 kW  80/60 °C', 'store 60 °C'],
      0.15,
      0.08,
    ),
    [0, 0],
    R + 0.003,
  );
  wrapOnto(
    sign(t, group, 'CAL-601  DHW', [0, 1.6, R], 0.2, 0.06, {
      ground: '#f2d23a',
    }),
    [0, 0],
    R + 0.003,
  );
  return group;
}

// ---- Gas train ------------------------------------------------------------

/**
 * The boiler house gas train, on a wall frame, in yellow ochre steel
 * (BS 1710): the incoming emergency control valve, a diaphragm gas
 * meter after the Itron/Actaris G25 (DN50, 280 mm centres), a filter, a
 * test point and an automatic safety shut-off valve after the Elektrogas
 * VMR6 2" (165 mm installation length), which the gas proving and
 * emergency stop system closes. Ours by Trager-Feinstein and Warden.
 */
export function createGasTrain(kit: PanelKit, live: { ecv?: Object3D } = {}) {
  const t = plantTools(kit);
  const group = new Group();
  group.name = 'Gas train';
  const gas = t.paint(BS1710_BASIC.gases, 0.5);
  const galv = t.paint(FINISH.galvanised, 0.4, 0.6);
  const r = STEEL_OD[50] / 2;
  const y = 1.0,
    z = 0;
  // The frame the train is fixed to: two uprights and channel.
  for (const x of [-1.05, 1.05])
    t.box(group, galv, 0.041, 1.6, 0.041, x, 0.8, -0.2);
  t.box(group, galv, 2.14, 0.041, 0.041, 0, 1.55, -0.2);
  t.box(group, galv, 2.14, 0.041, 0.041, 0, 0.45, -0.2);
  // The run: in from the floor at the left, across, and up at the right.
  t.rod(group, gas, [-1.0, 0, z], [-1.0, y, z], r, 14);
  t.rod(group, gas, [-1.0, y, z], [-0.55, y, z], r, 14);
  t.rod(group, gas, [-0.25, y, z], [1.0, y, z], r, 14);
  t.rod(group, gas, [1.0, y, z], [1.0, 1.6, z], r, 14);
  // Emergency control valve with its yellow lever: the working ball
  // valve when given.
  if (live.ecv) {
    live.ecv.position.set(-1.0, 0.5, z);
    live.ecv.rotation.set(0, 0, Math.PI / 2);
    group.add(live.ecv);
  } else {
    t.cyl(
      group,
      t.paint(FINISH.brass, 0.35, 0.7),
      0.04,
      0.12,
      -1.0,
      0.5,
      z,
      'y',
      14,
    );
    t.box(group, t.paint('#e5c43a', 0.5), 0.02, 0.02, 0.2, -1.0, 0.56, z + 0.1);
  }
  sign(
    t,
    group,
    'GAS EMERGENCY\nCONTROL VALVE',
    // On the frame's lower rail, by the valve.
    [-0.75, 0.45, -0.2 + 0.0215],
    0.2,
    0.07,
    { ground: '#e5c43a' },
  );
  // The meter, hung from its two spigots.
  const meter = brandLivery(kit, 'trager-feinstein').paint.casing;
  t.rod(group, gas, [-0.55, y, z], [-0.55, y - 0.04, z], r, 14);
  t.rod(group, gas, [-0.25, y, z], [-0.25, y - 0.04, z], r, 14);
  t.box(group, meter, 0.335, 0.457, 0.289, -0.4, y - 0.04 - 0.23, z);
  t.box(
    group,
    t.paint('#1d2022', 0.5),
    0.14,
    0.05,
    0.004,
    -0.4,
    y - 0.2,
    z + 0.146,
  );
  nameplate(
    kit,
    group,
    'trager-feinstein',
    [-0.4, y - 0.36, z + 0.146],
    ['G25  Qmax 40 m³/h', 'Pmax 0.5 bar  DN50'],
    0.13,
    0.06,
  );
  // Filter, test point, safety shut-off valve with its coil.
  t.box(group, t.paint('#7d8487', 0.4, 0.4), 0.16, 0.14, 0.12, 0.1, y, z);
  t.cyl(
    group,
    t.paint(FINISH.brass, 0.35, 0.7),
    0.008,
    0.04,
    0.28,
    y + 0.05,
    z,
    'y',
    8,
  );
  t.box(group, t.paint('#8c9295', 0.35, 0.6), 0.165, 0.12, 0.1, 0.55, y, z);
  t.box(
    group,
    brandLivery(kit, 'warden').paint.main,
    0.09,
    0.11,
    0.09,
    0.55,
    y + 0.115,
    z,
  );
  badge(kit, group, 'warden', [0.55, y + 0.12, z + 0.047], 0.02, '#e9e9e2');
  // The coil's indicator: lit while the valve is held open.
  const coilLamp = new MeshBasicMaterial({ color: '#5dff7a' });
  kit.materials.push(coilLamp);
  t.cyl(
    group,
    coilLamp,
    0.008,
    0.006,
    0.55,
    y + 0.15,
    z + 0.047,
    'z',
    12,
  ).userData.live = true;
  sign(
    t,
    group,
    'SSOV-701\nGAS SAFETY VALVE',
    // On the valve body's face.
    [0.55, y, z + 0.0505],
    0.15,
    0.05,
  );
  // BS 1710 identification and flow arrow.
  // On the frame's top rail.
  sign(t, group, 'NATURAL GAS  →', [0.3, 1.55, -0.2 + 0.0215], 0.36, 0.05, {
    ground: BS1710_BASIC.gases,
  });
  return Object.assign(group, {
    /** Show the safety shut-off valve open (lamp lit) or shut. */
    setSsov(open: boolean) {
      coilLamp.color.set(open ? '#5dff7a' : '#24331f');
    },
  });
}

// ---- Gas detection and the emergency stop ---------------------------------

/**
 * A wall board: the gas detection control panel, after the Crowcon
 * Gasflag (210 × 145 × 46 mm), with its methane detector head high on
 * the wall (methane rises: about 300 mm below the ceiling), a sounder
 * beacon, and the boiler house emergency stop, a red mushroom button in a
 * yellow box by the door that shuts the gas safety valve and stops the
 * boilers. Ours by Kessler-Moody and Hartwell & Bligh.
 */
export function createGasSafetyBoard(
  kit: PanelKit,
  live: {
    stop?: Object3D;
    test?: Object3D;
    reset?: Object3D;
    /** The working sounder-beacon, in place of the painted one. */
    beacon?: Object3D;
  } = {},
) {
  const t = plantTools(kit);
  const group = new Group();
  group.name = 'Gas detection and emergency stop';
  t.box(group, t.paint('#d7dad3', 0.8), 1.4, 1.8, 0.02, 0, 0, 0.01);
  const white = brandLivery(kit, 'kessler-moody').paint.casing;
  // The control panel.
  t.box(group, white, 0.145, 0.21, 0.046, -0.4, -0.25, 0.043);
  t.box(group, t.paint('#1d2022', 0.5), 0.09, 0.04, 0.004, -0.4, -0.2, 0.068);
  // Its lamps: healthy, fault, gas alarm. Live: `setLamps` drives them.
  const lampMaterials = ['#58d07a', '#e5c43a', '#d8382f'].map((c, i) => {
    const material = new MeshBasicMaterial({ color: c });
    kit.materials.push(material);
    t.cyl(
      group,
      material,
      0.007,
      0.006,
      -0.44 + i * 0.04,
      -0.29,
      0.068,
      'z',
      10,
    ).userData.live = true;
    return { material, colour: c };
  });
  if (live.test) {
    live.test.position.set(-0.4, -0.45, 0.02);
    group.add(live.test);
  }
  if (live.reset) {
    live.reset.position.set(-0.15, -0.45, 0.02);
    group.add(live.reset);
  }
  badge(kit, group, 'kessler-moody', [-0.4, -0.14, 0.068], 0.015);
  // The detector head, high, and its cable.
  t.box(group, white, 0.1, 0.12, 0.06, -0.4, 0.75, 0.05);
  t.cyl(
    group,
    t.paint('#2e3236', 0.5),
    0.025,
    0.05,
    -0.4,
    0.665,
    0.05,
    'y',
    14,
  );
  t.box(group, t.paint('#9aa1a6', 0.5), 0.02, 0.85, 0.015, -0.33, 0.25, 0.028);
  // Sounder beacon: the working one when given.
  if (live.beacon) {
    live.beacon.position.set(0.05, 0.75, 0.02);
    group.add(live.beacon);
  } else {
    const red = t.paint('#d8382f', 0.4);
    const amber = t.paint('#f0a020', 0.25);
    t.cyl(group, red, 0.05, 0.07, 0.05, 0.75, 0.055, 'z', 20);
    t.cyl(group, amber, 0.03, 0.03, 0.05, 0.75, 0.1, 'z', 16);
  }
  // The emergency stop: yellow box, red mushroom head, its label; the
  // working mushroom stop when given.
  if (live.stop) {
    t.box(group, t.paint('#e5c43a', 0.45), 0.09, 0.09, 0.08, 0.45, -0.25, 0.06);
    live.stop.position.set(0.45, -0.25, 0.1);
    group.add(live.stop);
  } else {
    t.box(group, t.paint('#e5c43a', 0.45), 0.09, 0.09, 0.08, 0.45, -0.25, 0.06);
    t.cyl(
      group,
      t.paint('#c42b23', 0.4),
      0.02,
      0.03,
      0.45,
      -0.25,
      0.115,
      'z',
      16,
    );
    t.cyl(
      group,
      t.paint('#c42b23', 0.4),
      0.032,
      0.02,
      0.45,
      -0.25,
      0.135,
      'z',
      20,
    );
  }
  badge(kit, group, 'penfold', [0.45, -0.32, 0.101], 0.014);
  sign(
    t,
    group,
    'BOILER HOUSE\nEMERGENCY STOP',
    [0.45, -0.05, 0.022],
    0.28,
    0.1,
    { ground: '#c42b23', ink: '#ffffff' },
  );
  sign(t, group, 'GAS DETECTION', [-0.4, 0.0, 0.022], 0.24, 0.05);
  return Object.assign(group, {
    /** Light the panel's lamps: healthy, fault, gas detected. */
    setLamps(healthy: boolean, fault: boolean, gas: boolean) {
      const on = [healthy, fault, gas];
      lampMaterials.forEach((l, i) =>
        l.material.color.set(on[i] ? l.colour : '#2a2c2a'),
      );
    },
  });
}
