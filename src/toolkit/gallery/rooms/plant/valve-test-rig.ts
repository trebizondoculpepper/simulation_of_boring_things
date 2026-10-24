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
import { createActuatedBallValve } from '../../../components/plant/views/actuated-ball-valve';
import { createSolenoidValve } from '../../../components/plant/views/solenoid-valve';
import { SOLENOID_CLICK } from '../../../components/plant/audio/actuated-valve';
import { partAudio } from '../../../components/core/audio/part-audio';
import { beginPart } from '../../../components/core/parts/parts';
import { remoteValveGeometry } from '../../../components/plant/logic/remote-valve';
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
  BALL_RIG,
  BYPASS,
  RIG,
  createValveTestRig,
  rigLcdLines,
} from '../../logic/valve-test-rig';
import type { ValveTestRig } from '../../logic/valve-test-rig';

/** What this room is for, printed on its title card. */
export const PURPOSE =
  'Valve test rigs, for trying valves and their sounds, one of each kind the plant has: an ideal mains-water source piped to an ideal sink through a DN80 butterfly valve, and another through a 35 mm ball valve, each on a spring-return electric actuator. Press OPEN or SHUT on a line’s Penfold panel; throw its supply isolator OFF to fail its power, and its spring drives it shut.';

/** Where things stand in the rig's own frame, metres: its pipe along x, the panel in front (+z). */
const PIPE_Y = 1.5;
const PIPE_Z = -0.2;
const SOURCE_X = -2.3;
const VALVE_X = -0.8;
const METER_X = 0.45;
const SINK_X = 1.3;
const ISOLATOR_X = 2.3;
/** The bypass: how far below the line it runs, and how far either side of the valve it tees off. */
const BYPASS_Y = PIPE_Y - 0.42;
const BYPASS_SPAN = 0.42;
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
  title: string,
) {
  const t = tools(kit);
  const group = new Group();
  t.box(group, t.paint('#3a3d3f', 0.6), 0.12, 1.0, 0.12, 0, 0.5, 0);
  const W = 0.5;
  // Taller with a bypass: a row for its solenoid valve under the valve's.
  const H = rig.hasBypass ? 0.56 : 0.44;
  t.box(group, t.paint('#c9cbc6', 0.6, 0.2), W, H, 0.16, 0, 1.0 + H / 2, 0);
  const face = new Group();
  face.position.set(0, 1.0 + H / 2, 0.082);
  group.add(face);
  const plate = createMicroLabel(kit, title, {
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
  // The bypass's solenoid valve: its lamp (lit while it stands open) and
  // its own OPEN and SHUT.
  const solenoidOpen = signal(false);
  const solenoidCommandOpen = signal(rig.solenoidCommand());
  const solenoidCommandShut = signal(!rig.solenoidCommand());
  if (rig.hasBypass) {
    place(
      parts.add(
        pilotLight(kit, {
          colour: 'amber',
          legend: 'SV1 OPEN',
          drive: solenoidOpen,
          pushToTest: false,
          name: 'SV1 OPEN lamp',
        }),
      ),
      -0.18,
      -0.235,
    );
    for (const [legend, colour, lamp, open, x] of [
      ['SV1 OPEN', 'green', solenoidCommandOpen, true, -0.04],
      ['SV1 SHUT', 'red', solenoidCommandShut, false, 0.12],
    ] as const)
      place(
        parts.add(
          pushButton(kit, {
            colour,
            head: 'illuminated',
            legend,
            name: `${legend} push button`,
            lamp,
            action: () => rig.setSolenoidCommand(open),
          }),
        ),
        x,
        -0.235,
      );
  }
  let shown = '';
  return {
    group,
    update() {
      for (const [drive, on] of lamps) drive.value = on();
      commandOpen.value = rig.command();
      commandShut.value = !rig.command();
      solenoidOpen.value = rig.solenoidOpen();
      solenoidCommandOpen.value = rig.solenoidCommand();
      solenoidCommandShut.value = !rig.solenoidCommand();
      const lines = rigLcdLines(rig.readings());
      const key = lines.join('|');
      if (key !== shown) {
        shown = key;
        lcd.show(lines);
      }
    },
  };
}

/**
 * The bypass's direct solenoid valve (`createSolenoidValve`), its pipe
 * along x, its coil toward the front: open while the rig energises it, its
 * plug's LED lit, heard clicking as its coil pulls in and as it snaps shut.
 */
function bypassSolenoid(kit: PanelKit, rig: ValveTestRig, parts: PartSet) {
  const a = beginPart(kit, 'SV1 · 54 mm SOLENOID VALVE');
  const view = createSolenoidValve(kit, BYPASS.od);
  view.group.rotation.z = Math.PI / 2;
  a.object.add(view.group);
  // Its manual override works it, as SV1 OPEN and SHUT do.
  a.uses.set(view.overrideButton, () =>
    rig.setSolenoidCommand(!rig.solenoidCommand()),
  );
  let audible = true;
  let was = rig.solenoidOpen();
  a.updates.push(() => {
    const open = rig.solenoidOpen();
    view.setOpen(open);
    if (open !== was && audible) partAudio.play(SOLENOID_CLICK, a.object);
    was = open;
  });
  const base = a.part();
  const setAudible = base.setAudible;
  return parts.add(
    Object.assign(base, {
      setAudible(on: boolean) {
        audible = on;
        setAudible(on);
      },
    }),
  );
}

/** Each line's valve, as the panel and the room need it. */
interface LineValve {
  object: Group;
  limits(): { open: boolean; shut: boolean };
}

/**
 * One line of the rig: source, pipe, valve, flowmeter, sink, its panel and
 * its supply isolator. `kind` picks its valve: the DN80 butterfly valve or
 * the 35 mm ball valve, each on the same spring-return electric actuator.
 */
const line =
  (kind: 'butterfly' | 'ball') =>
  (kit: PanelKit): LiveExhibit => {
    const ball = kind === 'ball';
    const rig = ball
      ? createValveTestRig({ id: 'ball', ...BALL_RIG })
      : createValveTestRig({ bypass: BYPASS.maxRate });
    const tag = ball ? 'V2' : 'V1';
    const object = new Group();
    const t = tools(kit);
    const parts = createPartSet();
    const od = ball ? BALL_RIG.od : PIPE_SIZES[RIG.dn].od;
    // The ideal source and sink, each with its stud up into the line.
    const source = createExperimentalSourceView(kit, rig.source);
    source.group.position.set(SOURCE_X, 0, PIPE_Z);
    const sink = createExperimentalSourceView(kit, rig.sink);
    sink.group.position.set(SINK_X, 0, PIPE_Z);
    object.add(source.group, sink.group);
    const stud = SOURCE_SHAPE.height + SOURCE_SHAPE.stud;
    // The line: up off the source, along, and down onto the sink.
    object.add(
      createPipe(ball ? 'copper' : 'pvc-pressure', od, [
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
    const binding = {
      open: () => rig.command(),
      set: (open: boolean) => rig.setCommand(open),
      position: () => rig.position(),
      power: () => rig.supply(),
    };
    const valve: LineValve = ball
      ? parts.add(
          createActuatedBallValve(kit, od, `${tag} · 35 mm ELECTRIC`, binding),
        )
      : parts.add(
          createActuatedButterflyValve(
            kit,
            RIG.dn,
            'x',
            `${tag} · DN80 ELECTRIC`,
            binding,
          ),
        );
    valve.object.position.set(VALVE_X, PIPE_Y, PIPE_Z);
    object.add(valve.object);
    // On the butterfly line, a bypass under it through a direct solenoid
    // valve: teed off before the valve, down, along and back up after it.
    const solenoid = ball ? null : bypassSolenoid(kit, rig, parts);
    if (solenoid) {
      const [x0, x1] = [VALVE_X - BYPASS_SPAN, VALVE_X + BYPASS_SPAN];
      object.add(
        createPipe('copper', BYPASS.od, [
          [x0, PIPE_Y, PIPE_Z],
          [x0, BYPASS_Y, PIPE_Z],
          [x1, BYPASS_Y, PIPE_Z],
          [x1, PIPE_Y, PIPE_Z],
        ]),
      );
      solenoid.object.position.set(VALVE_X, BYPASS_Y, PIPE_Z);
      object.add(solenoid.object);
    }
    // The flowmeter, downstream of it.
    const meter = createMagFlowmeter(kit, { od, tag: ball ? 'FT2' : 'FT1' });
    meter.group.position.set(METER_X, PIPE_Y, PIPE_Z);
    object.add(meter.group);
    // The throw switch: the actuator's supply isolator.
    // Its handle follows a signal (it reads its binding through a computed,
    // which a plain getter would never wake), kept as the rig's supply.
    const supplied = signal(rig.supply());
    const isolator = createIncomingIsolator(kit, 'on', {
      bound: {
        get value() {
          return supplied.value ? ('on' as const) : ('off' as const);
        },
        set: (p: 'on' | 'off' | 'tripped') => {
          rig.setSupply(p === 'on');
          supplied.value = rig.supply();
        },
      },
      rating: `VALVE ${tag} SUPPLY  230 V  1 PH  50 Hz`,
      danger: 'DANGER  230 V',
      branch: false,
    });
    isolator.group.position.set(ISOLATOR_X, 0, ISOLATOR_Z);
    object.add(isolator.group);
    parts.add(isolator.handle);
    // Its cable to the actuator's gland: up out of the isolator's top,
    // along overhead, and down.
    const port = remoteValveGeometry('water', od, 0).ports['actuator-power'].at;
    const gland: [number, number, number] = ball
      ? [VALVE_X + port[0], PIPE_Y + port[1], PIPE_Z + port[2]]
      : [VALVE_X - 0.11, 1.69, PIPE_Z];
    const caseZ = ISOLATOR_Z - 0.43;
    const route: [number, number, number][] = [
      gland,
      ...(ball
        ? [[gland[0], gland[1], gland[2] - 0.04] as [number, number, number]]
        : []),
      [gland[0], 2.35, ball ? gland[2] - 0.04 : PIPE_Z],
      [gland[0], 2.35, caseZ],
      [ISOLATOR_X, 2.35, caseZ],
      [ISOLATOR_X, 2.08, caseZ],
    ];
    const cable = t.paint('#2a2b2c', 0.7);
    for (let k = 0; k < route.length - 1; k++)
      plantTools(kit).rod(object, cable, route[k], route[k + 1], 0.006, 8);
    // The panel, in front, between the valve and the meter.
    const panel = controlPanel(
      kit,
      rig,
      () => valve.limits(),
      parts,
      ball ? `${tag} · 35 mm BALL VALVE` : `${tag} · DN80 BUTTERFLY VALVE`,
    );
    panel.group.position.set(-0.15, 0, 0.6);
    object.add(panel.group);
    return {
      object,
      parts,
      update: (delta) => {
        rig.step(delta);
        supplied.value = rig.supply();
        source.update();
        sink.update();
        meter.show(rig.readings().flow, 'MAINS');
        panel.update();
      },
    };
  };

export const EXHIBITS: readonly PlantExhibit[] = [
  {
    title:
      'Valve test rig: electric spring-return butterfly valve, DN80, and a solenoid valve beside it',
    reference:
      'Ideal mains-water source to ideal sink, 20 m³/h wide open; the valve on a spring-return quarter-turn electric actuator, and in parallel on a bypass under it a 54 mm direct solenoid valve (4 m³/h), both on one supply, its throw switch',
    size: { w: 5.8, d: 1.9, h: 2.6, mount: 'floor' },
    maker: 'grundflow',
    build: line('butterfly'),
  },
  {
    title: 'Valve test rig: electric spring-return ball valve, 35 mm',
    reference:
      'Ideal mains-water source to ideal sink, 3 m³/h wide open; a threaded ball valve on the same spring-return electric actuator, as the spa cabinets’ services have, its supply on a throw switch',
    size: { w: 5.8, d: 1.9, h: 2.6, mount: 'floor' },
    maker: 'grundflow',
    build: line('ball'),
  },
];
