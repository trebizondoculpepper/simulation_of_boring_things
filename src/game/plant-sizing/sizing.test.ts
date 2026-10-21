import { describe, expect, it } from 'vite-plus/test';
import { POOLS } from './pools.config';
import type { AttractionConfig } from './pools.config';
import { ASSUME, dnFor, roomSize, sizePlant } from './sizing';
import { sizingReport } from './report';

const one = (
  volume: number,
  use: 'leisure' | 'spa' = 'leisure',
): AttractionConfig => ({
  id: 'test',
  name: 'Test',
  room: 'test',
  hallAir: 1000,
  bodies: [{ name: 'Pool', use, area: volume / 1.5, volume, temperature: 30 }],
});

describe('plant sizing', () => {
  it('gives every attraction its own plant room, and the shared rooms once', () => {
    const plan = sizePlant(POOLS);
    for (const a of POOLS)
      expect(plan.rooms.some((r) => r.id === `plant-${a.id}`)).toBe(true);
    for (const id of [
      'wet-hall',
      'boiler-house',
      'hypo-store',
      'acid-store',
      'loading-bay',
      'switch-room',
      'air-plant',
      'control-room',
      'office',
    ])
      expect(plan.rooms.filter((r) => r.id === id).length).toBe(1);
  });

  it('turns over each pool in its period, through enough filter', () => {
    const plan = sizePlant([one(300)]);
    const c = plan.circuits[0];
    expect(c.flow).toBeCloseTo(300 / ASSUME.turnover.leisure);
    const area = c.filters.count * Math.PI * (c.filters.diameter / 2) ** 2;
    expect(c.flow / area).toBeLessThanOrEqual(ASSUME.filterRate);
    expect(c.filters.count).toBeGreaterThanOrEqual(2);
  });

  it('grows the plant with the pools', () => {
    const small = sizePlant([one(50)]);
    const big = sizePlant([one(2000)]);
    expect(big.totals.flow).toBeGreaterThan(small.totals.flow);
    expect(big.totals.boilers).toBeGreaterThanOrEqual(small.totals.boilers);
    const area = (p: ReturnType<typeof sizePlant>) =>
      p.rooms.find((r) => r.id === 'plant-test')!.area;
    expect(area(big)).toBeGreaterThan(area(small));
  });

  it('keeps the decided levels: the boiler house low, the loading bay and chemicals in the middle', () => {
    const level = (id: string) =>
      sizePlant(POOLS).rooms.find((r) => r.id === id)!.level;
    expect(level('boiler-house')).toBe(0);
    expect(level('loading-bay')).toBe(1);
    expect(level('hypo-store')).toBe(1);
    expect(level('acid-store')).toBe(1);
  });

  it('puts attraction rooms on every level', () => {
    const levels = new Set(
      sizePlant(POOLS)
        .rooms.filter((r) => r.part === 'attraction')
        .map((r) => r.level),
    );
    expect(levels.size).toBe(3);
  });

  it('makes a room big enough for its machines and their clearances', () => {
    const machines = [
      { kind: 'Tank', name: 'A', w: 3, d: 2, h: 2 },
      { kind: 'Tank', name: 'B', w: 3, d: 2, h: 2 },
    ];
    const size = roomSize(machines);
    expect(size.area).toBeGreaterThanOrEqual(2 * (3 + 1.6) * (2 + 1.6));
    expect(Math.max(size.w, size.d)).toBeGreaterThanOrEqual(3 + 1.6);
    expect(size.storeys).toBe(1);
  });

  it('gives a tiny circuit a packaged spa set, in a small room', () => {
    const plan = sizePlant(POOLS);
    const spa = plan.rooms.find((r) => r.id === 'plant-footbath')!;
    expect(spa.machines.map((m) => m.kind)).toEqual([
      'Prefabricated plant cabinet',
    ]);
    expect(spa.machines[0].name).toContain('packaged spa set');
    const main = plan.rooms.find((r) => r.id === 'plant-lounge')!;
    expect(main.machines.some((m) => m.kind === 'Packaged spa set')).toBe(
      false,
    );
    expect(spa.area).toBeLessThan(6);
  });

  it('keeps each pool’s balance tank in its own room, and none in the wet hall', () => {
    const plan = sizePlant(POOLS);
    const hall = plan.rooms.find((r) => r.id === 'wet-hall')!;
    expect(hall.machines.some((m) => m.kind === 'Balance tank')).toBe(false);
    for (const c of plan.circuits.filter((c) => c.flow >= ASSUME.packageBelow))
      expect(
        plan.rooms
          .find((r) => r.id === `plant-${c.attraction}`)!
          .machines.some(
            (m) => m.kind === 'Balance tank' && m.name === c.body.name,
          ),
      ).toBe(true);
  });

  it('runs the shared rings to every room, sized to their loads', () => {
    const plan = sizePlant(POOLS);
    const heating = plan.rings.find((r) => r.name.startsWith('Heating'))!;
    expect(heating.serves).toContain('plant-footbath');
    expect(heating.flow).toBeCloseTo(
      plan.totals.heat / (1.163 * ASSUME.lthwDrop),
    );
    const bigger = sizePlant([one(3000), ...POOLS]).rings.find((r) =>
      r.name.startsWith('Heating'),
    )!;
    expect(bigger.dn).toBeGreaterThanOrEqual(heating.dn);
    const hypo = plan.rings.find((r) => r.name.startsWith('Hypochlorite'))!;
    expect(hypo.serves).not.toContain('plant-footbath');
  });

  it('picks a bore that keeps the speed down', () => {
    expect(dnFor(10, 1)).toBe(65);
    expect(dnFor(0.1, 1)).toBe(15);
  });

  it('writes a report', () => {
    const text = sizingReport(sizePlant(POOLS));
    expect(text).toContain('## Rooms');
    expect(text).toContain('Olympic pool hall plant room');
  });
});
