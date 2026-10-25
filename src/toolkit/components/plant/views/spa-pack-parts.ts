import {
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
} from 'three';
import { createSightGlass } from './sight-glass';
import type { GlassInputs } from '../logic/sight-glass';
import type { Object3D } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import {
  createMicroLabel,
  createSevenSegment,
} from '../../core/views/eighties-controls';
import { createBrandBadge } from '../../core/views/brand-badge';
import { createDialGauge } from '../../industrial-control/views/dial-gauge';
import { plantTools } from './plant-tools';

/**
 * The parts of a packaged spa set (the small circuits' plant: the foot
 * spa's), each modelled on its own at true size after the kind of product
 * it copies, to go together on a skid in a prefabricated cabinet
 * (`spa-pack.ts`) or to be shown alone. Each is built on the floor at its
 * origin, its front toward +z, metres; each returns its group and what
 * changes as it runs.
 */

type Tools = ReturnType<typeof plantTools>;
type Point = [number, number, number];

const paints = (t: Tools) => ({
  motor: t.paint('#2f5d8c', 0.45, 0.2),
  black: t.paint('#202426', 0.55),
  grey: t.paint('#8c9295', 0.55),
  white: t.paint('#eceee9', 0.4),
  stainless: t.paint('#c9cdcf', 0.3, 0.85),
  brass: t.paint('#b8913f', 0.35, 0.7),
  vessel: t.paint('#3b5f8a', 0.45),
});

const badge = (
  kit: PanelKit,
  parent: Object3D,
  id: Parameters<typeof createBrandBadge>[1],
  at: Point,
  height = 0.025,
) => {
  const b = createBrandBadge(kit, id, { height });
  b.position.set(...at);
  parent.add(b);
  return b;
};

/**
 * A self-priming spa circulation pump, after Speck's BADU Prime 7: 7 m³/h,
 * 0.3 kW (0.5 kW drawn) at 230 V, 1½ in. connections, about 10 kg. A
 * ribbed motor on feet, a volute, and its strainer pot with a clear lid
 * and the basket inside, unions each side; its length, about 0.5 m, is
 * estimated (no drawing found). Grundflow's badge on it. Its fan spins as
 * it runs.
 */
export function createSpaPump(kit: PanelKit) {
  const t = plantTools(kit);
  const p = paints(t);
  const group = new Group();
  group.name = 'Spa circulation pump';
  const y = 0.13;
  // Feet and base.
  t.box(group, p.black, 0.42, 0.03, 0.16, 0.02, 0.015, 0);
  // The motor: a body with cooling ribs, and the fan cowl behind.
  t.cyl(group, p.motor, 0.075, 0.24, 0.12, y, 0, 'x', 24);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    t.box(
      group,
      p.motor,
      0.22,
      0.006,
      0.012,
      0.12,
      y + Math.sin(a) * 0.078,
      Math.cos(a) * 0.078,
    ).rotation.x = a;
  }
  t.cyl(group, p.black, 0.072, 0.06, 0.27, y, 0, 'x', 24);
  const fan = new Group();
  fan.position.set(0.302, y, 0);
  group.add(fan);
  for (let k = 0; k < 4; k++)
    t.box(fan, p.grey, 0.004, 0.11, 0.02, 0, 0, 0).rotation.x =
      (k * Math.PI) / 4;
  // The terminal box on top.
  t.box(group, p.motor, 0.07, 0.04, 0.07, 0.1, y + 0.09, 0);
  // The volute, and the strainer pot ahead of it with its clear lid.
  t.cyl(group, p.white, 0.07, 0.07, -0.03, y, 0, 'x', 24);
  t.cyl(group, p.white, 0.055, 0.17, -0.14, y + 0.02, 0, 'y', 24);
  const lid = new MeshStandardMaterial({
    color: '#cfe6ee',
    transparent: true,
    opacity: 0.45,
    roughness: 0.1,
  });
  kit.materials.push(lid);
  t.cyl(group, lid, 0.058, 0.02, -0.14, y + 0.115, 0, 'y', 24);
  t.cyl(group, p.grey, 0.045, 0.1, -0.14, y + 0.04, 0, 'y', 16);
  // Suction union into the pot, discharge up from the volute.
  t.cyl(group, p.grey, 0.028, 0.06, -0.21, y + 0.02, 0, 'x', 16);
  t.cyl(group, p.grey, 0.028, 0.08, -0.03, y + 0.1, 0, 'y', 16);
  t.ratingPlate(
    group,
    [0.12, y, 0.079],
    'GRUNDFLOW',
    ['SPA 7', '0.3 kW 230 V', '7 m³/h'],
    0.07,
    0.04,
  );
  badge(kit, group, 'grundflow', [-0.03, y + 0.02, 0.072], 0.02);
  return {
    group,
    /** Spin the fan as it runs: call each frame. */
    update(delta: number, running: boolean) {
      if (running) fan.rotation.x += delta * 40;
    },
  };
}

