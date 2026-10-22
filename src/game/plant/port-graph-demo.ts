import { createGraph, getEdgesByPort, getGraphIssues } from '@statelyai/graph';
import { BoilerControlModel } from './boiler-control-model';
import type { BoilerKey } from '../../toolkit/components/plant/logic/boiler-house';
import { celsius } from './control-quantity';
import type { Celsius } from './control-quantity';

/** The installed topology and the small, independent simulation behind dev19. */
export type DemoKind =
  | 'gas-main'
  | 'mains'
  | 'makeup-main'
  | 'boiler'
  | 'water-tank'
  | 'circulator'
  | 'pool-pump'
  | 'pool'
  | 'balance-tank'
  | 'sand-filter'
  | 'treatment'
  | 'heat-exchanger'
  | 'gas-meter'
  | 'remote-gas-valve'
  | 'remote-water-valve'
  | 'remote-breaker'
  | 'mimic'
  | 'pool-mimic'
  | 'atmosphere'
  | 'stack';
type Medium = 'gas' | 'flue' | 'water' | 'power' | 'heat' | 'control';
type Unit =
  | '°C'
  | 'kg'
  | 'kg/s'
  | 'm³'
  | 'm³/h'
  | 'kWh'
  | 'state'
  | 'm'
  | 'bar'
  | 'mg/L'
  | 'pH';
type Port = {
  name: string;
  direction: 'in' | 'out';
  data: {
    medium: Medium;
    required: boolean;
    rated?: { value: number; unit: 'kg/s' | 'kW' | 'A' };
    control?: {
      valueType: 'number' | 'boolean';
      unit: Unit;
      access: 'read' | 'write';
    };
  };
};
const physical = (
  name: string,
  direction: 'in' | 'out',
  medium: Medium,
  required = true,
): Port => ({ name, direction, data: { medium, required } });
const control = (
  name: string,
  direction: 'in' | 'out',
  unit: Unit,
  valueType: 'number' | 'boolean' = 'number',
): Port => ({
  name,
  direction,
  data: {
    medium: 'control',
    required: false,
    control: {
      unit,
      valueType,
      access: direction === 'out' ? 'read' : 'write',
    },
  },
});
const remotePorts = (medium: Medium, powerPort = 'actuator-power'): Port[] => [
  physical('in', 'in', medium),
  physical('out', 'out', medium),
  physical(powerPort, 'in', 'power'),
  control('command', 'in', 'state', 'boolean'),
  control('status', 'out', 'state', 'boolean'),
];

export const demoKindRatings: Record<
  DemoKind,
  Readonly<Record<string, number>>
