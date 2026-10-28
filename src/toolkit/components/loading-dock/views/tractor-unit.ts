import { CatmullRomCurve3, Group, Mesh, TubeGeometry, Vector3 } from 'three';
import type { Material, Object3D } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { effect } from '@preact/signals-core';
import type { PanelKit } from '../../core/views/eighties-controls';
import { kitGlow } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { brandLivery } from '../../core/views/brand-livery';
import { createBrandBadge } from '../../core/views/brand-badge';
import { drawBrandMark, wordmarkFont } from '../../core/views/brand-logo';
import { brandById } from '../../core/logic/brands';
import type { BrandId } from '../../core/logic/brands';
import { markComponent } from '../../core/views/component-identity';
import { beginPart, selector } from '../../core/parts/parts';
import type { Part } from '../../core/parts/parts';
import { UNIT } from '../logic/rig';

/**
 * A Haulmark tractor unit (prompt 097): a 4 × 2 cab-over after the 2000s
 * European units (the DAF XF, Volvo FH and Scania R), a sleeper cab on a
 * ladder chassis, in its operator's livery. Set decoration that works
 * where a visitor would touch it: its cab doors open and shut, and the
 * switch box on the back of its cab puts on its work lights and its amber
 * beacons. It does not drive.
 *
 * Metres; on the ground at its rear axle's middle, its front toward +z
 * (`UNIT` in `rig.ts`). `parts` are its working parts, for the room's
 * `PartSet`.
 */
