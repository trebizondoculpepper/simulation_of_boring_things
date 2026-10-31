import { Box3, Group, Vector3 } from 'three';
import type { Mesh, Object3D } from 'three';
import { signal } from '@preact/signals-core';
import type { PanelKit } from '../../core/views/eighties-controls';
import {
  createMicroLabel,
  createSevenSegment,
} from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { createPartSet, pilotLight, pushButton } from '../../core/parts/parts';
import { brandLivery } from '../../core/views/brand-livery';
import { createBrandBadge } from '../../core/views/brand-badge';
import { createCharacterLcd } from '../../industrial-control/views/panel-instruments';
import { createDialGauge } from '../../industrial-control/views/dial-gauge';

/**
 * The parts Hall 6 ("Grundflow's Amazing World of Pumps", 107j) needs
 * that the game had no view of: the test tank's (an IBC's) litres scale,
 * level readout and float switch; the Olympic-sized split-case
 * pump; a small magnetic-drive transfer pump; a submersible sump pump;
 * and each pump's RUN stand (its lit RUN button, its flow readout and its
 * plaque). Each draws what it is told and redraws only on change.
 * Metres, standing on y = 0.
 */

/**
 * The test tank's own instruments, for the game's standard IBC
 * (`createIbc`) that is Hall 6's tank: LI1, a litres scale on the
 * bottle's −z face (toward the visitors) marked every 100 litres from its
 * floor; LSH1's float switch on the cage top with its amber lamp; and the
 * TEST TANK plate with Grundflow's badge. In the IBC's frame; `show` sets
 * the lamp, which redraws only on change.
 */
export function createTankInstruments(
  kit: PanelKit,
  {
    area,
    floor,
    fullL,
    tags,
  }: {
    area: number;
    floor: number;
    fullL: number;
    tags: { li: string; lt: string; lsh: string };
  },
) {
  const t = tools(kit);
  const group = new Group();
  group.name = 'Test tank instruments';
  // The face toward −z, drawn facing +z and turned round.
  const face = new Group();
  face.rotation.y = Math.PI;
  face.position.set(0, 0, -0.5);
  group.add(face);
  const scale = new Group();
  scale.position.set(-0.3, floor, 0);
  face.add(scale);
  const ink = t.paint('#16191b', 0.5);
  for (let l = 0; l <= fullL; l += 100) {
    const y = l / 1000 / area;
    t.box(scale, ink, l % 500 === 0 ? 0.08 : 0.05, 0.006, 0.004, 0, y, 0);
    if (l % 200 === 0) {
      const label = createMicroLabel(kit, `${l}`, {
        height: 0.03,
        ink: '#16191b',
        plate: '#f4f3ee',
      });
      label.position.set(0.09, y, 0.003);
      scale.add(label);
    }
  }
  const liTag = createMicroLabel(kit, `${tags.li} LITRES`, {
    height: 0.03,
    ink: '#16191b',
    plate: '#f4f3ee',
  });
  liTag.position.set(-0.3, floor + fullL / 1000 / area + 0.1, 0.003);
  face.add(liTag);
  const full = createMicroLabel(kit, 'FULL', {
    height: 0.03,
    ink: '#ffffff',
    plate: '#b22a22',
  });
  full.position.set(-0.47, floor + fullL / 1000 / area, 0.003);
  face.add(full);
  const badge = createBrandBadge(kit, 'grundflow', {
    height: 0.07,
    plate: '#ffffff',
  });
  badge.position.set(0.25, 0.75, 0.005);
  face.add(badge);
  const plate = createMicroLabel(kit, `TEST TANK  ${fullL} L`, {
    height: 0.04,
    ink: '#16191b',
    plate: '#f4f3ee',
  });
  plate.position.set(0.25, 0.62, 0.005);
  face.add(plate);
  // LSH1 on the cage's top rail: a float switch body and its amber lamp, toward the visitors.
  const lsh = new Group();
  lsh.position.set(0.3, 1.16, -0.49);
  lsh.rotation.y = Math.PI;
  group.add(lsh);
  t.box(lsh, t.paint('#2b3438', 0.5), 0.12, 0.1, 0.1, 0, 0.05, 0);
  const high = signal(false);
  const parts = createPartSet();
  const lamp = parts.add(
    pilotLight(kit, {
      colour: 'amber',
      legend: tags.lsh,
      drive: high,
      name: `${tags.lsh} lamp`,
      pushToTest: false,
    }),
  );
  lamp.object.position.set(0, 0.05, 0.052);
  lamp.object.scale.setScalar(0.8);
  lsh.add(lamp.object);
  return {
    group,
    parts,
    /** Its instruments' own pieces, for binding each to its model: LI1's scale and words, LSH1's switch and lamp. */
    pieces: { li: [scale, liTag, full] as Object3D[], lsh: lsh as Object3D },
    show(isHigh: boolean) {
      if (high.value !== isHigh) high.value = isHigh;
    },
  };
}