> = {
  'gas-main': { heatingValueKJPerKg: 50_000 },
  mains: { voltageV: 230 },
  'makeup-main': { temperatureC: 15 },
  boiler: {
    maxFuelKgPerSecond: 0.00035,
    thermalEfficiency: 0.85,
    controlsKW: 0.05,
  },
  'water-tank': { waterKg: 500, heatCapacityKJPerKgK: 4.18, lossKWPerK: 0.025 },
  circulator: { electricalKW: 0.3, designFlowKgPerSecond: 0.5 },
  'pool-pump': { electricalKW: 1.1, designFlowKgPerSecond: 1.5 },
  pool: { waterKg: 6_000, heatCapacityKJPerKgK: 4.18, lossKWPerK: 0.065 },
  'balance-tank': { capacityKg: 500, makeUpKgPerSecond: 0.02 },
  'sand-filter': { cleanDifferentialBar: 0.18 },
  treatment: { electricalKW: 0.08, targetChlorineMgL: 1.2, targetPH: 7.2 },
  'heat-exchanger': { maxTransferKW: 12, conductanceKWPerK: 1.3 },
  'gas-meter': { gasDensityKgPerCubicMetre: 0.8, maxCubicMetresPerHour: 40 },
  'remote-gas-valve': { actuatorKW: 0.01 },
  'remote-water-valve': { actuatorKW: 0.01 },
  'remote-breaker': { ratedA: 32, motorKW: 0.02 },
  mimic: { electricalKW: 0.02 },
  'pool-mimic': { electricalKW: 0.02 },
  atmosphere: { temperatureC: 20 },
  stack: {},
};
const ports: Record<DemoKind, readonly Port[]> = {
  'gas-main': [physical('gas', 'out', 'gas')],
  'gas-meter': [
    physical('in', 'in', 'gas'),
    physical('out', 'out', 'gas'),
    control('volume', 'out', 'm³'),
    control('flow', 'out', 'm³/h'),
  ],
  mains: [
    physical('feeder', 'out', 'power'),
    control('consumption', 'out', 'kWh'),
  ],
  'makeup-main': [physical('supply', 'out', 'water')],
  boiler: [
    physical('fuel', 'in', 'gas'),
    physical('flue', 'out', 'flue'),
    physical('water-in', 'in', 'water'),
    physical('water-out', 'out', 'water'),
    physical('power', 'in', 'power'),
    control('temperature', 'out', '°C'),
    control('setpoint', 'in', '°C'),
    control('running', 'out', 'state', 'boolean'),
    control('on-command', 'in', 'state', 'boolean'),
  ],
  'water-tank': [
    physical('return', 'in', 'water'),
    physical('supply', 'out', 'water'),
    physical('loss', 'out', 'heat'),
    control('temperature', 'out', '°C'),
  ],
  circulator: [
    physical('suction', 'in', 'water'),
    physical('discharge', 'out', 'water'),
    physical('power', 'in', 'power'),
    control('running', 'out', 'state', 'boolean'),
    control('on-command', 'in', 'state', 'boolean'),
  ],
  'pool-pump': [
    physical('suction', 'in', 'water'),
    physical('discharge', 'out', 'water'),
    physical('power', 'in', 'power'),
    control('running', 'out', 'state', 'boolean'),
    control('on-command', 'in', 'state', 'boolean'),
  ],
  pool: [
    physical('inlet', 'in', 'water'),
    physical('overflow', 'out', 'water'),
    physical('loss', 'out', 'heat'),
    control('temperature', 'out', '°C'),
    control('chlorine', 'out', 'mg/L'),
    control('ph', 'out', 'pH'),
  ],
  'balance-tank': [
    physical('overflow', 'in', 'water'),
    physical('makeup', 'in', 'water'),
    physical('supply', 'out', 'water'),
    control('level', 'out', 'm'),
  ],
  'sand-filter': [
    physical('in', 'in', 'water'),
    physical('out', 'out', 'water'),
    control('differential', 'out', 'bar'),
  ],
  treatment: [
    physical('in', 'in', 'water'),
    physical('out', 'out', 'water'),
    physical('power', 'in', 'power'),
    control('dosing', 'out', 'state', 'boolean'),
  ],
  'heat-exchanger': [
    physical('primary-in', 'in', 'water'),
    physical('primary-out', 'out', 'water'),
    physical('pool-in', 'in', 'water'),
    physical('pool-out', 'out', 'water'),
  ],
  'remote-gas-valve': remotePorts('gas'),
  'remote-water-valve': remotePorts('water'),
  'remote-breaker': remotePorts('power', 'motor-power'),
  mimic: [
    physical('power', 'in', 'power'),
    control('gas-used', 'in', 'm³'),
    control('gas-flow', 'in', 'm³/h'),
    control('boiler-running', 'in', 'state', 'boolean'),
    control('boiler-temperature', 'in', '°C'),
    control('tank-temperature', 'in', '°C'),
    control('pump-running', 'in', 'state', 'boolean'),
    control('electricity', 'in', 'kWh'),
    control('gas-valve-status', 'in', 'state', 'boolean'),
    control('primary-valve-status', 'in', 'state', 'boolean'),
    control('breaker-status', 'in', 'state', 'boolean'),
    control('boiler-command', 'out', 'state', 'boolean'),
    control('pump-command', 'out', 'state', 'boolean'),
    control('gas-valve-command', 'out', 'state', 'boolean'),
    control('primary-valve-command', 'out', 'state', 'boolean'),
    control('breaker-command', 'out', 'state', 'boolean'),
  ],
  'pool-mimic': [
    physical('power', 'in', 'power'),
    control('pool-temperature', 'in', '°C'),
    control('chlorine', 'in', 'mg/L'),
    control('ph', 'in', 'pH'),
    control('balance-level', 'in', 'm'),
    control('filter-differential', 'in', 'bar'),
    control('pool-pump-running', 'in', 'state', 'boolean'),
    control('dosing', 'in', 'state', 'boolean'),
    control('suction-valve-status', 'in', 'state', 'boolean'),
    control('return-valve-status', 'in', 'state', 'boolean'),
    control('makeup-valve-status', 'in', 'state', 'boolean'),
    control('pool-pump-command', 'out', 'state', 'boolean'),
    control('suction-valve-command', 'out', 'state', 'boolean'),
    control('return-valve-command', 'out', 'state', 'boolean'),
    control('makeup-valve-command', 'out', 'state', 'boolean'),
  ],
  atmosphere: [physical('gain', 'in', 'heat')],
  stack: [physical('flue', 'in', 'flue')],
};
const installed = [
  ['demo.pool', 'pool'],
  ['demo.balance', 'balance-tank'],
  ['demo.poolPump', 'pool-pump'],
  ['demo.filter', 'sand-filter'],
  ['demo.treatment', 'treatment'],
  ['demo.hx', 'heat-exchanger'],
  ['demo.remoteSuction', 'remote-water-valve'],
  ['demo.remoteReturn', 'remote-water-valve'],
  ['demo.remoteMakeup', 'remote-water-valve'],
  ['demo.makeup', 'makeup-main'],
  ['demo.gasMain', 'gas-main'],
  ['demo.gasMeter', 'gas-meter'],
  ['demo.remoteGas', 'remote-gas-valve'],
  ['demo.boiler', 'boiler'],
  ['demo.tank', 'water-tank'],
  ['demo.remoteWater', 'remote-water-valve'],
  ['demo.pump', 'circulator'],
  ['demo.remotePower', 'remote-breaker'],
  ['demo.mains', 'mains'],
  ['demo.mimic', 'mimic'],
  ['demo.poolMimic', 'pool-mimic'],
  ['demo.air', 'atmosphere'],
  ['demo.stack', 'stack'],
] as const satisfies readonly (readonly [string, DemoKind])[];
const edge = (
  id: string,
  sourceId: string,
  sourcePort: string,
  targetId: string,
  targetPort: string,
) => ({ id, sourceId, sourcePort, targetId, targetPort });
const power = (id: string, targetId: string, targetPort = 'power') =>
  edge(id, 'demo.mains', 'feeder', targetId, targetPort);
