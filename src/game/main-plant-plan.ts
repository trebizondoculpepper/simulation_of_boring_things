import { LOOP_INNER } from './dev-corridor-plan';

export const GANTRY_INNER = LOOP_INNER - 2.6;
export const LOWER_FLOOR_Y = -3;
export const STAIR_WIDTH = 1.8;
export const STAIR_RUN = 6;
export const STAIR_STEPS = 18;

export const PLANT_STAIRS = [
  {
    corner: 'northeast',
    x: GANTRY_INNER - 1.4,
    startZ: -GANTRY_INNER,
    direction: 1,
  },
  {
    corner: 'southwest',
    x: -GANTRY_INNER + 1.4,
    startZ: GANTRY_INNER,
    direction: -1,
  },
] as const;

/** Connected walking elevation at the gantry, on either stair, and on the lower floor. */
export function mainPlantFloor(x: number, z: number) {
  for (const stair of PLANT_STAIRS) {
    const along = (z - stair.startZ) * stair.direction;
    if (
      Math.abs(x - stair.x) <= STAIR_WIDTH / 2 &&
      along >= 0 &&
      along <= STAIR_RUN
    )
      return along === 0 ? 0 : (LOWER_FLOOR_Y * along) / STAIR_RUN;
  }
  if (Math.max(Math.abs(x), Math.abs(z)) < GANTRY_INNER) return LOWER_FLOOR_Y;
  return 0;
}
