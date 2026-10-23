import { describe, expect, it } from 'vite-plus/test';
import { idealFootSpaGraph } from '../../../../game/plant/ideal-pool';
import { EXHIBITS, IDEAL_PHYSICAL_ROUTES } from './ideal-foot-spa';
import { choosePipe, runLength } from '../../../components/core/logic/plumber';
import { pipeClashes } from '../../../components/core/logic/pipe-route';
import { PIPE_KINDS } from '../../../components/core/views/pipe-kinds';

describe('ideal foot spa visual binding', () => {
  it('has exactly one visible exhibit for every graph node', () => {
    const visualIds = EXHIBITS.map((item) => item.graphNodeId);
    expect(visualIds.every(Boolean)).toBe(true);
    expect(new Set(visualIds).size).toBe(visualIds.length);
    expect(visualIds.sort((a, b) => (a ?? '').localeCompare(b ?? ''))).toEqual(
      idealFootSpaGraph.nodes
        .map((node) => node.id)
        .sort((a, b) => a.localeCompare(b)),
    );
  });

  it('draws each physical graph edge once', () => {
    const nodes = new Map(
      idealFootSpaGraph.nodes.map((node) => [node.id, node]),
    );
    const physical = idealFootSpaGraph.edges.filter(
      (edge) =>
        nodes.get(edge.sourceId)?.ports?.find((p) => p.name === edge.sourcePort)
          ?.data.medium !== 'control',
    );
    expect(
      IDEAL_PHYSICAL_ROUTES.map((route) => route.edge).sort((a, b) =>
        a.localeCompare(b),
      ),
    ).toEqual(
      physical.map((edge) => edge.id).sort((a, b) => a.localeCompare(b)),
    );
  });

  it('keeps its physical lines clear of each other', () => {
    const runs = IDEAL_PHYSICAL_ROUTES.map((route) => {
      const choice = choosePipe({
        ...route.request,
        length: runLength(route.points),
      });
      const kind = PIPE_KINDS[choice.kind];
      return {
        name: route.edge,
        od: choice.od,
        points: route.points,
        joint: kind.joint,
        bend: kind.bend,
        lengths: kind.lengths,
        insulation: kind.insulation?.thickness,
      };
    });
    const clashes = pipeClashes(runs);
    expect(
      clashes.map(
        (item) =>
          `${item.run}/${item.other}: ${item.what} at ${item.at.map((n) => n.toFixed(2)).join(',')}`,
      ),
    ).toEqual([]);
  });
});
