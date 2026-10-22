import { createGraph, getEdgesByPort, getGraphIssues } from '@statelyai/graph';
import { BoilerControlModel } from './boiler-control-model';
import type { BoilerKey } from '../../toolkit/components/plant/logic/boiler-house';
import { celsius } from './control-quantity';
import type { Celsius } from './control-quantity';

/** A deliberately small, isolated plant whose installed topology is a port graph. */
export type DemoKind =
  | 'fuel-store'
  | 'boiler'
  | 'water-tank'
  | 'circulator'
  | 'remote-gas-valve'
  | 'remote-water-valve'
  | 'remote-breaker'
  | 'battery'
  | 'mimic'
  | 'atmosphere'
  | 'stack';
type Medium = 'gas' | 'flue' | 'water' | 'power' | 'heat' | 'control';
type Port = {
  name: string;
  direction: 'in' | 'out';
  data: {
    medium: Medium;
    required: boolean;
    rated?: { value: number; unit: 'kg/s' | 'kW' | 'A' };
    control?: {
      valueType: 'number' | 'boolean';
      unit: '°C' | 'kg' | 'kg/s' | 'kWh' | 'state';
      access: 'read' | 'write';
    };
  };
};
const controlPort = (
  name: string,
  direction: 'in' | 'out',
  valueType: 'number' | 'boolean',
  unit: '°C' | 'kg' | 'kg/s' | 'kWh' | 'state',
): Port => ({
  name,
  direction,
  data: {
    medium: 'control',
    required: false,
    control: {
      valueType,
      unit,
      access: direction === 'out' ? 'read' : 'write',
    },
  },
});
/** Stable operating limits belong to the node kind, not to its mesh. */
export const demoKindRatings: Record<
  DemoKind,
  Readonly<Record<string, number>>
