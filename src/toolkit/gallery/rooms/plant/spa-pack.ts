import { computed } from '@preact/signals-core';
import { Group } from 'three';
import type { LiveExhibit, PlantExhibit } from './exhibit';
import { createPipe } from '../../../components/core/views/pipe-kinds';
import type { PipeKindId } from '../../../components/core/views/pipe-kinds';
import type { PanelKit } from '../../../components/core/views/eighties-controls';
import { createMicroLabel } from '../../../components/core/views/eighties-controls';
import { createBrandBadge } from '../../../components/core/views/brand-badge';
import { panelMakerMark } from '../../../components/core/views/panel-maker-mark';
import { plantTools } from '../../../components/plant/views/plant-tools';
import {
  createCartridgeFilter,
  createInlineUv,
  createSpaDosingController,
  createSpaHeatExchanger,
  createSpaPump,
  createSurgeVessel,
} from '../../../components/plant/views/spa-pack-parts';
import { createDialGauge } from '../../../components/industrial-control/views/dial-gauge';
import {
  createPartSet,
  doorLatch,
  pilotLight,
  selector,
} from '../../../components/core/parts/parts';

/**
 * A packaged spa set in its prefabricated plant cabinet: what the plant
 * sizing (`src/game/plant-sizing/sizing.ts`) gives a circuit too small for
 * pool plant, such as the foot spa. A factory-built steel cabinet,
 * 1.7 × 0.9 × 2.1 m, its two doors latched; inside, on one skid, a small
 * circulation pump, a cartridge filter, an inline UV unit, a plate heat
 * exchanger and a surge vessel, piped together, and on its back wall the
 * dosing controller with its two peristaltic pumps over their chemical
 * containers. Made by Lidoluxe; its control panel, on the left door, by
 * Penfold Controls.
 *
 * It works: the panel's POWER switch runs the pump (PUMP RUN lit, the
 * filter's gauge rising to its working pressure) and the UV lamp, which
 * an interlock puts out while a door is open, as a real one does, so no
 * one looks into its light (UV ON goes out, its sight glass dark).
 */

const CABINET = { w: 1.7, d: 0.9, h: 2.1, wall: 0.03 } as const;
/** How far the doors swing open, radians. */
const OPEN = 1.75;
/** The filter's working pressure, bar. */
const WORKING = 0.7;

