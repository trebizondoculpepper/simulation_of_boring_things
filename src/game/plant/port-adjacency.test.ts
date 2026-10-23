import { describe, expect, it } from 'vite-plus/test';
import { demoGraph, demoVisualBindings } from './port-graph-demo';
import { adjacencyLinks, physicalAdjacencyMatrix } from './port-adjacency';

describe('physical port adjacency', () => {
  it('sums typed physical links, excludes controls, and stays symmetric', () => {
    const ids = demoVisualBindings.map((binding) => binding.nodeId);
    const matrix = physicalAdjacencyMatrix(demoGraph, ids);
    expect(matrix).toHaveLength(ids.length);
    for (let a = 0; a < ids.length; a++) {
      expect(matrix[a][a]).toBe(0);
      for (let b = 0; b < ids.length; b++)
        expect(matrix[a][b]).toBe(matrix[b][a]);
    }
    const gasMain = ids.indexOf('demo.gasMain');
    const gasMeter = ids.indexOf('demo.gasMeter');
    const pool = ids.indexOf('demo.pool');
    const poolMimic = ids.indexOf('demo.poolMimic');
    expect(matrix[gasMain][gasMeter]).toBe(1);
    expect(matrix[pool][poolMimic]).toBe(0);
    expect(adjacencyLinks(matrix).length).toBeGreaterThan(20);
  });
});
