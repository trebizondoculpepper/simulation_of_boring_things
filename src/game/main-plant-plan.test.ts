import { describe, expect, it } from 'vite-plus/test';
import {
  GANTRY_INNER,
  LOWER_FLOOR_Y,
  mainPlantFloor,
  PLANT_STAIRS,
  STAIR_RUN,
} from './main-plant-plan';

describe('main plant room stairs', () => {
  it('connects both corner gantry entries continuously to the lower floor', () => {
    for (const stair of PLANT_STAIRS) {
      expect(mainPlantFloor(stair.x, stair.startZ)).toBe(0);
      expect(
        mainPlantFloor(
          stair.x,
          stair.startZ + (stair.direction * STAIR_RUN) / 2,
        ),
      ).toBe(LOWER_FLOOR_Y / 2);
      expect(
        mainPlantFloor(stair.x, stair.startZ + stair.direction * STAIR_RUN),
      ).toBe(LOWER_FLOOR_Y);
    }
  });

  it('keeps the remaining gantry at entry height and the pit on the lower level', () => {
    expect(mainPlantFloor(0, GANTRY_INNER + 1)).toBe(0);
    expect(mainPlantFloor(0, 0)).toBe(LOWER_FLOOR_Y);
  });
});
