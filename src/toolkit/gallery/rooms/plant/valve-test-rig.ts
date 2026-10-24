import { signal } from '@preact/signals-core';
import { Group } from 'three';
import type { LiveExhibit, PlantExhibit } from './exhibit';
import type { PanelKit } from '../../../components/core/views/eighties-controls';
import { createMicroLabel } from '../../../components/core/views/eighties-controls';
import {
  createPartSet,
  pilotLight,
  pushButton,
} from '../../../components/core/parts/parts';
import type { PartSet } from '../../../components/core/parts/parts';
import { createPipe } from '../../../components/core/views/pipe-kinds';
import { tools } from '../../../components/core/views/fitting-tools';
import { panelMakerMark } from '../../../components/core/views/panel-maker-mark';
import { createActuatedButterflyValve } from '../../../components/plant/views/actuated-butterfly-valve';
import { createExperimentalSourceView } from '../../../components/plant/views/experimental-source';
import { createMagFlowmeter } from '../../../components/plant/views/mag-flowmeter';
import {
  PIPE_SIZES,
  plantTools,
} from '../../../components/plant/views/plant-tools';
import { createCharacterLcd } from '../../../components/industrial-control/views/panel-instruments';
import { createIncomingIsolator } from '../../../components/industrial-control/views/incoming-isolator';
import { SOURCE_SHAPE } from '../../../../game/plant/experimental-source';
import {
  RIG,
  createValveTestRig,
  rigLcdLines,
} from '../../logic/valve-test-rig';
import type { ValveTestRig } from '../../logic/valve-test-rig';

/** What this room is for, printed on its title card. */
export const PURPOSE =
  'A valve test rig, for trying valves and their sounds: an ideal mains-water source piped to an ideal sink through a DN80 butterfly valve on a spring-return electric actuator. Press OPEN or SHUT on its Penfold panel; throw its supply isolator OFF to fail its power, and its spring drives it shut.';

/** Where things stand in the rig's own frame, metres: its pipe along x, the panel in front (+z). */
const PIPE_Y = 1.5;
const PIPE_Z = -0.2;
const SOURCE_X = -2.3;
const VALVE_X = -0.8;
const METER_X = 0.45;
const SINK_X = 1.3;
const ISOLATOR_X = 2.3;
/** The isolator's own origin stands this far in front of its posts' backs. */
const ISOLATOR_Z = -0.25;

/**
 * The rig's control panel by Penfold Controls, on its pedestal: its plate,
 * its readout (flow, and how open the valve stands), its lamps (SUPPLY,
 * OPEN and SHUT from the valve's limit switches, FLOW), and its OPEN and
 * SHUT push buttons, each lit while it is the command. Its own frame: on
 * the floor, its face toward +z.
 */
function controlPanel(
  kit: PanelKit,
  rig: ValveTestRig,
  limits: () => { open: boolean; shut: boolean },
  parts: PartSet,
) {
  const t = tools(kit);
  const group = new Group();
  t.box(group, t.paint('#3a3d3f', 0.6), 0.12, 1.0, 0.12, 0, 0.5, 0);
  const W = 0.5;
  const H = 0.44;
  t.box(group, t.paint('#c9cbc6', 0.6, 0.2), W, H, 0.16, 0, 1.0 + H / 2, 0);
  const face = new Group();
  face.position.set(0, 1.0 + H / 2, 0.082);
  group.add(face);
  const plate = createMicroLabel(kit, 'V1 · DN80 ELECTRIC ACTUATOR', {
    height: 0.018,
    ink: '#f2f2ec',
    plate: '#2e3438',
    maxWidth: W - 0.1,
  });
  plate.position.set(-0.04, H / 2 - 0.035, 0.002);
  face.add(plate);
  panelMakerMark(kit, face, { width: W, height: H, z: 0.001 });
  // Its readout, in a bezel.
  t.box(face, t.paint('#2a2d2f', 0.6), 0.2, 0.06, 0.01, 0, 0.115, 0.005);
  const lcd = createCharacterLcd(kit, {
    columns: 16,
    rows: 2,
    cell: 0.0068,
    backlight: true,
  });
  lcd.group.position.set(0, 0.115, 0.011);
  face.add(lcd.group);
  const place = (part: { object: Group }, x: number, y: number) => {
    part.object.position.set(x, y, 0.004);
    face.add(part.object);
  };
  const lamps: [ReturnType<typeof signal<boolean>>, () => boolean][] = [];
  for (const [legend, colour, on, x] of [
    ['SUPPLY', 'white', () => rig.supply(), -0.18],
    ['OPEN', 'green', () => limits().open, -0.06],
    ['SHUT', 'red', () => limits().shut, 0.06],
    ['FLOW', 'blue', () => rig.readings().flow > 0.05, 0.18],
  ] as const) {
    const drive = signal(false);
    lamps.push([drive, on]);
    place(
      parts.add(
        pilotLight(kit, {
          colour,
          legend,
          drive,
          pushToTest: false,
          name: `${legend} lamp`,
        }),
      ),
      x,
      0.0,
    );
  }
  const commandOpen = signal(rig.command());
  const commandShut = signal(!rig.command());
  for (const [legend, colour, lamp, open, x] of [
    ['OPEN', 'green', commandOpen, true, -0.08],
    ['SHUT', 'red', commandShut, false, 0.08],
  ] as const)
    place(
      parts.add(
        pushButton(kit, {
          colour,
          head: 'illuminated',
          legend,
          name: `${legend} push button`,
          lamp,
          action: () => rig.setCommand(open),
        }),
      ),
      x,
      -0.13,
    );
  let shown = '';
  return {
    group,
    update() {
      for (const [drive, on] of lamps) drive.value = on();
      commandOpen.value = rig.command();
      commandShut.value = !rig.command();
      const lines = rigLcdLines(rig.readings());
      const key = lines.join('|');
      if (key !== shown) {
        shown = key;
        lcd.show(lines);
      }
    },
  };
}

