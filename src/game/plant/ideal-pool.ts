import { createGraph, getGraphIssues } from '@statelyai/graph';
import {
  createExperimentalSink,
  createExperimentalSource,
} from './experimental-source';

/** A deliberately simple vessel for testing a real machine against ideal services. */
export const IDEAL_POOL = {
  side: 2.1,
  height: (2.1 * 210) / 297,
  capacityLitres: 6_500,
  supplyC: 16,
  heatSupplyC: 45,
} as const;

type Medium = 'water' | 'power' | 'control';
type Commodity = 'mains-water' | 'pool-water' | 'lthw' | 'drainage' | 'ac-230v';
const port = (
  name: string,
  direction: 'in' | 'out',
  medium: Medium,
  unit?: '°C' | 'L' | 'mg/L' | 'pH' | 'state',
  commodity?: Commodity,
) => ({
  name,
  direction,
  data: {
    medium,
    required: medium !== 'control',
    ...(unit ? { unit } : {}),
    ...(commodity ? { commodity } : {}),
  },
});
const edge = (
  id: string,
  sourceId: string,
  sourcePort: string,
  targetId: string,
  targetPort: string,
) => ({ id, sourceId, sourcePort, targetId, targetPort });

/** One graph node for each visible working thing; each physical port is explicit. */
export const idealFootSpaGraph = createGraph({
  nodes: [
    {
      id: 'demo.pool',
      data: { kind: 'ideal-pool', room: 'dev32' },
      ports: [
        port('makeup', 'in', 'water', undefined, 'mains-water'),
        port('return', 'in', 'water', undefined, 'pool-water'),
        port('suction', 'out', 'water', undefined, 'pool-water'),
        port('drain', 'out', 'water', undefined, 'drainage'),
        port('fill-command', 'in', 'control', 'state'),
        port('drain-command', 'in', 'control', 'state'),
        port('temperature', 'out', 'control', '°C'),
        port('volume', 'out', 'control', 'L'),
        port('chlorine', 'out', 'control', 'mg/L'),
        port('ph', 'out', 'control', 'pH'),
      ],
    },
    {
      id: 'demo.cabinet',
      data: { kind: 'foot-spa-cabinet', room: 'dev32' },
      ports: [
        port('suction', 'in', 'water', undefined, 'pool-water'),
        port('return', 'out', 'water', undefined, 'pool-water'),
        port('heating-flow', 'in', 'water', undefined, 'lthw'),
        port('heating-return', 'out', 'water', undefined, 'lthw'),
        port('power', 'in', 'power', undefined, 'ac-230v'),
      ],
    },
    {
      id: 'demo.makeup',
      data: { kind: 'ideal-water-source', room: 'dev32' },
      ports: [port('supply', 'out', 'water', undefined, 'mains-water')],
    },
    {
      id: 'demo.heating',
      data: { kind: 'ideal-heat-source', room: 'dev32' },
      ports: [port('supply', 'out', 'water', undefined, 'lthw')],
    },
    {
      id: 'demo.heatSink',
      data: { kind: 'ideal-heat-sink', room: 'dev32' },
      ports: [port('return', 'in', 'water', undefined, 'lthw')],
    },
    {
      id: 'demo.drain',
      data: { kind: 'ideal-drain', room: 'dev32' },
      ports: [port('inlet', 'in', 'water', undefined, 'drainage')],
    },
    {
      id: 'demo.mains',
      data: { kind: 'ideal-power-source', room: 'dev32' },
      ports: [
        port('supply-cabinet', 'out', 'power', undefined, 'ac-230v'),
        port('supply-sign', 'out', 'power', undefined, 'ac-230v'),
        port('supply-panel', 'out', 'power', undefined, 'ac-230v'),
      ],
    },
    {
      id: 'demo.panel',
      data: { kind: 'foot-spa-test-controls', room: 'dev32' },
      ports: [
        port('power', 'in', 'power', undefined, 'ac-230v'),
        port('fill-command', 'out', 'control', 'state'),
        port('drain-command', 'out', 'control', 'state'),
      ],
    },
    {
      id: 'demo.sign',
      data: { kind: 'pool-quality-sign', room: 'dev32' },
      ports: [
        port('power', 'in', 'power', undefined, 'ac-230v'),
        port('temperature', 'in', 'control', '°C'),
        port('chlorine', 'in', 'control', 'mg/L'),
        port('ph', 'in', 'control', 'pH'),
      ],
    },
  ],
  edges: [
    edge('makeup', 'demo.makeup', 'supply', 'demo.pool', 'makeup'),
    edge('suction', 'demo.pool', 'suction', 'demo.cabinet', 'suction'),
    edge('return', 'demo.cabinet', 'return', 'demo.pool', 'return'),
    edge(
      'heating-flow',
      'demo.heating',
      'supply',
      'demo.cabinet',
      'heating-flow',
    ),
    edge(
      'heating-return',
      'demo.cabinet',
      'heating-return',
      'demo.heatSink',
      'return',
    ),
    edge('drain', 'demo.pool', 'drain', 'demo.drain', 'inlet'),
    edge(
      'cabinet-power',
      'demo.mains',
      'supply-cabinet',
      'demo.cabinet',
      'power',
    ),
    edge('sign-power', 'demo.mains', 'supply-sign', 'demo.sign', 'power'),
    edge('panel-power', 'demo.mains', 'supply-panel', 'demo.panel', 'power'),
    edge(
      'fill-command',
      'demo.panel',
      'fill-command',
      'demo.pool',
      'fill-command',
    ),
    edge(
      'drain-command',
      'demo.panel',
      'drain-command',
      'demo.pool',
      'drain-command',
    ),
    edge(
      'sign-temperature',
      'demo.pool',
      'temperature',
      'demo.sign',
      'temperature',
    ),
    edge('sign-chlorine', 'demo.pool', 'chlorine', 'demo.sign', 'chlorine'),
    edge('sign-ph', 'demo.pool', 'ph', 'demo.sign', 'ph'),
  ],
});

