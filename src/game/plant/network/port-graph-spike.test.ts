import {
  addNode,
  createGraph,
  getEdgesByPort,
  getGraphIssues,
  updateEdge,
} from '@statelyai/graph';
import type { Graph, GraphNode, PortDirection } from '@statelyai/graph';
import { describe, expect, it } from 'vite-plus/test';
import { PLANT_NETWORK } from './plant-network';
import { splitEnd } from './types';

// This trial is deliberately separate from the running hydraulic model.
// It checks whether the library can hold our installed plant and express the
// stricter port contract before we change the production representation.
type Medium =
  | 'pool-water'
  | 'hydrochloric-acid'
  | 'sodium-hypochlorite'
  | 'natural-gas'
  | 'flue-gas'
  | 'fresh-water'
  | 'waste-water'
  | 'ac-400v'
  | 'dc-24v';
type Rating = { value: number; unit: 'm3' | 'm3/h' | 'g/h' | 'A' };
type MachineData = {
  room: string;
  machineType: string;
  brand: string | null;
  capacity?: Rating;
};
type PortData = { medium: Medium; required: boolean; rating?: Rating };
type Circuit = Graph<MachineData, null, null, PortData>;
type PortSpec = {
  name: string;
  direction: PortDirection;
  data: PortData;
};

const machineKinds: Record<string, readonly PortSpec[]> = {
  tank: [
    {
      name: 'outlet',
      direction: 'out',
      data: {
        medium: 'pool-water',
        required: true,
        rating: { value: 90, unit: 'm3/h' },
      },
    },
  ],
  pump: [
    {
      name: 'suction',
      direction: 'in',
      data: {
        medium: 'pool-water',
        required: true,
        rating: { value: 90, unit: 'm3/h' },
      },
    },
    {
      name: 'discharge',
      direction: 'out',
      data: {
        medium: 'pool-water',
        required: true,
        rating: { value: 90, unit: 'm3/h' },
      },
    },
    {
      name: 'power',
      direction: 'in',
      data: {
        medium: 'ac-400v',
        required: true,
        rating: { value: 30, unit: 'A' },
      },
    },
  ],
  filter: [
    {
      name: 'inlet',
      direction: 'in',
      data: { medium: 'pool-water', required: true },
    },
  ],
  supply: [
    {
      name: 'output',
      direction: 'out',
      data: { medium: 'ac-400v', required: true },
    },
  ],
  acidTank: [
    {
      name: 'outlet',
      direction: 'out',
      data: {
        medium: 'hydrochloric-acid',
        required: true,
        rating: { value: 30, unit: 'g/h' },
      },
    },
  ],
  gasMain: [
    {
      name: 'outlet',
      direction: 'out',
      data: { medium: 'natural-gas', required: true },
    },
  ],
  boiler: [
    {
      name: 'fuel',
      direction: 'in',
      data: { medium: 'natural-gas', required: true },
    },
    {
      name: 'exhaust',
      direction: 'out',
      data: { medium: 'flue-gas', required: true },
    },
  ],
  stack: [
    {
      name: 'inlet',
      direction: 'in',
      data: { medium: 'flue-gas', required: true },
    },
  ],
  freshMain: [
    {
      name: 'outlet',
      direction: 'out',
      data: { medium: 'fresh-water', required: true },
    },
  ],
  fixture: [
    {
      name: 'inlet',
      direction: 'in',
      data: { medium: 'fresh-water', required: true },
    },
    {
      name: 'drain',
      direction: 'out',
      data: { medium: 'waste-water', required: true },
    },
  ],
  sewer: [
    {
      name: 'inlet',
      direction: 'in',
      data: { medium: 'waste-water', required: true },
    },
  ],
};

function install(
  id: string,
  machineType: keyof typeof machineKinds,
  room: string,
  brand: string | null,
  capacity?: Rating,
) {
  return {
    id,
    data: { room, machineType, brand, capacity },
    ports: machineKinds[machineType].map((port) => ({ ...port })),
  };
}

function wiringProblems(graph: Circuit): string[] {
  const problems = getGraphIssues(graph).map((issue) => issue.message);
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const port = (node: GraphNode<MachineData, PortData>, name: string) =>
    node.ports?.find((candidate) => candidate.name === name);
  for (const edge of graph.edges) {
    const source = byId.get(edge.sourceId);
    const target = byId.get(edge.targetId);
    const from = source && edge.sourcePort && port(source, edge.sourcePort);
    const to = target && edge.targetPort && port(target, edge.targetPort);
    if (!from || !to) continue; // Reported by getGraphIssues.
    if (from.direction === 'in' || to.direction === 'out')
      problems.push(`${edge.id}: wrong port direction`);
    if (from.data.medium !== to.data.medium)
      problems.push(
        `${edge.id}: ${from.data.medium} cannot feed ${to.data.medium}`,
      );
  }
  for (const node of graph.nodes)
    for (const candidate of node.ports ?? [])
      if (
        candidate.data.required &&
        getEdgesByPort(graph, node.id, candidate.name).length === 0
      )
        problems.push(`${node.id}.${candidate.name} is unconnected`);
  return problems;
}