/** LT1's big litres readout, on its own: a dark board, four digits, LITRES and its tag. Front +z. */
export function createLitresDisplay(kit: PanelKit, tag: string) {
  const t = tools(kit);
  const group = new Group();
  group.name = `${tag} level display`;
  t.box(group, t.paint('#1b2328', 0.5), 0.9, 0.38, 0.05, 0, 0, 0.025);
  const digits = createSevenSegment(kit, 4, { digitHeight: 0.2 });
  digits.group.position.set(-0.1, 0.02, 0.052);
  group.add(digits.group);
  const unit = createMicroLabel(kit, `LITRES  ${tag}`, {
    height: 0.04,
    ink: '#f4f3ee',
  });
  unit.position.set(0.3, -0.13, 0.052);
  group.add(unit);
  let shown = '';
  return {
    group,
    show(litres: number) {
      const text = Math.round(litres).toString().padStart(4);
      if (text !== shown) digits.show((shown = text));
    },
  };
}

/**
 * The showpiece: a horizontal split-case pump after the Grundfos HS
 * range, its cast-iron casing split along the shaft (the upper half
 * bolted down along a flange), a double-suction volute with its suction
 * flange on +x and its discharge on −x at `axis` above the floor, its
 * bearing housings both ends, a coupling guard and a 45 kW four-pole
 * motor along +z on a long fabricated baseplate on a plinth; suction and
 * discharge gauges on the casing. Grundflow's livery and plate. Its
 * coupling spins while it runs.
 */
export function createSplitCasePump(
  kit: PanelKit,
  { axis, label }: { axis: number; label: string },
) {
  const t = tools(kit);
  const livery = brandLivery(kit, 'grundflow');
  const group = new Group();
  group.name = 'Split-case pump';
  const iron = livery.paint.casing;
  const shade = livery.paint.shade;
  const steel = t.paint('#b8bcbc', 0.3, 0.7);
  // The plinth and the baseplate.
  t.box(group, t.paint('#9a9d98', 0.85), 1.3, 0.15, 3.6, 0, 0.075, 1.15);
  t.box(group, shade, 1.1, 0.12, 3.4, 0, 0.21, 1.15);
  // The casing: its lower half, the split flange, the upper half.
  t.box(group, iron, 1.0, axis - 0.27, 0.9, 0, 0.27 + (axis - 0.27) / 2, 0);
  t.box(group, iron, 1.12, 0.05, 1.0, 0, axis, 0);
  t.cyl(group, iron, 0.42, 0.85, 0, axis + 0.02, 0, 'z');
  for (let k = -4; k <= 4; k++)
    for (const x of [-0.53, 0.53])
      t.cyl(group, steel, 0.018, 0.08, x, axis + 0.04, k * 0.1);
  // The suction and discharge necks and flanges, DN 250.
  t.cyl(group, iron, 0.14, 0.2, 0.55, axis, 0, 'z');
  t.box(group, iron, 0.14, 0.32, 0.32, 0.55, axis, 0);
  t.box(group, iron, 0.14, 0.32, 0.32, -0.55, axis, 0);
  // Bearing housings and the shaft out to the coupling.
  t.cyl(group, iron, 0.11, 0.18, 0, axis, -0.55, 'z');
  t.cyl(group, iron, 0.11, 0.18, 0, axis, 0.55, 'z');
  t.cyl(group, steel, 0.04, 0.5, 0, axis, 0.85, 'z');
  // The coupling (spinning) under its guard.
  const coupling = t.cyl(
    group,
    t.paint('#2d2f30', 0.5),
    0.13,
    0.12,
    0,
    axis,
    1.05,
    'z',
  ) as Mesh;
  coupling.userData.live = true;
  const guard = t.paint('#f2c418', 0.5);
  guard.transparent = true;
  guard.opacity = 0.6;
  t.box(group, guard, 0.4, 0.4, 0.5, 0, axis, 1.05);
  // The motor: ribbed frame, fan cowl, terminal box, on its feet.
  t.cyl(group, livery.paint.main, 0.33, 1.3, 0, axis, 1.95, 'z');
  for (let k = 0; k < 10; k++)
    t.cyl(group, livery.paint.main, 0.345, 0.025, 0, axis, 1.4 + k * 0.11, 'z');
  t.cyl(group, t.paint('#25292b', 0.6), 0.3, 0.3, 0, axis, 2.75, 'z');
  t.box(group, livery.paint.main, 0.3, 0.2, 0.3, 0.33, axis + 0.2, 1.7);
  t.box(group, shade, 0.7, axis - 0.55, 1.2, 0, 0.27 + (axis - 0.55) / 2, 1.95);
  // Its badge and rating plate on the motor's foot, the visitors' (−x)
  // side under the motor: the holder turns their faces to −x, so its
  // local x runs along the pump's +z (toward the motor).
  const foot = { face: -0.356, mid: 0.27 + (axis - 0.55) / 2 };
  const badge = createBrandBadge(kit, 'grundflow', { height: 0.1 });
  const badgeHolder = new Group();
  badgeHolder.position.set(foot.face, 0, 0);
  badgeHolder.rotation.y = -Math.PI / 2;
  group.add(badgeHolder);
  badge.position.set(1.95, foot.mid + 0.07, 0);
  badgeHolder.add(badge);
  const plateText = createMicroLabel(kit, `${label}  625 m3/h  20 m  45 kW`, {
    height: 0.03,
    ink: '#16191b',
    plate: '#e8e4d6',
  });
  plateText.position.set(1.95, foot.mid - 0.06, 0);
  badgeHolder.add(plateText);
  // Suction and discharge gauges on the casing.
  const gauge = (x: number, legend: string) => {
    const d = createDialGauge(kit, {
      dia: 0.12,
      max: 4,
      unit: 'bar',
      legend,
      min: -1,
    });
    d.group.position.set(x, axis + 0.42, -0.3);
    d.group.rotation.y = x > 0 ? Math.PI / 2 : -Math.PI / 2;
    group.add(d.group);
    return d;
  };
  return {
    group,
    coupling: coupling as Object3D,
    gauges: { suction: gauge(0.35, 'SUCT'), discharge: gauge(-0.35, 'DISCH') },
    update(delta: number, running: boolean) {
      if (running) coupling.rotation.z += delta * 155;
    },
  };
}

