import { describe, expect, it } from 'vite-plus/test';
import {
  CHEM_EDGE,
  CROSSING,
  OVERHEAD,
  PLANT_EDGE,
  fitsHall,
  hall9PipeClashes,
  plumbHall9,
  portInHall,
} from './museum-9-layout';
import { FITTINGS, LINKS } from '../../../game/plant/museum-9-plant';
import type { MachineId } from '../../../game/plant/museum-9-plant';

const room = plumbHall9();

describe('Hall 9’s plant, laid out and plumbed', () => {
  it('fits the 24 × 14 m hall, its machines clear of each other and its walls', () => {
    expect(fitsHall()).toBe(true);
  });

  it('routes every link of the schematic, and nothing else', () => {
    expect(room.problems).toEqual([]);
    expect(room.lines.map((l) => l.edge).sort()).toEqual(
      LINKS.map((l) => l.id).sort(),
    );
  });

  it('lays every pipe clear of every other', () => {
    expect(hall9PipeClashes(room)).toEqual([]);
  });

  it('starts and ends each pipe at its ports, crossing the visitors’ floor only overhead', () => {
    for (const l of LINKS) {
      const line = room.lines.find((x) => x.edge === l.id)!;
      expect(line.points[0], l.id).toEqual(
        portInHall(l.sourceId as MachineId, l.sourcePort).at,
      );
      expect(line.points.at(-1), l.id).toEqual(
        portInHall(l.targetId as MachineId, l.targetPort).at,
      );
      for (const p of line.points)
        if (p[2] > PLANT_EDGE + 0.01 && p[2] < CHEM_EDGE - 0.01) {
          expect(p[1], l.id).toBeGreaterThanOrEqual(OVERHEAD - 0.2);
          expect(p[0], l.id).toBeGreaterThanOrEqual(CROSSING.minX - 0.2);
          expect(p[0], l.id).toBeLessThanOrEqual(CROSSING.maxX + 0.2);
        }
    }
  });

  it('keeps its pipework short: under 180 m in all, no more than 35 m over the visitors’ floor (196 m and 50 m before the owner’s report)', () => {
    let total = 0;
    let over = 0;
    for (const l of room.lines)
      for (let k = 1; k < l.points.length; k++) {
        const a = l.points[k - 1];
        const b = l.points[k];
        const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
        total += d;
        const z = (a[2] + b[2]) / 2;
        if (z > PLANT_EDGE + 0.05 && z < CHEM_EDGE - 0.05) over += d;
      }
    expect(total).toBeLessThan(180);
    expect(over).toBeLessThan(35);
  });

  it('sets every fitting on its line, each once', () => {
    expect(room.items.map((i) => i.id).sort()).toEqual(
      FITTINGS.map((f) => f.id).sort(),
    );
  });
});
