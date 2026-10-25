import { createGraph, getGraphIssues } from '@statelyai/graph';
import { demoGraph } from './port-graph-demo';
import type { Expansion } from './plumbing-expansion';

/**
 * Dev19's graph as the plumber leaves it (`doc/prompts/done/018-plumber-valves-and-isolators.md`,
 * "The bound room"): the designed plan's nodes, the fittings the plumber
 * installed as nodes of their own, each with an `in` and an `out` port in
 * its line's medium, and every link they sit on split through them. The
 * simulation runs on this graph. Built fresh from the plan each time; the
 * plan itself is never edited. Pure.
 */
/** A plumbed graph node's data: the plan's, or a fitting's. */
export interface PlumbedNodeData {
  kind: string;
  room: string;
  brand: string | null;
  visible: boolean;
  ratings?: unknown;
  /** A fitting's: the node it serves, and the base link it sits on. */
  serves?: string;
  link?: string;
}
type PlumbedPortData = { medium: string; required: boolean } & Record<
  string,
  unknown
>;
interface PlumbedNode {
  id: string;
  data: PlumbedNodeData;
  ports?: { name: string; direction: 'in' | 'out'; data: PlumbedPortData }[];
}

export function plumbedDemoGraph(
  expansion: Expansion,
  base: typeof demoGraph = demoGraph,
) {
  const fittingNodes: PlumbedNode[] = expansion.fittings.map((f) => ({
    id: f.id,
    data: {
      kind: f.kind,
      room: 'dev19',
      brand: 'trial',
      visible: true,
      serves: f.serves,
      link: f.edge,
    },
    ports: (['in', 'out'] as const).map((name) => ({
      name,
      direction: name,
      data: { medium: f.medium, required: true },
    })),
  }));
  const graph = createGraph({
    nodes: [
      ...base.nodes.map((n): PlumbedNode => ({
        id: n.id,
        data: n.data,
        ports: n.ports?.map((p) => ({
          name: p.name,
          direction: p.direction as 'in' | 'out',
          data: { ...p.data },
        })),
      })),
      ...fittingNodes,
      // Headers after ports several links share.
      ...expansion.headers.map((h): PlumbedNode => ({
        id: h.id,
        data: {
          kind: 'header',
          room: 'dev19',
          brand: 'trial',
          visible: true,
          serves: h.serves,
        },
        ports: (['in', 'out'] as const).map((name) => ({
          name,
          direction: name,
          data: { medium: h.medium, required: true },
        })),
      })),
    ],
    edges: [
      // Links with no fittings keep their own; split ones go through them.
      ...base.edges.filter((e) => !expansion.along.has(e.id)),
      ...expansion.edges
        .filter((e) => e.id.includes('#'))
        .map((e) => ({
          id: e.id,
          sourceId: e.sourceId,
          sourcePort: e.sourcePort,
          targetId: e.targetId,
          targetPort: e.targetPort,
        })),
    ],
  });
  return graph;
}

/** What is wrong with a plumbed graph, as `@statelyai/graph` sees it. */
export function plumbedGraphIssues(graph: ReturnType<typeof plumbedDemoGraph>) {
  return getGraphIssues(graph).map((issue) => JSON.stringify(issue));
}
