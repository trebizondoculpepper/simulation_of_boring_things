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
import {
  createEndSuctionPump,
  createSandFilter,
  createPlateHeatExchanger,
} from '../../../components/plant/views/pumps-plant';
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
import { createLine } from '../../../components/plant/views/pipe-line';
import {
  demoLocalPortAnchor,
  demoLineRequest,
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
import { createSignState } from '../../../components/pool/logic/pool-info-sign';
import {
  createPoolInfoSign,
  markLive,
} from '../../../components/pool/views/pool-info-sign';

/** The same graph IDs address the model, all visible machines, and their ports. */
const demo = createPortGraphDemo();
const visual: Record<DemoKind, { title: string; colour: string }> = {
  'gas-main': { title: 'Mains gas', colour: '#b9a458' },
  'gas-meter': { title: 'Natural gas flow meter', colour: '#c9c8bb' },
  mains: { title: 'Mains electrical supply', colour: '#69777e' },
  'makeup-main': { title: 'Fresh water supply', colour: '#7ca9ac' },
  boiler: { title: 'Boiler', colour: '#b95337' },
  'water-tank': { title: 'Water tank', colour: '#64a8ad' },
  circulator: { title: 'Primary circulator', colour: '#3c8396' },
  'pool-pump': { title: 'Pool pump', colour: '#3c8396' },
  pool: { title: 'Small pool', colour: '#54a9b2' },
  'pool-info-sign': { title: 'Pool water quality', colour: '#d9e4e2' },
  'balance-tank': { title: 'Balance tank', colour: '#728f90' },
  'sand-filter': { title: 'Pressure sand filter', colour: '#779ca0' },
  treatment: { title: 'Water treatment', colour: '#73a69c' },
  'heat-exchanger': { title: 'Plate heat exchanger', colour: '#7099ac' },
  'remote-gas-valve': { title: 'Remote gas shutoff', colour: '#58a2c1' },
  'remote-water-valve': { title: 'Remote water valve', colour: '#58a2c1' },
  'remote-breaker': { title: 'Motor breaker', colour: '#69777e' },
  mimic: { title: 'Boiler mimic', colour: '#314752' },
  'pool-mimic': { title: 'Pool mimic', colour: '#314752' },
  atmosphere: { title: 'Outside air', colour: '#879bae' },
  stack: { title: 'Flue stack', colour: '#4f626a' },
};

function value(id: string) {
  const s = demo.state;
  switch (id) {
    case 'demo.gasMeter':
      return s.gasCubicMetresPerHour.toFixed(2);
    case 'demo.boiler':
      return s.boilerKW.toFixed(1);
    case 'demo.tank':
      return s.tankC.toFixed(1);
    case 'demo.pool':
      return s.poolC.toFixed(1);
    case 'demo.balance':
      return (s.balanceKg / 500).toFixed(2);
    case 'demo.filter':
      return s.filterDifferentialBar.toFixed(2);
    case 'demo.pump':
      return s.pumpA.toFixed(2);
    case 'demo.poolPump':
      return s.poolPumpA.toFixed(2);
    case 'demo.mains':
      return s.electricKWh.toFixed(2);
    case 'demo.treatment':
      return s.poolChlorineMgL.toFixed(2);
    case 'demo.hx':
      return s.transferKWh.toFixed(2);
    case 'demo.remoteGas':
    case 'demo.remoteWater':
    case 'demo.remotePower':
    case 'demo.remoteSuction':
    case 'demo.remoteReturn':
    case 'demo.remoteMakeup':
      return s.remote[id].actual ? '1' : '0';
    default:
      return '0';
  }
}

function toggle(id: string) {
  demo.command(id, 'toggle');
}

function buildMimic(
  kit: Parameters<PlantExhibit['build']>[0],
  id: 'demo.mimic' | 'demo.poolMimic',
): LiveExhibit {
  const t = tools(kit);
  const object = new Group();
  object.name = `${id} control model`;
  object.userData.graphNodeId = id;
  const parts = createPartSet();
  const casing = t.paint('#263941', 0.55);
  const face = t.paint('#d6dbd5', 0.78);
  t.box(object, casing, 2.2, 2.4, 0.18, 0, 1.35, 0);
  t.box(object, face, 2.04, 2.24, 0.012, 0, 1.35, 0.1);
  for (const x of [-0.8, 0.8])
    t.box(object, casing, 0.1, 0.22, 0.18, x, 0.11, 0);
  const title = createMicroLabel(
    kit,
    id === 'demo.mimic' ? 'PENFOLD  ·  BOILER PLANT' : 'PENFOLD  ·  SMALL POOL',
    {
      height: 0.037,
      ink: '#15343e',
      maxWidth: 1.9,
    },
  );
  title.position.set(0, 2.43, 0.12);
  object.add(title);
  const signals =
    id === 'demo.mimic'
      ? ([
          ['GAS USED', 'signal-gas-used', 'm3', 2],
          ['GAS FLOW', 'signal-gas-flow', 'm3/h', 2],
          ['BOILER RUN', 'signal-boiler-running', 'ON', 0],
          ['BOILER FLOW', 'signal-boiler-temperature', 'C', 1],
          ['TANK TEMP', 'signal-tank-temperature', 'C', 1],
          ['PUMP RUN', 'signal-pump-running', 'ON', 0],
          ['ELECTRICITY', 'signal-electricity', 'kWh', 2],
          ['GAS VALVE', 'signal-remote-gas', 'OPEN', 0],
          ['WATER VALVE', 'signal-remote-water', 'OPEN', 0],
          ['POWER BREAKER', 'signal-remote-power', 'ON', 0],
        ] as const)
      : ([
          ['POOL TEMP', 'signal-pool-temperature', 'C', 1],
          ['POOL TARGET', 'signal-pool-target', 'C', 1],
          ['CHLORINE', 'signal-chlorine', 'mg/L', 2],
          ['POOL PH', 'signal-ph', 'pH', 2],
          ['BALANCE', 'signal-balance-level', 'FULL', 2],
          ['FILTER DP', 'signal-filter-differential', 'bar', 2],
          ['PUMP RUN', 'signal-pool-pump-running', 'ON', 0],
          ['DOSING', 'signal-dosing', 'ON', 0],
          ['SUCTION', 'signal-suction-valve', 'OPEN', 0],
          ['RETURN', 'signal-return-valve', 'OPEN', 0],
          ['MAKEUP', 'signal-makeup-valve', 'OPEN', 0],
        ] as const);
  const readouts = signals.map(([legend, edgeId, unit, decimals], i) => {
    const y = 2.21 - i * (id === 'demo.poolMimic' ? 0.145 : 0.16);
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
  const valveCommands =
    id === 'demo.mimic'
      ? ([
          [7, 'command-remote-gas', 'demo.remoteGas', 'GAS'],
          [8, 'command-remote-water', 'demo.remoteWater', 'WATER'],
          [9, 'command-remote-power', 'demo.remotePower', 'POWER'],
        ] as const)
      : ([
          [8, 'command-suction-valve', 'demo.remoteSuction', 'SUCTION'],
          [9, 'command-return-valve', 'demo.remoteReturn', 'RETURN'],
          [10, 'command-makeup-valve', 'demo.remoteMakeup', 'MAKEUP'],
        ] as const);
  for (const [row, edgeId, nodeId, legend] of valveCommands) {
    const button = parts.add(
      pushButton(kit, {
        colour: 'blue',
        legend: `${legend} OPEN/CLOSE`,
        name: `Mimic ${legend} remote control`,
        action: () =>
          demo.commandMimic(edgeId, !demo.state.remote[nodeId].command),
      }),
    );
    button.object.position.set(
      -0.93,
      2.21 - row * (id === 'demo.poolMimic' ? 0.145 : 0.16),
      0.15,
    );
    object.add(button.object);
  }
  const machineCommands =
    id === 'demo.mimic'
      ? ([
          ['command-boiler', 'BOILER ON/OFF', 'boilerOn'],
          ['command-pump', 'PUMP ON/OFF', 'pumpOn'],
        ] as const)
      : ([['command-pool-pump', 'POOL PUMP ON/OFF', 'poolPumpOn']] as const);
  machineCommands.forEach(([edgeId, legend, stateKey], i) => {
    const button = parts.add(
      pushButton(kit, {
        colour: 'green',
        legend,
        name: `Mimic ${legend}`,
        action: () => demo.commandMimic(edgeId, !demo.state[stateKey]),
      }),
    );
    button.object.position.set(
      i === 0 ? -0.55 : 0.55,
      id === 'demo.poolMimic' ? 0.16 : 0.3,
      0.15,
    );
    object.add(button.object);
  });
  if (id === 'demo.poolMimic') {
    const heatButton = parts.add(
      pushButton(kit, {
        colour: 'green',
        legend: 'POOL HEAT ON/OFF',
        name: 'Pool heating control',
        action: () => {
          const on = !(demo.state.boilerOn && demo.state.pumpOn);
          demo.commandMimic('command-pool-heat-boiler', on);
          demo.commandMimic('command-pool-heat-pump', on);
        },
      }),
    );
    heatButton.object.position.set(0.55, 0.16, 0.15);
    object.add(heatButton.object);
    for (const [direction, x, legend] of [
      [-1, -0.15, 'TARGET −'],
      [1, 0.15, 'TARGET +'],
    ] as const) {
      const button = parts.add(
        pushButton(kit, {
          colour: 'blue',
          legend,
          name: `Pool target ${legend}`,
          action: () =>
            demo.setPoolSetpoint(demo.state.poolSetpointC + direction * 0.5),
        }),
      );
      button.object.position.set(x, 0.39, 0.15);
      object.add(button.object);
    }
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
  if (node.data.kind === 'mimic' || node.data.kind === 'pool-mimic')
    return buildMimic(kit, id as 'demo.mimic' | 'demo.poolMimic');
  if (node.data.kind === 'pool-info-sign') {
    const sign = createPoolInfoSign(kit, 'post');
    sign.object.userData.graphNodeId = id;
    const state = createSignState('TRIAL POOL');
    markLive(sign.object);
    return {
      object: sign.object,
      update() {
        const now = demo.state.seconds;
        state.power = demo.state.mainsOn;
        state.clock =
          new Date().getHours() * 3600 +
          new Date().getMinutes() * 60 +
          new Date().getSeconds();
        for (const [field, edgeId] of [
          ['water', 'sign-pool-temperature'],
          ['ph', 'sign-ph'],
          ['free', 'sign-chlorine'],
        ] as const) {
          state.readings[field] = {
            value: Number(demo.readMimic(edgeId)),
            at: now,
          };
        }
        sign.show(state, now);
        sign.update(now);
      },
    };
  }
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
    node.data.kind === 'circulator' || node.data.kind === 'pool-pump'
      ? pumpSound({
          ...HEATING_CIRCULATOR,
          kW: node.data.kind === 'pool-pump' ? 1.1 : 0.3,
        })
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
            demo.state.mainsOn &&
            demo.state.remote['demo.remotePower'].actual,
        },
        demo.state.seconds,
        delta,
      );
  } else if (node.data.kind === 'circulator') {
    object.add(createEndSuctionPump(kit));
  } else if (node.data.kind === 'pool-pump') {
    object.add(createEndSuctionPump(kit));
  } else if (node.data.kind === 'gas-meter') {
    const brass = t.paint('#aa8f55', 0.45, 0.65);
    t.cyl(object, brass, 0.07, 0.48, 0, 0.82, 0, 'x', 16);
    t.box(object, body, 0.42, 0.35, 0.3, 0, 1.02, 0);
    t.box(object, silver, 0.31, 0.1, 0.01, 0, 1.09, 0.16);
    const meterPlate = createMicroLabel(kit, 'TRAGER G25  ·  m3/h', {
      height: 0.015,
      ink: '#192425',
      maxWidth: 0.3,
    });
    meterPlate.position.set(0, 1.16, 0.18);
    object.add(meterPlate);
  } else if (node.data.kind === 'pool') {
    const tile = t.paint('#d9e9e2', 0.4);
    const water = t.paint('#3a9cab', 0.12, 0.15);
    t.box(object, tile, 3.25, 0.12, 2.3, 0, 0.06, 0);
    t.box(object, water, 3.05, 0.045, 2.1, 0, 0.65, 0);
    for (const x of [-1.56, 1.56])
      t.box(object, tile, 0.12, 0.65, 2.3, x, 0.38, 0);
    for (const z of [-1.09, 1.09])
      t.box(object, tile, 3.25, 0.65, 0.12, 0, 0.38, z);
  } else if (node.data.kind === 'sand-filter') {
    const filter = createSandFilter(kit, {
      dia: 0.9,
      shell: 1.25,
      dn: 65,
      label: 'DEMO FILTER',
    });
    object.add(filter);
    mechanicalUpdate = (delta) =>
      filter.show(
        { inlet: 1.3, outlet: 1.3 - demo.state.filterDifferentialBar },
        delta,
      );
  } else if (node.data.kind === 'heat-exchanger') {
    object.add(createPlateHeatExchanger(kit));
  } else if (node.data.kind === 'balance-tank') {
    t.box(object, body, 1.25, 0.95, 0.85, 0, 0.52, 0);
    t.box(object, silver, 1.28, 0.04, 0.88, 0, 1.02, 0);
  } else if (
    node.data.kind === 'gas-main' ||
    node.data.kind === 'makeup-main' ||
    node.data.kind === 'mains'
  ) {
    t.box(object, body, 0.64, 0.82, 0.45, 0, 0.46, 0);
  } else if (node.data.kind === 'treatment') {
    t.box(object, body, 0.72, 1.1, 0.5, 0, 0.58, 0);
    t.box(object, silver, 0.5, 0.37, 0.02, 0, 0.75, 0.26);
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

  if (id in demo.state.remote) {
    const override = parts.add(
      pushButton(kit, {
        colour: 'amber',
        head: 'illuminated',
        legend: 'LOCAL OVERRIDE',
        name: `${id} local override`,
        lamp: {
          get value() {
            return (
              demo.state.mainsOn && demo.state.remote[id].localOverride !== null
            );
          },
        },
        action: () => demo.toggleLocalOverride(id),
      }),
    );
    override.object.scale.setScalar(1.4);
    override.object.position.set(
      node.data.kind === 'remote-breaker' ? -0.12 : 0.17,
      node.data.kind === 'remote-breaker' ? 0.66 : 1.0,
      node.data.kind === 'remote-breaker' ? 0.19 : 0.23,
    );
    object.add(override.object);
  }

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
      faceCamera: true,
    });
    label.position.set(x, y + 0.07, z + 0.06);
    object.add(label);
  }

  if (['demo.mains', 'demo.pump', 'demo.poolPump'].includes(id)) {
    const button = parts.add(
      pushButton(kit, {
        colour: 'green',
        legend: 'ON/OFF',
        name: `${id} control`,
        action: () => toggle(id),
      }),
    );
    button.object.position.set(0.18, 0.28, 0.43);
    object.add(button.object);
  }
  const digits = createSevenSegment(kit, 7, { digitHeight: 0.023 });
  digits.group.position.set(
    -0.1,
    id === 'demo.gasMeter' ? 1.02 : 0.28,
    id === 'demo.gasMeter' ? 0.19 : 0.43,
  );
  digits.group.traverse((part) => {
    part.userData.live = true;
  });
  object.add(digits.group);
  const unit =
    (
      {
        'demo.gasMeter': 'm3/h',
        'demo.boiler': 'kW',
        'demo.tank': 'C',
        'demo.pool': 'C',
        'demo.balance': 'FULL',
        'demo.filter': 'bar',
        'demo.pump': 'A',
        'demo.poolPump': 'A',
        'demo.mains': 'kWh',
        'demo.treatment': 'mg/L',
        'demo.hx': 'kWh',
      } as Record<string, string>
    )[id] ?? 'ON';
  const unitLabel = createMicroLabel(kit, unit, {
    height: 0.018,
    ink: '#e6ede8',
    plate: '#263035',
  });
  unitLabel.position.set(
    -0.1,
    id === 'demo.gasMeter' ? 0.94 : 0.2,
    id === 'demo.gasMeter' ? 0.19 : 0.42,
  );
  object.add(unitLabel);
  return {
    object,
    parts,
    update(delta) {
      if (id === demoVisualBindings[0].nodeId) demo.step(delta * 10);
      if (pumpLoop) {
        const running =
          (id === 'demo.poolPump' ? demo.state.poolPumpA : demo.state.pumpA) >
          0;
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
            demo.state.mainsOn ? servoMotionSound(actual) : SPRING_RETURN,
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
  'Small pool and boiler plant bound to typed nodes; routed gas, water, flue and power';

const dimensions: Record<DemoKind, { w: number; d: number; h: number }> = {
  'gas-main': { w: 0.9, d: 0.8, h: 1.2 },
  'gas-meter': { w: 0.9, d: 0.8, h: 1.35 },
  mains: { w: 0.9, d: 0.8, h: 1.3 },
  'makeup-main': { w: 0.9, d: 0.8, h: 1.2 },
  boiler: { w: 1, d: 0.8, h: 2.3 },
  'water-tank': { w: 1.5, d: 1.2, h: 2.4 },
  circulator: { w: 2.2, d: 1, h: 1.6 },
  'pool-pump': { w: 2.2, d: 1, h: 1.6 },
  pool: { w: 3.3, d: 2.35, h: 0.9 },
  'pool-info-sign': { w: 0.8, d: 0.6, h: 2.65 },
  'balance-tank': { w: 1.4, d: 1, h: 1.2 },
  'sand-filter': { w: 1.8, d: 1.8, h: 2.2 },
  treatment: { w: 0.9, d: 0.7, h: 1.5 },
  'heat-exchanger': { w: 1.3, d: 0.8, h: 1.3 },
  'remote-gas-valve': { w: 0.72, d: 0.55, h: 1.45 },
  'remote-water-valve': { w: 0.72, d: 0.55, h: 1.45 },
  'remote-breaker': { w: 0.64, d: 0.5, h: 1.4 },
  mimic: { w: 2.25, d: 0.6, h: 2.6 },
  'pool-mimic': { w: 2.25, d: 0.6, h: 2.6 },
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
  for (const route of demoServiceRoutes(layout)) {
    const request = demoLineRequest(route.edgeId, route.medium);
    const { group: run } = createLine(kit, request, route.points, {
      ends: ['open', 'open'],
      colour: route.medium === 'gas' ? '#c7a642' : undefined,
    });
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
    const bottomY =
      nodeId === 'demo.mimic' || nodeId === 'demo.poolMimic' ? 2.54 : 1.45;
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
