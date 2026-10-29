import { describe, expect, it } from 'vite-plus/test';
import {
  DAY_TANK,
  PLANT_EDGE,
  PORTS,
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

  it('puts each day tank’s ports on fittings on the tank itself', () => {
    // The view draws a bulkhead from the wall out to `out` and a lance
    // through the lid up to `in` (the owner, 2026-10-29: the hose stopped
    // short of the tank), so each must be square to its face, on its axis.
    const { r, h, bund } = DAY_TANK;
    for (const id of ['hypoTank', 'acidTank'] as const) {
      const { in: inlet, out } = PORTS[id];
      expect(out.out).toEqual([1, 0, 0]);
      expect(out.at[0]).toBeGreaterThan(r);
      expect(out.at[0]).toBeLessThanOrEqual(r + 0.08);
      expect(out.at[1]).toBeGreaterThan(bund + 0.03);
      expect(out.at[1]).toBeLessThan(bund + h - 0.1);
      expect(out.at[2]).toBe(0);
      expect(inlet.out).toEqual([0, 1, 0]);
      expect([inlet.at[0], inlet.at[2]]).toEqual([0, 0]);
      expect(inlet.at[1]).toBeGreaterThan(bund + h);
    }
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
