import { Group } from 'three';
import type { PlantExhibit, LiveExhibit } from './exhibit';
import {
  createPortGraphDemo,
  demoGraph,
  demoVisualBindings,
} from '../../../../game/plant/port-graph-demo';
import type { DemoKind } from '../../../../game/plant/port-graph-demo';
import {
  createCondensingBoiler,
  createCalorifier,
} from '../../../components/plant/views/boiler-plant';
import { createBoilerPanel } from '../../../components/plant/views/boiler-controls';
import {
  createRemoteValve,
  createRemoteBreaker,
} from '../../../components/plant/views/remote-actuators';
import { createEndSuctionPump } from '../../../components/plant/views/pumps-plant';
import { pumpSound } from '../../../components/plant/views/pump-sound';
import {
  BOILER_IGNITION,
  BOILER_SHUTDOWN,
  boilerFiringSound,
  servoMotionSound,
  SPRING_RETURN,
} from '../../../components/plant/views/plant-switch-sound';
import { HEATING_CIRCULATOR } from '../../../components/plant/logic/pump-sound';
import { partAudio } from '../../../components/core/audio/part-audio';
import { createPipeRun } from '../../../components/core/views/pipe-route';
import {
  demoLocalPortAnchor,
  demoServiceRoutes,
} from '../../logic/port-graph-demo-routes';
import type { PlantRoomLayout } from '../../logic/plant-room-layout';
import {
  createPartSet,
  pushButton,
} from '../../../components/core/parts/parts';
import {
  createMicroLabel,
  createSevenSegment,
} from '../../../components/core/views/eighties-controls';
import { tools } from '../../../components/core/views/fitting-tools';

/** The same graph IDs address the model, all visible machines, and their ports. */
const demo = createPortGraphDemo();
const visual: Record<DemoKind, { title: string; colour: string }> = {
  'fuel-store': { title: 'Finite gas store', colour: '#c79a4b' },
  boiler: { title: 'Boiler', colour: '#b95337' },
  'water-tank': { title: 'Water tank', colour: '#64a8ad' },
  circulator: { title: 'Circulator', colour: '#3c8396' },
  'remote-gas-valve': { title: 'Remote gas shutoff', colour: '#58a2c1' },
  'remote-water-valve': { title: 'Remote water valve', colour: '#58a2c1' },
  'remote-breaker': { title: 'Motor breaker', colour: '#69777e' },
  battery: { title: 'Finite battery bank', colour: '#b7aa48' },
  mimic: { title: 'Plant mimic', colour: '#314752' },
  atmosphere: { title: 'Outside air', colour: '#879bae' },
  stack: { title: 'Flue stack', colour: '#4f626a' },
};

function value(id: string) {
  const s = demo.state;
  switch (id) {
    case 'demo.fuel':
      return s.fuelKg.toFixed(2);
    case 'demo.boiler':
      return s.boilerKW.toFixed(1);
    case 'demo.tank':
      return s.tankC.toFixed(1);
    case 'demo.pump':
      return s.pumpA.toFixed(2);
    case 'demo.battery':
      return s.batteryKWh.toFixed(3);
    case 'demo.air':
      return '20.0';
    case 'demo.remoteGas':
    case 'demo.remoteWater':
    case 'demo.remotePower':
      return s.remote[id].actual ? '1' : '0';
    default:
      return '0';
  }
}

function toggle(id: string) {
  demo.command(id, id === 'demo.fuel' ? 'refill' : 'toggle');
}