/** The whole rig: source, pipe, valve, flowmeter, sink, its panel and its supply isolator. */
function build(kit: PanelKit): LiveExhibit {
  const rig = createValveTestRig();
  const object = new Group();
  const t = tools(kit);
  const parts = createPartSet();
  const od = PIPE_SIZES[RIG.dn].od;
  // The ideal source and sink, each with its stud up into the line.
  const source = createExperimentalSourceView(kit, rig.source);
  source.group.position.set(SOURCE_X, 0, PIPE_Z);
  const sink = createExperimentalSourceView(kit, rig.sink);
  sink.group.position.set(SINK_X, 0, PIPE_Z);
  object.add(source.group, sink.group);
  const stud = SOURCE_SHAPE.height + SOURCE_SHAPE.stud;
  // The line: up off the source, along, and down onto the sink.
  object.add(
    createPipe('pvc-pressure', od, [
      [SOURCE_X, stud, PIPE_Z],
      [SOURCE_X, PIPE_Y, PIPE_Z],
      [SINK_X, PIPE_Y, PIPE_Z],
      [SINK_X, stud, PIPE_Z],
    ]),
  );
  // Two stands under it.
  for (const x of [-1.5, -0.1])
    t.box(
      object,
      t.paint('#5c6166', 0.5, 0.5),
      0.06,
      PIPE_Y - od / 2,
      0.06,
      x,
      (PIPE_Y - od / 2) / 2,
      PIPE_Z,
    );
  // The valve, on its own state from the rig.
  const valve = parts.add(
    createActuatedButterflyValve(
      kit,
      RIG.dn,
      'x',
      'V1 · DN80 ELECTRIC',
      {
        open: () => rig.command(),
        set: (open) => rig.setCommand(open),
        position: () => rig.position(),
        power: () => rig.supply(),
      },
      { drive: 'electric' },
    ),
  );
  valve.object.position.set(VALVE_X, PIPE_Y, PIPE_Z);
  object.add(valve.object);
  // The flowmeter, downstream of it.
  const meter = createMagFlowmeter(kit, { od, tag: 'FT1' });
  meter.group.position.set(METER_X, PIPE_Y, PIPE_Z);
  object.add(meter.group);
  // The throw switch: the actuator's supply isolator.
  const isolator = createIncomingIsolator(kit, 'on', {
    bound: {
      get value() {
        return rig.supply() ? ('on' as const) : ('off' as const);
      },
      set: (p: 'on' | 'off' | 'tripped') => rig.setSupply(p === 'on'),
    },
    rating: 'VALVE V1 SUPPLY  230 V  1 PH  50 Hz',
    danger: 'DANGER  230 V',
    branch: false,
  });
  isolator.group.position.set(ISOLATOR_X, 0, ISOLATOR_Z);
  object.add(isolator.group);
  parts.add(isolator.handle);
  // Its cable to the actuator's gland: up out of the isolator's top, along overhead, and down.
  const gland: [number, number, number] = [VALVE_X - 0.11, 1.69, PIPE_Z];
  const caseZ = ISOLATOR_Z - 0.43;
  const route: [number, number, number][] = [
    gland,
    [gland[0], 2.35, PIPE_Z],
    [gland[0], 2.35, caseZ],
    [ISOLATOR_X, 2.35, caseZ],
    [ISOLATOR_X, 2.08, caseZ],
  ];
  const cable = t.paint('#2a2b2c', 0.7);
  for (let k = 0; k < route.length - 1; k++)
    plantTools(kit).rod(object, cable, route[k], route[k + 1], 0.006, 8);
  // The panel, in front, between the valve and the meter.
  const panel = controlPanel(kit, rig, () => valve.limits(), parts);
  panel.group.position.set(-0.15, 0, 0.6);
  object.add(panel.group);
  return {
    object,
    parts,
    update: (delta) => {
      rig.step(delta);
      source.update();
      sink.update();
      meter.show(rig.readings().flow, 'MAINS');
      panel.update();
    },
  };
}

export const EXHIBITS: readonly PlantExhibit[] = [
  {
    title: 'Valve test rig: electric spring-return butterfly valve, DN80',
    reference:
      'Ideal mains-water source to ideal sink, 20 m³/h wide open; the valve on a spring-return quarter-turn electric actuator, its supply on a throw switch',
    size: { w: 5.8, d: 1.9, h: 2.6, mount: 'floor' },
    maker: 'grundflow',
    build,
  },
];