> = {
  'fuel-store': { capacityKg: 1 },
  boiler: {
    maxFuelKgPerSecond: 0.002,
    thermalEfficiency: 0.85,
    controlsKW: 0.05,
  },
  'water-tank': { waterKg: 500, heatCapacityKJPerKgK: 4.18, lossKWPerK: 0.025 },
  circulator: { electricalKW: 0.3, designFlowKgPerSecond: 0.5 },
  'remote-gas-valve': { maxFlowKgPerSecond: 0.002, actuatorKW: 0.01 },
  'remote-water-valve': { maxFlowKgPerSecond: 0.5, actuatorKW: 0.01 },
  'remote-breaker': { ratedA: 32, motorKW: 0.02 },
  battery: { voltageV: 230, capacityKWh: 0.04 },
  mimic: {},
  atmosphere: { temperatureC: 20 },
  stack: {},
};
const ports: Record<DemoKind, readonly Port[]> = {
  'fuel-store': [
    { name: 'gas', direction: 'out', data: { medium: 'gas', required: true } },
    controlPort('level', 'out', 'number', 'kg'),
    controlPort('flow', 'out', 'number', 'kg/s'),
  ],
  boiler: [
    {
      name: 'fuel',
      direction: 'in',
      data: {
        medium: 'gas',
        required: true,
        rated: { value: 0.002, unit: 'kg/s' },
      },
    },
    {
      name: 'flue',
      direction: 'out',
      data: { medium: 'flue', required: true },
    },
    {
      name: 'water-in',
      direction: 'in',
      data: {
        medium: 'water',
        required: true,
        rated: { value: 0.5, unit: 'kg/s' },
      },
    },
    {
      name: 'water-out',
      direction: 'out',
      data: { medium: 'water', required: true },
    },
    {
      name: 'power',
      direction: 'in',
      data: {
        medium: 'power',
        required: true,
        rated: { value: 0.05, unit: 'kW' },
      },
    },
    {
      name: 'temperature',
      direction: 'out',
      data: {
        medium: 'control',
        required: false,
        control: { valueType: 'number', unit: '°C', access: 'read' },
      },
    },
    {
      name: 'setpoint',
      direction: 'in',
      data: {
        medium: 'control',
        required: false,
        control: { valueType: 'number', unit: '°C', access: 'write' },
      },
    },
    controlPort('running', 'out', 'boolean', 'state'),
    controlPort('on-command', 'in', 'boolean', 'state'),
  ],
  'water-tank': [
    controlPort('temperature', 'out', 'number', '°C'),
    {
      name: 'return',
      direction: 'in',
      data: { medium: 'water', required: true },
    },
    {
      name: 'supply',
      direction: 'out',
      data: { medium: 'water', required: true },
    },
    {
      name: 'loss',
      direction: 'out',
      data: { medium: 'heat', required: true },
    },
  ],
  circulator: [
    controlPort('running', 'out', 'boolean', 'state'),
    controlPort('on-command', 'in', 'boolean', 'state'),
    {
      name: 'suction',
      direction: 'in',
      data: { medium: 'water', required: true },
    },
    {
      name: 'discharge',
      direction: 'out',
      data: { medium: 'water', required: true },
    },
    {
      name: 'power',
      direction: 'in',
      data: {
        medium: 'power',
        required: true,
        rated: { value: 0.3, unit: 'kW' },
      },
    },
  ],
  'remote-gas-valve': [
    { name: 'in', direction: 'in', data: { medium: 'gas', required: true } },
    { name: 'out', direction: 'out', data: { medium: 'gas', required: true } },
    {
      name: 'actuator-power',
      direction: 'in',
      data: { medium: 'power', required: true },
    },
    controlPort('command', 'in', 'boolean', 'state'),
    controlPort('status', 'out', 'boolean', 'state'),
  ],
  'remote-water-valve': [
    { name: 'in', direction: 'in', data: { medium: 'water', required: true } },
    {
      name: 'out',
      direction: 'out',
      data: { medium: 'water', required: true },
    },
    {
      name: 'actuator-power',
      direction: 'in',
      data: { medium: 'power', required: true },
    },
    controlPort('command', 'in', 'boolean', 'state'),
    controlPort('status', 'out', 'boolean', 'state'),
  ],
  'remote-breaker': [
    { name: 'in', direction: 'in', data: { medium: 'power', required: true } },
    {
      name: 'out',
      direction: 'out',
      data: { medium: 'power', required: true },
    },
    {
      name: 'motor-power',
      direction: 'in',
      data: { medium: 'power', required: true },
    },
    controlPort('command', 'in', 'boolean', 'state'),
    controlPort('status', 'out', 'boolean', 'state'),
  ],
  battery: [
    controlPort('consumption', 'out', 'number', 'kWh'),
    controlPort('charge', 'out', 'number', 'kWh'),
    {
      name: 'feeder',
      direction: 'out',
      data: { medium: 'power', required: true },
    },
  ],
  mimic: [
    controlPort('fuel-level', 'in', 'number', 'kg'),
    controlPort('fuel-flow', 'in', 'number', 'kg/s'),
    controlPort('boiler-running', 'in', 'boolean', 'state'),
    controlPort('boiler-temperature', 'in', 'number', '°C'),
    controlPort('tank-temperature', 'in', 'number', '°C'),
    controlPort('pump-running', 'in', 'boolean', 'state'),
    controlPort('electricity', 'in', 'number', 'kWh'),
    controlPort('battery-charge', 'in', 'number', 'kWh'),
    controlPort('boiler-command', 'out', 'boolean', 'state'),
    controlPort('pump-command', 'out', 'boolean', 'state'),
    controlPort('gas-valve-status', 'in', 'boolean', 'state'),
    controlPort('water-valve-status', 'in', 'boolean', 'state'),
    controlPort('breaker-status', 'in', 'boolean', 'state'),
    controlPort('gas-valve-command', 'out', 'boolean', 'state'),
    controlPort('water-valve-command', 'out', 'boolean', 'state'),
    controlPort('breaker-command', 'out', 'boolean', 'state'),
  ],
  atmosphere: [
    { name: 'gain', direction: 'in', data: { medium: 'heat', required: true } },
  ],
  stack: [
    { name: 'flue', direction: 'in', data: { medium: 'flue', required: true } },
  ],
};

