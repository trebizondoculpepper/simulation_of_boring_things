import { describe, expect, it } from 'vite-plus/test';
import {
  VISITOR_FLOOR,
  plantPipeClashes,
  plumbIdealPlantRoom,
  portInRoom,
} from './ideal-pool-plant-layout';
import {
  FITTINGS,
  INSTRUMENTS,
  LINKS,
} from '../../../game/plant/ideal-pool-plant';
import type { MachineId } from '../../../game/plant/ideal-pool-plant';

const room = plumbIdealPlantRoom();

describe('dev51, the ideal pool plant’s room', () => {
  it('routes every link of the schematic, and nothing else', () => {
    expect(room.problems).toEqual([]);
    expect(room.lines.map((l) => l.edge).sort()).toEqual(
      LINKS.map((l) => l.id).sort(),
    );
  });

  it('lays every pipe clear of every other', () => {
    expect(plantPipeClashes(room)).toEqual([]);
  });

  it('starts and ends each pipe at its machines’ ports', () => {
    for (const l of LINKS) {
      const line = room.lines.find((x) => x.edge === l.id)!;
      const from = portInRoom(l.sourceId as MachineId, l.sourcePort).at;
      const to = portInRoom(l.targetId as MachineId, l.targetPort).at;
      expect(line.points[0], l.id).toEqual(from);
      expect(line.points.at(-1), l.id).toEqual(to);
    }
  });

  it('lets the overflow fall all the way, by gravity', () => {
    const points = room.lines.find((l) => l.edge === 'overflow')!.points;
    for (let k = 1; k < points.length; k++)
      expect(points[k][1]).toBeLessThanOrEqual(points[k - 1][1] + 1e-9);
  });

  it('keeps the visitors’ floor clear below head height', () => {
    for (const l of room.lines)
      for (const p of l.points) {
        const over =
          p[0] > VISITOR_FLOOR.minX + 0.2 &&
          p[0] < VISITOR_FLOOR.maxX &&
          p[2] > VISITOR_FLOOR.minZ + 0.2 &&
          p[2] < VISITOR_FLOOR.maxZ;
        if (over) expect(p[1], l.edge).toBeGreaterThan(VISITOR_FLOOR.clear);
      }
  });

  it('sets every fitting and thermometer on its line, each once, within a visitor’s reach', () => {
    const ids = room.items.map((i) => i.id).sort();
    const wanted = [
      ...FITTINGS.map((f) => f.id),
      ...INSTRUMENTS.filter(
        (i) => i.kind === 'temperature' || i.kind === 'sight-glass',
      ).map((i) => i.id),
    ].sort();
    expect(ids).toEqual(wanted);
    for (const item of room.items) {
      expect(item.at[1], item.id).toBeLessThan(2.2);
      expect(item.at[1], item.id).toBeGreaterThan(0.3);
    }
  });

  it('sets the variable-area meters in rising pipes, as they must be', () => {
    for (const f of FITTINGS.filter((f) => f.meter === 'variable-area')) {
      const item = room.items.find((i) => i.id === f.id)!;
      expect(item.along, f.id).toEqual([0, 1, 0]);
    }
  });
});

describe('cutting a gap for an instrument', () => {
  it('leaves the lengths either side, the gap where it was asked', async () => {
    const { cutLine, distanceAlong } =
      await import('./ideal-pool-plant-layout');
    const points = [
      [0, 0, 0],
      [0, 2, 0],
      [2, 2, 0],
    ] as const;
    const [a, b] = cutLine(points, 1, 1.5);
    expect(a).toEqual([
      [0, 0, 0],
      [0, 1, 0],
    ]);
    expect(b).toEqual([
      [0, 1.5, 0],
      [0, 2, 0],
      [2, 2, 0],
    ]);
    expect(distanceAlong(points, [1, 2, 0])).toBeCloseTo(3, 9);
  });
});
