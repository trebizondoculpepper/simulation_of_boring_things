import { signal } from '@preact/signals-core';
import { Group } from 'three';
import type { LiveExhibit, PlantExhibit } from './exhibit';
import type { PanelKit } from '../../../components/core/views/eighties-controls';
import { createMicroLabel } from '../../../components/core/views/eighties-controls';
import {
  createPartSet,
  pilotLight,
  selector,
} from '../../../components/core/parts/parts';
import { createPipe } from '../../../components/core/views/pipe-kinds';
import type { PipeKindId } from '../../../components/core/views/pipe-kinds';
import { tools } from '../../../components/core/views/fitting-tools';
import { panelMakerMark } from '../../../components/core/views/panel-maker-mark';
import { createActuatedButterflyValve } from '../../../components/plant/views/actuated-butterfly-valve';
import { createSolenoidValve } from '../../../components/plant/views/solenoid-valve';
import type { DN } from '../../../components/plant/views/plant-tools';
import { PIPE_SIZES } from '../../../components/plant/views/plant-tools';
import {
  energised,
  limits,
  newActuatedValve,
  stepActuatedValve,
  strokeTime,
} from '../../../components/plant/logic/actuated-valve';
import type { ActuatedValveState } from '../../../components/plant/logic/actuated-valve';

/** What this room is for, printed on its title card. */
export const PURPOSE =
  'Actuated valves, as the plant rooms have them: a butterfly valve on a spring-return electric actuator; and a direct solenoid valve. Command each open or shut, cut its power, and watch it fail safe, shut.';

/**
 * A test station by Penfold Controls on its pedestal, for one valve: its
 * COMMAND selector (SHUT, OPEN), its POWER selector (OFF, ON), and
 * its lamps: ENERGISED, OPEN, SHUT (from the valve's limit switches). Its
 * own frame: on the floor, its face toward +z.
 */
function testStation(
  kit: PanelKit,
  label: string,
  io: {
    command: () => boolean;
    setCommand: (open: boolean) => void;
    power: () => boolean;
    setPower: (on: boolean) => void;
    lamps: () => { energised: boolean; open: boolean; shut: boolean };
  },
  /** The rig's parts, which its controls join. */
  parts: ReturnType<typeof createPartSet>,
) {
  const t = tools(kit);
  const group = new Group();
  t.box(group, t.paint('#3a3d3f', 0.6), 0.12, 1.0, 0.12, 0, 0.5, 0);
  const W = 0.42;
  const H = 0.36;
  t.box(group, t.paint('#c9cbc6', 0.6, 0.2), W, H, 0.16, 0, 1.0 + H / 2, 0);
  const face = new Group();
  face.position.set(0, 1.0 + H / 2, 0.082);
  group.add(face);
  const plate = createMicroLabel(kit, label, {
    height: 0.018,
    ink: '#f2f2ec',
    plate: '#2e3438',
    maxWidth: W - 0.08,
  });
  plate.position.set(-0.03, H / 2 - 0.04, 0.002);
  face.add(plate);
  panelMakerMark(kit, face, { width: W, height: H, z: 0.001 });
  const place = (part: { object: Group }, x: number, y: number) => {
    part.object.position.set(x, y, 0.004);
    face.add(part.object);
  };
  const lamps: [ReturnType<typeof signal<boolean>>, () => boolean][] = [];
  for (const [legend, colour, on, x] of [
    ['ENERGISED', 'amber', () => io.lamps().energised, -0.13],
    ['OPEN', 'green', () => io.lamps().open, 0],
    ['SHUT', 'red', () => io.lamps().shut, 0.13],
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
          name: legend,
        }),
      ),
      x,
      0.05,
    );
  }
  const seen = signal(0);
  const two = (
    legend: string,
    get: () => boolean,
    set: (on: boolean) => void,
    x: number,
  ) =>
    place(
      parts.add(
        selector(kit, {
          positions: 2,
          legend,
          name: legend,
          // Read through `seen`, so the selector (which reads its
          // binding through a computed) wakes when the rig's state moves.
          bound: {
            get value() {
              void seen.value;
              return get() ? 1 : 0;
            },
            set: (v: number) => {
              set(v >= 0.5);
              seen.value++;
            },
          },
        }),
      ),
      x,
      -0.09,
    );
  two('COMMAND  SHUT · OPEN', io.command, io.setCommand, -0.07);
  two('POWER  OFF · ON', io.power, io.setPower, 0.07);
  let last = '';
  return {
    group,
    update() {
      for (const [drive, on] of lamps) drive.value = on();
      // Moved some other way (its override): wake the selectors.
      const now = `${io.command()}${io.power()}`;
      if (now !== last) {
        last = now;
        seen.value++;
      }
    },
  };
}

