import { describe, expect, it } from 'vite-plus/test';
import { POOLS } from '../../../game/plant-sizing/pools.config';
import {
  basinArea,
  basinVolume,
  hallFloorAt,
  hallSolids,
  POOL_HALLS,
  sunLands,
  galleryPlan,
  CORRIDOR_SECTION,
  archSpan,
  roofAt,
  hallVolume,
  freeOutline,
  insideOutline,
  offsetOutline,
  outlineArea,
  WATER_Y,
} from './pool-halls';

describe('pool halls', () => {
  it('stands on the deck, and in each pool on its floor', () => {
    const olympic = POOL_HALLS.pool_02;
    expect(hallFloorAt(olympic, -29, 0)).toBe(0);
    const footbath = POOL_HALLS.pool_04;
    // Wall to wall: there is no way past it but through it.
    for (const x of [-1.95, 0, 1.95])
      expect(hallFloorAt(footbath, x, 0)).toBeCloseTo(WATER_Y - 0.15);
    expect(hallFloorAt(olympic, 0, 0)).toBeCloseTo(WATER_Y - 2);
  });

  it('gives the lounge pool its shelves and the jacuzzi its raised plinth', () => {
    const lounge = POOL_HALLS.pool_01;
    // In the water, on the shelf, and up on the island.
    expect(hallFloorAt(lounge, 0, -3)).toBeCloseTo(WATER_Y - 0.9);
    expect(hallFloorAt(lounge, -3, 3.9)).toBeCloseTo(WATER_Y - 0.3);
    expect(hallFloorAt(lounge, 7, 2.6)).toBeCloseTo(WATER_Y - 0.45);
    expect(hallFloorAt(lounge, 5.4, -2)).toBe(0);
    expect(hallFloorAt(lounge, -6.4, -1.4)).toBe(0);
    // Out on the deck beyond the outline.
    expect(hallFloorAt(lounge, -11, 0)).toBe(0);
    // The pinched waist: deck between its lobes.
    expect(hallFloorAt(lounge, 1.4, 4)).toBe(0);
    const jacuzzi = POOL_HALLS.pool_03;
    expect(hallFloorAt(jacuzzi, -2.7, 0)).toBeCloseTo(0.9);
    expect(hallFloorAt(jacuzzi, -0.95, 0)).toBeCloseTo(0.6);
    expect(hallFloorAt(jacuzzi, -0.8, 0)).toBeCloseTo(0.3);
    expect(hallFloorAt(jacuzzi, 0, 0)).toBe(0);
  });

  it('stands the lounge’s arch on the deck, its columns in the water, and sinks its well', () => {
    const lounge = POOL_HALLS.pool_01;
    const [arch] = lounge.arches!;
    const { left, right } = archSpan(arch);
    for (const [z0, z1] of [
      [arch.z0, left],
      [right, arch.z1],
    ])
      for (const z of [z0 - 0.4, z1 + 0.4])
        for (const x of [arch.x - 0.75, arch.x + 0.75])
          expect(hallFloorAt(lounge, x, z), `pier at ${x}, ${z}`).toBe(0);
    // Water passes under it.
    expect(hallFloorAt(lounge, arch.x, -1)).toBeLessThan(0);
    for (const c of lounge.columns.slice(1, 3))
      expect(hallFloorAt(lounge, c.x, c.z)).toBeCloseTo(WATER_Y - 0.9);
    expect(hallFloorAt(lounge, -2.6, -1.2)).toBeCloseTo(WATER_Y - 2.4);
  });

  it('runs the Olympic pool’s gallery under its north deck, its windows into the water', () => {
    const hall = POOL_HALLS.pool_02;
    const plan = galleryPlan(hall)!;
    expect(plan.windows.length).toBe(12);
    // The corridor lies outside the pool, wholly under the deck.
    expect(plan.z + CORRIDOR_SECTION.width / 2).toBeLessThanOrEqual(
      -12.5 - hall.gutter.width + 1e-9,
    );
    expect(plan.floor + CORRIDOR_SECTION.height).toBeLessThan(-0.3);
    // Each window wholly under the water and above the pool's floor.
    expect(plan.windowY + plan.r).toBeLessThan(WATER_Y);
    expect(plan.windowY - plan.r).toBeGreaterThan(WATER_Y - 2);
    // And seen standing in the corridor: within a head's height.
    expect(Math.abs(plan.floor + 1.6 - plan.windowY)).toBeLessThan(0.5);
    for (const x of plan.windows) expect(Math.abs(x)).toBeLessThan(25 - plan.r);
  });

  it('slopes the Olympic hall’s roof at 20 degrees across its short side', () => {
    const hall = POOL_HALLS.pool_02;
    expect(roofAt(hall, -20)).toBeCloseTo(9);
    expect(roofAt(hall, 20)).toBeCloseTo(hall.h);
    expect((roofAt(hall, 20) - roofAt(hall, -20)) / 40).toBeCloseTo(
      Math.tan((20 * Math.PI) / 180),
    );
    expect(roofAt(POOL_HALLS.pool_01, 5)).toBe(7);
  });

  it('offsets a free outline outward, enclosing it', () => {
    const b = POOL_HALLS.pool_01.basins[0];
    if (b.shape !== 'free') throw new Error('not free');
    const line = freeOutline(b);
    const out = offsetOutline(line, 0.25);
    expect(outlineArea(out)).toBeGreaterThan(outlineArea(line));
    for (const [x, z] of line.filter((_, i) => i % 10 === 0))
      expect(insideOutline(out, x, z)).toBe(true);
  });

  it('walls every hall in, and blocks the Olympic pool’s starting blocks', () => {
    for (const hall of Object.values(POOL_HALLS))
      expect(hallSolids(hall).length).toBeGreaterThanOrEqual(4);
    expect(hallSolids(POOL_HALLS.pool_02).length).toBe(7 + 10 + 10 * 6);
  });

  it('puts each hall’s sun into its water, through its skylights or windows', () => {
    for (const hall of Object.values(POOL_HALLS)) {
      const through = [
        ...hall.skylights.map((k) => sunLands(k.x, k.z, roofAt(hall, k.z))),
        ...(hall.highWindows?.at ?? []).map((z) =>
          sunLands(
            hall.w / 2,
            z,
            (hall.highWindows!.from + hall.highWindows!.to) / 2,
          ),
        ),
      ];
      if (hall.id === 'pool_03') {
        // The jacuzzi has no sunlight: no skylights, no high windows.
        expect(hall.skylights).toEqual([]);
        expect(hall.highWindows).toBeUndefined();
      } else {
        const lit = through.some((at) => hallFloorAt(hall, at.x, at.z) < 0);
        expect(lit, hall.id).toBe(true);
      }
      for (const k of hall.skylights) {
        expect(Math.abs(k.x) + k.size / 2).toBeLessThan(hall.w / 2);
        expect(Math.abs(k.z) + k.size / 2).toBeLessThan(hall.d / 2);
      }
    }
  });

  it('matches the plant’s configuration, room for room', () => {
    for (const hall of Object.values(POOL_HALLS)) {
      const config = POOLS.find((p) => p.room === hall.id);
      expect(config, hall.id).toBeDefined();
      expect(config!.hallAir).toBeCloseTo(hallVolume(hall), -1);
      hall.basins.forEach((b, k) => {
        const body = config!.bodies[k];
        expect(body.volume).toBeCloseTo(basinVolume(b), 0);
        expect(body.area).toBeCloseTo(basinArea(b), 0);
      });
    }
  });
});
