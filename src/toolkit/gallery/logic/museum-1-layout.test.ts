import { describe, expect, it } from 'vite-plus/test';
import {
  PLANT_EDGE,
  ROOF,
  hall1PipeClashes,
  plumbHall1,
  portInHall,
} from './museum-1-layout';
import {
  FITTINGS,
  INSTRUMENTS,
  LINKS,
} from '../../../game/plant/museum-1-heating';
import type { MachineId } from '../../../game/plant/museum-1-heating';

const room = plumbHall1();

describe('Hall 1’s plant, laid out and plumbed', () => {
  it('routes every link of the schematic, and nothing else', () => {
    expect(room.problems).toEqual([]);
    expect(room.lines.map((l) => l.edge).sort()).toEqual(
      LINKS.map((l) => l.id).sort(),
    );
  });

  it('lays every pipe clear of every other', () => {
    expect(hall1PipeClashes(room)).toEqual([]);
  });

  it('starts and ends each pipe at its machines’ ports', () => {
    for (const l of LINKS) {
      const line = room.lines.find((x) => x.edge === l.id)!;
      expect(line.points[0], l.id).toEqual(
        portInHall(l.sourceId as MachineId, l.sourcePort).at,
      );
      expect(line.points.at(-1), l.id).toEqual(
        portInHall(l.targetId as MachineId, l.targetPort).at,
      );
    }
  });

  it('keeps every pipe off the visitors’ floor, and the flue straight up to the roof', () => {
    for (const l of room.lines)
      for (const p of l.points)
        expect(p[0], l.edge).toBeLessThanOrEqual(PLANT_EDGE);
    const flue = room.lines.find((l) => l.edge === 'flue')!.points;
    expect(flue.length).toBe(2);
    expect(flue[0][0]).toBe(flue[1][0]);
    expect(flue[0][2]).toBe(flue[1][2]);
    expect(flue[1][1]).toBe(ROOF);
  });

  it('sets every fitting and line instrument on its line, each once, within reach', () => {
    const ids = room.items.map((i) => i.id).sort();
    const wanted = [
      ...FITTINGS.map((f) => f.id),
      ...INSTRUMENTS.filter((i) => i.edge).map((i) => i.id),
    ].sort();
    expect(ids).toEqual(wanted);
    for (const item of room.items) {
      expect(item.at[1], item.id).toBeLessThan(2.6);
      expect(item.at[1], item.id).toBeGreaterThan(0.3);
    }
  });
});
