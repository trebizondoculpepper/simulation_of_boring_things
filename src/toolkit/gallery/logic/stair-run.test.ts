import { describe, expect, it } from 'vite-plus/test';
import {
  deckRails,
  levelSolids,
  STAIR_TOWER,
  stairTowerRuns,
  stairTowerSurfaces,
  surfaceFloorAt,
} from './stair-run';
import type { Surface } from './stair-run';
import type { Footprint } from '../../controls/logic/walk-collision';

const surfaces = stairTowerSurfaces();
const flights = surfaces.filter(
  (s): s is Surface & { y: Exclude<Surface['y'], number> } =>
    typeof s.y !== 'number',
);
const overlap = (a: Footprint, b: Footprint) =>
  a.minX < b.maxX - 1e-6 &&
  b.minX < a.maxX - 1e-6 &&
  a.minZ < b.maxZ - 1e-6 &&
  b.minZ < a.maxZ - 1e-6;
const top = 3 * STAIR_TOWER.storey;

describe('the stair helper, four storeys (dev34)', () => {
  it('runs, on each side, three flights the same way, each to a landing at its storey', () => {
    for (const r of stairTowerRuns()) {
      const fs = r.surfaces.filter(
        (s): s is Surface & { y: Exclude<Surface['y'], number> } =>
          typeof s.y !== 'number',
      );
      expect(
        fs.map((f) => f.y.y1),
        r.side,
      ).toEqual([3, 6, 9]);
      for (const f of fs) expect(f.y.at1).toBeLessThan(f.y.at0);
      const landings = r.surfaces.filter((s) => s.name.endsWith('landing'));
      expect(landings.map((l) => l.y)).toEqual([3, 6, 9]);
    }
  });

  it('stands each stair on its decks’ room side, against its own wall', () => {
    const [west, east] = stairTowerRuns();
    const deckOf = (r: typeof west) => r.surfaces[0].area;
    const flightOf = (r: typeof west) =>
      r.surfaces.find((s) => typeof s.y !== 'number')!.area;
    expect(deckOf(west).minX).toBe(-STAIR_TOWER.w / 2);
    expect(flightOf(west).minX).toBeCloseTo(deckOf(west).maxX, 9);
    expect(deckOf(east).maxX).toBe(STAIR_TOWER.w / 2);
    expect(flightOf(east).maxX).toBeCloseTo(deckOf(east).minX, 9);
  });

  for (const side of ['west', 'east'] as const)
    it(`lets a walker climb the ${side} stair from the floor to the top without walking into anything`, () => {
      const run = stairTowerRuns().find((r) => r.side === side)!;
      const f1 = run.surfaces.find((s) => s.name.endsWith('first flight'))!;
      const last = run.surfaces.find((s) => s.name.endsWith('third landing'))!;
      const fx = (f1.area.minX + f1.area.maxX) / 2;
      let y = 0;
      for (let z = f1.area.maxZ + 0.5; z >= last.area.minZ + 0.3; z -= 0.05) {
        y = surfaceFloorAt(surfaces, fx, z, y);
        const body = {
          minX: fx - 0.3,
          maxX: fx + 0.3,
          minZ: z - 0.3,
          maxZ: z + 0.3,
        };
        const blocked = levelSolids(surfaces, y).some((r) => overlap(r, body));
        expect(blocked, `at z ${z.toFixed(2)}, y ${y.toFixed(2)}`).toBe(false);
      }
      expect(y).toBeCloseTo(top, 6);
    });

  it('stops a walker on the floor from passing under either first flight’s low end', () => {
    const under = levelSolids(surfaces, 0);
    for (const f of flights.filter((f) => f.y.y0 === 0)) {
      const mid = {
        minX: f.area.minX + 0.2,
        maxX: f.area.maxX - 0.2,
        minZ: (f.area.minZ + f.area.maxZ) / 2 - 0.1,
        maxZ: (f.area.minZ + f.area.maxZ) / 2 + 0.1,
      };
      expect(
        under.some((r) => overlap(r, mid)),
        f.name,
      ).toBe(true);
    }
  });

  it('draws no level rail over or under any flight', () => {
    // Across a flight or along its outer side; the decks' own edge rail
    // beside a flight, along the flight's inner side, guards the deck.
    for (const run of stairTowerRuns())
      for (const y of [3, 6, 9])
        for (const r of deckRails(run.surfaces, y))
          for (const f of run.surfaces.filter((s) => typeof s.y !== 'number')) {
            const inner = run.side === 'west' ? f.area.minX : f.area.maxX;
            const band = {
              ...f.area,
              minX: f.area.minX - 0.05,
              maxX: f.area.maxX + 0.05,
            };
            const alongInner =
              Math.abs((r.minX + r.maxX) / 2 - inner) < 0.05 &&
              r.maxZ - r.minZ > r.maxX - r.minX;
            expect(
              overlap(r, band) && !alongInner,
              `a rail at ${y} m on ${f.name}`,
            ).toBe(false);
          }
  });

  it('never makes a flight’s end a solid', () => {
    for (const y of [3, 6, 9])
      for (const r of levelSolids(surfaces, y))
        for (const f of flights) {
          const across = r.maxX - r.minX > r.maxZ - r.minZ;
          const atEnd = [f.y.at0, f.y.at1].some(
            (z) => Math.abs((r.minZ + r.maxZ) / 2 - z) < 0.1,
          );
          const onFlight =
            r.minX >= f.area.minX - 1e-6 && r.maxX <= f.area.maxX + 1e-6;
          expect(across && atEnd && onFlight, `${f.name} at ${y} m`).toBe(
            false,
          );
        }
  });
});
