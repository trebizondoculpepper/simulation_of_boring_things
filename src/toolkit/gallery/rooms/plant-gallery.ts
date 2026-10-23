import { computed, signal } from '@preact/signals-core';
import { BoxGeometry, Group, Mesh } from 'three';
import {
  createMicroLabel,
  kitPaint,
} from '../../components/core/views/eighties-controls';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import {
  createPartSet,
  pilotLight,
  potentiometer,
  selector,
} from '../../components/core/parts/parts';
import type { Part } from '../../components/core/parts/parts';
import { createPipe } from '../../components/core/views/pipe-kinds';
import { createActuatedButterflyValve } from '../../components/plant/views/actuated-butterfly-valve';
import { createMagFlowmeter } from '../../components/plant/views/mag-flowmeter';
import { PIPE_SIZES } from '../../components/plant/views/plant-tools';
import type { TestFitting } from './test-boards';

/**
 * The plant fittings on dev0's gallery plinths (the owner, 2026-10-23),
 * tried here as the rooms have them: the solenoid-operated butterfly
 * valve (`actuated-butterfly-valve.ts`) and the electromagnetic flowmeter
 * (`mag-flowmeter.ts`), each on a short spool of DN150 on the plinth's
 * deck, worked from test controls on its pedestal, as the machine
 * gallery's parts are.
 */
export const PLANT_EXHIBITS = [
  {
    kind: 'actuated-valve',
    title: 'SOLENOID-OPERATED BUTTERFLY VALVE',
    reference:
      'Grundflow DN150 wafer valve, spring-return pneumatic actuator, NAMUR solenoid pilot, limit switch box',
  },
  {
    kind: 'flowmeter',
    title: 'ELECTROMAGNETIC FLOWMETER',
    reference:
      'Kessler-Moody DN150 full-bore flowmeter, two-line LCD converter',
  },
] as const;

const DN = 150;
/** The spool's height over the floor, on its stands on the deck (0.98 m). */
const SPOOL_Y = 1.22;

/** One plinth, as the machine gallery's: its column, its deck, its pedestal's control face and its labels. */
function plinth(kit: PanelKit, title: string, reference: string) {
  const group = new Group();
  group.name = `${title} plinth`;
  const column = new Mesh(
    new BoxGeometry(0.9, 0.95, 0.9),
    kitPaint(kit, '#5d625f'),
  );
  column.position.y = 0.475;
  const deck = new Mesh(
    new BoxGeometry(0.94, 0.03, 0.94),
    kitPaint(kit, '#343936'),
  );
  deck.position.y = 0.965;
  deck.userData.boardSupport = true;
  group.userData.placementSurface = deck;
  group.add(column, deck);
  const panel = new Group();
  panel.name = 'Pedestal test controls';
  panel.position.set(0, 0.991, 0.31);
  panel.rotation.x = -Math.PI / 2;
  group.add(panel);
  const face = new Mesh(
    new BoxGeometry(0.84, 0.3, 0.012),
    kitPaint(kit, '#c4c6bf'),
  );
  face.position.z = -0.006;
  panel.add(face);
  for (const [text, height, z, ink] of [
    [title, 0.009, 0.415, '#171b18'],
    [reference, 0.0045, 0.446, '#30382e'],
  ] as const) {
    const mark = createMicroLabel(kit, text, { height, width: 0.84, ink });
    mark.rotation.x = -Math.PI / 2;
    mark.position.set(0, 0.993, z);
    group.add(mark);
  }
  // The spool, on two stands on the deck.
  const od = PIPE_SIZES[DN].od;
  group.add(
    createPipe('pvc-pressure', od, [
      [-0.42, SPOOL_Y, -0.12],
      [0.42, SPOOL_Y, -0.12],
    ]),
  );
  const stand = kitPaint(kit, '#5c6166');
  for (const x of [-0.33, 0.33]) {
    const h = SPOOL_Y - od / 2 - 0.98;
    const post = new Mesh(new BoxGeometry(0.05, h, 0.05), stand);
    post.position.set(x, 0.98 + h / 2, -0.12);
    group.add(post);
  }
  const parts = createPartSet();
  const controls: { part: Part; text: string }[] = [];
  const lay = () =>
    controls.forEach(({ part, text }, i) => {
      const x =
        controls.length > 1 ? -0.33 + (i * 0.66) / (controls.length - 1) : 0;
      part.object.position.set(x, 0.035, 0.012);
      panel.add(part.object);
      parts.add(part);
      const mark = createMicroLabel(kit, text, {
        height: 0.0035,
        ink: '#252922',
      });
      mark.position.set(x, -0.035, 0.001);
      panel.add(mark);
    });
  return { group, parts, controls, lay };
}