export function createTractorUnit(
  kit: PanelKit,
  {
    operator,
    cab: cabColour,
    stripe,
    fleet,
  }: {
    /** Whose fleet it runs in: its name and mark on the doors and visor. */
    operator: BrandId;
    cab: string;
    stripe: string;
    /** Its fleet number, on the cab's front corner. */
    fleet: string;
  },
): { group: Group; parts: Part[] } {
  const t = tools(kit);
  const group = new Group();
  group.name = 'Haulmark tractor unit';
  const parts: Part[] = [];
  const W = UNIT.width;
  const front = UNIT.wheelbase + UNIT.frontOverhang;
  const { floor, roof, back, spoiler } = UNIT.cab;
  const depth = front - back;
  const black = t.paint('#1b1c1e', 0.7);
  const chassis = t.paint('#2a2b2d', 0.6, 0.2);
  const rubber = t.paint('#141414', 0.9);
  const rim = t.paint('#c9cbcc', 0.35, 0.6);
  const glass = t.paint('#1d2a33', 0.15, 0.4);
  const plastic = t.paint('#3a3c3e', 0.65);
  const chrome = t.paint('#d6d8da', 0.2, 0.9);
  const body = t.paint(cabColour, 0.4);
  const band = t.paint(stripe, 0.45);

  // ---- The chassis, its axles and wheels -----------------------------------
  for (const s of [-1, 1])
    t.box(
      group,
      chassis,
      0.09,
      0.28,
      front - 0.2 + UNIT.rearOverhang,
      s * 0.43,
      0.88,
      (front - 0.2 - UNIT.rearOverhang) / 2,
    );
  for (const z of [-0.6, 0.9, 2.4, 3.9])
    t.box(group, chassis, 0.86, 0.12, 0.08, 0, 0.88, z);
  const wheel = (x: number, z: number, side: number, twin = false) => {
    for (const k of twin ? [0, 1] : [0]) {
      const wx = x + side * k * (UNIT.tyre.w + 0.02);
      t.cyl(
        group,
        rubber,
        UNIT.tyre.r,
        UNIT.tyre.w,
        wx,
        UNIT.tyre.r,
        z,
        'x',
        28,
      );
      // Its rim, outboard.
      if (k === (twin ? 1 : 0))
        t.cyl(
          group,
          rim,
          0.29,
          0.02,
          wx + side * (UNIT.tyre.w / 2),
          UNIT.tyre.r,
          z,
          'x',
          20,
        );
    }
    t.cyl(
      group,
      chrome,
      0.07,
      0.03,
      x + side * (UNIT.tyre.w * (twin ? 1.6 : 0.6)),
      UNIT.tyre.r,
      z,
      'x',
      10,
    );
  };
  for (const s of [-1, 1]) {
    wheel(s * (W / 2 - UNIT.tyre.w / 2), UNIT.wheelbase, s);
    wheel(s * (W / 2 - UNIT.tyre.w * 1.5 - 0.02), 0, s, true);
    // The rear wheels' mudguards, quarter-round over the twins.
    t.box(
      group,
      black,
      UNIT.tyre.w * 2 + 0.1,
      0.02,
      0.9,
      s * (W / 2 - UNIT.tyre.w - 0.02),
      1.16,
      0.15,
    );
    t.box(
      group,
      black,
      UNIT.tyre.w * 2 + 0.1,
      0.35,
      0.02,
      s * (W / 2 - UNIT.tyre.w - 0.02),
      1.0,
      -0.3,
    );
  }
  // Axle beams.
  t.cyl(group, chassis, 0.07, W - 0.6, 0, UNIT.tyre.r, 0, 'x', 10);
  t.cyl(group, chassis, 0.06, W - 0.6, 0, UNIT.tyre.r, UNIT.wheelbase, 'x', 10);

  // ---- The fifth wheel -----------------------------------------------------
  const fw = UNIT.fifthWheel;
  t.box(group, chassis, 0.95, 0.12, 0.7, 0, fw.y - 0.12, fw.z);
  const plate = t.cyl(
    group,
    t.paint('#3c3e40', 0.4, 0.5),
    0.45,
    0.06,
    0,
    fw.y - 0.03,
    fw.z,
    'y',
    24,
  );
  plate.name = 'Fifth wheel';
  // Its throat, the slot the kingpin enters, open to the rear.
  t.box(group, black, 0.12, 0.062, 0.45, 0, fw.y - 0.03, fw.z - 0.25);

  // ---- On the chassis: fuel, AdBlue, batteries, air tanks ------------------
  const tank = t.paint('#b9bcbf', 0.3, 0.7);
  t.box(group, tank, 0.62, 0.62, 1.3, -(W / 2 - 0.42), 0.82, 1.95);
  t.cyl(group, chrome, 0.07, 0.04, -(W / 2 - 0.1), 1.08, 1.95, 'x', 12);
  t.box(
    group,
    t.paint('#2a4c8f', 0.5),
    0.36,
    0.45,
    0.45,
    -(W / 2 - 0.3),
    0.8,
    2.95,
  );
  t.box(group, black, 0.5, 0.45, 0.7, W / 2 - 0.36, 0.84, 2.1);
  for (const z of [0.95, 1.4])
    t.cyl(
      group,
      t.paint('#4d5052', 0.5, 0.4),
      0.13,
      0.8,
      0.0,
      0.62,
      z,
      'x',
      12,
    );
  // The exhaust's tail, under the right side.
  t.cyl(group, chrome, 0.06, 0.4, W / 2 - 0.25, 0.42, 0.95, 'z', 12);

  // ---- The cab -----------------------------------------------------------
  const cab = new Mesh(
    new RoundedBoxGeometry(W - 0.02, roof - floor, depth, 4, 0.09),
    body,
  );
  cab.position.set(0, (floor + roof) / 2, (front + back) / 2);
  group.add(cab);
  // The roof spoiler, rising to the trailer's height behind.
  const deflector = new Mesh(
    new RoundedBoxGeometry(W - 0.2, spoiler - roof, depth - 0.5, 3, 0.08),
    body,
  );
  deflector.position.set(
    0,
    (roof + spoiler) / 2 - 0.02,
    (front + back) / 2 - 0.2,
  );
  group.add(deflector);
  // The livery's band round the cab, below the windows.
  for (const s of [-1, 1])
    t.box(
      group,
      band,
      0.012,
      0.16,
      depth - 0.2,
      s * (W / 2 - 0.004),
      2.05,
      (front + back) / 2,
    );
  t.box(group, band, W - 0.2, 0.16, 0.012, 0, 2.05, front - 0.004);
  // The windscreen, raked a little, and its wiper arms.
  const screen = t.box(
    group,
    glass,
    W - 0.22,
    1.0,
    0.03,
    0,
    2.72,
    front - 0.02,
  );
  screen.rotation.x = -0.08;
  for (const x of [-0.55, 0.45]) {
    const wiper = t.box(group, black, 0.02, 0.85, 0.015, x, 2.6, front + 0.012);
    wiper.rotation.z = 0.25;
  }
  // The sun visor over it.
  t.box(group, body, W - 0.1, 0.06, 0.32, 0, 3.32, front + 0.1);
  // The grille, its slats, and Haulmark's badge and name above it.
  t.box(group, black, 1.5, 0.85, 0.03, 0, 1.68, front - 0.005);
  for (let i = 0; i < 6; i++)
    t.box(group, plastic, 1.42, 0.04, 0.03, 0, 1.33 + i * 0.13, front + 0.012);
  const badge = createBrandBadge(kit, 'haulmark', { height: 0.2 });
  badge.position.set(0, 1.68, front + 0.03);
  group.add(badge);
  const haulmark = brandById('haulmark');
  const name = t.printed(
    1.0,
    0.13,
    (c, cw, ch) => {
      c.clearRect(0, 0, cw, ch);
      c.fillStyle = '#e9ecef';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = wordmarkFont(haulmark, ch * 0.78);
      c.fillText(haulmark.wordmark ?? haulmark.name, cw / 2, ch / 2, cw * 0.96);
    },
    512,
  );
  (name.mesh.material as Material & { transparent: boolean }).transparent =
    true;
  name.mesh.position.set(0, 2.18, front + 0.006);
  group.add(name.mesh);
  // The bumper, its headlamps and fog lamps, and the steps up to the doors.
  t.box(group, plastic, W - 0.04, 0.48, 0.26, 0, 0.82, front - 0.06);
  const lamps: { set(level: number): void }[] = [];
  const glowBox = (
    colour: string,
    w: number,
    h: number,
    x: number,
    y: number,
    z: number,
  ) => {
    const material = kitGlow(kit, colour);
    const on = material.color.clone();
    const off = on.clone().multiplyScalar(0.25);
    material.color.copy(off);
    t.box(group, material, w, h, 0.02, x, y, z);
    return { set: (level: number) => material.color.copy(off).lerp(on, level) };
  };
  const heads: { set(level: number): void }[] = [];
  for (const s of [-1, 1]) {
    heads.push(glowBox('#fff6dc', 0.42, 0.16, s * 0.82, 0.96, front + 0.075));
    heads.push(glowBox('#fff1c8', 0.14, 0.09, s * 0.82, 0.72, front + 0.075));
    // Amber side repeaters on the cab's front corners.
    lamps.push(
      glowBox('#ffb020', 0.02, 0.06, s * (W / 2 + 0.005), 1.55, front - 0.25),
    );
    for (const y of [0.42, 0.72])
      t.box(
        group,
        t.paint('#9a9c9e', 0.4, 0.6),
        0.5,
        0.03,
        0.26,
        s * (W / 2 - 0.3),
        y,
        front - 0.75,
      );
  }
  // Its ADR plate's bracket, blank until it carries something that needs one.
  // The number plate.
  const plateMesh = t.printed(0.52, 0.11, (c, cw, ch) => {
    c.fillStyle = '#f4f4ef';
    c.fillRect(0, 0, cw, ch);
    c.fillStyle = '#111';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `700 ${ch * 0.7}px "Helvetica Neue", Arial, sans-serif`;
    c.fillText('HM07 DLV', cw / 2, ch / 2 + 2, cw * 0.9);
  });
  plateMesh.mesh.position.set(0, 0.7, front + 0.075);
  group.add(plateMesh.mesh);

  // ---- The operator's livery on the doors and visor ------------------------
  const livery = brandLivery(kit, operator);
  const op = livery.brand;
  const sign = (w: number, h: number) =>
    t.printed(
      w,
      h,
      (c, cw, ch) => {
        c.clearRect(0, 0, cw, ch);
        drawBrandMark(c, op, ch * 0.5, ch / 2, ch * 0.42);
        c.fillStyle = livery.palette.ink === cabColour ? '#ffffff' : stripe;
        c.textAlign = 'left';
        c.textBaseline = 'middle';
        c.font = wordmarkFont(op, ch * 0.42);
        c.fillText(
          op.wordmark ?? op.name.toUpperCase(),
          ch * 1.05,
          ch / 2,
          cw - ch * 1.1,
        );
      },
      512,
    );
  const visor = sign(1.6, 0.26);
  (visor.mesh.material as Material & { transparent: boolean }).transparent =
    true;
  visor.mesh.position.set(0, 3.08, front + 0.004);
  group.add(visor.mesh);
  const fleetNo = (s: number) => {
    const mark = t.label(
      group,
      fleet,
      s * (W / 2 + 0.004),
      3.3,
      front - 0.3,
      0.08,
      stripe,
    );
    mark.rotation.y = (s * Math.PI) / 2;
  };
  fleetNo(-1);
  fleetNo(1);

  // ---- The doors, which open ----------------------------------------------
  // Each hinged at its front edge, opening outward, after a cab-over's
  // wide door over its steps.
  const doorW = 1.12;
  const hingeZ = front - 0.2;
  for (const s of [-1, 1]) {
    const a = beginPart(
      kit,
      s < 0 ? 'Cab door (nearside)' : 'Cab door (offside)',
    );
    const hinge = new Group();
    hinge.position.set(s * (W / 2), 0, hingeZ);
    a.object.add(hinge);
    const leaf = new Group();
    hinge.add(leaf);
    const panel = t.box(
      leaf,
      body,
      0.05,
      1.0,
      doorW,
      s * 0.012,
      floor + 0.55,
      -doorW / 2,
    );
    const win = t.box(
      leaf,
      glass,
      0.05,
      0.78,
      doorW - 0.16,
      s * 0.012,
      floor + 1.5,
      -doorW / 2 + 0.03,
    );
    const stripeOn = t.box(
      leaf,
      band,
      0.052,
      0.16,
      doorW,
      s * 0.012,
      2.05,
      -doorW / 2,
    );
    const handle = t.box(
      leaf,
      chrome,
      0.04,
      0.04,
      0.2,
      s * 0.045,
      floor + 0.85,
      -doorW + 0.18,
    );
    const logo = sign(0.95, 0.42);
    (logo.mesh.material as Material & { transparent: boolean }).transparent =
      true;
    logo.mesh.position.set(s * 0.04, floor + 0.45, -doorW / 2);
    logo.mesh.rotation.y = (s * Math.PI) / 2;
    leaf.add(logo.mesh);
    group.add(a.object);
    let open = false;
    let angle = 0;
    const toggle = () => {
      open = !open;
    };
    for (const piece of [panel, win, stripeOn, handle, logo.mesh] as Object3D[])
      a.uses.set(piece, toggle);
    a.updates.push((delta) => {
      const want = open ? 1.2 : 0;
      angle +=
        Math.sign(want - angle) * Math.min(Math.abs(want - angle), delta * 1.6);
      hinge.rotation.y = s * angle;
    });
    a.shows(() => (open ? 'open' : 'shut'));
    parts.push(a.part());
  }
  // The mirrors on their arms ahead of the doors.
  for (const s of [-1, 1]) {
    t.box(
      group,
      black,
      0.32,
      0.04,
      0.04,
      s * (W / 2 + 0.14),
      2.85,
      front - 0.15,
    );
    t.box(
      group,
      black,
      0.09,
      0.42,
      0.22,
      s * (W / 2 + 0.3),
      2.65,
      front - 0.15,
    );
    t.box(
      group,
      glass,
      0.012,
      0.38,
      0.18,
      s * (W / 2 + 0.3),
      2.65,
      front - 0.27,
    );
  }

  // ---- Its lights: beacons on the roof, work lights on the cab's back ------
  const beacons: { set(level: number): void }[] = [];
  for (const s of [-1, 1]) {
    t.cyl(
      group,
      black,
      0.09,
      0.05,
      s * 0.75,
      spoiler + 0.02,
      back + 0.6,
      'y',
      16,
    );
    const lens = kitGlow(kit, '#ff9a1a');
    const on = lens.color.clone();
    const off = on.clone().multiplyScalar(0.3);
    lens.color.copy(off);
    t.cyl(
      group,
      lens,
      0.08,
      0.13,
      s * 0.75,
      spoiler + 0.11,
      back + 0.6,
      'y',
      16,
    );
    beacons.push({ set: (level) => lens.color.copy(off).lerp(on, level) });
  }
  const work: { set(level: number): void }[] = [];
  for (const s of [-1, 1]) {
    t.box(group, black, 0.2, 0.14, 0.08, s * 0.85, spoiler - 0.12, back - 0.02);
    const material = kitGlow(kit, '#f4f6ff');
    const on = material.color.clone();
    const off = on.clone().multiplyScalar(0.2);
    material.color.copy(off);
    t.box(
      group,
      material,
      0.17,
      0.1,
      0.01,
      s * 0.85,
      spoiler - 0.12,
      back - 0.065,
    );
    work.push({ set: (level) => material.color.copy(off).lerp(on, level) });
  }
  // The rear-of-cab switch box, where the driver works them from the
  // catwalk while coupling: WORK LIGHTS and BEACONS.
  const box = new Group();
  box.position.set(0.55, 1.75, back - 0.03);
  box.rotation.y = Math.PI;
  group.add(box);
  t.box(box, t.paint('#3a3d40', 0.55), 0.34, 0.2, 0.08, 0, 0, -0.04);
  const workSwitch = selector(kit, {
    positions: 2,
    legend: 'WORK LIGHTS',
    name: 'Work lights switch',
    series: 'xb4',
  });
  workSwitch.object.position.set(-0.08, -0.02, 0.001);
  box.add(workSwitch.object);
  const beaconSwitch = selector(kit, {
    positions: 2,
    legend: 'BEACONS',
    name: 'Beacons switch',
    series: 'xb4',
  });
  beaconSwitch.object.position.set(0.08, -0.02, 0.001);
  box.add(beaconSwitch.object);
  parts.push(workSwitch, beaconSwitch);
  // The beacons turn: each flashes in its own phase while on.
  let clock = 0;
  const lightsOn = () => workSwitch.position.value === 1;
  const stopWork = effect(() => {
    const lit = lightsOn() ? 1 : 0;
    for (const l of [...work, ...heads]) l.set(lit);
  });
  const turning = beginPart(kit, 'Beacons');
  turning.updates.push((delta) => {
    clock += delta;
    const on = beaconSwitch.position.value === 1;
    beacons.forEach((b, i) =>
      b.set(on ? 0.5 + 0.5 * Math.max(0, Math.sin(clock * 9 + i * 2.2)) : 0),
    );
    for (const l of lamps) l.set(on ? 1 : 0);
  });
  turning.disposers.push(stopWork);
  parts.push(turning.part());

  // ---- The air and electric lines to the trailer (the "suzies") ----------
  const coil = (colour: string, x: number) => {
    const points = [
      new Vector3(x, 2.2, back - 0.05),
      new Vector3(x, 1.85, back - 0.6),
      new Vector3(x * 0.6, 1.7, back - 1.1),
      new Vector3(x * 0.4, 1.55, back - 1.7),
    ];
    const tube = new Mesh(
      new TubeGeometry(new CatmullRomCurve3(points), 24, 0.012, 6),
      t.paint(colour, 0.5),
    );
    group.add(tube);
  };
  coil('#c62a22', -0.25);
  coil('#e2b81f', -0.15);
  coil('#1b1b1b', -0.05);

  return {
    group: markComponent(group, {
      name: 'Haulmark tractor unit',
      decorative: true,
    }),
    parts,
  };
}