function buildMimic(kit: Parameters<PlantExhibit['build']>[0]): LiveExhibit {
  const t = tools(kit);
  const object = new Group();
  object.name = 'demo.mimic control model';
  object.userData.graphNodeId = 'demo.mimic';
  const parts = createPartSet();
  const casing = t.paint('#263941', 0.55);
  const face = t.paint('#d6dbd5', 0.78);
  t.box(object, casing, 2.2, 2.4, 0.18, 0, 1.35, 0);
  t.box(object, face, 2.04, 2.24, 0.012, 0, 1.35, 0.1);
  for (const x of [-0.8, 0.8])
    t.box(object, casing, 0.1, 0.22, 0.18, x, 0.11, 0);
  const title = createMicroLabel(kit, 'PENFOLD CONTROLS  ·  MINI PLANT', {
    height: 0.037,
    ink: '#15343e',
    maxWidth: 1.9,
  });
  title.position.set(0, 2.43, 0.12);
  object.add(title);
  const signals = [
    ['GAS STORE', 'signal-fuel-level', 'kg', 2],
    ['GAS FLOW', 'signal-fuel-flow', 'kg/s', 4],
    ['BOILER RUN', 'signal-boiler-running', 'ON', 1],
    ['BOILER FLOW', 'signal-boiler-temperature', '°C', 1],
    ['TANK TEMP', 'signal-tank-temperature', '°C', 1],
    ['PUMP RUN', 'signal-pump-running', 'ON', 1],
    ['ELECTRICITY', 'signal-electricity', 'kWh', 2],
    ['BATTERY LEFT', 'signal-battery-charge', 'kWh', 3],
    ['GAS VALVE', 'signal-remote-gas', 'OPEN', 0],
    ['WATER VALVE', 'signal-remote-water', 'OPEN', 0],
    ['POWER BREAKER', 'signal-remote-power', 'ON', 0],
  ] as const;
  const readouts = signals.map(([legend, edgeId, unit, decimals], i) => {
    const y = 2.21 - i * 0.16;
    const label = createMicroLabel(kit, legend, {
      height: 0.025,
      ink: '#243b42',
      maxWidth: 0.8,
    });
    label.position.set(-0.58, y, 0.12);
    object.add(label);
    const digits = createSevenSegment(kit, 6, { digitHeight: 0.032 });
    digits.group.position.set(0.32, y, 0.13);
    digits.group.traverse((item) => {
      item.userData.live = true;
    });
    object.add(digits.group);
    const suffix = createMicroLabel(kit, unit, {
      height: 0.017,
      ink: '#243b42',
      maxWidth: 0.34,
    });
    suffix.position.set(0.83, y, 0.12);
    object.add(suffix);
    return { edgeId, decimals, digits };
  });
  for (const [row, edgeId, nodeId, legend] of [
    [8, 'command-remote-gas', 'demo.remoteGas', 'GAS'],
    [9, 'command-remote-water', 'demo.remoteWater', 'WATER'],
    [10, 'command-remote-power', 'demo.remotePower', 'POWER'],
  ] as const) {
    const button = parts.add(
      pushButton(kit, {
        colour: 'blue',
        legend: `${legend} OPEN/CLOSE`,
        name: `Mimic ${legend} remote control`,
        action: () =>
          demo.commandMimic(edgeId, !demo.state.remote[nodeId].command),
      }),
    );
    button.object.position.set(-0.93, 2.21 - row * 0.16, 0.15);
    object.add(button.object);
  }
  for (const [i, edgeId, legend] of [
    [0, 'command-boiler', 'BOILER ON/OFF'],
    [1, 'command-pump', 'PUMP ON/OFF'],
  ] as const) {
    const button = parts.add(
      pushButton(kit, {
        colour: 'green',
        legend,
        name: `Mimic ${legend}`,
        action: () =>
          demo.commandMimic(
            edgeId,
            edgeId === 'command-boiler'
              ? !demo.state.boilerOn
              : !demo.state.pumpOn,
          ),
      }),
    );
    button.object.position.set(i === 0 ? -0.55 : 0.55, 0.3, 0.15);
    object.add(button.object);
    const caption = createMicroLabel(kit, legend, {
      height: 0.018,
      ink: '#243b42',
      maxWidth: 0.65,
    });
    caption.position.set(i === 0 ? -0.55 : 0.55, 0.37, 0.12);
    object.add(caption);
  }
  return {
    object,
    parts,
    update(delta) {
      parts.update(delta);
      for (const { edgeId, decimals, digits } of readouts) {
        const reading = demo.readMimic(edgeId);
        digits.show(
          typeof reading === 'boolean'
            ? reading
              ? '1'
              : '0'
            : reading.toFixed(decimals),
        );
      }
    },
  };
}