const signal = (
  id: string,
  sourceId: string,
  sourcePort: string,
  targetId: string,
  targetPort: string,
) => edge(id, sourceId, sourcePort, targetId, targetPort);
const command = (
  id: string,
  sourceId: string,
  sourcePort: string,
  targetId: string,
  targetPort: string,
) => edge(id, sourceId, sourcePort, targetId, targetPort);

export const demoGraph = createGraph({
  nodes: installed.map(([id, kind]) => ({
    id,
    data: {
      kind,
      ratings: demoKindRatings[kind],
      room: 'dev19',
      brand: ['atmosphere', 'stack'].includes(kind) ? null : 'trial',
      visible: !['atmosphere', 'stack'].includes(kind),
    },
    ports: ports[kind].map((port) => ({ ...port })),
  })),
  edges: [
    edge('gas-supply', 'demo.gasMain', 'gas', 'demo.gasMeter', 'in'),
    edge('meter-to-gas-valve', 'demo.gasMeter', 'out', 'demo.remoteGas', 'in'),
    edge('gas-to-boiler', 'demo.remoteGas', 'out', 'demo.boiler', 'fuel'),
    edge('flue', 'demo.boiler', 'flue', 'demo.stack', 'flue'),
    edge('primary-supply', 'demo.tank', 'supply', 'demo.remoteWater', 'in'),
    edge(
      'primary-valve-to-pump',
      'demo.remoteWater',
      'out',
      'demo.pump',
      'suction',
    ),
    edge(
      'primary-pump-to-boiler',
      'demo.pump',
      'discharge',
      'demo.boiler',
      'water-in',
    ),
    edge('boiler-to-hx', 'demo.boiler', 'water-out', 'demo.hx', 'primary-in'),
    edge('hx-to-tank', 'demo.hx', 'primary-out', 'demo.tank', 'return'),
    edge('pool-overflow', 'demo.pool', 'overflow', 'demo.balance', 'overflow'),
    edge(
      'balance-supply',
      'demo.balance',
      'supply',
      'demo.remoteSuction',
      'in',
    ),
    edge(
      'pool-suction',
      'demo.remoteSuction',
      'out',
      'demo.poolPump',
      'suction',
    ),
    edge(
      'pool-pump-to-filter',
      'demo.poolPump',
      'discharge',
      'demo.filter',
      'in',
    ),
    edge('filter-to-treatment', 'demo.filter', 'out', 'demo.treatment', 'in'),
    edge('treatment-to-hx', 'demo.treatment', 'out', 'demo.hx', 'pool-in'),
    edge(
      'hx-to-return-valve',
      'demo.hx',
      'pool-out',
      'demo.remoteReturn',
      'in',
    ),
    edge('pool-return', 'demo.remoteReturn', 'out', 'demo.pool', 'inlet'),
    edge('makeup-supply', 'demo.makeup', 'supply', 'demo.remoteMakeup', 'in'),
    edge(
      'makeup-to-balance',
      'demo.remoteMakeup',
      'out',
      'demo.balance',
      'makeup',
    ),
    edge('tank-loss', 'demo.tank', 'loss', 'demo.air', 'gain'),
    edge('pool-loss', 'demo.pool', 'loss', 'demo.air', 'gain'),
    power('primary-pump-power', 'demo.pump'),
    power('pool-pump-power', 'demo.poolPump'),
    power('treatment-power', 'demo.treatment'),
    power('boiler-feed', 'demo.remotePower', 'in'),
    edge(
      'breaker-to-boiler',
      'demo.remotePower',
      'out',
      'demo.boiler',
      'power',
    ),
    power('gas-actuator-power', 'demo.remoteGas', 'actuator-power'),
    power('primary-actuator-power', 'demo.remoteWater', 'actuator-power'),
    power('suction-actuator-power', 'demo.remoteSuction', 'actuator-power'),
    power('return-actuator-power', 'demo.remoteReturn', 'actuator-power'),
    power('makeup-actuator-power', 'demo.remoteMakeup', 'actuator-power'),
    power('breaker-motor-power', 'demo.remotePower', 'motor-power'),
    power('boiler-mimic-power', 'demo.mimic'),
    power('pool-mimic-power', 'demo.poolMimic'),
    signal(
      'signal-gas-used',
      'demo.gasMeter',
      'volume',
      'demo.mimic',
      'gas-used',
    ),
    signal(
      'signal-gas-flow',
      'demo.gasMeter',
      'flow',
      'demo.mimic',
      'gas-flow',
    ),
    signal(
      'signal-boiler-running',
      'demo.boiler',
      'running',
      'demo.mimic',
      'boiler-running',
    ),
    signal(
      'signal-boiler-temperature',
      'demo.boiler',
      'temperature',
      'demo.mimic',
      'boiler-temperature',
    ),
    signal(
      'signal-tank-temperature',
      'demo.tank',
      'temperature',
      'demo.mimic',
      'tank-temperature',
    ),
    signal(
      'signal-pump-running',
      'demo.pump',
      'running',
      'demo.mimic',
      'pump-running',
    ),
    signal(
      'signal-electricity',
      'demo.mains',
      'consumption',
      'demo.mimic',
      'electricity',
    ),
    signal(
      'signal-remote-gas',
      'demo.remoteGas',
      'status',
      'demo.mimic',
      'gas-valve-status',
    ),
    signal(
      'signal-remote-water',
      'demo.remoteWater',
      'status',
      'demo.mimic',
      'primary-valve-status',
    ),
    signal(
      'signal-remote-power',
      'demo.remotePower',
      'status',
      'demo.mimic',
      'breaker-status',
    ),
    command(
      'command-boiler',
      'demo.mimic',
      'boiler-command',
      'demo.boiler',
      'on-command',
    ),
    command(
      'command-pump',
      'demo.mimic',
      'pump-command',
      'demo.pump',
      'on-command',
    ),
    command(
      'command-remote-gas',
      'demo.mimic',
      'gas-valve-command',
      'demo.remoteGas',
      'command',
    ),
    command(
      'command-remote-water',
      'demo.mimic',
      'primary-valve-command',
      'demo.remoteWater',
      'command',
    ),
    command(
      'command-remote-power',
      'demo.mimic',
      'breaker-command',
      'demo.remotePower',
      'command',
    ),
    signal(
      'signal-pool-temperature',
      'demo.pool',
      'temperature',
      'demo.poolMimic',
      'pool-temperature',
    ),
    signal(
      'signal-chlorine',
      'demo.pool',
      'chlorine',
      'demo.poolMimic',
      'chlorine',
    ),
    signal('signal-ph', 'demo.pool', 'ph', 'demo.poolMimic', 'ph'),
    signal(
      'signal-balance-level',
      'demo.balance',
      'level',
      'demo.poolMimic',
      'balance-level',
    ),
    signal(
      'signal-filter-differential',
      'demo.filter',
      'differential',
      'demo.poolMimic',
      'filter-differential',
    ),
    signal(
      'signal-pool-pump-running',
      'demo.poolPump',
      'running',
      'demo.poolMimic',
      'pool-pump-running',
    ),
    signal(
      'signal-dosing',
      'demo.treatment',
      'dosing',
      'demo.poolMimic',
      'dosing',
    ),
    signal(
      'signal-suction-valve',
      'demo.remoteSuction',
      'status',
      'demo.poolMimic',
      'suction-valve-status',
    ),
    signal(
      'signal-return-valve',
      'demo.remoteReturn',
      'status',
      'demo.poolMimic',
      'return-valve-status',
    ),
    signal(
      'signal-makeup-valve',
      'demo.remoteMakeup',
      'status',
      'demo.poolMimic',
      'makeup-valve-status',
    ),
    command(
      'command-pool-pump',
      'demo.poolMimic',
      'pool-pump-command',
      'demo.poolPump',
      'on-command',
    ),
    command(
      'command-suction-valve',
      'demo.poolMimic',
      'suction-valve-command',
      'demo.remoteSuction',
      'command',
    ),
    command(
      'command-return-valve',
      'demo.poolMimic',
      'return-valve-command',
      'demo.remoteReturn',
      'command',
    ),
    command(
      'command-makeup-valve',
      'demo.poolMimic',
      'makeup-valve-command',
      'demo.remoteMakeup',
      'command',
    ),
  ],
});

