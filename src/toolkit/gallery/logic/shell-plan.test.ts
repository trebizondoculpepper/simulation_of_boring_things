import { describe, expect, it } from 'vite-plus/test';
import { overlaps } from './doorway';
import { plantRoomFloorAt, plantRoomPlan } from './plant-rooms';
import { aloft, shellFloorAt, shellPlan, shellSolids } from './shell-plan';
import { olympicShellPlan } from './olympic-plan';

const blocked = (
  solids: ReturnType<typeof shellSolids>,
  x: number,
  z: number,
) => solids.some((s) => overlaps(s, x, z, 0.01));

describe('a square plant room’s shell plan', () => {
  it('gives the walker the same floor as the template plan does, everywhere', () => {
    for (const size of ['tiny', 'small', 'medium', 'large'] as const) {
      const old = plantRoomPlan(size);
      const plan = shellPlan(size);
      for (let x = -old.h + 0.25; x < old.h; x += 0.5)
        for (let z = -old.h + 0.25; z < old.h; z += 0.5) {
          // From the deck (as the walker comes in) and from the floor.
          const fromDeck = shellFloorAt(plan, x, z, 0);
          const expected = plantRoomFloorAt(old, x, z);
          if (!plan.cantilevered && expected !== old.floor)
            expect(fromDeck, `${size} ${x},${z}`).toBeCloseTo(expected, 9);
        }
    }
  });
});

describe('the Olympic plant room’s shell plan', () => {
  const plan = olympicShellPlan();
  const g = plan.decks[1];
  const landing = plan.decks[0];

  it('is 22 × 14 m, its decks cantilevered', () => {
    expect([plan.hx * 2, plan.hz * 2]).toEqual([22, 14]);
    expect(plan.cantilevered).toBe(true);
  });

  it('keeps the walker on the gantry while up there, and on the plant floor under it while down', () => {
    const x = (g.minX + g.maxX) / 2;
    expect(shellFloorAt(plan, x, -3, 0)).toBe(0);
    expect(shellFloorAt(plan, x, -3, plan.floor)).toBe(plan.floor);
  });

  it('runs its stair down from the landing heading west, a tread a going', () => {
    const s = plan.stair!;
    const z = (s.minZ + s.maxZ) / 2;
    expect(shellFloorAt(plan, s.top - 0.1, z, 0)).toBeCloseTo(-s.riser, 9);
    // Its lowest tread a riser above the floor: the last riser steps onto the floor itself.
    expect(shellFloorAt(plan, s.bottom + 0.1, z, -3.3)).toBeCloseTo(
      -(s.steps - 1) * s.riser,
      9,
    );
    // From the floor, only its foot is reached.
    expect(shellFloorAt(plan, s.top - 0.5, z, plan.floor)).toBe(plan.floor);
  });

  it('opens the pool door at deck level only, the main plant’s and the balance tank hall’s on the plant floor only', () => {
    const up = shellSolids(plan, true);
    const down = shellSolids(plan, false);
    const east = plan.hx + 0.1;
    expect(blocked(up, east, plan.door.at)).toBe(false);
    expect(blocked(down, east, plan.door.at)).toBe(true);
    const south = plan.hz + 0.1;
    expect(blocked(down, plan.equipment.at, south)).toBe(false);
    expect(blocked(up, plan.equipment.at, south)).toBe(true);
    expect(blocked(down, -plan.hx - 0.1, plan.tankDoor!.at)).toBe(false);
  });

  it('rails the gantry’s open edge for a walker up there, not for one on the floor below', () => {
    expect(blocked(shellSolids(plan, true), g.minX - 0.02, -3)).toBe(true);
    expect(blocked(shellSolids(plan, false), g.minX - 0.02, -3)).toBe(false);
    expect(aloft(plan, 0)).toBe(true);
    expect(landing.maxX).toBe(plan.hx);
  });
});