function buildNode(
  id: string,
  expectedKind: DemoKind,
  kit: Parameters<PlantExhibit['build']>[0],
): LiveExhibit {
  const node = demoGraph.nodes.find((item) => item.id === id);
  if (!node) throw new Error(`Visual has no graph node: ${id}`);
  if (node.data.kind !== expectedKind)
    throw new Error(`${id}: expected ${expectedKind}, found ${node.data.kind}`);
  if (node.data.kind === 'mimic') return buildMimic(kit);
  const { title, colour } = visual[node.data.kind];
  const t = tools(kit);
  const object = new Group();
  object.name = `${id} visual twin`;
  object.userData.graphNodeId = id;
  const body = t.paint(colour, 0.55);
  const dark = t.paint('#303a3d', 0.65);
  const silver = t.paint('#cfd5d1', 0.4, 0.3);
  t.box(object, dark, 0.92, 0.08, 0.68, 0, 0.04, 0);
  const parts = createPartSet();
  let mechanicalUpdate: ((delta: number) => void) | undefined;
  const pumpLoop =
    node.data.kind === 'circulator'
      ? pumpSound({ ...HEATING_CIRCULATOR, kW: 0.3 })
      : null;
  let pumpHeard = false;
  let boilerHeard = false;
  let remoteActual =
    id in demo.state.remote ? demo.state.remote[id].actual : undefined;
  if (node.data.kind === 'water-tank') {
    object.add(createCalorifier(kit));
  } else if (node.data.kind === 'boiler') {
    const panel = createBoilerPanel(
      kit,
      (key) => demo.pressBoiler(key),
      (celsius) => demo.setBoilerSetpoint(celsius),
    );
    object.add(createCondensingBoiler(kit, 300, panel.group));
    panel.group.traverse((item) => {
      item.userData.live = true;
    });
    for (const [item, use] of panel.parts.uses) parts.uses.set(item, use);
    mechanicalUpdate = (delta) =>
      panel.show(
        {
          ...demo.state.boilerControl.state,
          on:
            demo.state.boilerControl.state.on &&
            demo.state.batteryOn &&
            demo.state.batteryKWh > 0 &&
            demo.state.remote['demo.remotePower'].actual,
        },
        demo.state.seconds,
        delta,
      );
  } else if (node.data.kind === 'circulator') {
    object.add(createEndSuctionPump(kit));
  } else if (node.data.kind === 'battery') {
    t.box(object, dark, 0.68, 0.75, 0.44, 0, 0.47, -0.06);
    for (const x of [-0.22, 0, 0.22]) {
      t.box(object, body, 0.18, 0.57, 0.12, x, 0.46, 0.18);
      t.cyl(object, silver, 0.045, 0.05, x, 0.88, -0.06, 'y');
    }
    const plate = createMicroLabel(kit, '230 V BATTERY\n0.04 kWh', {
      height: 0.022,
      ink: '#182326',
      plate: '#f2eac2',
      maxWidth: 0.55,
    });
    plate.position.set(0, 0.73, 0.205);
    object.add(plate);
  } else if (
    node.data.kind === 'remote-gas-valve' ||
    node.data.kind === 'remote-water-valve'
  ) {
    t.box(object, dark, 0.53, 0.08, 0.4, 0, 0.04, 0);
    t.box(object, dark, 0.06, 0.66, 0.06, 0, 0.37, 0);
    const actuator = createRemoteValve(
      kit,
      node.data.kind === 'remote-gas-valve' ? 'gas' : 'water',
    );
    object.add(actuator.group);
    mechanicalUpdate = () => actuator.show(demo.state.remote[id].actual);
  } else if (node.data.kind === 'remote-breaker') {
    t.box(object, dark, 0.53, 0.08, 0.4, 0, 0.04, 0);
    t.box(object, dark, 0.06, 0.49, 0.06, 0, 0.3, 0);
    const breaker = createRemoteBreaker(kit);
    object.add(breaker.group);
    mechanicalUpdate = () => breaker.show(demo.state.remote[id].actual);
  } else if (node.data.kind === 'fuel-store') {
    t.cyl(object, body, 0.27, 0.72, 0, 0.48, -0.06, 'y');
    t.cyl(object, silver, 0.28, 0.04, 0, 0.85, -0.06, 'y');
  } else {
    t.box(object, body, 0.64, 0.7, 0.46, 0, 0.47, -0.06);
  }
  const tag = createMicroLabel(kit, `${id.toUpperCase()}\n${title}`, {
    height: 0.028,
    ink: '#182326',
    plate: '#f2f3e9',
    maxWidth: 0.75,
  });
  tag.position.set(
    0,
    node.data.kind === 'boiler' || node.data.kind === 'water-tank' ? 2.15 : 1.5,
    0.04,
  );
  object.add(tag);

  // Studs are the visual port twins, one for each declared graph port.
  for (const port of node.ports ?? []) {
    if (port.data.medium === 'heat' || port.data.medium === 'control') continue;
    const [x, y, z] = demoLocalPortAnchor(node.data.kind, port.name);
    const stud = t.cyl(object, silver, 0.037, 0.07, x, y, z, 'y');
    stud.name = `${id}.${port.name}`;
    stud.userData.graphPortId = `${id}.${port.name}`;
    const label = createMicroLabel(kit, port.name.toUpperCase(), {
      height: 0.009,
      ink: '#ecf1ed',
      plate: '#283237',
      maxWidth: 0.15,
    });
    label.position.set(x, y + 0.07, z + 0.06);
    object.add(label);
  }

  if (['demo.fuel', 'demo.pump', 'demo.battery'].includes(id)) {
    const button = parts.add(
      pushButton(kit, {
        colour: id === 'demo.fuel' ? 'blue' : 'green',
        legend: id === 'demo.fuel' ? 'REFILL' : 'ON/OFF',
        name: `${id} control`,
        action: () => toggle(id),
      }),
    );
    button.object.position.set(0.18, 0.28, id === 'demo.pump' ? 0.43 : 0.4);
    object.add(button.object);
  }
  const digits = createSevenSegment(kit, 7, { digitHeight: 0.023 });
  digits.group.position.set(-0.1, 0.28, id === 'demo.pump' ? 0.43 : 0.4);
  digits.group.traverse((part) => {
    part.userData.live = true;
  });
  object.add(digits.group);
  const unit = (
    {
      'demo.fuel': 'kg',
      'demo.boiler': 'kW',
      'demo.tank': 'C',
      'demo.pump': 'A',
      'demo.battery': 'kWh',
      'demo.air': 'C',
      'demo.stack': 'FLUE',
      'demo.remoteGas': 'OPEN',
      'demo.remoteWater': 'OPEN',
      'demo.remotePower': 'CLOSED',
    } as Record<string, string>
  )[id];
  const unitLabel = createMicroLabel(kit, unit, {
    height: 0.018,
    ink: '#e6ede8',
    plate: '#263035',
  });
  unitLabel.position.set(-0.1, 0.2, 0.42);
  object.add(unitLabel);
  return {
    object,
    parts,
    update(delta) {
      if (id === demoVisualBindings[0].nodeId) demo.step(delta * 10);
      if (pumpLoop) {
        const running = demo.state.pumpA > 0;
        if (running !== pumpHeard) {
          pumpHeard = running;
          partAudio.hold(object, running ? pumpLoop : null, object);
        }
      }
      if (id === 'demo.boiler') {
        const firing = demo.state.boilerKW > 0;
        if (firing !== boilerHeard) {
          boilerHeard = firing;
          if (firing) partAudio.play(BOILER_IGNITION, object);
          else partAudio.play(BOILER_SHUTDOWN, object);
          partAudio.hold(object, firing ? boilerFiringSound : null, object);
        }
      }
      if (remoteActual !== undefined) {
        const actual = demo.state.remote[id].actual;
        if (actual !== remoteActual) {
          remoteActual = actual;
          partAudio.play(
            demo.state.batteryOn && demo.state.batteryKWh > 0
              ? servoMotionSound(actual)
              : SPRING_RETURN,
            object,
          );
        }
      }
      mechanicalUpdate?.(delta);
      parts.update(delta);
      digits.show(value(id));
    },
    dispose() {
      if (pumpLoop || id === 'demo.boiler') partAudio.hold(object, null);
    },
  };
}