/**
 * A spa cabinet's sand filter (the owner, 2026-10-25), in place of its
 * cartridge: a small Lidoluxe pressure vessel, its size its filter's
 * (`SPA_FILTERS`: the jacuzzi's Ø0.44 m on a 0.8 m bed, the foot spa's
 * Ø0.38 m on 0.6 m), on its base ring; on its top its three-way valve
 * head, turned by a servo, and its gauge; a small sight glass on its front
 * showing its bed; its inlet and outlet unions low at either side, where
 * the cartridge's were (0.23 m out from its middle, 0.12 m up), so the
 * cabinet's pipework is unchanged.
 */
export function createSpaSandFilter(
  kit: PanelKit,
  { diameter, bedDepth }: { diameter: number; bedDepth: number },
) {
  const t = plantTools(kit);
  const p = paints(t);
  const group = new Group();
  group.name = 'Spa sand filter';
  const r = diameter / 2;
  const base = 0.06;
  // The shell: its bed, and the freeboard over it for the bed to lift.
  const shell = bedDepth + 0.3;
  t.cyl(group, p.grey, r * 0.85, base, 0, base / 2, 0, 'y', 28);
  t.cyl(group, p.white, r, shell, 0, base + shell / 2, 0, 'y', 36);
  // Its domed top, flattened, and its valve head.
  const top = base + shell;
  const dome = new Mesh(
    new SphereGeometry(r, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    p.white,
  );
  dome.scale.set(1, 0.35, 1);
  dome.position.y = top;
  group.add(dome);
  const head = top + r * 0.35;
  t.cyl(group, p.grey, 0.07, 0.09, 0, head + 0.04, 0, 'y', 20);
  // The servo on the valve head, its actuator box and its cable gland.
  t.box(group, p.black, 0.09, 0.07, 0.07, 0, head + 0.12, 0);
  t.cyl(group, p.stainless, 0.008, 0.03, 0.05, head + 0.12, 0, 'x', 8);
  const gauge = createDialGauge(kit, {
    dia: 0.06,
    max: 2.5,
    maker: 'kessler-moody',
  });
  gauge.group.position.set(0, head + 0.06, 0.08);
  group.add(gauge.group);
  // Its inlet and outlet: out to where the cartridge's unions were.
  for (const side of [-1, 1]) {
    const from = r * 0.95;
    const to = 0.23;
    if (to > from)
      t.cyl(
        group,
        p.grey,
        0.028,
        to - from,
        side * ((from + to) / 2),
        0.12,
        0,
        'x',
        16,
      );
  }
  // Its sight glass, half way up its bed, on its front.
  const glass = createSightGlass(kit, {
    radius: 0.045,
    seed: Math.round(diameter * 100),
  });
  glass.group.position.set(0, base + 0.08 + bedDepth * 0.6, r + 0.004);
  group.add(glass.group);
  t.cyl(group, p.black, 0.015, 0.02, 0, 0.07, r, 'z', 10);
  badge(kit, group, 'lidoluxe', [0, base + shell * 0.85, r + 0.002], 0.03);
  return {
    group,
    /** Its gauge's reading, bar, and its sight glass's view of its bed: call each frame. */
    update(delta: number, pressure: number, bed?: GlassInputs) {
      gauge.set(pressure);
      gauge.update(delta);
      if (bed) glass.update(bed, delta);
    },
  };
}

/**
 * An inline UV unit, after Blue Lagoon's UV-C Tech 40 W: a duplex
 * stainless chamber for 50/63 mm pipe (its length, 0.62 m, estimated: no
 * drawing found), on two saddle clips, its lamp's sleeve and end cap and cable at
 * one end, a sight glass that glows while the lamp runs, and its control
 * box on the wall with a lamp-on light and a lamp-hours counter (lamps are
 * changed at about 9000 hours). 0.62 m long.
 */
export function createInlineUv(kit: PanelKit) {
  const t = plantTools(kit);
  const p = paints(t);
  const group = new Group();
  group.name = 'Inline UV unit';
  const y = 0.12;
  for (const x of [-0.2, 0.2]) t.box(group, p.grey, 0.04, y, 0.08, x, y / 2, 0);
  t.cyl(group, p.stainless, 0.05, 0.56, 0, y + 0.05, 0, 'x', 24);
  t.cyl(group, p.black, 0.052, 0.05, 0.3, y + 0.05, 0, 'x', 24);
  t.rod(group, p.black, [0.325, y + 0.05, 0], [0.4, y + 0.05, 0], 0.006, 8);
  for (const x of [-0.22, 0.18])
    t.cyl(group, p.grey, 0.026, 0.06, x, y + 0.12, 0, 'y', 16);
  const glow = new MeshStandardMaterial({
    color: '#1c2a3a',
    emissive: '#7ab8ff',
    emissiveIntensity: 0,
  });
  kit.materials.push(glow);
  t.cyl(group, glow, 0.016, 0.012, 0, y + 0.05, 0.05, 'z', 16);
  // The control box, on its own, above.
  const box = new Group();
  box.position.set(0, 0.55, -0.02);
  group.add(box);
  t.box(box, p.white, 0.2, 0.14, 0.07, 0, 0, 0);
  const lamp = t.led(box, '#7ab8ff', 0.008, -0.06, 0.03, 0.036);
  const hours = createSevenSegment(kit, 5, { digitHeight: 0.012 });
  hours.group.position.set(0.03, 0.03, 0.036);
  box.add(hours.group);
  hours.group.traverse((o) => (o.userData.live = true));
  t.label(box, 'LAMP HOURS', 0.03, 0.005, 0.0365, 0.006);
  badge(kit, box, 'lidoluxe', [0, -0.04, 0.036], 0.02);
  let run = 4120.4;
  return {
    group,
    /** Light the lamp and count its hours (a game second an hour). */
    update(delta: number, on: boolean) {
      if (on) run += delta;
      glow.emissiveIntensity = on ? 2.2 : 0;
      lamp.set(on);
      hours.show(String(Math.floor(run)).padStart(5, ' '));
    },
  };
}

/**
 * A small brazed plate heat exchanger, after SWEP's B8 with 20 plates
 * (about 117 × 310 mm, from memory of its range: to be checked): a stack of
 * stainless plates between end plates, four threaded ports (the heating
 * ring's flow and return on one side, the pool water's on the other) and
 * its insulation jacket left off to show it. 0.12 × 0.31 m.
 */
export function createSpaHeatExchanger(kit: PanelKit) {
  const t = plantTools(kit);
  const p = paints(t);
  const group = new Group();
  group.name = 'Brazed plate heat exchanger';
  t.box(group, p.grey, 0.16, 0.04, 0.16, 0, 0.02, 0);
  const plates = 20;
  for (let k = 0; k < plates; k++)
    t.box(
      group,
      k % 2 ? p.stainless : p.grey,
      0.12,
      0.31,
      0.004,
      0,
      0.2,
      -0.04 + k * 0.0042,
    );
  for (const z of [-0.048, 0.048])
    t.box(group, p.stainless, 0.125, 0.315, 0.006, 0, 0.2, z);
  const ports: [number, number, string][] = [
    [-0.035, 0.32, '#c8302a'],
    [0.035, 0.32, '#3b5f8a'],
    [-0.035, 0.08, '#c8302a'],
    [0.035, 0.08, '#3b5f8a'],
  ];
  for (const [x, y, colour] of ports) {
    t.cyl(group, p.brass, 0.012, 0.03, x, y, 0.065, 'z', 12);
    // A coloured band: the heating ring's red, the pool water's blue.
    t.cyl(group, t.paint(colour, 0.6), 0.014, 0.012, x, y, 0.09, 'z', 12);
  }
  return { group, update() {} };
}

/**
 * A surge vessel: the spa's own small balance tank, an off-the-shelf
 * 100 l blue polyethylene water tank with a lid, its inlet from the spa's overflow, its outlet to the
 * pump, and a clear sight tube showing its level. 0.32 m across.
 */
export function createSurgeVessel(kit: PanelKit) {
  const t = plantTools(kit);
  const p = paints(t);
  const group = new Group();
  group.name = 'Surge vessel';
  t.cyl(group, p.vessel, 0.15, 0.5, 0, 0.25, 0, 'y', 32);
  t.cyl(group, p.black, 0.155, 0.03, 0, 0.515, 0, 'y', 32);
  t.cyl(group, p.grey, 0.025, 0.06, 0, 0.56, 0, 'y', 12);
  t.cyl(group, p.grey, 0.025, 0.06, 0.18, 0.15, 0, 'x', 12);
  // The sight tube, and the water in it.
  const tube = new MeshStandardMaterial({
    color: '#dff3f8',
    transparent: true,
    opacity: 0.35,
  });
  kit.materials.push(tube);
  t.cyl(group, tube, 0.008, 0.4, 0, 0.26, 0.16, 'y', 10);
  const water = t.cyl(
    group,
    t.paint('#3fa7c9', 0.2),
    0.006,
    1,
    0,
    0.06,
    0.16,
    'y',
    10,
  );
  water.userData.live = true;
  let level = 0.75;
  /** Show the water at `level` (0 to 1) up the sight tube. */
  const show = () => {
    const h = 0.38 * level;
    water.scale.y = h;
    water.position.y = 0.07 + h / 2;
  };
  show();
  return {
    group,
    /**
     * Its level, 0 to 1: lower while the pump draws it, refilling when
     * off; or, given `fill`, that (a vessel disconnected from its pump,
     * the cabinet plumbed to an external tank, empty at 0).
     */
    update(delta: number, running: boolean, fill?: number) {
      level =
        fill ??
        level + ((running ? 0.45 : 0.75) - level) * Math.min(1, delta * 0.5);
      show();
    },
  };
}

/**
 * The dosing controller: a wall-hung box with its free chlorine and pH
 * readouts, and two peristaltic pumps under it, hypochlorite and acid,
 * whose rotors turn while they dose, their tubes down to two 5 l
 * containers. After the small spa controllers with two peristaltic pumps
 * (Bayrol's Analyt class, from memory: to be checked); Grundflow's badge.
 * Built against a wall at z = 0.
 */
export function createSpaDosingController(kit: PanelKit) {
  const t = plantTools(kit);
  const p = paints(t);
  const group = new Group();
  group.name = 'Spa dosing controller';
  // The controller.
  t.box(group, p.white, 0.3, 0.22, 0.08, 0, 0.78, 0.04);
  const readouts = [-0.07, 0.07].map((x) => {
    const r = createSevenSegment(kit, 3, { digitHeight: 0.022 });
    r.group.position.set(x, 0.81, 0.081);
    r.group.traverse((o) => (o.userData.live = true));
    group.add(r.group);
    return r;
  });
  t.label(group, 'FREE Cl mg/l', -0.07, 0.76, 0.081, 0.007);
  t.label(group, 'pH', 0.07, 0.76, 0.081, 0.007);
  badge(kit, group, 'grundflow', [0, 0.7, 0.081], 0.018);
  // The two peristaltic pumps, as such pumps are: a grey body with its
  // motor behind, and on the front the pump head, a clear cover over a
  // turning rotor of three rollers that squeeze a flexible tube looped
  // round it, the tube coming in at one bottom corner (from the
  // container) and leaving at the other (to the injection point); a label
  // in the chemical's colour under each.
  const clear = new MeshStandardMaterial({
    color: '#e6f2f4',
    transparent: true,
    opacity: 0.28,
    roughness: 0.05,
  });
  const hose = new MeshStandardMaterial({ color: '#efe6cf', roughness: 0.5 });
  kit.materials.push(clear, hose);
  /** Where each pump's discharge tube leaves its head, in this frame. */
  const outlets: [number, number, number][] = [];
  const rotors = (
    [
      [-0.09, '#c8302a', 'HYPO'],
      [0.09, '#3b5f8a', 'ACID'],
    ] as const
  ).map(([x, colour, chemical]) => {
    const y = 0.5;
    // A taller body than the head needs, its label strip above the head.
    t.box(group, p.grey, 0.12, 0.19, 0.06, x, y + 0.015, 0.03);
    t.cyl(group, p.black, 0.03, 0.03, x, y, -0.005, 'z', 16);
    // The head: its dark back plate, the tube's track, the cover.
    t.cyl(group, p.black, 0.05, 0.012, x, y + 0.01, 0.066, 'z', 32);
    const loop = new Mesh(
      new TorusGeometry(0.036, 0.0045, 8, 32, Math.PI),
      hose,
    );
    loop.position.set(x, y + 0.01, 0.075);
    group.add(loop);
    t.cyl(group, clear, 0.05, 0.022, x, y + 0.01, 0.083, 'z', 32);
    const rotor = new Group();
    rotor.position.set(x, y + 0.01, 0.075);
    group.add(rotor);
    t.cyl(rotor, p.stainless, 0.012, 0.012, 0, 0, 0, 'z', 16);
    for (let k = 0; k < 3; k++) {
      const a = (k * 2 * Math.PI) / 3;
      t.rod(
        rotor,
        p.stainless,
        [0, 0, 0],
        [Math.cos(a) * 0.026, Math.sin(a) * 0.026, 0],
        0.003,
        6,
      );
      const roller = t.cyl(
        rotor,
        p.white,
        0.0085,
        0.012,
        Math.cos(a) * 0.028,
        Math.sin(a) * 0.028,
        0,
        'z',
        12,
      );
      roller.userData.live = true;
    }
    // The tube's two ends, out of the head's bottom corners.
    t.rod(
      group,
      hose,
      [x - 0.036, y + 0.01, 0.075],
      [x - 0.036, y - 0.055, 0.075],
      0.0045,
      8,
    );
    t.rod(
      group,
      hose,
      [x + 0.036, y + 0.01, 0.075],
      [x + 0.036, y - 0.055, 0.075],
      0.0045,
      8,
    );
    outlets.push([x + 0.036, y - 0.055, 0.075]);
    const tag = createMicroLabel(kit, chemical, {
      height: 0.008,
      ink: '#ffffff',
      plate: colour,
    });
    tag.position.set(x, y + 0.085, 0.0605);
    group.add(tag);
    // Its 5 l container on the floor, directly under the tube's inlet end.
    t.box(group, t.paint('#e8e6dc', 0.6), 0.15, 0.24, 0.1, x, 0.12, 0.06);
    t.cyl(
      group,
      t.paint(colour, 0.5),
      0.025,
      0.03,
      x - 0.036,
      0.255,
      0.075,
      'y',
      12,
    );
    t.rod(
      group,
      hose,
      [x - 0.036, y - 0.055, 0.075],
      [x - 0.036, 0.27, 0.075],
      0.0045,
      6,
    );
    return rotor;
  });
  return {
    group,
    /** Where the dosing tubes leave the pump heads, to run on to the pipework. */
    outlets,
    /** Show the readings, and turn the pumps while dosing. */
    update(delta: number, on: boolean, chlorine: number, ph: number) {
      readouts[0].show(on ? chlorine.toFixed(2) : '');
      readouts[1].show(on ? ph.toFixed(1) : '');
      if (on) for (const r of rotors) r.rotation.z -= delta * 3;
    },
  };
}