export function demoGraphProblems(): string[] {
  const problems = getGraphIssues(demoGraph).map((issue) => issue.message);
  const nodes = new Map(demoGraph.nodes.map((node) => [node.id, node]));
  for (const edge of demoGraph.edges) {
    const from = nodes
      .get(edge.sourceId)
      ?.ports?.find((port) => port.name === edge.sourcePort);
    const to = nodes
      .get(edge.targetId)
      ?.ports?.find((port) => port.name === edge.targetPort);
    if (!from || !to) continue;
    if (from.direction !== 'out' || to.direction !== 'in')
      problems.push(`${edge.id}: direction`);
    if (from.data.medium !== to.data.medium)
      problems.push(`${edge.id}: medium`);
    if (
      from.data.medium === 'control' &&
      to.data.medium === 'control' &&
      (from.data.control?.unit !== to.data.control?.unit ||
        from.data.control?.valueType !== to.data.control?.valueType)
    )
      problems.push(`${edge.id}: control message type`);
  }
  for (const node of demoGraph.nodes)
    for (const port of node.ports ?? [])
      if (
        port.data.required &&
        getEdgesByPort(demoGraph, node.id, port.name).length === 0
      )
        problems.push(`${node.id}.${port.name}: unconnected`);
  return problems;
}

export type DemoVisualDeclaration =
  | { role: 'functional'; nodeId: string; kind: DemoKind }
  | { role: 'decorative'; nodeId?: never; kind?: never; ports?: never };
