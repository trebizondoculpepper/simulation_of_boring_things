import { describe, expect, it } from 'vite-plus/test';
import {
  PLANT_EDGE,
  hall3PipeClashes,
  plumbHall3,
  portInHall,
} from './museum-3-layout';
import { FITTINGS, LINKS } from '../../../game/plant/museum-3-dosing';
import type { MachineId } from '../../../game/plant/museum-3-dosing';

const room = plumbHall3();

describe('Hall 3’s plant, laid out and plumbed', () => {
  it('routes every link of the schematic, and nothing else', () => {
    expect(room.problems).toEqual([]);
    expect(room.lines.map((l) => l.edge).sort()).toEqual(
      LINKS.map((l) => l.id).sort(),
    );
  });

  it('lays every pipe clear of every other', () => {
    expect(hall3PipeClashes(room)).toEqual([]);
  });

  it('starts and ends each pipe at its machines’ ports, and keeps off the visitors’ floor', () => {
    for (const l of LINKS) {
      const line = room.lines.find((x) => x.edge === l.id)!;
      expect(line.points[0], l.id).toEqual(
        portInHall(l.sourceId as MachineId, l.sourcePort).at,
      );
      expect(line.points.at(-1), l.id).toEqual(
        portInHall(l.targetId as MachineId, l.targetPort).at,
      );
      for (const p of line.points)
        expect(p[2], l.id).toBeLessThanOrEqual(PLANT_EDGE);
    }
  });

  it('sets every fitting on its line, each once, within reach', () => {
    expect(room.items.map((i) => i.id).sort()).toEqual(
      FITTINGS.map((f) => f.id).sort(),
    );
    for (const item of room.items) {
      expect(item.at[1], item.id).toBeLessThan(2.9);
      expect(item.at[1], item.id).toBeGreaterThan(0.1);
    }
  });
});
