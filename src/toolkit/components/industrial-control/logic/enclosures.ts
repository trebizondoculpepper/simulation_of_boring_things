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
  // Its glands 5 cm out from the wall, in line with a switch-fuse's.
  glands: { x: [-0.03, 0.03], z: 0.05, h: 0.016 },
};

/**
 * Voltara's switch-fuse (`createSwitchFuse`), 200 × 300 × 150 mm: two
 * glands on its top, its supply in (the first, at its left as you face
 * it) and its feed out (the second), as the isolator has.
 */
export const SWITCH_FUSE: Enclosure = {
  w: 0.2,
  h: 0.3,
  d: 0.15,
  // Its glands 5 cm out from the wall, where the conduits run down it
  // (`STANDOFF` in `room-services.ts`).
  glands: { x: [-0.05, 0.05], z: 0.05, h: 0.02 },
};

/**
 * Voltara's plug-in tap-off unit for its busbar trunking
 * (`createBusbarTapOff`): a steel box hung under the bar, 200 mm along
 * it, 250 mm high, 180 mm out from the wall, its plug-in head on its top
 * engaging one of the bar's outlets, its outgoing cable's gland on its
 * foot. Its middle under the bar's; its gland's foot `TAP_OFF_GLAND`
 * below its middle.
 */
export const BUSBAR_TAP_OFF = {
  w: 0.2,
  h: 0.25,
  d: 0.18,
  gland: { h: 0.02 },
} as const;
/** How far below its middle a conduit leaving its foot's gland starts. */
export const TAP_OFF_GLAND = BUSBAR_TAP_OFF.h / 2 + BUSBAR_TAP_OFF.gland.h;

/** How far above its middle a conduit entering its top glands ends. */
export const glandTop = (e: Enclosure) => e.h / 2 + e.glands.h;
