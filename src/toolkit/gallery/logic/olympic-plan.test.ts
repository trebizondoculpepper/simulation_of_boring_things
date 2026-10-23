import { describe, expect, it } from 'vite-plus/test';
import {
  DECK_SOFFIT,
  FILTER_GAP,
  GANTRY_WIDTH,
  OLYMPIC_ROOM,
  accessOf,
  footprintOf,
  keptClear,
  olympicPlan,
  olympicRoomPlan,
  solids,
} from './olympic-plan';
import { PLANT_ROOM } from './plant-rooms';
import type { Footprint } from '../../controls/logic/walk-collision';

const overlap = (a: Footprint, b: Footprint) =>
  a.minX < b.maxX - 1e-9 &&
  b.minX < a.maxX - 1e-9 &&
  a.minZ < b.maxZ - 1e-9 &&
  b.minZ < a.maxZ - 1e-9;

describe('the Olympic plant room, in plan', () => {
  const items = olympicPlan();
  const room = olympicRoomPlan();
  const hx = room.halfX;
  const hz = room.halfZ;

  it('is 22 × 14 m inside', () => {
    expect(OLYMPIC_ROOM).toEqual({ w: 22, d: 14 });
  });

  it('keeps every machine inside the walls, clear of the doors’ spaces, the stair and its foot', () => {
    for (const i of items) {
      const f = footprintOf(i);
      expect(f.minX, i.key).toBeGreaterThanOrEqual(-hx);
      expect(f.maxX, i.key).toBeLessThanOrEqual(hx);
      expect(f.minZ, i.key).toBeGreaterThanOrEqual(-hz);
      expect(f.maxZ, i.key).toBeLessThanOrEqual(hz);
      for (const k of [...keptClear(), ...solids()])
        expect(overlap(f, k), `${i.key} in a kept space`).toBe(false);
      if (i.mount === 'floor')
        for (const k of [...keptClear(), ...solids()])
          expect(
            overlap(accessOf(i), k),
            `${i.key}’s access in a kept space`,
          ).toBe(false);
    }
  });

  it('stands no machine in another, or in another’s maintenance access', () => {
    for (const a of items)
      for (const b of items) {
        if (a === b) continue;
        expect(
          overlap(footprintOf(a), footprintOf(b)),
          `${a.key} / ${b.key}`,
        ).toBe(false);
        if (a.mount === 'floor' && b.mount === 'floor')
          expect(
            overlap(footprintOf(a), accessOf(b)),
            `${a.key} in ${b.key}’s access`,
          ).toBe(false);
      }
  });

  it('lines the five filters up along the north wall, facing south, 0.6 m apart', () => {
    const filters = items.filter((i) => i.key.startsWith('filter'));
    expect(filters).toHaveLength(5);
    for (const f of filters) expect(f.facing).toBe('south');
    expect(new Set(filters.map((f) => f.z)).size).toBe(1);
    for (let k = 1; k < 5; k++)
      expect(
        footprintOf(filters[k]).minX - footprintOf(filters[k - 1]).maxX,
      ).toBeCloseTo(FILTER_GAP, 9);
    expect(footprintOf(filters[0]).minZ).toBeCloseTo(-hz + 0.2, 9);
  });

  it('puts the pool door in the east wall onto the landing, the main plant’s doors in the south wall under it, the balance tank’s in the west', () => {
    const { pool, main, tank } = room.doors;
    expect(pool.wall).toBe('east');
    expect(pool.at).toBeGreaterThan(room.landing.minZ);
    expect(pool.at).toBeLessThan(room.landing.maxZ);
    expect(main.wall).toBe('south');
    // The whole opening under the landing, which is a storey up, over the 2.46 m doors.
    expect(main.at - main.width / 2).toBeGreaterThanOrEqual(room.landing.minX);
    expect(main.at + main.width / 2).toBeLessThanOrEqual(room.landing.maxX);
    expect(PLANT_ROOM.storey).toBeGreaterThan(2.46 + 0.3);
    expect(tank.wall).toBe('west');
  });

  it('carries a cantilevered gantry along the east wall at deck level, from the landing to the north wall, nothing under it taller than its soffit', () => {
    const g = room.gantry;
    expect(room.cantilevered).toBe(true);
    expect(g.maxX).toBe(hx);
    expect(g.maxX - g.minX).toBeCloseTo(GANTRY_WIDTH, 9);
    expect(g.minZ).toBe(-hz);
    expect(g.maxZ).toBe(room.landing.minZ);
    for (const i of items)
      if (overlap(footprintOf(i), g))
        expect(i.h, `${i.key} under the gantry`).toBeLessThan(
          DECK_SOFFIT - 0.3,
        );
  });

  it('runs the stair down from the landing along the south wall, heading west', () => {
    expect(room.stair.maxX).toBe(room.landing.minX);
    expect(room.stair.maxZ).toBe(hz);
    expect(room.stair.minX).toBeLessThan(room.stair.maxX - 3);
  });

  it('stands the pumps against the west wall, beside the balance tank hall’s doors', () => {
    const pumps = items.find((i) => i.key === 'pumps')!;
    // Its suction side (its left) to the wall.
    expect(pumps.facing).toBe('south');
    expect(footprintOf(pumps).minX).toBeLessThan(-hx + 0.3);
    expect(Math.abs(pumps.z - room.doors.tank.at)).toBeLessThan(4);
  });

  it('keeps the panel on the east wall, where power and control come in', () => {
    const panel = items.find((i) => i.key === 'panel')!;
    expect(panel.facing).toBe('west');
    expect(footprintOf(panel).maxX).toBeGreaterThan(hx - 0.3);
  });
});

describe('the Olympic plant room’s drawing', () => {
  it('draws every machine, the five filters round, the four walls’ roles, and the plumbing as routed and scored', async () => {
    const { olympicPlanSvg } = await import('./olympic-plan-svg');
    const svg = olympicPlanSvg();
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.match(/<circle class="filter"/g)).toHaveLength(5);
    // The plumbed result, scored.
    expect(svg).toContain('every gate passed');
    for (const role of [
      'THE OLYMPIC POOL',
      'THE MAIN PLANT',
      'THE BALANCE TANK HALL',
      'POWER AND CONTROL',
    ])
      expect(svg).toContain(role);
    // Each by its name (the dosing controller's shortened to fit).
    for (const i of olympicPlan())
      expect(svg).toContain(
        i.label.replace(' and sample cells', '').split(', ')[0],
      );
  }, 60000);
});
