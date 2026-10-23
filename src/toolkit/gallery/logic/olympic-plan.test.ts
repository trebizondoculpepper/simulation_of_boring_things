import { describe, expect, it } from 'vite-plus/test';
import {
  FILTER_GAP,
  accessOf,
  footprintOf,
  olympicBox,
  olympicPlan,
  olympicRoomPlan,
} from './olympic-plan';
import type { Footprint } from '../../controls/logic/walk-collision';

const overlap = (a: Footprint, b: Footprint) =>
  a.minX < b.maxX - 1e-9 &&
  b.minX < a.maxX - 1e-9 &&
  a.minZ < b.maxZ - 1e-9 &&
  b.minZ < a.maxZ - 1e-9;

describe('the Olympic plant room, in plan', () => {
  const items = olympicPlan();
  const box = olympicBox();
  const h = box.w / 2;

  it('keeps every machine inside the walls, clear of the doors, the landing and the stair', () => {
    for (const i of items) {
      const f = footprintOf(i);
      expect(f.minX, i.key).toBeGreaterThanOrEqual(-h);
      expect(f.maxX, i.key).toBeLessThanOrEqual(h);
      expect(f.minZ, i.key).toBeGreaterThanOrEqual(-h);
      expect(f.maxZ, i.key).toBeLessThanOrEqual(h);
      for (const k of [...box.keepClear, ...box.solid])
        expect(overlap(f, k), `${i.key} in a kept space`).toBe(false);
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
    // Their backs at the landing's edge.
    expect(footprintOf(filters[0]).minZ).toBeCloseTo(
      olympicRoomPlan().landing.maxZ + 0.05,
      9,
    );
  });

  it('stands the pumps against the west wall, beside the balance tank hall’s doors', () => {
    const pumps = items.find((i) => i.key === 'pumps')!;
    const f = footprintOf(pumps);
    expect(pumps.facing).toBe('east');
    expect(f.minX).toBeLessThan(-h + 0.3);
    expect(Math.abs(pumps.z - olympicRoomPlan().tankDoor!.z)).toBeLessThan(4);
  });

  it('keeps the panel on the east wall, where power and control come in', () => {
    const panel = items.find((i) => i.key === 'panel')!;
    expect(panel.facing).toBe('west');
    expect(footprintOf(panel).maxX).toBeGreaterThan(h - 0.3);
  });
});

describe('the Olympic plant room’s drawing', () => {
  it('draws every machine, the five filters round, and the four walls’ roles', async () => {
    const { olympicPlanSvg } = await import('./olympic-plan-svg');
    const svg = olympicPlanSvg();
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.match(/<circle /g)).toHaveLength(5);
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
  });
});
