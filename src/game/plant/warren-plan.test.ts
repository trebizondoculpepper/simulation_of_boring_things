import { describe, expect, it } from 'vite-plus/test';
import {
  CHAMBERS,
  DOCKS,
  FREIGHT_LIFT,
  RISERS,
  DOORWAYS,
  chamberAt,
  chamberById,
  chamberFloor,
  floorAt,
  gapsIn,
  sharedSide,
  sideOf,
  span,
  wallsAt,
} from './warren-plan';
import { placements } from './placement';
import { ATTRACTIONS, CIRCUITS, buildGraph } from './inventory';
import type { Rect } from '../pool-styles/geometry';

const overlap = (a: Rect, b: Rect) =>
  a.minX < b.maxX && b.minX < a.maxX && a.minZ < b.maxZ && b.minZ < a.maxZ;
const area = (r: Rect) => (r.maxX - r.minX) * (r.maxZ - r.minZ);
const centre = (r: Rect) =>
  [(r.minX + r.maxX) / 2, (r.minZ + r.maxZ) / 2] as const;

describe('the plant rooms, laid out', () => {
  it('gives every room of the inventory a chamber, at the level the rules put it', () => {
    for (const p of placements()) {
      const c = CHAMBERS.find((x) => x.room === p.room);
      expect(c, p.room).toBeDefined();
      expect(c!.level).toBe(p.level);
    }
  });

  it('never overlaps two chambers on one level, though levels stand over one another', () => {
    for (const a of CHAMBERS)
      for (const b of CHAMBERS) {
        if (a === b || !overlap(a.rect, b.rect)) continue;
        const sa = span(a),
          sb = span(b);
        // Overlapping in plan only if a whole storey apart.
        expect(
          Math.min(Math.abs(sa.low - sb.high), Math.abs(sb.low - sa.high)),
          `${a.id}/${b.id}`,
        ).toBeGreaterThanOrEqual(3);
      }
  });

  it('opens every doorway in a wall both chambers share, their floors meeting there', () => {
    for (const d of DOORWAYS) {
      const a = chamberById(d.a);
      const b = chamberById(d.b);
      const side = sharedSide(a.rect, b.rect);
      expect(side, `${d.a}–${d.b}`).not.toBeNull();
      const s = sideOf(a.rect, side!);
      expect(d.from).toBeGreaterThanOrEqual(
        Math.max(
          s.from,
          sideOf(
            b.rect,
            side === 'north'
              ? 'south'
              : side === 'south'
                ? 'north'
                : side === 'east'
                  ? 'west'
                  : 'east',
          ).from,
        ) - 1e-9,
      );
      const mid = (d.from + d.to) / 2;
      const [x, z] = s.along === 'x' ? [mid, s.at] : [s.at, mid];
      expect(chamberFloor(a, x, z)).toBeCloseTo(chamberFloor(b, x, z), 6);
      expect(gapsIn(a, side!)).toContainEqual([d.from, d.to]);
    }
  });

  it('joins every chamber to every other, from the office', () => {
    const reached = new Set(['office']);
    for (let changed = true; changed;) {
      changed = false;
      for (const { a, b } of DOORWAYS)
        if (reached.has(a) !== reached.has(b)) {
          reached.add(a);
          reached.add(b);
          changed = true;
        }
    }
    expect([...reached].sort()).toEqual(CHAMBERS.map((c) => c.id).sort());
  });

  it('climbs between the levels by stairs gentle enough to walk', () => {
    const stairs = CHAMBERS.filter((c) => c.to !== undefined);
    expect(stairs.length).toBeGreaterThanOrEqual(3);
    for (const s of stairs) {
      const r = s.rect;
      const run = s.along === 'x' ? r.maxX - r.minX : r.maxZ - r.minZ;
      expect(Math.abs(s.to! - s.y) / run).toBeLessThan(
        Math.tan((35 * Math.PI) / 180),
      );
    }
    // A walk from the office down to the boiler house reaches each floor.
    expect(floorAt(20, 25, 0)).toBe(0);
    expect(floorAt(0, 17, 0)).toBeLessThan(0);
    expect(floorAt(0, 0, -5)).toBe(-5);
    expect(chamberAt(0, -33, -10)?.id).toBe('boiler-house');
    expect(chamberAt(25, 55, 8)?.id).toBe('air-plant');
  });

  it('puts the tank hall at the centre, ringed by the corridor, and the attractions’ plant rooms outside the ring', () => {
    const hall = chamberById('balance-tanks');
    const [hx, hz] = centre(hall.rect);
    expect(Math.hypot(hx, hz)).toBeLessThan(1);
    // The ring's outer bounds: nothing of an attraction's plant room inside them.
    const ring = ['ring-north', 'ring-south', 'ring-west', 'ring-east'].map(
      (id) => chamberById(id).rect,
    );
    const box = {
      minX: Math.min(...ring.map((r) => r.minX)),
      maxX: Math.max(...ring.map((r) => r.maxX)),
      minZ: Math.min(...ring.map((r) => r.minZ)),
      maxZ: Math.max(...ring.map((r) => r.maxZ)),
    };
    for (const c of CHAMBERS.filter((x) => x.room?.startsWith('plant-')))
      expect(overlap(c.rect, box), c.id).toBe(false);
  });

  it('sizes each attraction’s plant room for its circuits, the bigger plant the bigger room', () => {
    const graph = buildGraph();
    const kit = (room: string) =>
      graph.nodes.filter((n) => n.in === room).length;
    for (const a of ATTRACTIONS) {
      const r = chamberById(`plant-${a.id}`).rect;
      const filters = CIRCUITS.filter((c) => c.attraction === a.id).reduce(
        (s, c) => s + c.filters,
        0,
      );
      // Room for its filters (about 3 × 3 m each with access) and the rest.
      expect(area(r)).toBeGreaterThanOrEqual(
        filters * 9 + kit(`plant-${a.id}`) * 4,
      );
    }
  });

  it('puts the loading bay’s docks in its outer wall, onto the white', () => {
    const bay = chamberById('loading-bay').rect;
    for (const [a, b] of DOCKS) {
      expect(a).toBeGreaterThan(bay.minX);
      expect(b).toBeLessThan(bay.maxX);
    }
    // Nothing on the surface stands beyond it to the south.
    for (const c of CHAMBERS.filter((x) => x.level === 'surface'))
      expect(c.rect.minZ).toBeLessThan(bay.maxZ);
  });

  it('walls a walker in on its own level only', () => {
    const treatment = wallsAt(-5);
    const surface = wallsAt(0);
    // The tank hall's north wall stands at the treatment level, not the surface.
    const tankWall = (w: Rect) =>
      Math.abs(w.minZ + 8.15) < 0.2 && w.minX >= -12 && w.maxX <= 12;
    expect(treatment.some(tankWall)).toBe(true);
    expect(surface.some(tankWall)).toBe(false);
  });
  it('reserves risers and a freight lift between the levels, each opening onto a chamber on every level it serves', () => {
    const order = ['roof', 'surface', 'treatment', 'basement'] as const;
    const touches = (a: Rect, b: Rect) =>
      a.minX <= b.maxX &&
      b.minX <= a.maxX &&
      a.minZ <= b.maxZ &&
      b.minZ <= a.maxZ &&
      !overlap(a, b);
    for (const shaft of [...RISERS, FREIGHT_LIFT]) {
      const levels = order.slice(
        order.indexOf(shaft.top),
        order.indexOf(shaft.bottom) + 1,
      );
      for (const level of levels) {
        const here = CHAMBERS.filter((c) => c.level === level);
        for (const c of here)
          expect(overlap(shaft.rect, c.rect), `${shaft.id} in ${c.id}`).toBe(
            false,
          );
        expect(
          here.some((c) => touches(shaft.rect, c.rect)),
          `${shaft.id} at ${level}`,
        ).toBe(true);
      }
    }
    for (const [level, chamber] of Object.entries(FREIGHT_LIFT.landings)) {
      expect(chamberById(chamber).level).toBe(level);
      expect(touches(FREIGHT_LIFT.rect, chamberById(chamber).rect)).toBe(true);
    }
  });

  it('brings every utility in through one room, by the loading dock', () => {
    const intake = chamberById('utilities-intake');
    expect(intake.level).toBe('surface');
  });
});
