import { describe, expect, it } from 'vite-plus/test';
import { SUBSTANCES } from '../../../game/plant/experimental-source';
import type { Substance } from '../../../game/plant/experimental-source';
import { pipeClashes } from '../../components/core/logic/pipe-route';
import { WALKWAY_CLEAR, plumbSourceSinkRoom } from './source-sink-plumbing';

const ALL = Object.keys(SUBSTANCES) as Substance[];

describe('the source-to-sink room, plumbed', () => {
  const plumbed = plumbSourceSinkRoom(ALL);

  it('joins every source to its sink', () => {
    expect(plumbed.problems).toEqual([]);
    expect(plumbed.lines).toHaveLength(ALL.length);
  });

  it('sets a fitting into each end of every line, all closed', () => {
    for (const line of plumbed.lines) {
      const on = plumbed.fittings.filter((f) => f.edge === line.edge);
      expect(on).toHaveLength(2);
      expect(on.every((f) => f.normally === 'closed')).toBe(true);
      expect(on.map((f) => f.kind)).toEqual(
        line.medium === 'power'
          ? ['power-isolator', 'power-isolator']
          : ['isolating-valve', 'isolating-valve'],
      );
    }
  });

  it('puts the fittings in the expanded graph, between source and sink', () => {
    const { edges } = plumbed.expansion;
    const water = edges.filter((e) => e.id.startsWith('mains-water.line'));
    expect(water.map((e) => [e.sourceId, e.targetId])).toEqual([
      ['exp.mains-water', 'exp.mains-water.out-1.iso'],
      ['exp.mains-water.out-1.iso', 'sink.mains-water.in-1.iso'],
      ['sink.mains-water.in-1.iso', 'sink.mains-water'],
    ]);
  });

  it('keeps the walkway clear and never puts a pipe through another', () => {
    const { walkway } = plumbed;
    for (const line of plumbed.lines)
      for (const p of line.points) {
        const inside =
          p[2] > walkway.min[2] + 0.01 &&
          p[2] < walkway.max[2] - 0.01 &&
          p[1] < WALKWAY_CLEAR - 0.01;
        expect(inside).toBe(false);
      }
    expect(
      pipeClashes(
        plumbed.lines.map((l) => ({
          name: l.edge,
          points: l.points,
          od: l.od,
          joint: l.joint,
        })),
      ),
    ).toEqual([]);
  });
});