const circuit = () =>
  createGraph<MachineData, null, null, PortData>({
    nodes: [
      install('pl1.t1', 'tank', 'plant_pool_01', null, {
        value: 45,
        unit: 'm3',
      }),
      install('pl1.p1', 'pump', 'plant_pool_01', 'Voltara', {
        value: 90,
        unit: 'm3/h',
      }),
      install('pl1.f1', 'filter', 'plant_pool_01', 'Lidoluxe'),
      install('sr.db1', 'supply', 'switch_room', 'Voltara'),
    ],
    edges: [
      {
        id: 'water-in',
        sourceId: 'pl1.t1',
        sourcePort: 'outlet',
        targetId: 'pl1.p1',
        targetPort: 'suction',
      },
      {
        id: 'water-out',
        sourceId: 'pl1.p1',
        sourcePort: 'discharge',
        targetId: 'pl1.f1',
        targetPort: 'inlet',
      },
      {
        id: 'power',
        sourceId: 'sr.db1',
        sourcePort: 'output',
        targetId: 'pl1.p1',
        targetPort: 'power',
      },
    ],
  });

describe('@statelyai/graph plant feasibility trial', () => {
  it('holds the existing plant network with its explicit port endpoints', () => {
    const graph = createGraph({
      nodes: PLANT_NETWORK.nodes.map((node) => ({
        id: node.id,
        data: { room: node.room ?? null, kind: node.kind, serial: node.serial },
        // The current network knows service but not direction; do not invent it.
        ports: Object.entries(node.ports).map(([name, service]) => ({
          name,
          direction: 'inout' as const,
          data: { service },
        })),
      })),
      edges: PLANT_NETWORK.links.map((link) => {
        const from = splitEnd(link.from);
        const to = splitEnd(link.to);
        return {
          id: link.id,
          sourceId: from.node,
          sourcePort: from.port,
          targetId: to.node,
          targetPort: to.port,
          data: { service: link.service },
        };
      }),
    });
    expect(getGraphIssues(graph)).toEqual([]);
    expect(graph.nodes).toHaveLength(PLANT_NETWORK.nodes.length);
    expect(graph.edges).toHaveLength(PLANT_NETWORK.links.length);
    expect(
      graph.nodes.filter((node) => node.data.room === 'plant_pool_02').length,
    ).toBeGreaterThan(0);
    expect(getEdgesByPort(graph, 'pl1.p1', 'suction')).toHaveLength(1);
  });

  it('derives typed ports from machine kind and preserves room, brand, and ratings', () => {
    const graph = circuit();
    expect(wiringProblems(graph)).toEqual([]);
    expect(
      graph.nodes.find((node) => node.id === 'pl1.p1')?.ports,
    ).toHaveLength(3);
    expect(
      graph.nodes.find((node) => node.id === 'pl1.p1')?.data,
    ).toMatchObject({
      room: 'plant_pool_01',
      machineType: 'pump',
      brand: 'Voltara',
      capacity: { value: 90, unit: 'm3/h' },
    });
    expect(
      graph.nodes
        .find((node) => node.id === 'pl1.p1')
        ?.ports?.find((p) => p.name === 'power')?.data.rating,
    ).toEqual({ value: 30, unit: 'A' });
  });

  it('needs our domain rules to reject wrong media, direction, and unconnected ports', () => {
    const graph = circuit();
    addNode(graph, install('as.t1', 'acidTank', 'acid_store', null));
    updateEdge(graph, 'water-in', { sourceId: 'as.t1' });
    // The library checks references, but not our chemical or flow semantics.
    expect(getGraphIssues(graph)).toEqual([]);
    expect(wiringProblems(graph)).toContain(
      'water-in: hydrochloric-acid cannot feed pool-water',
    );
    expect(wiringProblems(graph)).toContain('pl1.t1.outlet is unconnected');
    updateEdge(graph, 'water-in', {
      sourceId: 'pl1.p1',
      sourcePort: 'suction',
    });
    expect(wiringProblems(graph)).toContain('water-in: wrong port direction');
  });

  it('represents external supplies and sinks as boundary nodes with typed ports', () => {
    const graph = createGraph<MachineData, null, null, PortData>({
      nodes: [
        install('site.gas', 'gasMain', 'outside', null),
        install('pl1.boiler', 'boiler', 'boiler_room', 'Voltara'),
        install('site.stack', 'stack', 'outside', null),
        install('site.fresh', 'freshMain', 'outside', null),
        install('pl1.fixture', 'fixture', 'plant_pool_01', null),
        install('site.sewer', 'sewer', 'outside', null),
      ],
      edges: [
        {
          id: 'gas',
          sourceId: 'site.gas',
          sourcePort: 'outlet',
          targetId: 'pl1.boiler',
          targetPort: 'fuel',
        },
        {
          id: 'flue',
          sourceId: 'pl1.boiler',
          sourcePort: 'exhaust',
          targetId: 'site.stack',
          targetPort: 'inlet',
        },
        {
          id: 'fresh',
          sourceId: 'site.fresh',
          sourcePort: 'outlet',
          targetId: 'pl1.fixture',
          targetPort: 'inlet',
        },
        {
          id: 'waste',
          sourceId: 'pl1.fixture',
          sourcePort: 'drain',
          targetId: 'site.sewer',
          targetPort: 'inlet',
        },
      ],
    });
    expect(wiringProblems(graph)).toEqual([]);
    expect(
      graph.nodes.filter((node) => node.data.room === 'outside'),
    ).toHaveLength(4);
  });
});
