import { POOL_HALLS } from './pool-halls';
/** North wall, left of the water-circuit mimic, facing south into the room. */
export const JACUZZI_MUSIC_CABINET = {
  x: -1.2,
  z: -3.45,
  bottom: 1.25,
  yaw: 0,
  footprint: { minX: -1.5, maxX: -0.9, minZ: -3.95, maxZ: -3.45 },
  access: { minX: -1.5, maxX: -0.9, minZ: -3.45, maxZ: -2.55 },
} as const;

/** West-side corners picked by the owner, in the concrete above the tile line. */
export function jacuzziSpeakerMounts() {
  const hall = POOL_HALLS.pool_03;
  const x = -hall.w / 2 + 0.15;
  const y = hall.tileTop + 0.25;
  return [hall.d / 2 - 0.65, -hall.d / 2 + 0.65].map((z) => {
    const dx = -2.7 - x;
    const dz = -z;
    return {
      x,
      y,
      z,
      yaw: Math.atan2(dx, dz),
      pitch: Math.atan2(y - 1.1, Math.hypot(dx, dz)),
      wireFrom: [-hall.w / 2 + 0.003, y + 0.19, z - 0.08] as const,
      wallNormal: [1, 0, 0] as const,
    };
  });
}