function buildSpaPack(kit: PanelKit, circuit = 'FOOT SPA'): LiveExhibit {
  const t = plantTools(kit);
  const c = CABINET;
  const object = new Group();
  object.name = 'Packaged spa set in its plant cabinet';
  // Centred on its footprint, the doors' swing included.
  const body = new Group();
  body.position.z = -0.42;
  object.add(body);
  const steel = t.paint('#d9ddd8', 0.5, 0.2);
  const dark = t.paint('#2f3436', 0.6);

  // The carcass: back, sides, top, plinth; open at the front for the doors.
  const hd = c.d / 2;
  t.box(body, steel, c.w, c.h, c.wall, 0, c.h / 2, -hd + c.wall / 2);
  for (const side of [-1, 1])
    t.box(
      body,
      steel,
      c.wall,
      c.h,
      c.d,
      side * (c.w / 2 - c.wall / 2),
      c.h / 2,
      0,
    );
  t.box(body, steel, c.w, c.wall, c.d, 0, c.h - c.wall / 2, 0);
  t.box(body, dark, c.w, 0.1, c.d, 0, 0.05, 0);
  // Louvres high in each side, for its ventilation.
  for (const side of [-1, 1])
    for (let k = 0; k < 5; k++)
      t.box(
        body,
        dark,
        0.006,
        0.02,
        0.3,
        side * (c.w / 2 + 0.003),
        1.7 + k * 0.05,
        0,
      );

  // ---- Inside: the skid, its parts (`spa-pack-parts.ts`) -------------------
  const skidY = 0.16;
  t.box(body, dark, 1.55, 0.06, 0.7, 0, skidY - 0.03, 0);
  const backZ = -hd + c.wall;
  const set = <P extends { group: Group }>(
    part: P,
    x: number,
    z: number,
    yaw = 0,
  ): P => {
    part.group.position.set(x, skidY, z);
    part.group.rotation.y = yaw;
    body.add(part.group);
    return part;
  };
  // In the order the water goes, along the front: the surge vessel, its
  // union meeting the pump's suction; the pump; the filter; the UV unit
  // turned to run front to back. Behind: the heat exchanger, and the
  // dosing on the back wall over its containers.
  const vessel = set(createSurgeVessel(kit), -0.66, 0.1);
  const pump = set(createSpaPump(kit), -0.27, 0.1);
  const filter = set(createCartridgeFilter(kit), 0.34, 0.1);
  const uv = set(createInlineUv(kit), 0.7, 0.06, Math.PI / 2);
  const exchanger = set(createSpaHeatExchanger(kit), 0.35, -0.3);
  const dosing = set(createSpaDosingController(kit), -0.3, backZ);
  /**
   * A pipe run, square: straight lengths between the points (each step
   * along one axis), a fitting at each turn. Heights above the skid.
   */
  // The back panel, which the runs to and from the spa go out through,
  // each in its rubber grommet.
  const backPanel = {
    at: [0, 0, -hd + c.wall / 2] as const,
    normal: [0, 0, 1] as const,
    kind: 'grommet' as const,
    thickness: c.wall,
  };
  /**
   * Out through the back panel and a little beyond, where each connection
   * ends in its isolating valve, capped: the unit as it arrives on site,
   * ready to be connected to the spa and the heating ring.
   */
  const out = -hd - 0.03;
  const run = (
    points: [number, number, number][],
    kind: PipeKindId = 'pvc-pressure',
    od = 0.05,
  ) => {
    const leaves = points[points.length - 1][2] === out;
    body.add(
      createPipe(
        kind,
        od,
        points.map(([x, y, z]) => [x, skidY + y, z] as const),
        {
          laid: true,
          through: [backPanel],
          ends: ['open', leaves ? 'valve' : 'open'],
        },
      ),
    );
  };
  // Pump to filter, over the top and down between them.
  run([
    [-0.3, 0.27, 0.1],
    [-0.3, 0.45, 0.1],
    [0.095, 0.45, 0.1],
    [0.095, 0.12, 0.1],
    [0.11, 0.12, 0.1],
  ]);
  // Filter to the UV unit's front port.
  run([
    [0.57, 0.12, 0.1],
    [0.6, 0.12, 0.1],
    [0.6, 0.45, 0.1],
    [0.6, 0.45, 0.28],
    [0.7, 0.45, 0.28],
    [0.7, 0.27, 0.28],
  ]);
  // The UV unit's back port to the heat exchanger, behind the filter.
  run([
    [0.7, 0.27, -0.12],
    [0.7, 0.45, -0.12],
    [0.385, 0.45, -0.12],
    [0.385, 0.32, -0.12],
    [0.385, 0.32, -0.22],
  ]);
  // Back to the spa, out through the back wall.
  run([
    [0.385, 0.08, -0.22],
    [0.385, 0.08, -0.16],
    [0.52, 0.08, -0.16],
    [0.52, 0.08, out],
  ]);
  // From the spa's overflow into the surge vessel.
  run([
    [-0.66, 0.59, 0.1],
    [-0.66, 1.0, 0.1],
    [-0.66, 1.0, out],
  ]);
  // The heating ring's flow and return to the exchanger, in copper.
  run(
    [
      [0.315, 0.32, -0.22],
      [0.315, 0.32, -0.16],
      [0.315, 1.0, -0.16],
      [0.315, 1.0, out],
    ],
    'copper',
    0.022,
  );
  run(
    [
      [0.315, 0.08, -0.22],
      [0.315, 0.08, -0.16],
      [0.2, 0.08, -0.16],
      [0.2, 1.1, -0.16],
      [0.2, 1.1, out],
    ],
    'copper',
    0.022,
  );
  // The dosing tubes, from each pump head's outlet down under the pumps,
  // back to the wall, along it and down to their injection points on the
  // return.
  dosing.outlets.forEach(([x, y, z], k) => {
    const wx = -0.3 + x;
    const low = 0.4 - k * 0.03;
    const wall = backZ + 0.02 + k * 0.012;
    run(
      [
        [wx, y, backZ + z],
        [wx, low, backZ + z],
        [wx, low, wall],
        [0.5, low, wall],
        [0.5, 0.12, wall],
      ],
      'chemical-tube',
      0.008,
    );
  });

  // A plant tag on each part, as an installer labels them: on the skid's
  // front edge under the front row, on the parts behind.
  const tag = (text: string, x: number, y: number, z: number) => {
    const label = createMicroLabel(kit, text, {
      height: 0.013,
      ink: '#1d2125',
      plate: '#f2efe2',
    });
    label.position.set(x, y, z);
    body.add(label);
  };
  const edge = 0.351;
  tag('SV1  SURGE VESSEL', -0.66, skidY - 0.03, edge);
  tag('P1  CIRCULATION PUMP', -0.27, skidY - 0.03, edge);
  tag('F1  CARTRIDGE FILTER', 0.34, skidY - 0.03, edge);
  tag('UV1  UV UNIT', 0.7, skidY - 0.03, edge);
  tag('HX1  HEAT EXCHANGER', 0.35, skidY + 0.42, -0.24);
  tag('DC1  DOSING CONTROLLER', -0.3, skidY + 0.95, backZ + 0.002);

  // ---- The doors ---------------------------------------------------------
  const leafW = c.w / 2 - 0.01;
  const leaf = (side: -1 | 1) => {
    const hinge = new Group();
    hinge.position.set(side * (c.w / 2), 0.1, hd);
    body.add(hinge);
    const face = new Group();
    face.position.x = -side * (leafW / 2);
    hinge.add(face);
    t.box(face, steel, leafW, c.h - 0.13, 0.025, 0, (c.h - 0.13) / 2, 0.0125);
    return { hinge, face };
  };
  const left = leaf(-1);
  const right = leaf(1);
  const badge = createBrandBadge(kit, 'lidoluxe', { height: 0.05 });
  badge.position.set(0, 1.78, 0.026);
  left.face.add(badge);
  const plate = createMicroLabel(kit, `PACKAGED SPA SET · ${circuit}`, {
    height: 0.018,
    ink: '#1d2125',
  });
  plate.position.set(0, 1.86, 0.026);
  right.face.add(plate);

  // ---- The control panel, on the left door -------------------------------
  const panel = new Group();
  panel.position.set(0, 1.2, 0.026);
  left.face.add(panel);
  t.box(panel, t.paint('#c8ccc4', 0.55), 0.5, 0.44, 0.04, 0, 0, 0.02);
  const front = new Group();
  front.position.z = 0.041;
  panel.add(front);
  panelMakerMark(kit, front, {
    width: 0.5,
    height: 0.44,
    z: 0,
    corner: 'bottom-right',
  });
  const parts = createPartSet();
  const power = parts.add(
    selector(kit, {
      positions: 2,
      initial: 0,
      legend: 'POWER',
      name: 'Spa set power',
    }),
  );
  power.object.position.set(-0.15, 0.06, 0);
  power.object.scale.setScalar(0.8);
  front.add(power.object);
  const latches = ([left, right] as const).map((door, i) => {
    const latch = parts.add(
      doorLatch(kit, {
        material: dark,
        name: `Spa set cabinet ${i ? 'right' : 'left'} door`,
      }),
    );
    latch.object.position.set(
      i ? -(leafW / 2 - 0.08) : leafW / 2 - 0.08,
      1.0,
      0.026,
    );
    door.face.add(latch.object);
    return latch;
  });
  const running = computed(() => power.position.value === 1);
  const doorOpen = computed(() => latches.some((l) => l.open.value));
  const uvOn = computed(() => running.value && !doorOpen.value);
  (
    [
      ['PUMP RUN', 'green', running],
      ['UV ON', 'blue', uvOn],
      ['DOOR OPEN', 'amber', doorOpen],
    ] as const
  ).forEach(([legend, colour, drive], i) => {
    const lamp = parts.add(
      pilotLight(kit, {
        colour,
        legend,
        drive,
        pushToTest: false,
        name: `Spa set ${legend.toLowerCase()} lamp`,
      }),
    );
    lamp.object.position.set(0.02 + i * 0.1, 0.06, 0);
    lamp.object.scale.setScalar(0.8);
    front.add(lamp.object);
  });
  const gauge = createDialGauge(kit, {
    dia: 0.09,
    max: 2.5,
    legend: 'FILTER bar',
    maker: 'kessler-moody',
  });
  gauge.group.position.set(0.02, -0.11, 0.02);
  front.add(gauge.group);

  // Everything here moves or changes: none of it is merged.
  object.traverse((o) => (o.userData.live = true));
  let swing = [0, 0];
  return {
    object,
    parts,
    update(delta) {
      const ease = Math.min(1, delta * 4);
      swing = latches.map(
        (l, i) => swing[i] + ((l.open.value ? OPEN : 0) - swing[i]) * ease,
      );
      left.hinge.rotation.y = -swing[0];
      right.hinge.rotation.y = swing[1];
      const on = running.value;
      pump.update(delta, on);
      filter.update(delta, on ? WORKING : 0);
      uv.update(delta, uvOn.value);
      vessel.update(delta, on);
      exchanger.update();
      dosing.update(delta, on, 1.8, 7.3);
      gauge.set(on ? WORKING : 0);
      gauge.update(delta);
    },
  };
}