export function idealFootSpaGraphIssues(): string[] {
  const issues = getGraphIssues(idealFootSpaGraph).map(
    (issue) => issue.message,
  );
  const nodes = new Map(idealFootSpaGraph.nodes.map((node) => [node.id, node]));
  for (const e of idealFootSpaGraph.edges) {
    const a = nodes
      .get(e.sourceId)
      ?.ports?.find((p) => p.name === e.sourcePort);
    const b = nodes
      .get(e.targetId)
      ?.ports?.find((p) => p.name === e.targetPort);
    if (
      !a ||
      !b ||
      a.direction !== 'out' ||
      b.direction !== 'in' ||
      a.data.medium !== b.data.medium ||
      a.data.unit !== b.data.unit ||
      a.data.commodity !== b.data.commodity
    )
      issues.push(`${e.id}: incompatible ports`);
  }
  for (const node of idealFootSpaGraph.nodes)
    for (const p of node.ports ?? [])
      if (
        p.data.required &&
        !idealFootSpaGraph.edges.some(
          (e) =>
            (e.sourceId === node.id && e.sourcePort === p.name) ||
            (e.targetId === node.id && e.targetPort === p.name),
        )
      )
        issues.push(`${node.id}.${p.name}: unconnected`);
  return issues;
}

export function createIdealFootSpaDemo() {
  const makeup = createExperimentalSource({
    id: 'demo.makeup',
    substance: 'mains-water',
    maxRate: 60,
  });
  const heat = createExperimentalSource({
    id: 'demo.heating',
    substance: 'lthw',
    maxRate: 10,
  });
  const mains = createExperimentalSource({
    id: 'demo.mains',
    substance: 'power-230v',
    outputs: 3,
  });
  const drain = createExperimentalSink({
    id: 'demo.drain',
    substance: 'dirty-water',
    maxRate: 60,
  });
  const heatSink = createExperimentalSink({
    id: 'demo.heatSink',
    substance: 'lthw',
    maxRate: 10,
  });
  let litres = 0;
  let celsius = 20;
  let fillOpen = false;
  let drainOpen = false;
  let powerOn = false;
  let setpoint = 34;
  let filling = false;
  let draining = false;
  let running = false;
  return {
    graph: idealFootSpaGraph,
    sources: { makeup, heat, mains },
    sinks: { drain, heatSink },
    get state() {
      return {
        litres,
        celsius,
        fillOpen,
        drainOpen,
        powerOn,
        setpoint,
        filling,
        draining,
        running,
        chlorine: 1.2,
        ph: 7.3,
      };
    },
    setFill: (on: boolean) => {
      fillOpen = on;
    },
    setDrain: (on: boolean) => {
      drainOpen = on;
    },
    setPower: (on: boolean) => {
      powerOn = on;
    },
    setSetpoint: (value: number) => {
      setpoint = Math.max(20, Math.min(40, value));
    },
    step(seconds: number) {
      const dt = Math.max(0, Math.min(seconds, 0.1)) * 20;
      if (!dt) return;
      const before = litres;
      const added = fillOpen
        ? makeup.draw(
            Math.min(
              (IDEAL_POOL.capacityLitres - litres) / 1000,
              (60 * dt) / 3600,
            ),
            dt,
          ) * 1000
        : 0;
      // Source quantities are cubic metres; the vessel readout is litres.
      const incoming = Math.min(IDEAL_POOL.capacityLitres - litres, added);
      if (incoming > 0)
        celsius =
          (celsius * litres + IDEAL_POOL.supplyC * incoming) /
          (litres + incoming);
      litres += incoming;
      const removed = drainOpen
        ? drain.accept(Math.min(litres / 1000, (60 * dt) / 3600), dt) * 1000
        : 0;
      litres -= removed;
      filling = litres > before && incoming > 0;
      draining = removed > 0;
      running = powerOn && litres >= 60 && mains.remaining() > 0;
      if (running && celsius < setpoint && heat.remaining() > 0) {
        const primary = heat.draw((10 * dt) / 3600, dt);
        heatSink.accept(primary, dt);
        celsius = Math.min(setpoint, celsius + 0.008 * dt);
      }
      celsius += (20 - celsius) * Math.min(1, dt * 0.0003);
    },
  };
}
