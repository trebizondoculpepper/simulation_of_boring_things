import { describe, expect, it } from 'vite-plus/test';
import { CIRCUITS } from './plant/inventory';
import {
  makeSharedPlantLayout,
  SHARED_MACHINES,
  sharedGantryFloor,
} from './shared-plant-layout';

describe('shared plant layout study', () => {
  it('includes one balance tank per circuit and excludes local treatment equipment', () => {
    const balance = SHARED_MACHINES.filter((m) => m.zone === 'balance');
    expect(balance).toHaveLength(CIRCUITS.length);
    expect(SHARED_MACHINES.map((m) => m.id).join(' ')).not.toMatch(
      /filters-|ozone-|uv-|flume-pump-/,
    );
  });
  it('keeps all machine and service envelopes inside non-overlapping zones', () => {
    const { zones, width, depth, area, equipmentArea, zoneArea } =
      makeSharedPlantLayout();
    expect(area).toBe(width * depth);
    expect(equipmentArea).toBeLessThan(zoneArea);
    expect(zoneArea).toBeLessThan(area);
    for (const zone of zones) {
      expect(zone.x + zone.w).toBeLessThanOrEqual(width);
      expect(zone.z + zone.d).toBeLessThanOrEqual(depth);
      for (const machine of zone.machines) {
        expect(machine.x - machine.allowance.w / 2).toBeGreaterThanOrEqual(
          zone.x,
        );
        expect(machine.x + machine.allowance.w / 2).toBeLessThanOrEqual(
          zone.x + zone.w,
        );
        expect(machine.z - machine.allowance.d / 2).toBeGreaterThanOrEqual(
          zone.z,
        );
        expect(machine.z + machine.allowance.d / 2).toBeLessThanOrEqual(
          zone.z + zone.d,
        );
      }
    }
    for (let i = 0; i < zones.length; i++)
      for (let j = i + 1; j < zones.length; j++) {
        const a = zones[i],
          b = zones[j];
        expect(
          a.x + a.w <= b.x ||
            b.x + b.w <= a.x ||
            a.z + a.d <= b.z ||
            b.z + b.d <= a.z,
        ).toBe(true);
      }
  });
  it('puts the electrical room by the intake, the office centrally, and the chemical bay against the store', () => {
    const { zones, width, depth } = makeSharedPlantLayout();
    const zone = (id: string) => zones.find((z) => z.id === id)!;
    expect(
      zone('electrical').x - zone('utilities').x - zone('utilities').w,
    ).toBe(2);
    expect(zone('office').x + zone('office').w / 2).toBeGreaterThan(width / 3);
    expect(zone('office').x + zone('office').w / 2).toBeLessThan(
      (2 * width) / 3,
    );
    expect(zone('office').z + zone('office').d / 2).toBeGreaterThan(depth / 3);
    expect(zone('loading_bay').x + zone('loading_bay').w).toBe(
      zone('chemicals').x,
    );
    expect(zone('loading_bay').z).toBe(zone('chemicals').z);
    expect(
      SHARED_MACHINES.filter((m) => m.zone === 'loading_bay').map((m) => m.id),
    ).toEqual(['hypo-fill', 'acid-fill']);
  });
  it('lets the south-west stair rise continuously onto the gantry', () => {
    const { width, depth } = makeSharedPlantLayout();
    expect(sharedGantryFloor(width, depth, -1.5, depth + 12)).toBe(0);
    expect(sharedGantryFloor(width, depth, -1.5, depth + 7.5)).toBe(3);
    expect(sharedGantryFloor(width, depth, -1.5, depth + 3, 6)).toBe(6);
    expect(sharedGantryFloor(width, depth, width / 2, depth + 1.5, 0)).toBe(0);
    expect(sharedGantryFloor(width, depth, width / 2, depth + 1.5, 6)).toBe(6);
    expect(sharedGantryFloor(width, depth, width / 2, depth / 2)).toBe(0);
  });
});