export const PURPOSE =
  'Existing machine views bound to typed nodes; routed gas, water, flue and power';

const dimensions: Record<DemoKind, { w: number; d: number; h: number }> = {
  'fuel-store': { w: 1.0, d: 0.8, h: 1.2 },
  boiler: { w: 1.0, d: 0.8, h: 2.3 },
  'water-tank': { w: 1.5, d: 1.2, h: 2.4 },
  circulator: { w: 2.2, d: 1.0, h: 1.6 },
  'remote-gas-valve': { w: 0.72, d: 0.55, h: 1.45 },
  'remote-water-valve': { w: 0.72, d: 0.55, h: 1.45 },
  'remote-breaker': { w: 0.64, d: 0.5, h: 1.4 },
  battery: { w: 0.9, d: 0.8, h: 1.2 },
  mimic: { w: 2.25, d: 0.6, h: 2.6 },
  atmosphere: { w: 0, d: 0, h: 0 },
  stack: { w: 0, d: 0, h: 0 },
};

export const EXHIBITS: readonly PlantExhibit[] = demoVisualBindings.map(
  ({ nodeId: id, kind }) => {
    const node = demoGraph.nodes.find((item) => item.id === id)!;
    return {
      title: visual[node.data.kind].title,
      reference: `${id} · ${node.ports?.length ?? 0} graph ports · ${node.data.kind}`,
      size: { ...dimensions[kind], mount: 'floor' as const },
      build: (kit) => buildNode(id, kind, kit),
    };
  },
);

