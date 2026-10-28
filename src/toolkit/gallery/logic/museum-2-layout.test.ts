import { describe, expect, it } from 'vite-plus/test';
import {
  HALL_NEEDED,
  PLACES,
  PLANT_EDGE,
  PLANT_LENGTH,
  POINTS,
  ROOM,
  boxInHall,
  hall2PipeClashes,
  plumbHall2,
  portInHall,
  sizerEstimate,
} from './museum-2-layout';
import {
  FITTINGS,
  INSTRUMENTS,
  LINKS,
  NODES,
} from '../../../game/plant/museum-2-clean-water';
import type { MachineId } from '../../../game/plant/museum-2-clean-water';

const room = plumbHall2();

describe('Hall 2’s plant, laid out and plumbed', () => {
  it('routes every link of the schematic, and nothing else', () => {
    expect(room.problems).toEqual([]);
    expect(room.lines.map((l) => l.edge).sort()).toEqual(
      LINKS.map((l) => l.id).sort(),
    );
  });

  it('adds no fitting the schematic did not give', () => {
    expect(room.expansion.added).toEqual([]);
  });

  it('lays every pipe clear of every other', () => {
    expect(hall2PipeClashes(room)).toEqual([]);
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

  it('keeps every pipe and machine off the visitors’ floor and inside the hall', () => {
    for (const l of room.lines)
      for (const p of l.points) {
        expect(p[0], l.edge).toBeLessThanOrEqual(PLANT_EDGE);
        expect(Math.abs(p[2]), l.edge).toBeLessThan(ROOM.halfZ);
        expect(p[1], l.edge).toBeLessThan(ROOM.height);
      }
    for (const n of NODES) {
      const b = boxInHall(n.id);
      expect(b.max[0], n.id).toBeLessThanOrEqual(PLANT_EDGE);
      expect(b.min[0], n.id).toBeGreaterThanOrEqual(-ROOM.halfX);
      expect(Math.abs(b.min[2]), n.id).toBeLessThanOrEqual(ROOM.halfZ);
      expect(Math.abs(b.max[2]), n.id).toBeLessThanOrEqual(ROOM.halfZ);
    }
  });

  it('stands no machine inside another', () => {
    const solid = NODES.map((n) => n.id).filter(
      (id) => !POINTS.includes(id) && id !== 'destructor',
    );
    for (let i = 0; i < solid.length; i++)
      for (let j = i + 1; j < solid.length; j++) {
        const a = boxInHall(solid[i]);
        const b = boxInHall(solid[j]);
        const overlap = [0, 1, 2].every(
          (k) => a.min[k] < b.max[k] - 1e-6 && b.min[k] < a.max[k] - 1e-6,
        );
        expect(overlap, `${solid[i]} and ${solid[j]}`).toBe(false);
      }
  });

  it('reads left to right, south to north: the inputs first, the pool last', () => {
    const z = (id: MachineId) => PLACES[id].z;
    const order: MachineId[] = [
      'mains',
      'tank',
      'filter',
      'generator',
      'contact',
      'carbon',
      'uv',
      'pool',
    ];
    for (let k = 1; k < order.length; k++)
      expect(z(order[k]), order[k]).toBeLessThan(z(order[k - 1]));
    expect(z('air')).toBeGreaterThan(z('tank'));
  });

  it('runs the overflow, the one line going right to left, low along the back', () => {
    const overflow = room.lines.find((l) => l.edge === 'overflow')!;
    for (const p of overflow.points) expect(p[1]).toBeLessThan(1.5);
    const back = overflow.points.filter(
      (p, k) => k > 0 && Math.abs(p[2] - overflow.points[k - 1][2]) > 5,
    );
    for (const p of back) expect(p[0]).toBeLessThan(-7);
  });

  it('sets every fitting and line instrument on its line, each once, within reach', () => {
    const ids = room.items.map((i) => i.id).sort();
    const wanted = [
      ...FITTINGS.map((f) => f.id),
      ...INSTRUMENTS.filter(
        (i) =>
          i.edge && (i.kind === 'dissolved-ozone' || i.kind === 'sight-glass'),
      ).map((i) => i.id),
    ].sort();
    expect(ids).toEqual(wanted);
    for (const item of room.items) {
      expect(item.at[1], item.id).toBeLessThan(3.2);
      expect(item.at[1], item.id).toBeGreaterThan(0.3);
    }
  });

  it('needs a hall about 20.5 m long for its row, longer than the museum’s provisional 13.4 m', () => {
    expect(PLANT_LENGTH).toBeCloseTo(20.5, 1);
    expect(HALL_NEEDED.d).toBe(20.5);
    // The sizer, by floor area alone, would put it in a 10 × 10 m room:
    // the row along one wall is what makes it long.
    const size = sizerEstimate();
    expect(size.w * size.d).toBeLessThan(HALL_NEEDED.w * HALL_NEEDED.d);
  });
});
