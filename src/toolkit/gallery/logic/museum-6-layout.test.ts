import { describe, expect, it } from 'vite-plus/test';
import {
  INTERIOR,
  PLAQUE,
  READER,
  hall6PipeClashes,
  plumbHall6,
  portInHall,
  standOf,
} from './museum-6-layout';
import { hallColumns } from './museum-plan';
import { sightBlockers } from './sight-lines';
import { FITTINGS, LINKS, PUMPS } from '../../../game/plant/museum-6-pumps';
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

describe('Hall 6’s plaques, seen from the visitors’ walkway', () => {
  it('shows every plaque’s face clear of the columns and the pipes', () => {
    const pipes = room.lines.map((l) => ({
      name: l.edge,
      od: l.od,
      points: l.points,
    }));
    const columns = hallColumns('museum6').map((c, k) => ({
      name: `column ${k}`,
      min: [c.x - 0.3, 0, c.z - 0.3] as const,
      max: [c.x + 0.3, 6, c.z + 0.3] as const,
    }));
    const blocked: string[] = [];
    for (const p of PUMPS) {
      const s = standOf(p.no);
      // Straight on and from either side; to the plaque's middle and both edges.
      for (const dz of [-0.6, 0, 0.6])
        for (const edge of [-0.25, 0, 0.25]) {
          const hit = sightBlockers(
            [s.x - READER.back, READER.eye, s.z + dz],
            [s.x - 0.02, PLAQUE.y, s.z + edge],
            pipes,
            columns,
          );
          if (hit.length)
            blocked.push(`P${p.no} (${dz}, ${edge}): ${hit.join(', ')}`);
        }
    }
    expect(blocked).toEqual([]);
  });
});