export const SPA_PACK_EXHIBIT: PlantExhibit = {
  title: 'Packaged spa set in a prefabricated plant cabinet',
  reference:
    'For circuits under 10 m³/h (the foot spa): pump, cartridge filter, inline UV, plate heat exchanger and surge vessel on one skid, dosing on the back wall; 1.7 × 0.9 × 2.1 m cabinet',
  size: { w: 2.1, d: 1.9, h: 2.2, mount: 'floor' },
  build: buildSpaPack,
};

/** The same factory cabinet labeled for the Jacuzzi circuit. */
export const JACUZZI_PACK_EXHIBIT: PlantExhibit = {
  ...SPA_PACK_EXHIBIT,
  title: 'Packaged Jacuzzi plant cabinet',
  build: (kit) => buildSpaPack(kit, 'JACUZZI'),
};

/**
 * The same parts on their own, each on a plinth with its name, and a
 * POWER switch that runs them all as the cabinet would: the pump's fan
 * spinning, the filter's gauge up, the UV lit and counting its hours, the
 * surge vessel drawn down, the dosing pumps turning and its readouts lit.
 */
function buildSpaParts(kit: PanelKit): LiveExhibit {
  const t = plantTools(kit);
  const object = new Group();
  object.name = 'Packaged spa set, its parts';
  const plinth = t.paint('#5d625f', 0.8);
  const ink = '#1d2125';
  const parts = createPartSet();
  const spots: { label: string; x: number; z?: number }[] = [
    { label: 'Circulation pump', x: -1.75 },
    { label: 'Cartridge filter', x: -1.05 },
    { label: 'Inline UV unit', x: -0.25 },
    { label: 'Plate heat exchanger', x: 0.5 },
    { label: 'Surge vessel', x: 1.1 },
    { label: 'Dosing controller', x: 1.75, z: -0.3 },
  ];
  for (const { label, x, z = 0 } of spots) {
    t.box(object, plinth, 0.62, 0.15, 0.6, x, 0.075, z);
    const name = createMicroLabel(kit, label.toUpperCase(), {
      height: 0.022,
      ink,
      plate: '#eeeae0',
    });
    name.position.set(x, 0.1, z + 0.305);
    object.add(name);
  }
  const at = <P extends { group: Group }>(part: P, x: number, z = 0): P => {
    part.group.position.set(x, 0.15, z);
    object.add(part.group);
    return part;
  };
  const pump = at(createSpaPump(kit), -1.75);
  const filter = at(createCartridgeFilter(kit), -1.05);
  const uv = at(createInlineUv(kit), -0.25);
  const exchanger = at(createSpaHeatExchanger(kit), 0.5);
  const vessel = at(createSurgeVessel(kit), 1.1);
  // The dosing controller on a little wall of its own.
  t.box(object, t.paint('#c9ccc4', 0.8), 0.6, 1.1, 0.04, 1.75, 0.7, -0.3);
  const dosing = at(createSpaDosingController(kit), 1.75, -0.28);
  // The test switch, on a post at the front.
  const post = new Group();
  post.position.set(-2.35, 0, 0.15);
  object.add(post);
  t.box(post, t.paint('#3a3d40', 0.6), 0.05, 1.0, 0.05, 0, 0.5, 0);
  t.box(post, t.paint('#c8ccc4', 0.55), 0.22, 0.22, 0.05, 0, 1.1, 0.03);
  const face = new Group();
  face.position.set(0, 1.1, 0.056);
  post.add(face);
  const power = parts.add(
    selector(kit, {
      positions: 2,
      initial: 0,
      legend: 'POWER',
      name: 'Spa parts power',
    }),
  );
  power.object.position.set(-0.05, 0.02, 0);
  power.object.scale.setScalar(0.7);
  face.add(power.object);
  const running = computed(() => power.position.value === 1);
  const lamp = parts.add(
    pilotLight(kit, {
      colour: 'green',
      legend: 'RUN',
      drive: running,
      pushToTest: false,
      name: 'Spa parts run lamp',
    }),
  );
  lamp.object.position.set(0.06, 0.02, 0);
  lamp.object.scale.setScalar(0.7);
  face.add(lamp.object);
  object.traverse((o) => (o.userData.live = true));
  return {
    object,
    parts,
    update(delta) {
      const on = running.value;
      pump.update(delta, on);
      filter.update(delta, on ? WORKING : 0);
      uv.update(delta, on);
      vessel.update(delta, on);
      exchanger.update();
      dosing.update(delta, on, 1.8, 7.3);
    },
  };
}

export const SPA_PARTS_EXHIBIT: PlantExhibit = {
  title: 'Packaged spa set, its parts',
  reference:
    'Each part of the spa set alone: 0.4 kW self-priming pump; cartridge filter; 40 W inline UV with lamp-hours counter; 20-plate brazed heat exchanger; surge vessel; dosing controller with two peristaltic pumps',
  size: { w: 4.9, d: 1.2, h: 1.6, mount: 'floor' },
  build: buildSpaParts,
};
