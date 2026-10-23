import { createGraph, getGraphIssues } from '@statelyai/graph';
import { demoGraph, demoVisualBindings } from './port-graph-demo';
import type { DemoKind } from './port-graph-demo';

/**
 * Variants of Dev19's plant, for trying the room's layers on different
 * contents (the owner, 2026-10-23): the same plan with more of a machine,
 * in parallel. Dev19d has three sand filters, each fed by the pool pump
 * and feeding the treatment cabinet, as the first filter is. The base plan
 * (`port-graph-demo.ts`) is not changed. Pure.
 */

export interface DemoModel {
  name: string;
  graph: typeof demoGraph;
  bindings: readonly { nodeId: string; kind: DemoKind }[];
}

export const BASE_MODEL: DemoModel = {
  name: 'dev19',
  graph: demoGraph,
  bindings: demoVisualBindings,
};

/** Dev19 with `filters` sand filters in parallel. */
export function withFilters(
  filters: number,
  name = `dev19, ${filters} filters`,
): DemoModel {
  const first = demoGraph.nodes.find((n) => n.id === 'demo.filter')!;
  const extra = Array.from(
    { length: filters - 1 },
    (_, k) => `demo.filter${k + 2}`,
  );
  const graph = createGraph({
    nodes: [
      ...demoGraph.nodes.map((n) => ({
        id: n.id,
        data: n.data,
        ports: n.ports?.map((p) => ({ ...p })),
      })),
      ...extra.map((id) => ({
        id,
        data: first.data,
        ports: first.ports?.map((p) => ({ ...p })),
      })),
    ],
    edges: [
      ...demoGraph.edges.map((e) => ({ ...e })),
      ...extra.flatMap((id) => [
        {
          id: `pool-pump-to-${id.slice(5)}`,
          sourceId: 'demo.poolPump',
          sourcePort: 'discharge',
          targetId: id,
          targetPort: 'in',
        },
        {
          id: `${id.slice(5)}-to-treatment`,
          sourceId: id,
          sourcePort: 'out',
          targetId: 'demo.treatment',
          targetPort: 'in',
        },
      ]),
    ],
  }) as unknown as typeof demoGraph;
  const at = demoVisualBindings.findIndex((b) => b.nodeId === 'demo.filter');
  const bindings = [
    ...demoVisualBindings.slice(0, at + 1),
    ...extra.map((nodeId) => ({ nodeId, kind: 'sand-filter' as const })),
    ...demoVisualBindings.slice(at + 1),
  ];
  return { name, graph, bindings };
}

/** Dev19d: three sand filters. */
export const DEV19D_MODEL = withFilters(3, 'dev19d');

/** What is wrong with a variant's graph, as `@statelyai/graph` sees it. */
export const variantIssues = (model: DemoModel) =>
  getGraphIssues(model.graph).map((issue) => issue.message);