export const demoVisualBindings: readonly Extract<
  DemoVisualDeclaration,
  { role: 'functional' }
>[] = installed
  .filter(([, kind]) => !['atmosphere', 'stack'].includes(kind))
  .map(([nodeId, kind]) => ({ role: 'functional' as const, nodeId, kind }));

export interface DemoState {
  gasKg: number;
  gasKgPerSecond: number;
  gasCubicMetres: number;
  gasCubicMetresPerHour: number;
  tankC: number;
  poolC: number;
  poolChlorineMgL: number;
  poolPH: number;
  balanceKg: number;
  filterDifferentialBar: number;
  filterLoad: number;
  poolFlowKgPerSecond: number;
  dosing: boolean;
  electricKWh: number;
  fuelKWh: number;
  heatKWh: number;
  transferKWh: number;
  lossKWh: number;
  poolLossKWh: number;
  boilerKW: number;
  pumpA: number;
  poolPumpA: number;
  remote: Record<string, { command: boolean; actual: boolean }>;
  seconds: number;
  mainsOn: boolean;
  pumpOn: boolean;
  poolPumpOn: boolean;
  boilerOn: boolean;
  boilerControl: BoilerControlModel;
  boilerMode:
    | 'off'
    | 'standby'
    | 'firing'
    | 'unpowered'
    | 'no-flow'
    | 'gas-isolated';
}
const remoteIds = [
  'demo.remoteGas',
  'demo.remoteWater',
  'demo.remotePower',
  'demo.remoteSuction',
  'demo.remoteReturn',
  'demo.remoteMakeup',
] as const;

