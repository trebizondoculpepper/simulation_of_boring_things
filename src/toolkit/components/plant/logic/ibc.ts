/**
 * A standard 1000 L IBC (intermediate bulk container, 1200 × 1000 ×
 * 1160 mm): what its view (`createIbc`) and the rooms that use it share.
 * In its own frame, its base on the floor at y = 0, its outlet toward +x.
 * Pure.
 */
export const IBC = {
  /** Its bottle's inside: floor height and depth of liquid when full, metres. */
  floor: 0.165,
  depth: 0.94,
  /** Its plan, inside: 1.13 × 0.95 m, so brimful it holds about 1,009 litres. */
  area: 1.13 * 0.95,
  outlet: [0.67, 0.22, 0] as const,
} as const;
