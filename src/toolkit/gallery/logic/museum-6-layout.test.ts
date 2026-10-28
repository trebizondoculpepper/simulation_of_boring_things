import { describe, expect, it } from 'vite-plus/test';
import {
  INTERIOR,
  hall6PipeClashes,
  plumbHall6,
  portInHall,
} from './museum-6-layout';
import { FITTINGS, LINKS } from '../../../game/plant/museum-6-pumps';
import type { MachineId } from '../../../game/plant/museum-6-pumps';

const room = plumbHall6();

describe('Hall 6’s plant, laid out and plumbed', () => {
  it('routes every link, and nothing else', () => {
    expect(room.problems).toEqual([]);
    expect(room.lines.map((l) => l.edge).sort()).toEqual(
      LINKS.map((l) => l.id).sort(),
    );
  });

  it('lays every pipe clear of every other', () => {
    expect(hall6PipeClashes(room)).toEqual([]);
  });

  it('joins each pipe to its machines’ ports, inside the hall', () => {
    for (const l of LINKS) {
      const line = room.lines.find((x) => x.edge === l.id)!;
      expect(line.points[0], l.id).toEqual(
        portInHall(l.sourceId as MachineId, l.sourcePort).at,
      );
      expect(line.points.at(-1), l.id).toEqual(
        portInHall(l.targetId as MachineId, l.targetPort).at,
      );
      for (const p of line.points) {
        expect(p[0]).toBeGreaterThan(INTERIOR.minX);
        expect(p[0]).toBeLessThan(INTERIOR.maxX);
        expect(p[2]).toBeGreaterThan(INTERIOR.minZ);
        expect(p[2]).toBeLessThan(INTERIOR.maxZ);
      }
    }
  });

  it('sets every fitting on its line, each once (the plumber adds nothing)', () => {
    expect(room.expansion.added).toEqual([]);
    expect(room.items.map((i) => i.id).sort()).toEqual(
      FITTINGS.map((f) => f.id).sort(),
    );
  });
});