export function createPortGraphDemo() {
  const state: DemoState = {
    gasKg: 0,
    gasKgPerSecond: 0,
    gasCubicMetres: 0,
    gasCubicMetresPerHour: 0,
    tankC: 42,
    poolC: 26,
    poolChlorineMgL: 1.2,
    poolPH: 7.2,
    balanceKg: 350,
    filterDifferentialBar: 0,
    filterLoad: 0,
    poolFlowKgPerSecond: 0,
    dosing: false,
    electricKWh: 0,
    fuelKWh: 0,
    heatKWh: 0,
    transferKWh: 0,
    lossKWh: 0,
    poolLossKWh: 0,
    boilerKW: 0,
    pumpA: 0,
    poolPumpA: 0,
    remote: Object.fromEntries(
      remoteIds.map((id) => [id, { command: true, actual: true }]),
    ),
    seconds: 0,
    mainsOn: true,
    pumpOn: true,
    poolPumpOn: true,
    boilerOn: true,
    boilerControl: new BoilerControlModel(),
    boilerMode: 'off',
  };
  const rating = demoKindRatings;
  const tank = rating['water-tank'];
  const pool = rating.pool;
  const air = rating.atmosphere;
  const initialTankKWh =
    (tank.waterKg * tank.heatCapacityKJPerKgK * state.tankC) / 3600;
  const initialPoolKWh =
    (pool.waterKg * pool.heatCapacityKJPerKgK * state.poolC) / 3600;
  const connected = (a: string, ap: string, b: string, bp: string) =>
    demoGraph.edges.some(
      (e) =>
        e.sourceId === a &&
        e.sourcePort === ap &&
        e.targetId === b &&
        e.targetPort === bp,
    );
  const remote = (id: string) => state.remote[id].actual;
  return {
    graph: demoGraph,
    state,
    readMimic(edgeId: string): number | boolean {
      const e = demoGraph.edges.find(
        (item) =>
          item.id === edgeId &&
          ['demo.mimic', 'demo.poolMimic'].includes(item.targetId),
      );
      const source = demoGraph.nodes
        .find((node) => node.id === e?.sourceId)
        ?.ports?.find((p) => p.name === e?.sourcePort);
      const target = demoGraph.nodes
        .find((node) => node.id === e?.targetId)
        ?.ports?.find((p) => p.name === e?.targetPort);
      if (
        source?.data.control?.access !== 'read' ||
        target?.data.medium !== 'control'
      )
        throw new Error(`${edgeId}: not a connected control reading`);
      switch (edgeId) {
        case 'signal-gas-used':
          return state.gasCubicMetres;
        case 'signal-gas-flow':
          return state.gasCubicMetresPerHour;
        case 'signal-boiler-running':
          return state.boilerKW > 0;
        case 'signal-boiler-temperature':
          return state.boilerControl.state.flow;
        case 'signal-tank-temperature':
          return state.tankC;
        case 'signal-pump-running':
          return state.pumpA > 0;
        case 'signal-electricity':
          return state.electricKWh;
        case 'signal-remote-gas':
          return remote('demo.remoteGas');
        case 'signal-remote-water':
          return remote('demo.remoteWater');
        case 'signal-remote-power':
          return remote('demo.remotePower');
        case 'signal-pool-temperature':
          return state.poolC;
        case 'signal-chlorine':
          return state.poolChlorineMgL;
        case 'signal-ph':
          return state.poolPH;
        case 'signal-balance-level':
          return state.balanceKg / rating['balance-tank'].capacityKg;
        case 'signal-filter-differential':
          return state.filterDifferentialBar;
        case 'signal-pool-pump-running':
          return state.poolPumpA > 0;
        case 'signal-dosing':
          return state.dosing;
        case 'signal-suction-valve':
          return remote('demo.remoteSuction');
        case 'signal-return-valve':
          return remote('demo.remoteReturn');
        case 'signal-makeup-valve':
          return remote('demo.remoteMakeup');
        default:
          throw new Error(`${edgeId}: no control-model reading`);
      }
    },
    commandMimic(edgeId: string, on: boolean) {
      const e = demoGraph.edges.find(
        (item) =>
          item.id === edgeId &&
          ['demo.mimic', 'demo.poolMimic'].includes(item.sourceId),
      );
      const target = demoGraph.nodes
        .find((node) => node.id === e?.targetId)
        ?.ports?.find((p) => p.name === e?.targetPort);
      if (
        target?.data.control?.access !== 'write' ||
        target.data.control.valueType !== 'boolean'
      )
        throw new Error(`${edgeId}: not a connected boolean command`);
      if (e?.targetId === 'demo.boiler' && state.boilerOn !== on) {
        state.boilerControl.press('power');
        state.boilerOn = state.boilerControl.state.on;
      } else if (e?.targetId === 'demo.pump') state.pumpOn = on;
      else if (e?.targetId === 'demo.poolPump') state.poolPumpOn = on;
      else if (e?.targetId && e.targetId in state.remote)
        state.remote[e.targetId].command = on;
    },
    readControlPort(nodeId: 'demo.boiler', portName: 'temperature'): Celsius {
      const port = demoGraph.nodes
        .find((node) => node.id === nodeId)
        ?.ports?.find((p) => p.name === portName);
      if (port?.data.control?.access !== 'read')
        throw new Error(`${nodeId}.${portName}: not readable`);
      return celsius(state.boilerControl.state.flow);
    },
    writeControlPort(
      nodeId: 'demo.boiler',
      portName: 'setpoint',
      value: Celsius,
    ) {
      const port = demoGraph.nodes
        .find((node) => node.id === nodeId)
        ?.ports?.find((p) => p.name === portName);
      if (port?.data.control?.access !== 'write')
        throw new Error(`${nodeId}.${portName}: not writable`);
      if (
        value.unit !== port.data.control.unit ||
        !Number.isFinite(value.value)
      )
        throw new Error(
          `${nodeId}.${portName}: expected ${port.data.control.unit}`,
        );
      state.boilerControl.setSetpoint(value.value);
    },
    pressBoiler(key: BoilerKey) {
      state.boilerControl.press(key);
      state.boilerOn = state.boilerControl.state.on;
    },
    setBoilerSetpoint(value: number) {
      state.boilerControl.setSetpoint(value);
    },
    command(nodeId: string, action: 'toggle') {
      const kind = demoGraph.nodes.find((node) => node.id === nodeId)?.data
        .kind;
      if (kind === 'mains') state.mainsOn = !state.mainsOn;
      else if (kind === 'boiler') this.pressBoiler('power');
      else if (kind === 'circulator') state.pumpOn = !state.pumpOn;
      else if (kind === 'pool-pump') state.poolPumpOn = !state.poolPumpOn;
      else throw new Error(`${nodeId} cannot ${action}`);
    },
    /** One-second bounded physical steps; the view may run at tenfold time. */
    step(dt: number) {
      if (dt <= 0) return;
      if (dt > 1) {
        for (let left = dt; left > 0; left -= 1) this.step(Math.min(1, left));
        return;
      }
      const powered = state.mainsOn;
      for (const id of remoteIds) {
        const motorPort =
          id === 'demo.remotePower' ? 'motor-power' : 'actuator-power';
        const motor =
          powered && connected('demo.mains', 'feeder', id, motorPort);
        if (id === 'demo.remotePower') {
          if (motor) state.remote[id].actual = state.remote[id].command;
        } else state.remote[id].actual = motor && state.remote[id].command;
      }
      const primaryRuns =
        powered &&
        state.pumpOn &&
        remote('demo.remoteWater') &&
        connected('demo.tank', 'supply', 'demo.remoteWater', 'in') &&
        connected('demo.remoteWater', 'out', 'demo.pump', 'suction');
      const poolRuns =
        powered &&
        state.poolPumpOn &&
        remote('demo.remoteSuction') &&
        remote('demo.remoteReturn') &&
        state.balanceKg > 20 &&
        connected('demo.pool', 'overflow', 'demo.balance', 'overflow') &&
        connected('demo.poolPump', 'discharge', 'demo.filter', 'in') &&
        connected('demo.filter', 'out', 'demo.treatment', 'in') &&
        connected('demo.treatment', 'out', 'demo.hx', 'pool-in') &&
        connected('demo.hx', 'pool-out', 'demo.remoteReturn', 'in') &&
        connected('demo.remoteReturn', 'out', 'demo.pool', 'inlet');
      state.poolFlowKgPerSecond = poolRuns
        ? rating['pool-pump'].designFlowKgPerSecond
        : 0;
      state.filterLoad = Math.min(
        1,
        state.filterLoad + (poolRuns ? dt * 0.000002 : 0),
      );
      state.filterDifferentialBar = poolRuns
        ? rating['sand-filter'].cleanDifferentialBar + state.filterLoad * 0.5
        : 0;
      state.boilerMode = !state.boilerOn
        ? 'off'
        : !powered || !remote('demo.remotePower')
          ? 'unpowered'
          : !primaryRuns
            ? 'no-flow'
            : !remote('demo.remoteGas')
              ? 'gas-isolated'
              : state.boilerControl.state.forcing === 'auto' &&
                  state.tankC >= state.boilerControl.state.setpoint
                ? 'standby'
                : 'firing';
      const fuelKg =
        state.boilerMode === 'firing' &&
        connected('demo.gasMain', 'gas', 'demo.gasMeter', 'in') &&
        connected('demo.gasMeter', 'out', 'demo.remoteGas', 'in') &&
        connected('demo.remoteGas', 'out', 'demo.boiler', 'fuel') &&
        connected('demo.pump', 'discharge', 'demo.boiler', 'water-in') &&
        connected('demo.boiler', 'water-out', 'demo.hx', 'primary-in') &&
        connected('demo.hx', 'primary-out', 'demo.tank', 'return')
          ? rating.boiler.maxFuelKgPerSecond *
            dt *
            (state.boilerControl.state.forcing === 'low' ? 0.2 : 1)
          : 0;
      state.gasKg += fuelKg;
      state.gasKgPerSecond = fuelKg / dt;
      state.gasCubicMetres +=
        fuelKg / rating['gas-meter'].gasDensityKgPerCubicMetre;
      state.gasCubicMetresPerHour =
        (fuelKg / dt / rating['gas-meter'].gasDensityKgPerCubicMetre) * 3600;
      const fuelKWh = (fuelKg * rating['gas-main'].heatingValueKJPerKg) / 3600;
      const heatKWh = fuelKWh * rating.boiler.thermalEfficiency;
      const transferKW =
        primaryRuns && poolRuns
          ? Math.min(
              rating['heat-exchanger'].maxTransferKW,
              Math.max(0, state.tankC - state.poolC) *
                rating['heat-exchanger'].conductanceKWPerK,
            )
          : 0;
      const transferKWh = (transferKW * dt) / 3600;
      const lossKWh =
        (tank.lossKWPerK * (state.tankC - air.temperatureC) * dt) / 3600;
      const poolLossKWh =
        (pool.lossKWPerK * (state.poolC - air.temperatureC) * dt) / 3600;
      state.tankC +=
        ((heatKWh - transferKWh - lossKWh) * 3600) /
        (tank.waterKg * tank.heatCapacityKJPerKgK);
      state.poolC +=
        ((transferKWh - poolLossKWh) * 3600) /
        (pool.waterKg * pool.heatCapacityKJPerKgK);
      state.fuelKWh += fuelKWh;
      state.heatKWh += heatKWh;
      state.transferKWh += transferKWh;
      state.lossKWh += lossKWh;
      state.poolLossKWh += poolLossKWh;
      const makeup =
        powered &&
        remote('demo.remoteMakeup') &&
        state.balanceKg < 350 &&
        connected('demo.makeup', 'supply', 'demo.remoteMakeup', 'in')
          ? rating['balance-tank'].makeUpKgPerSecond * dt
          : 0;
      state.balanceKg = Math.max(
        0,
        Math.min(
          rating['balance-tank'].capacityKg,
          state.balanceKg + makeup - (poolRuns ? 0.003 * dt : 0.001 * dt),
        ),
      );
      state.dosing =
        poolRuns &&
        powered &&
        connected('demo.mains', 'feeder', 'demo.treatment', 'power');
      state.poolChlorineMgL = Math.max(
        0,
        state.poolChlorineMgL +
          (state.dosing
            ? (rating.treatment.targetChlorineMgL - state.poolChlorineMgL) *
              0.002
            : -0.00003) *
            dt,
      );
      state.poolPH +=
        (state.dosing
          ? (rating.treatment.targetPH - state.poolPH) * 0.001
          : 0.000005) * dt;
      state.pumpA = primaryRuns
        ? (rating.circulator.electricalKW * 1000) / rating.mains.voltageV
        : 0;
      state.poolPumpA = poolRuns
        ? (rating['pool-pump'].electricalKW * 1000) / rating.mains.voltageV
        : 0;
      state.boilerKW = (heatKWh * 3600) / dt;
      const powerKW = powered
        ? (primaryRuns ? rating.circulator.electricalKW : 0) +
          (poolRuns ? rating['pool-pump'].electricalKW : 0) +
          (state.dosing ? rating.treatment.electricalKW : 0) +
          (state.boilerOn && remote('demo.remotePower')
            ? rating.boiler.controlsKW
            : 0) +
          rating.mimic.electricalKW +
          rating['pool-mimic'].electricalKW +
          remoteIds.filter((id) => remote(id) && id !== 'demo.remotePower')
            .length *
            rating['remote-water-valve'].actuatorKW
        : 0;
      state.electricKWh += (powerKW * dt) / 3600;
      state.boilerControl.showPhysical({
        powered: powered && remote('demo.remotePower'),
        firing: state.boilerKW > 0,
        flowing: state.pumpA > 0,
        waterC: state.tankC,
        rate:
          state.boilerKW /
          (rating.boiler.maxFuelKgPerSecond *
            rating['gas-main'].heatingValueKJPerKg *
            rating.boiler.thermalEfficiency),
        deltaSeconds: dt,
      });
      state.seconds += dt;
    },
    tankLedgerErrorKWh() {
      const now =
        (tank.waterKg * tank.heatCapacityKJPerKgK * state.tankC) / 3600;
      return (
        now - initialTankKWh - state.heatKWh + state.transferKWh + state.lossKWh
      );
    },
    poolLedgerErrorKWh() {
      const now =
        (pool.waterKg * pool.heatCapacityKJPerKgK * state.poolC) / 3600;
      return now - initialPoolKWh - state.transferKWh + state.poolLossKWh;
    },
  };
}
