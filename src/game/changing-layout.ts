import type { PlanFootprint } from './facility-plan';

/** Furniture stays in two banks, leaving the reception-to-pool route open. */
export const CUBICLES = [12, 14.5, 17, 31, 33.5, 36].map((minZ) => ({
  minX: 80.3,
  maxX: 84.3,
  minZ,
  maxZ: minZ + 2.2,
}));
export const LOCKER_BANKS: readonly PlanFootprint[] = [
  { minX: 94.55, maxX: 95.35, minZ: 12, maxZ: 21.6 },
  { minX: 94.55, maxX: 95.35, minZ: 28.4, maxZ: 38 },
];
export const BENCHES: readonly PlanFootprint[] = [
  { minX: 87.1, maxX: 88.05, minZ: 13.5, maxZ: 19.5 },
  { minX: 87.1, maxX: 88.05, minZ: 30.5, maxZ: 36.5 },
];
export const VANITY: PlanFootprint = {
  minX: 86,
  maxX: 92,
  minZ: 10.35,
  maxZ: 11.15,
};

/** Opaque furniture and partitions for the shared first-person collision. */
export const CHANGING_SOLIDS: readonly PlanFootprint[] = [
  ...CUBICLES.flatMap((c) => [
    { minX: c.minX, maxX: c.maxX, minZ: c.minZ, maxZ: c.minZ + 0.08 },
    { minX: c.minX, maxX: c.maxX, minZ: c.maxZ - 0.08, maxZ: c.maxZ },
    { minX: c.maxX - 0.08, maxX: c.maxX, minZ: c.minZ, maxZ: c.minZ + 1.2 },
    {
      minX: c.minX + 0.7,
      maxX: c.maxX - 0.5,
      minZ: c.minZ + 0.9,
      maxZ: c.minZ + 1.35,
    },
  ]),
  ...LOCKER_BANKS,
  ...BENCHES,
  VANITY,
  ...[89.2, 91.2, 93.2].map((x) => ({
    minX: x - 0.04,
    maxX: x + 0.04,
    minZ: 38.2,
    maxZ: 39.8,
  })),
];
