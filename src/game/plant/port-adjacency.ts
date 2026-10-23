/** Weighted physical coupling between visual machines in a port graph. */
export function physicalAdjacencyMatrix(
  graph: {
    nodes: readonly {
      id: string;
      ports?: readonly { name: string; data: { medium: string } }[];
    }[];
    edges: readonly {
      sourceId: string;
      sourcePort?: string;
      targetId: string;
    }[];
  },
  ids: readonly string[],
  weights: Readonly<Record<string, number>> = { gas: 1, water: 1, power: 0.25 },
): number[][] {
  const matrix = ids.map(() => ids.map(() => 0));
  const index = new Map(ids.map((id, i) => [id, i]));
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  for (const edge of graph.edges) {
    const a = index.get(edge.sourceId);
    const b = index.get(edge.targetId);
    if (a === undefined || b === undefined || a === b) continue;
    const medium = nodes
      .get(edge.sourceId)
      ?.ports?.find((port) => port.name === edge.sourcePort)?.data.medium;
    const weight = medium ? (weights[medium] ?? 0) : 0;
    matrix[a][b] += weight;
    matrix[b][a] += weight;
  }
  return matrix;
}

export function adjacencyLinks(
  matrix: readonly (readonly number[])[],
): [number, number, number][] {
  return matrix.flatMap((row, a) =>
    row.flatMap((weight, b) =>
      b > a && weight > 0 ? [[a, b, weight] as [number, number, number]] : [],
    ),
  );
}