function valvePlinth(kit: PanelKit): TestFitting {
  const { title, reference } = PLANT_EXHIBITS[0];
  const p = plinth(kit, title, reference);
  const command = signal(false);
  const valve = p.parts.add(
    createActuatedButterflyValve(kit, DN, 'x', `${title}`, {
      open: () => command.value,
      set: (open) => (command.value = open),
    }),
  );
  valve.object.position.set(0, SPOOL_Y, -0.12);
  p.group.add(valve.object);
  const two = (legend: string, initial: number) =>
    selector(kit, {
      positions: 2,
      initial,
      series: 'xb4',
      name: `${title} ${legend}`,
    });
  const commandSwitch = selector(kit, {
    positions: 2,
    series: 'xb4',
    name: `${title} command`,
    bound: {
      get value() {
        return command.value ? 1 : 0;
      },
      set: (v: number) => (command.value = v >= 0.5),
    },
  });
  const power = two('power', 1);
  const air = two('air', 1);
  // Its lamps, from its solenoid and its limit switches, read each frame.
  const energised = signal(false);
  const opened = signal(false);
  const shut = signal(true);
  const lamp = (
    colour: 'amber' | 'green' | 'red',
    legend: string,
    drive: typeof energised,
  ) =>
    pilotLight(kit, {
      colour,
      name: `${title} ${legend}`,
      drive,
      pushToTest: false,
      series: 'xb4',
    });
  p.controls.push(
    { part: commandSwitch, text: 'COMMAND SHUT/OPEN' },
    { part: power, text: 'POWER' },
    { part: air, text: 'AIR' },
    { part: lamp('amber', 'energised', energised), text: 'ENERGISED' },
    { part: lamp('green', 'open', opened), text: 'OPEN' },
    { part: lamp('red', 'shut', shut), text: 'SHUT' },
  );
  p.lay();
  return {
    group: p.group,
    parts: p.parts,
    update: (_t, dt) => {
      valve.setSupplies(power.position.value === 1, air.position.value === 1);
      p.parts.update(dt);
      const limits = valve.limits();
      energised.value = valve.energised();
      opened.value = limits.open;
      shut.value = limits.shut;
    },
    dispose: () => p.parts.dispose(),
  };
}

function meterPlinth(kit: PanelKit): TestFitting {
  const { title, reference } = PLANT_EXHIBITS[1];
  const p = plinth(kit, title, reference);
  const meter = createMagFlowmeter(kit, {
    od: PIPE_SIZES[DN].od,
    tag: 'DEV-FT1',
  });
  meter.group.position.set(0, SPOOL_Y, -0.12);
  meter.group.traverse((o) => (o.userData.live = true));
  p.group.add(meter.group);
  // Centre zero: the knob's middle is no flow, either side flows either way, to 200 m³/h.
  const flow = potentiometer(kit, {
    initial: 0.75,
    steps: 20,
    name: `${title} flow`,
  });
  const pumping = selector(kit, {
    positions: 2,
    initial: 1,
    series: 'xb4',
    name: `${title} pump`,
  });
  const reading = computed(() =>
    pumping.position.value === 1 ? (flow.share.value - 0.5) * 400 : 0,
  );
  const flowing = computed(() => Math.abs(reading.value) > 0.05);
  p.controls.push(
    { part: pumping, text: 'PUMP' },
    { part: flow, text: 'FLOW  <-  0  ->' },
    {
      part: pilotLight(kit, {
        colour: 'green',
        name: `${title} flowing`,
        drive: flowing,
        pushToTest: false,
        series: 'xb4',
      }),
      text: 'FLOWING',
    },
  );
  p.lay();
  return {
    group: p.group,
    parts: p.parts,
    update: (_t, dt) => {
      p.parts.update(dt);
      meter.show(reading.value, 'TEST');
    },
    dispose: () => p.parts.dispose(),
  };
}

/** The plant fittings' plinths, in `PLANT_EXHIBITS`' order. */
export function createPlantPlinths(kit: PanelKit): TestFitting[] {
  return [valvePlinth(kit), meterPlinth(kit)];
}