/** A valve on its spool, with its test station beside it. */
function rig(
  dn: DN,
  kind: PipeKindId,
  vertical: boolean,
  label: string,
  direct = false,
) {
  return (kit: PanelKit): LiveExhibit => {
    const object = new Group();
    const od = PIPE_SIZES[dn].od;
    const at = vertical ? 1.2 : 1.1;
    // Its spool, on two stands (or rising from the floor to the ceiling's height).
    const spool = vertical
      ? [
          [0, 0.1, 0],
          [0, 2.6, 0],
        ]
      : [
          [-1.1, at, 0],
          [1.1, at, 0],
        ];
    object.add(createPipe(kind, od, spool as [number, number, number][]));
    const t = tools(kit);
    if (!vertical)
      for (const x of [-0.9, 0.9])
        t.box(
          object,
          t.paint('#5c6166', 0.5, 0.5),
          0.06,
          at - od / 2,
          0.06,
          x,
          (at - od / 2) / 2,
          0,
        );
    let state: ActuatedValveState = newActuatedValve(false);
    const stroke = strokeTime(od);
    const parts = createPartSet();
    let actuated: ReturnType<typeof createActuatedButterflyValve> | null = null;
    let solenoid: ReturnType<typeof createSolenoidValve> | null = null;
    if (direct) {
      solenoid = createSolenoidValve(kit, od);
      // Its manual override works it by hand, as COMMAND does.
      parts.uses.set(solenoid.overrideButton, () => {
        state = { ...state, command: !state.command };
      });
      solenoid.group.position.set(0, at, 0);
      if (!vertical) solenoid.group.rotation.z = Math.PI / 2;
      object.add(solenoid.group);
    } else {
      actuated = parts.add(
        createActuatedButterflyValve(kit, dn, vertical ? 'y' : 'x', label, {
          open: () => state.command,
          set: (open) => {
            state = { ...state, command: open };
          },
        }),
      );
      actuated.object.position.set(0, vertical ? 1.3 : at, 0);
      object.add(actuated.object);
    }
    const station = testStation(
      kit,
      label,
      {
        command: () => state.command,
        setCommand: (open) => {
          state = { ...state, command: open };
        },
        power: () => state.power,
        setPower: (on) => {
          state = { ...state, power: on };
        },
        // Neither needs air: the actuator is electric, the solenoid valve
        // opens on its coil alone.
        lamps: () => ({ energised: energised(state), ...limits(state) }),
      },
      parts,
    );
    // Beside its valve, not in front of it.
    station.group.position.set(vertical ? 0.9 : 0.85, 0, vertical ? 0.6 : 0.75);
    object.add(station.group);
    return {
      object,
      parts,
      update: (delta) => {
        state = stepActuatedValve({ ...state, air: true }, delta, stroke);
        actuated?.setSupplies(state.power, true);
        solenoid?.setOpen(energised(state));
        station.update();
      },
    };
  };
}

export const EXHIBITS: readonly PlantExhibit[] = [
  {
    title: 'Actuated butterfly valve, DN300',
    reference:
      'On a spring-return electric actuator, its position indicator on top: the Olympic main’s',
    size: { w: 2.4, d: 1.4, h: 2.0, mount: 'floor' },
    maker: 'grundflow',
    build: rig(300, 'pvc-pressure', false, 'V1 · DN300 ACTUATED'),
  },
  {
    title: 'Actuated butterfly valve, DN150',
    reference: 'On a vertical pipe, as on a pump’s discharge riser',
    size: { w: 1.6, d: 1.4, h: 2.7, mount: 'floor' },
    maker: 'grundflow',
    build: rig(150, 'pvc-pressure', true, 'V2 · DN150 ACTUATED'),
  },
  {
    title: 'Direct solenoid valve, 54 mm',
    reference:
      'After the Bürkert 6213, on a make-up line: no air, its coil opens it',
    size: { w: 2.4, d: 1.4, h: 2.0, mount: 'floor' },
    maker: 'grundflow',
    build: rig(50, 'copper', false, 'V3 · DIRECT SOLENOID', true),
  },
];