/** Every drawn service run is generated from a graph edge and visual port anchors. */
export function buildRoomServices(
  kit: Parameters<PlantExhibit['build']>[0],
  layout: PlantRoomLayout,
) {
  const t = tools(kit);
  const group = new Group();
  const styles = {
    gas: { colour: '#c9ae39', od: 0.045, joint: 'thread' as const },
    water: { colour: '#468d6e', od: 0.065, joint: 'flange' as const },
    power: { colour: '#5b6268', od: 0.028, joint: 'thread' as const },
    flue: { colour: '#aeb5b4', od: 0.25, joint: 'band' as const },
  };
  for (const route of demoServiceRoutes(layout)) {
    const style = styles[route.medium];
    const pipe = t.paint(style.colour, 0.45, 0.3);
    const run = createPipeRun(
      route.points,
      { pipe, fitting: pipe, bolt: pipe },
      { od: style.od, joint: style.joint, ends: ['open', 'open'] },
    );
    run.name = `Graph edge ${route.edgeId}`;
    run.userData.graphEdgeId = route.edgeId;
    group.add(run);
  }
  // Control edges share an abstract bus. The trunk only shows the connection;
  // individual signal wires do not need to snake around the physical services.
  const controlNodes = new Set<string>();
  for (const edge of demoGraph.edges) {
    const source = demoGraph.nodes.find((node) => node.id === edge.sourceId);
    if (
      source?.ports?.find((port) => port.name === edge.sourcePort)?.data
        .medium !== 'control'
    )
      continue;
    controlNodes.add(edge.sourceId);
    controlNodes.add(edge.targetId);
  }
  const wire = t.paint('#45555d', 0.5);
  const busY = layout.height - 0.18;
  const busZ = -layout.halfZ + 0.22;
  const drops = demoVisualBindings.flatMap(({ nodeId }, i) =>
    controlNodes.has(nodeId) ? [{ nodeId, place: layout.places[i] }] : [],
  );
  const left = Math.min(...drops.map(({ place }) => place.x));
  const right = Math.max(...drops.map(({ place }) => place.x));
  t.box(
    group,
    wire,
    right - left + 0.28,
    0.075,
    0.1,
    (left + right) / 2,
    busY,
    busZ,
  );
  for (const { nodeId, place } of drops) {
    const endZ = place.z - 0.38;
    const branch = t.box(
      group,
      wire,
      0.07,
      0.06,
      Math.abs(endZ - busZ),
      place.x,
      busY,
      (endZ + busZ) / 2,
    );
    branch.userData.controlNodeId = nodeId;
    const bottomY = nodeId === 'demo.mimic' ? 2.54 : 1.45;
    const drop = t.box(
      group,
      wire,
      0.07,
      busY - bottomY,
      0.07,
      place.x,
      (busY + bottomY) / 2,
      endZ,
    );
    drop.userData.controlNodeId = nodeId;
  }
  return group;
}