/**
 * A small magnetic-drive transfer pump after the Iwaki MX class: a
 * polypropylene pump head, its suction axial along +x, its discharge up
 * from its top, close-coupled to a little motor on a galvanised foot.
 * Grundflow's badge. Its fan turns while it runs.
 */
export function createMagDrivePump(kit: PanelKit) {
  const t = tools(kit);
  const livery = brandLivery(kit, 'grundflow');
  const group = new Group();
  group.name = 'Magnetic-drive transfer pump';
  t.box(group, t.paint('#a9afaf', 0.4, 0.7), 0.7, 0.04, 0.3, -0.05, 0.02, 0);
  t.cyl(group, t.paint('#dcdcd2', 0.6), 0.1, 0.12, 0.18, 0.25, 0, 'x');
  t.cyl(group, t.paint('#dcdcd2', 0.6), 0.03, 0.12, 0.25, 0.25, 0, 'x');
  t.cyl(group, t.paint('#dcdcd2', 0.6), 0.025, 0.2, 0.12, 0.4, 0, 'y');
  t.cyl(group, livery.paint.main, 0.11, 0.36, -0.08, 0.25, 0, 'x');
  t.box(group, livery.paint.main, 0.24, 0.2, 0.18, -0.08, 0.12, 0);
  const fan = t.cyl(
    group,
    t.paint('#25292b', 0.6),
    0.1,
    0.05,
    -0.29,
    0.25,
    0,
    'x',
  ) as Mesh;
  fan.userData.live = true;
  // Its badge on the motor foot's −x end, under the fan cowl: its suction
  // faces the trough, so its fan end is its front, toward the visitors.
  const badge = createBrandBadge(kit, 'grundflow', { height: 0.03 });
  badge.position.set(-0.205, 0.08, 0);
  badge.rotation.y = -Math.PI / 2;
  group.add(badge);
  return {
    group,
    update(delta: number, running: boolean) {
      if (running) fan.rotation.x += delta * 40;
    },
  };
}

/**
 * A submersible sump pump after the Grundfos Unilift AP12: a stainless
 * motor can on a strainer foot, a float on a short cable, its discharge
 * up through a riser out of the water. Stands in the water; the riser's
 * top at `riserTop`.
 */
