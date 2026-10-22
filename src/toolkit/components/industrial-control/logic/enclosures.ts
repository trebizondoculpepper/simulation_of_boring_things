/**
 * The sizes of the wall-hung switchgear enclosures, and where their cable
 * glands are: one source for their views and for the conduit routed to
 * them, so a conduit always ends on a gland. Pure; metres. Each is built
 * with its back on the wall at z = 0, its middle at y = 0, its front
 * toward +z.
 */

export interface Enclosure {
  /** Its body: width, height, and depth out from the wall. */
  w: number;
  h: number;
  d: number;
  /** Its glands on its top: across from its middle, out from the wall, and how tall. */
  glands: { x: readonly number[]; z: number; h: number };
}

/** Voltara's rotary isolator (`createPowerIsolator`), about 115 × 160 × 105 mm: a supply gland and a feed gland. */
export const POWER_ISOLATOR: Enclosure = {
  w: 0.115,
  h: 0.16,
  d: 0.105,
  glands: { x: [-0.03, 0.03], z: 0.0525, h: 0.016 },
};

/** Voltara's switch-fuse (`createSwitchFuse`), 200 × 300 × 150 mm: one supply gland on its top. */
export const SWITCH_FUSE: Enclosure = {
  w: 0.2,
  h: 0.3,
  d: 0.15,
  // Its gland 5 cm out from the wall, where the conduit runs down it
  // (`STANDOFF` in `room-services.ts`).
  glands: { x: [0], z: 0.05, h: 0.02 },
};

/** How far above its middle a conduit entering its top glands ends. */
export const glandTop = (e: Enclosure) => e.h / 2 + e.glands.h;