export const demoGraph = createGraph({
  nodes: (
    [
      ['demo.fuel', 'fuel-store'],
      ['demo.boiler', 'boiler'],
      ['demo.tank', 'water-tank'],
      ['demo.pump', 'circulator'],
      ['demo.remoteGas', 'remote-gas-valve'],
      ['demo.remoteWater', 'remote-water-valve'],
      ['demo.remotePower', 'remote-breaker'],
      ['demo.battery', 'battery'],
      ['demo.mimic', 'mimic'],
      ['demo.air', 'atmosphere'],
      ['demo.stack', 'stack'],
    ] as const
  ).map(([id, kind]) => ({
    id,
    data: {
      kind,
      ratings: demoKindRatings[kind],
      room: 'dev19',
      brand: kind === 'atmosphere' || kind === 'stack' ? null : 'trial',
      visible: kind !== 'atmosphere' && kind !== 'stack',
    },
    ports: ports[kind].map((port) => ({ ...port })),
  })),
  edges: [
    {
      id: 'signal-fuel-level',
      sourceId: 'demo.fuel',
      sourcePort: 'level',
      targetId: 'demo.mimic',
      targetPort: 'fuel-level',
    },
    {
      id: 'signal-fuel-flow',
      sourceId: 'demo.fuel',
      sourcePort: 'flow',
      targetId: 'demo.mimic',
      targetPort: 'fuel-flow',
    },
    {
      id: 'signal-boiler-running',
      sourceId: 'demo.boiler',
      sourcePort: 'running',
      targetId: 'demo.mimic',
      targetPort: 'boiler-running',
    },
    {
      id: 'signal-boiler-temperature',
      sourceId: 'demo.boiler',
      sourcePort: 'temperature',
      targetId: 'demo.mimic',
      targetPort: 'boiler-temperature',
    },
    {
      id: 'signal-tank-temperature',
      sourceId: 'demo.tank',
      sourcePort: 'temperature',
      targetId: 'demo.mimic',
      targetPort: 'tank-temperature',
    },
    {
      id: 'signal-pump-running',
      sourceId: 'demo.pump',
      sourcePort: 'running',
      targetId: 'demo.mimic',
      targetPort: 'pump-running',
    },
    {
      id: 'signal-electricity',
      sourceId: 'demo.battery',
      sourcePort: 'consumption',
      targetId: 'demo.mimic',
      targetPort: 'electricity',
    },
    {
      id: 'signal-battery-charge',
      sourceId: 'demo.battery',
      sourcePort: 'charge',
      targetId: 'demo.mimic',
      targetPort: 'battery-charge',
    },
    {
      id: 'command-boiler',
      sourceId: 'demo.mimic',
      sourcePort: 'boiler-command',
      targetId: 'demo.boiler',
      targetPort: 'on-command',
    },
    {
      id: 'command-pump',
      sourceId: 'demo.mimic',
      sourcePort: 'pump-command',
      targetId: 'demo.pump',
      targetPort: 'on-command',
    },
    {
      id: 'signal-remote-gas',
      sourceId: 'demo.remoteGas',
      sourcePort: 'status',
      targetId: 'demo.mimic',
      targetPort: 'gas-valve-status',
    },
    {
      id: 'signal-remote-water',
      sourceId: 'demo.remoteWater',
      sourcePort: 'status',
      targetId: 'demo.mimic',
      targetPort: 'water-valve-status',
    },
    {
      id: 'signal-remote-power',
      sourceId: 'demo.remotePower',
      sourcePort: 'status',
      targetId: 'demo.mimic',
      targetPort: 'breaker-status',
    },
    {
      id: 'command-remote-gas',
      sourceId: 'demo.mimic',
      sourcePort: 'gas-valve-command',
      targetId: 'demo.remoteGas',
      targetPort: 'command',
    },
    {
      id: 'command-remote-water',
      sourceId: 'demo.mimic',
      sourcePort: 'water-valve-command',
      targetId: 'demo.remoteWater',
      targetPort: 'command',
    },
    {
      id: 'command-remote-power',
      sourceId: 'demo.mimic',
      sourcePort: 'breaker-command',
      targetId: 'demo.remotePower',
      targetPort: 'command',
    },
    {
      id: 'gas',
      sourceId: 'demo.fuel',
      sourcePort: 'gas',
      targetId: 'demo.remoteGas',
      targetPort: 'in',
    },
    {
      id: 'gas-motorized',
      sourceId: 'demo.remoteGas',
      sourcePort: 'out',
      targetId: 'demo.boiler',
      targetPort: 'fuel',
    },
    {
      id: 'flue',
      sourceId: 'demo.boiler',
      sourcePort: 'flue',
      targetId: 'demo.stack',
      targetPort: 'flue',
    },
    {
      id: 'tank-to-pump',
      sourceId: 'demo.tank',
      sourcePort: 'supply',
      targetId: 'demo.remoteWater',
      targetPort: 'in',
    },
    {
      id: 'water-motorized',
      sourceId: 'demo.remoteWater',
      sourcePort: 'out',
      targetId: 'demo.pump',
      targetPort: 'suction',
    },
    {
      id: 'pump-to-boiler',
      sourceId: 'demo.pump',
      sourcePort: 'discharge',
      targetId: 'demo.boiler',
      targetPort: 'water-in',
    },
    {
      id: 'boiler-to-tank',
      sourceId: 'demo.boiler',
      sourcePort: 'water-out',
      targetId: 'demo.tank',
      targetPort: 'return',
    },
    {
      id: 'tank-to-air',
      sourceId: 'demo.tank',
      sourcePort: 'loss',
      targetId: 'demo.air',
      targetPort: 'gain',
    },
    {
      id: 'pump-power',
      sourceId: 'demo.battery',
      sourcePort: 'feeder',
      targetId: 'demo.pump',
      targetPort: 'power',
    },
    {
      id: 'boiler-power',
      sourceId: 'demo.battery',
      sourcePort: 'feeder',
      targetId: 'demo.remotePower',
      targetPort: 'in',
    },
    {
      id: 'breaker-motorized-output',
      sourceId: 'demo.remotePower',
      sourcePort: 'out',
      targetId: 'demo.boiler',
      targetPort: 'power',
    },
    {
      id: 'gas-actuator-power',
      sourceId: 'demo.battery',
      sourcePort: 'feeder',
      targetId: 'demo.remoteGas',
      targetPort: 'actuator-power',
    },
    {
      id: 'water-actuator-power',
      sourceId: 'demo.battery',
      sourcePort: 'feeder',
      targetId: 'demo.remoteWater',
      targetPort: 'actuator-power',
    },
    {
      id: 'breaker-motor-power',
      sourceId: 'demo.battery',
      sourcePort: 'feeder',
      targetId: 'demo.remotePower',
      targetPort: 'motor-power',
    },
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

/** Functional visuals require a matching simulation node; decorative ones have no functional ports. */
export type DemoVisualDeclaration =
  | { role: 'functional'; nodeId: string; kind: DemoKind }
  | { role: 'decorative'; nodeId?: never; kind?: never; ports?: never };

/** Every visible node has one bound exhibit; air and flue sinks are virtual. */
export const demoVisualBindings = [
  { role: 'functional', nodeId: 'demo.fuel', kind: 'fuel-store' },
  { role: 'functional', nodeId: 'demo.boiler', kind: 'boiler' },
  { role: 'functional', nodeId: 'demo.tank', kind: 'water-tank' },
  { role: 'functional', nodeId: 'demo.pump', kind: 'circulator' },
  { role: 'functional', nodeId: 'demo.remoteGas', kind: 'remote-gas-valve' },
  {
    role: 'functional',
    nodeId: 'demo.remoteWater',
    kind: 'remote-water-valve',
  },
  { role: 'functional', nodeId: 'demo.remotePower', kind: 'remote-breaker' },
  { role: 'functional', nodeId: 'demo.battery', kind: 'battery' },
  { role: 'functional', nodeId: 'demo.mimic', kind: 'mimic' },
] as const satisfies readonly DemoVisualDeclaration[];

export interface DemoState {
  fuelKg: number;
  tankC: number;
  electricKWh: number;
  batteryKWh: number;
  fuelKWh: number;
  heatKWh: number;
  lossKWh: number;
  boilerKW: number;
  pumpA: number;
  gasKgPerSecond: number;
  remote: Record<string, { command: boolean; actual: boolean }>;
  seconds: number;
  batteryOn: boolean;
  pumpOn: boolean;
  boilerOn: boolean;
  boilerControl: BoilerControlModel;
  boilerMode:
    | 'off'
    | 'standby'
    | 'firing'
    | 'fuel-exhausted'
    | 'unpowered'
    | 'no-flow'
    | 'gas-isolated';
}

/** A tiny energy ledger: 500 kg water, 20 °C air, 0.5 kW/K envelope. */
export function createPortGraphDemo() {
  const state: DemoState = {
    fuelKg: 1,
    tankC: 20,
    electricKWh: 0,
    batteryKWh: demoKindRatings.battery.capacityKWh,
    fuelKWh: 0,
    heatKWh: 0,
    lossKWh: 0,
    boilerKW: 0,
    pumpA: 0,
    gasKgPerSecond: 0,
    remote: {
      'demo.remoteGas': { command: true, actual: true },
      'demo.remoteWater': { command: true, actual: true },
      'demo.remotePower': { command: true, actual: true },
    },
    seconds: 0,
    batteryOn: true,
    pumpOn: true,
    boilerOn: true,
    boilerControl: new BoilerControlModel(),
    boilerMode: 'off',
  };
  const tank = demoKindRatings['water-tank'];
  const boiler = demoKindRatings.boiler;
  const pump = demoKindRatings.circulator;
  const battery = demoKindRatings.battery;
  const air = demoKindRatings.atmosphere;
  const initialEnergyKWh =
    (tank.waterKg * tank.heatCapacityKJPerKgK * state.tankC) / 3600;
  return {
    graph: demoGraph,
    state,
    readMimic(edgeId: string): number | boolean {
      const edge = demoGraph.edges.find(
        (item) => item.id === edgeId && item.targetId === 'demo.mimic',
      );
      const source = demoGraph.nodes
        .find((node) => node.id === edge?.sourceId)
        ?.ports?.find((port) => port.name === edge?.sourcePort);
      const target = demoGraph.nodes
        .find((node) => node.id === 'demo.mimic')
        ?.ports?.find((port) => port.name === edge?.targetPort);
      if (
        source?.data.medium !== 'control' ||
        target?.data.medium !== 'control' ||
        source.data.control?.access !== 'read'
      )
        throw new Error(`${edgeId}: not a connected control reading`);
      switch (edgeId) {
        case 'signal-fuel-level':
          return state.fuelKg;
        case 'signal-fuel-flow':
          return state.gasKgPerSecond;
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
        case 'signal-battery-charge':
          return state.batteryKWh;
        case 'signal-remote-gas':
          return state.remote['demo.remoteGas'].actual;
        case 'signal-remote-water':
          return state.remote['demo.remoteWater'].actual;
        case 'signal-remote-power':
          return state.remote['demo.remotePower'].actual;
        default:
          throw new Error(`${edgeId}: no control-model reading`);
      }
    },
    commandMimic(
      edgeId:
        | 'command-boiler'
        | 'command-pump'
        | 'command-remote-gas'
        | 'command-remote-water'
        | 'command-remote-power',
      on: boolean,
    ) {
      const edge = demoGraph.edges.find(
        (item) => item.id === edgeId && item.sourceId === 'demo.mimic',
      );
      const target = demoGraph.nodes
        .find((node) => node.id === edge?.targetId)
        ?.ports?.find((port) => port.name === edge?.targetPort);
      if (
        target?.data.medium !== 'control' ||
        target.data.control?.access !== 'write' ||
        target.data.control.valueType !== 'boolean'
      )
        throw new Error(`${edgeId}: not a connected boolean command`);
      if (edgeId === 'command-boiler' && state.boilerOn !== on) {
        state.boilerControl.press('power');
        state.boilerOn = state.boilerControl.state.on;
      }
      if (edgeId === 'command-pump') state.pumpOn = on;
      if (edgeId === 'command-remote-gas')
        state.remote['demo.remoteGas'].command = on;
      if (edgeId === 'command-remote-water')
        state.remote['demo.remoteWater'].command = on;
      if (edgeId === 'command-remote-power')
        state.remote['demo.remotePower'].command = on;
    },
    /** Optional graph endpoints call the control model; they never carry heat or power. */
    readControlPort(nodeId: 'demo.boiler', portName: 'temperature'): Celsius {
      const port = demoGraph.nodes
        .find((node) => node.id === nodeId)
        ?.ports?.find((item) => item.name === portName);
      if (
        port?.data.medium !== 'control' ||
        port.data.control?.access !== 'read'
      )
        throw new Error(`${nodeId}.${portName}: not a readable control port`);
      if (nodeId === 'demo.boiler' && portName === 'temperature')
        return celsius(state.boilerControl.state.flow);
      throw new Error(`${nodeId}.${portName}: no control-model binding`);
    },
    writeControlPort(
      nodeId: 'demo.boiler',
      portName: 'setpoint',
      value: Celsius,
    ) {
      const port = demoGraph.nodes
        .find((node) => node.id === nodeId)
        ?.ports?.find((item) => item.name === portName);
      if (
        port?.data.medium !== 'control' ||
        port.data.control?.access !== 'write'
      )
        throw new Error(`${nodeId}.${portName}: not a writable control port`);
      if (
        value.unit !== port.data.control.unit ||
        !Number.isFinite(value.value)
      )
        throw new Error(
          `${nodeId}.${portName}: expected ${port.data.control.unit}`,
        );
      if (nodeId === 'demo.boiler' && portName === 'setpoint') {
        state.boilerControl.setSetpoint(value.value);
        return;
      }
      throw new Error(`${nodeId}.${portName}: no control-model binding`);
    },
    pressBoiler(key: BoilerKey) {
      state.boilerControl.press(key);
      state.boilerOn = state.boilerControl.state.on;
    },
    setBoilerSetpoint(celsius: number) {
      state.boilerControl.setSetpoint(celsius);
    },
    command(nodeId: string, action: 'toggle' | 'refill') {
      const kind = demoGraph.nodes.find((node) => node.id === nodeId)?.data
        .kind;
      if (action === 'refill' && kind === 'fuel-store') state.fuelKg = 1;
      else if (action === 'toggle' && kind === 'boiler') {
        state.boilerControl.press('power');
        state.boilerOn = state.boilerControl.state.on;
      } else if (action === 'toggle' && kind === 'circulator')
        state.pumpOn = !state.pumpOn;
      else if (action === 'toggle' && kind === 'battery')
        state.batteryOn = !state.batteryOn;
      else throw new Error(`${nodeId} cannot ${action}`);
    },
    /** SI seconds. Rates are per second; accumulators display in kWh. */
    step(dt: number) {
      if (dt <= 0) return;
      if (dt > 1) {
        for (let remaining = dt; remaining > 0; remaining -= 1)
          this.step(Math.min(1, remaining));
        return;
      }
      const connected = (
        sourceId: string,
        sourcePort: string,
        targetId: string,
        targetPort: string,
      ) =>
        demoGraph.edges.some(
          (edge) =>
            edge.sourceId === sourceId &&
            edge.sourcePort === sourcePort &&
            edge.targetId === targetId &&
            edge.targetPort === targetPort,
        );
      const supplyPowered = state.batteryOn && state.batteryKWh > 0;
      const gasActuatorPowered =
        supplyPowered &&
        connected('demo.battery', 'feeder', 'demo.remoteGas', 'actuator-power');
      const waterActuatorPowered =
        supplyPowered &&
        connected(
          'demo.battery',
          'feeder',
          'demo.remoteWater',
          'actuator-power',
        );
      const breakerMotorPowered =
        supplyPowered &&
        connected('demo.battery', 'feeder', 'demo.remotePower', 'motor-power');
      state.remote['demo.remoteGas'].actual =
        gasActuatorPowered && state.remote['demo.remoteGas'].command;
      state.remote['demo.remoteWater'].actual =
        waterActuatorPowered && state.remote['demo.remoteWater'].command;
      if (breakerMotorPowered)
        state.remote['demo.remotePower'].actual =
          state.remote['demo.remotePower'].command;
      const pumpRuns =
        supplyPowered &&
        state.pumpOn &&
        state.remote['demo.remoteWater'].actual &&
        connected('demo.battery', 'feeder', 'demo.pump', 'power') &&
        connected('demo.tank', 'supply', 'demo.remoteWater', 'in') &&
        connected('demo.remoteWater', 'out', 'demo.pump', 'suction');
      state.boilerMode = !state.boilerOn
        ? 'off'
        : !supplyPowered ||
            !state.remote['demo.remotePower'].actual ||
            !connected('demo.battery', 'feeder', 'demo.remotePower', 'in') ||
            !connected('demo.remotePower', 'out', 'demo.boiler', 'power')
          ? 'unpowered'
          : !pumpRuns
            ? 'no-flow'
            : !state.remote['demo.remoteGas'].actual
              ? 'gas-isolated'
              : state.fuelKg <= 0
                ? 'fuel-exhausted'
                : state.boilerControl.state.forcing === 'auto' &&
                    state.tankC >= state.boilerControl.state.setpoint
                  ? 'standby'
                  : 'firing';
      const thermostatLimitKg =
        state.boilerControl.state.forcing === 'auto'
          ? (Math.max(0, state.boilerControl.state.setpoint - state.tankC) *
              tank.waterKg *
              tank.heatCapacityKJPerKgK) /
            (50_000 * boiler.thermalEfficiency)
          : Infinity;
      const gasKg =
        state.boilerMode === 'firing' &&
        connected('demo.fuel', 'gas', 'demo.remoteGas', 'in') &&
        connected('demo.remoteGas', 'out', 'demo.boiler', 'fuel') &&
        connected('demo.pump', 'discharge', 'demo.boiler', 'water-in') &&
        connected('demo.boiler', 'water-out', 'demo.tank', 'return')
          ? Math.min(
              state.fuelKg,
              thermostatLimitKg,
              boiler.maxFuelKgPerSecond *
                dt *
                (state.boilerControl.state.forcing === 'low' ? 0.2 : 1),
            )
          : 0;
      state.fuelKg -= gasKg;
      state.gasKgPerSecond = gasKg / dt;
      const fuelKWh = (gasKg * 50_000) / 3600; // 50 MJ/kg natural gas LHV.
      const heatKWh = fuelKWh * boiler.thermalEfficiency;
      const lossKWh =
        (tank.lossKWPerK * (state.tankC - air.temperatureC) * dt) / 3600;
      state.tankC +=
        ((heatKWh - lossKWh) * 3600) /
        (tank.waterKg * tank.heatCapacityKJPerKgK);
      state.fuelKWh += fuelKWh;
      state.heatKWh += heatKWh;
      state.lossKWh += lossKWh;
      const powerKW = supplyPowered
        ? (pumpRuns ? pump.electricalKW : 0) +
          (state.remote['demo.remoteGas'].actual
            ? demoKindRatings['remote-gas-valve'].actuatorKW
            : 0) +
          (state.boilerMode !== 'unpowered' &&
          state.boilerOn &&
          state.remote['demo.remotePower'].actual
            ? boiler.controlsKW
            : 0)
        : 0;
      const usedKWh = Math.min(state.batteryKWh, (powerKW * dt) / 3600);
      state.electricKWh += usedKWh;
      state.batteryKWh -= usedKWh;
      state.pumpA = pumpRuns
        ? (pump.electricalKW * 1000) / battery.voltageV
        : 0;
      state.boilerKW = (heatKWh * 3600) / dt;
      if (state.batteryKWh <= 0) {
        state.remote['demo.remoteGas'].actual = false;
        state.remote['demo.remoteWater'].actual = false;
        state.pumpA = 0;
        state.boilerKW = 0;
        state.gasKgPerSecond = 0;
        if (state.boilerOn) state.boilerMode = 'unpowered';
      }
      state.boilerControl.showPhysical({
        powered:
          state.batteryOn &&
          state.batteryKWh > 0 &&
          state.remote['demo.remotePower'].actual,
        firing: state.boilerKW > 0,
        flowing: state.pumpA > 0,
        waterC: state.tankC,
        rate:
          state.boilerKW /
          (boiler.maxFuelKgPerSecond * 50_000 * boiler.thermalEfficiency),
        deltaSeconds: dt,
      });
      state.seconds += dt;
    },
    /** Thermal-energy conservation, in kWh, around the water tank. */
    tankLedgerErrorKWh() {
      const now =
        (tank.waterKg * tank.heatCapacityKJPerKgK * state.tankC) / 3600;
      return now - initialEnergyKWh - state.heatKWh + state.lossKWh;
    },
  };
}
