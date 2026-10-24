import { describe, expect, it } from 'vite-plus/test';
import {
  AIR_UNITS,
  airBox,
  airDucts,
  airFloorAt,
  gantries,
  levelSolids,
  placeStacks,
  STACKS,
  stackPorts,
} from './air-plant';
import { layoutRoom } from './room-equipment';
import { SHELL_ROOMS } from './shell-rooms';
import type { Footprint } from '../../controls/logic/walk-collision';

const box = airBox();
const layout = layoutRoom('air_plant')!;
const surfaces = gantries(box);
const overlap = (a: Footprint, b: Footprint) =>
  a.minX < b.maxX - 1e-6 &&
  b.minX < a.maxX - 1e-6 &&
  a.minZ < b.maxZ - 1e-6 &&
  b.minZ < a.maxZ - 1e-6;

describe('the air plant’s units', () => {
  it('are the sizing’s: one for the lounge, nine 9/18s for the Olympic, one each for the jacuzzi and footbath', () => {
    expect(AIR_UNITS.map((u) => u.tag)[0]).toBe('AHU-801');
    const olympic = AIR_UNITS.filter((u) => u.hall === 'olympic');
    expect(olympic).toHaveLength(9);
    for (const u of AIR_UNITS)
      expect(u.airflow, u.tag).toBeLessThanOrEqual(u.size.max);
    expect(olympic.every((u) => u.size.model === '9/18')).toBe(true);
  });

  it('stand the Olympic’s in three stacks of three, the rest one each', () => {
    const olympic = STACKS.filter((s) => s.units[0].hall === 'olympic');
    expect(olympic.map((s) => s.units.length)).toEqual([3, 3, 3]);
    expect(STACKS.length).toBe(6);
  });

  it('fit the room, stacks clear of each other and of the doorway', () => {
    expect(layout.failed).toEqual([]);
    const stacks = layout.placed.filter((p) =>
      p.item.key.startsWith('ahu-stack'),
    );
    expect(stacks).toHaveLength(STACKS.length);
    for (const p of stacks) {
      expect(p.footprint.minX).toBeGreaterThanOrEqual(-box.w / 2 - 1e-6);
      expect(p.footprint.maxX).toBeLessThanOrEqual(box.w / 2 + 1e-6);
      expect(p.footprint.minZ).toBeGreaterThanOrEqual(-box.d / 2 - 1e-6);
      expect(p.footprint.maxZ).toBeLessThanOrEqual(box.d / 2 + 1e-6);
      for (const k of box.keepClear)
        expect(overlap(p.footprint, k), p.item.label).toBe(false);
    }
  });

  it('stand three high under the services ceiling, the room made taller for them', () => {
    const roof = SHELL_ROOMS.air_plant.height;
    for (const p of placeStacks(box))
      expect(p.item.h, p.item.label).toBeLessThan(roof - 1.9);
  });
});

describe('the air plant’s ducts', () => {
  const ducts = airDucts(layout.placed, box);

  it('leave every unit’s four ends and go into the wall behind its stack', () => {
    expect(ducts).toHaveLength(AIR_UNITS.length * 4);
    for (const d of ducts) {
      const end = d.points.at(-1)!;
      const onWall =
        Math.abs(Math.abs(end[0]) - box.w / 2) < 1e-6 ||
        Math.abs(Math.abs(end[2]) - box.d / 2) < 1e-6;
      expect(onWall, d.name).toBe(true);
    }
  });

  it('run level and square, and none meets another', () => {
    const boxes = ducts.map((d) =>
      d.points.slice(1).map((b, i) => {
        const a = d.points[i];
        const alongX = Math.abs(b[0] - a[0]) > 1e-9;
        const half = d.w / 2;
        return {
          minX: Math.min(a[0], b[0]) - (alongX ? 0 : half),
          maxX: Math.max(a[0], b[0]) + (alongX ? 0 : half),
          minY: a[1] - d.h / 2,
          maxY: a[1] + d.h / 2,
          minZ: Math.min(a[2], b[2]) - (alongX ? half : 0),
          maxZ: Math.max(a[2], b[2]) + (alongX ? half : 0),
        };
      }),
    );
    for (const d of ducts)
      for (let i = 1; i < d.points.length; i++) {
        expect(d.points[i][1]).toBe(d.points[0][1]);
        const moved = [0, 2].filter(
          (k) => Math.abs(d.points[i][k] - d.points[i - 1][k]) > 1e-9,
        );
        expect(moved.length, d.name).toBeLessThanOrEqual(1);
      }
    for (let i = 0; i < ducts.length; i++)
      for (let j = i + 1; j < ducts.length; j++)
        for (const a of boxes[i])
          for (const b of boxes[j]) {
            const clash =
              a.minX < b.maxX - 1e-6 &&
              b.minX < a.maxX - 1e-6 &&
              a.minY < b.maxY - 1e-6 &&
              b.minY < a.maxY - 1e-6 &&
              a.minZ < b.maxZ - 1e-6 &&
              b.minZ < a.maxZ - 1e-6;
            expect(clash, `${ducts[i].name} meets ${ducts[j].name}`).toBe(
              false,
            );
          }
  });

  it('take each stack’s ports from its own units', () => {
    for (const st of STACKS)
      expect(stackPorts(st)).toHaveLength(st.units.length * 4);
  });
});