export function createSubmersiblePump(kit: PanelKit, riserTop: number) {
  const t = tools(kit);
  const group = new Group();
  group.name = 'Submersible sump pump';
  const stainless = t.paint('#c9cdd0', 0.3, 0.8);
  t.cyl(group, t.paint('#25292b', 0.6), 0.1, 0.06, 0, 0.03, 0);
  t.cyl(group, stainless, 0.085, 0.32, 0, 0.22, 0);
  t.cyl(
    group,
    stainless,
    0.03,
    riserTop - 0.38,
    0,
    0.38 + (riserTop - 0.38) / 2,
    0,
  );
  const float = t.cyl(
    group,
    t.paint('#d8a12a', 0.5),
    0.035,
    0.09,
    0.15,
    0.5,
    0.05,
  ) as Mesh;
  void float;
  const badge = createBrandBadge(kit, 'grundflow', { height: 0.025 });
  badge.position.set(0, 0.25, 0.087);
  group.add(badge);
  return { group };
}

/**
 * A pump's RUN stand: a post and a tilted head at hand height with its
 * plaque (printed, drawn once), a green illuminated RUN push button (lit
 * while the pump runs; press to start, again to stop), a PUSH tag, and
 * its flow readout, a small Grundflow LCD that shows its delivery now.
 * In its own frame the visitor stands on +z.
 */
export function createRunStand(
  kit: PanelKit,
  {
    no,
    tag,
    paint,
    press,
    running,
  }: {
    no: number;
    tag: string;
    paint: (c: CanvasRenderingContext2D, w: number, h: number) => void;
    press: () => void;
    running: () => boolean;
  },
) {
  const t = tools(kit);
  const group = new Group();
  group.name = `P${no} RUN stand`;
  const frame = t.paint('#1f5fa6', 0.5, 0.2);
  t.box(group, frame, 0.36, 0.03, 0.3, 0, 0.015, -0.05);
  t.box(group, frame, 0.07, 0.86, 0.07, 0, 0.45, -0.05);
  const head = new Group();
  head.position.set(0, 0.98, 0);
  head.rotation.x = -0.62;
  group.add(head);
  t.box(head, t.paint('#2b3438', 0.5, 0.3), 0.64, 0.66, 0.03, 0, 0, -0.016);
  const face = t.printed(0.6, 0.42, paint, 768);
  // Its card clear of the RUN legend below it (the owner, 2026-10-29).
  face.mesh.position.set(0, 0.115, 0.0005);
  head.add(face.mesh);
  const lamp = signal(false);
  const parts = createPartSet();
  const button = parts.add(
    pushButton(kit, {
      colour: 'green',
      head: 'illuminated',
      lamp,
      name: `${tag} RUN`,
      action: press,
    }),
  );
  button.object.scale.setScalar(1.8);
  button.object.position.set(-0.17, -0.22, 0.002);
  head.add(button.object);
  // RUN above it and PUSH below, each 5 mm clear of its 27 mm radius
  // (the owner, 2026-10-29).
  const runLabel = createMicroLabel(kit, 'RUN', {
    height: 0.021,
    ink: '#ffffff',
    plate: '#2c7a3a',
  });
  // Placed by its plate's own height, measured: its lettering's is smaller.
  const plateHalf = (o: Object3D) => {
    o.updateMatrixWorld(true);
    return new Box3().setFromObject(o).getSize(new Vector3()).y / 2;
  };
  runLabel.position.set(
    -0.17,
    -0.22 + 0.027 + 0.005 + plateHalf(runLabel),
    0.002,
  );
  head.add(runLabel);
  const push = createMicroLabel(kit, 'PUSH', {
    height: 0.0154,
    ink: '#111111',
    plate: '#ffd21f',
  });
  push.position.set(-0.17, -0.22 - 0.027 - 0.005 - plateHalf(push), 0.002);
  head.add(push);
  const lcd = createCharacterLcd(kit, {
    columns: 12,
    rows: 2,
    cell: 0.012,
    backlight: true,
  });
  lcd.group.position.set(0.12, -0.22, 0.004);
  head.add(lcd.group);
  let shown = '';
  return {
    group,
    parts,
    update(delta: number, lines: [string, string]) {
      const on = running();
      if (lamp.value !== on) lamp.value = on;
      const key = lines.join('|');
      if (key !== shown) {
        shown = key;
        lcd.show(lines);
      }
      parts.update(delta);
    },
  };
}
