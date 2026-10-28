import { describe, expect, it } from 'vite-plus/test';
import {
  END_CLEAR,
  LEGS,
  PLACES,
  PLANT_LENGTH,
  POINTS,
  ROOM,
  VISITOR_FLOOR,
  boxInHall,
  hall2PipeClashes,
  legOf,
  onPlantFloor,
  plumbHall2,
  portInHall,
  sizerEstimate,
} from './museum-2-layout';
import { hallArches, hallSize } from './museum-plan';
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

  it('keeps every pipe and machine on the L, off the visitors’ floor, inside the hall', () => {
    for (const l of room.lines)
      for (const p of l.points) {
        expect(onPlantFloor(p[0], p[2]), `${l.edge} at ${p.join(', ')}`).toBe(
          true,
        );
        expect(Math.abs(p[0]), l.edge).toBeLessThan(ROOM.halfX);
        expect(Math.abs(p[2]), l.edge).toBeLessThan(ROOM.halfZ);
        expect(p[1], l.edge).toBeLessThan(ROOM.height);
      }
    for (const n of NODES) {
      const b = boxInHall(n.id);
      const clear =
        b.max[0] <= VISITOR_FLOOR.minX + 1e-6 ||
        b.max[2] <= VISITOR_FLOOR.minZ + 1e-6;
      expect(clear, n.id).toBe(true);
      expect(b.min[0], n.id).toBeGreaterThanOrEqual(-ROOM.halfX);
      expect(b.max[0], n.id).toBeLessThanOrEqual(ROOM.halfX);
      expect(Math.abs(b.min[2]), n.id).toBeLessThanOrEqual(ROOM.halfZ);
      expect(Math.abs(b.max[2]), n.id).toBeLessThanOrEqual(ROOM.halfZ);
    }
  });

  it('fits the corner hall and keeps both archways and the way between them clear', () => {
    const size = hallSize('museum2');
    expect(ROOM.halfX * 2).toBeCloseTo(size.w, 6);
    expect(ROOM.halfZ * 2).toBeCloseTo(size.d, 6);
    expect(LEGS.west.from).toBeLessThanOrEqual(ROOM.halfZ - END_CLEAR + 1e-6);
    expect(LEGS.north.to).toBeLessThanOrEqual(ROOM.halfX - END_CLEAR + 1e-6);
    // Each archway's opening, a metre into the hall, is on the visitors' floor.
    for (const a of hallArches('museum2')) {
      const along = a.axis === 'x' ? [1, 0] : [0, 1];
      for (const u of [-a.w / 2, 0, a.w / 2]) {
        const x = a.frame.x + a.into[0] + along[0] * u;
        const z = a.frame.z + a.into[1] + along[1] * u;
        expect(onPlantFloor(x, z), `${a.to} at ${x}, ${z}`).toBe(false);
      }
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

  it('reads left to right round the L: the inputs first up the west wall, the pool last along the north', () => {
    const west: MachineId[] = ['mains', 'tank', 'filter', 'generator'];
    const north: MachineId[] = ['contact', 'carbon', 'uv', 'pool'];
    for (const id of west) expect(legOf(id), id).toBe('west');
    for (const id of north) expect(legOf(id), id).toBe('north');
    for (let k = 1; k < west.length; k++)
      expect(PLACES[west[k]].z, west[k]).toBeLessThan(PLACES[west[k - 1]].z);
    for (let k = 1; k < north.length; k++)
      expect(PLACES[north[k]].x, north[k]).toBeGreaterThan(
        PLACES[north[k - 1]].x,
      );
    expect(PLACES.air.z).toBeGreaterThan(PLACES.tank.z);
    // The pool by the way on to Hall 3, in the hall's east half.
    expect(PLACES.pool.x).toBeGreaterThan(3);
  });

  it('runs the overflow, the one line going right to left, low along the backs of both walls', () => {
    const overflow = room.lines.find((l) => l.edge === 'overflow')!;
    for (const p of overflow.points) expect(p[1]).toBeLessThan(1.5);
    const long = overflow.points
      .slice(1)
      .map((p, k) => [overflow.points[k], p] as const)
      .filter(([a, b]) => Math.hypot(b[0] - a[0], b[2] - a[2]) > 4);
    expect(long.length).toBeGreaterThan(0);
    for (const [a, b] of long) {
      const alongWest = Math.abs(b[2] - a[2]) > 4;
      if (alongWest) expect(a[0]).toBeLessThan(-7);
      else expect(a[2]).toBeLessThan(-6);
    }
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

  it('folds its 20.7 m row round the corner', () => {
    expect(PLANT_LENGTH).toBeCloseTo(20.7, 1);
    // The sizer, by floor area alone, would put it in a smaller room: the
    // row along the walls is what needs the corner.
    const size = sizerEstimate();
    expect(size.w * size.d).toBeLessThan(ROOM.halfX * 2 * ROOM.halfZ * 2);
  });
});