describe('the gantries and their stair', () => {
  const g1 = surfaces.find((s) => s.name === 'Gantry 1')!;
  const g2 = surfaces.find((s) => s.name === 'Gantry 2')!;
  const x = (g1.area.minX + g1.area.maxX) / 2;
  const z = (g1.area.minZ + g1.area.maxZ) / 2;

  it('stand at the upper units’ floors, along the west stacks’ fronts', () => {
    expect(g1.y).toBeCloseTo(2.4, 6);
    expect(g2.y).toBeCloseTo(4.8, 6);
  });

  it('let a walker pass under them on the floor, and stand on each from its own level', () => {
    expect(airFloorAt(surfaces, x, z, 0)).toBe(0);
    expect(airFloorAt(surfaces, x, z, 2.4)).toBeCloseTo(2.4, 6);
    expect(airFloorAt(surfaces, x, z, 4.8)).toBeCloseTo(4.8, 6);
  });

  it('are reached by walking up the stair, step by step, from the floor to the top', () => {
    const f1 = surfaces.find((s) => s.name === 'Stair, first flight')!;
    const f2 = surfaces.find((s) => s.name === 'Stair, second flight')!;
    const top = surfaces.find((s) => s.name === 'Second landing')!;
    // Up the first flight, northward, to the middle landing.
    let y = 0;
    const fx = (f1.area.minX + f1.area.maxX) / 2;
    for (let zz = f1.area.maxZ + 0.3; zz >= f1.area.minZ - 0.6; zz -= 0.05)
      y = airFloorAt(surfaces, fx, zz, y);
    expect(y).toBeCloseTo(2.4, 6);
    // Straight on north up the second, the same way, to the top landing.
    for (let zz = f2.area.maxZ; zz >= top.area.minZ + 0.3; zz -= 0.05)
      y = airFloorAt(surfaces, fx, zz, y);
    expect(y).toBeCloseTo(4.8, 6);
    // And sideways west off the landing, onto the top gantry.
    const tz = (top.area.minZ + top.area.maxZ) / 2;
    for (let xx = fx; xx >= x; xx -= 0.05) y = airFloorAt(surfaces, xx, tz, y);
    expect(y).toBeCloseTo(4.8, 6);
  });

  it('let a walker climb the whole stair without walking into anything', () => {
    const f1 = surfaces.find((s) => s.name === 'Stair, first flight')!;
    const top = surfaces.find((s) => s.name === 'Second landing')!;
    const fx = (f1.area.minX + f1.area.maxX) / 2;
    let y = 0;
    for (let zz = f1.area.maxZ + 0.5; zz >= top.area.minZ + 0.3; zz -= 0.05) {
      y = airFloorAt(surfaces, fx, zz, y);
      const blocked = levelSolids(surfaces, y).some((r) =>
        overlap(r, {
          minX: fx - 0.3,
          maxX: fx + 0.3,
          minZ: zz - 0.3,
          maxZ: zz + 0.3,
        }),
      );
      expect(blocked, `at z ${zz.toFixed(2)}, y ${y.toFixed(2)}`).toBe(false);
    }
    expect(y).toBeCloseTo(4.8, 6);
  });

  it('stop a walker on the floor from passing under the first flight’s low end', () => {
    const f1 = surfaces.find((s) => s.name === 'Stair, first flight')!;
    const under = levelSolids(surfaces, 0);
    const mid = {
      minX: f1.area.minX + 0.2,
      maxX: f1.area.maxX - 0.2,
      minZ: (f1.area.minZ + f1.area.maxZ) / 2 - 0.1,
      maxZ: (f1.area.minZ + f1.area.maxZ) / 2 + 0.1,
    };
    expect(under.some((r) => overlap(r, mid))).toBe(true);
  });

  it('run outside the gantries, both flights the same way, nothing over either', () => {
    const flights = surfaces.filter((s) => typeof s.y !== 'number');
    expect(flights).toHaveLength(2);
    for (const f of flights) {
      // East of the gantries, never under one.
      expect(f.area.minX).toBeGreaterThanOrEqual(g1.area.maxX - 1e-9);
      for (const d of surfaces.filter((s) => typeof s.y === 'number'))
        if (
          d.area.minX < f.area.maxX - 1e-9 &&
          d.area.maxX > f.area.minX + 1e-9
        )
          expect(
            d.area.maxZ <= f.area.minZ + 1e-9 ||
              d.area.minZ >= f.area.maxZ - 1e-9,
          ).toBe(true);
      // Rising northward, at a stair's pitch (BS EN ISO 14122-3: up to 45 degrees).
      if (typeof f.y === 'number') continue;
      expect(f.y.at1).toBeLessThan(f.y.at0);
      const pitch = Math.atan2(f.y.y1 - f.y.y0, f.y.at0 - f.y.at1);
      expect(pitch).toBeGreaterThan((30 * Math.PI) / 180);
      expect(pitch).toBeLessThan((42 * Math.PI) / 180);
    }
  });

  it('stand their foot well clear of the door in the south wall', () => {
    const f1 = surfaces.find((s) => s.name === 'Stair, first flight')!;
    expect(box.d / 2 - f1.area.maxZ).toBeGreaterThanOrEqual(4);
  });

  it('meet each gantry from a landing at its own level', () => {
    for (const [landing, gantry] of [
      ['First landing', g1],
      ['Second landing', g2],
    ] as const) {
      const l = surfaces.find((s) => s.name === landing)!;
      expect(l.y).toBe(gantry.y);
      expect(l.area.minX).toBeCloseTo(gantry.area.maxX, 6);
      expect(l.area.minZ).toBeGreaterThanOrEqual(gantry.area.minZ - 1e-9);
      expect(l.area.maxZ).toBeLessThanOrEqual(gantry.area.maxZ + 1e-9);
      // No rail between them.
      const level = typeof l.y === 'number' ? l.y : 0;
      const between = {
        minX: l.area.minX - 0.02,
        maxX: l.area.minX + 0.02,
        minZ: l.area.minZ + 0.2,
        maxZ: l.area.maxZ - 0.2,
      };
      expect(
        levelSolids(surfaces, level).some((r) => overlap(r, between)),
      ).toBe(false);
    }
  });

  it('rail every gantry’s open edge, but leave the way on to the stair', () => {
    const rails = levelSolids(surfaces, 2.4);
    // The first gantry's east edge is railed beside the stacks' middle.
    const edge = {
      minX: g1.area.maxX - 0.01,
      maxX: g1.area.maxX + 0.05,
      minZ: z - 0.1,
      maxZ: z + 0.1,
    };
    expect(rails.some((r) => overlap(r, edge))).toBe(true);
    // The first flight's top, where it meets the landing, is open.
    const f1 = surfaces.find((s) => s.name === 'Stair, first flight')!;
    const mouth = {
      minX: f1.area.minX + 0.1,
      maxX: f1.area.maxX - 0.1,
      minZ: f1.area.minZ - 0.02,
      maxZ: f1.area.minZ + 0.02,
    };
    expect(rails.some((r) => overlap(r, mouth))).toBe(false);
    // Up top, the second flight's side beside the top gantry is railed.
    const top = levelSolids(surfaces, 4.8);
    const f2 = surfaces.find((s) => s.name === 'Stair, second flight')!;
    const side = {
      minX: g2.area.maxX - 0.02,
      maxX: g2.area.maxX + 0.02,
      minZ: f2.area.minZ + 0.5,
      maxZ: f2.area.minZ + 0.6,
    };
    expect(top.some((r) => overlap(r, side))).toBe(true);
  });
});
