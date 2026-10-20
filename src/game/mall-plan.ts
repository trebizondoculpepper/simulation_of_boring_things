/**
 * The shopping mall the leisure centre opens off. It is scenery only: the
 * player sees it through the reception glazing but may not walk into it.
 * Plan x runs east, plan z runs south, one unit to a metre, as in
 * `facility-plan.ts`.
 *
 * The reception's street entrance (east wall, x = 112) opens onto a long
 * north-south concourse; the glazed south wall of reception looks into a
 * side court off the same concourse. The low windows elsewhere on the
 * building look into windowless back-of-house service bays.
 */
import type { PlanFootprint } from './facility-plan';
import { PORTALS } from './doors';

/** The mall's name, on its directory board. */
export const MALL_NAME = 'Linden Court Shopping Centre';

/** The sign over the leisure centre's entrance, seen from the concourse. */
export const POOL_SIGN = {
  title: 'Linden Court Leisure Pool',
  subtitle: 'Swimming  ·  Learner pool  ·  Spa',
};

/** The long concourse in front of reception. */
export const CONCOURSE: PlanFootprint = {
  minX: 112,
  maxX: 136,
  minZ: -60,
  maxZ: 110,
};

/** A side court south of reception, open to the concourse on its east. */
export const COURT: PlanFootprint = { minX: 96, maxX: 112, minZ: 35, maxZ: 55 };

/** Section through the concourse, metres above the floor. */
export const SECTION = {
  /** Flat soffit over the shop fronts, and over the court. */
  soffit: 6,
  /** Where the barrel-vault rooflight springs from its upstands. */
  spring: 8,
  /** The vault's crown. */
  crown: 10.5,
  /** The vault's width, centred on the concourse. */
  vaultWidth: 12,
  /** The shutter or glazing height of a shop front. */
  front: 4,
};

/** How deep the visible interior of each shop unit is, metres. */
export const UNIT_DEPTH = 5;

/** The entrance door that the mall side keeps locked. */
export const ENTRANCE = (() => {
  const portal = PORTALS.find((p) => p.id === 'door:entrance');
  if (!portal) throw new Error('No street entrance in the door plan.');
  return portal;
})();

/** Doors that never open: the mall is not part of the game. */
export const LOCKED_PORTALS: ReadonlySet<string> = new Set([ENTRANCE.id]);

/**
 * A solid slab just outside the entrance doors: even if the door were
 * somehow open, nobody walks out into the mall.
 */
export const MALL_SOLIDS: readonly PlanFootprint[] = [
  {
    minX: ENTRANCE.x + 0.1,
    maxX: ENTRANCE.x + 0.6,
    minZ: ENTRANCE.z - ENTRANCE.width / 2 - 0.3,
    maxZ: ENTRANCE.z + ENTRANCE.width / 2 + 0.3,
  },
];

export type UnitState = 'shuttered' | 'dark' | 'to-let';

/** One shop unit's frontage. */
export interface ShopUnit {
  /** The frontage line it faces from. */
  frontage: 'west' | 'east' | 'court';
  /** Stretch along the frontage: z on the concourse, x in the court. */
  from: number;
  to: number;
  name: string;
  state: UnitState;
}

/** Invented, generic names for the shops. Any likeness is accidental. */
const SHOP_NAMES = [
  'Wicks & Wax',
  'Phone Clinic',
  'Sole Proprietor',
  'Knot & Salt Pretzels',
  'Far Away Travel',
  'Cardigan County',
  'Lumen Opticians',
  'The Greeting Card Depot',
  'Nails & Brows',
  'Keys Cut · Shoes Mended',
  'Video Vault',
  'Little Acorns Toys',
  'Pound Plus',
  'Halcyon Bridal',
  'Spud Express',
  'Gadget Grotto',
];

/** Split a frontage into units close to `width` metres wide. */
export function splitFrontage(from: number, to: number, width = 8) {
  const count = Math.max(1, Math.round((to - from) / width));
  const step = (to - from) / count;
  return Array.from({ length: count }, (_, i) => ({
    from: from + i * step,
    to: from + (i + 1) * step,
  }));
}

/** Frontage runs: west side broken by reception and the court. */
const FRONTAGES: readonly {
  frontage: ShopUnit['frontage'];
  from: number;
  to: number;
}[] = [
  { frontage: 'west', from: CONCOURSE.minZ, to: 13 },
  { frontage: 'west', from: COURT.maxZ, to: CONCOURSE.maxZ },
  { frontage: 'east', from: CONCOURSE.minZ, to: 20 },
  { frontage: 'east', from: 30, to: CONCOURSE.maxZ },
  { frontage: 'court', from: COURT.minX, to: COURT.maxX },
];

/**
 * The opening on the east frontage, opposite the pool entrance, into a
 * dark passage signed for the toilets and car park.
 */
export const PASSAGE = { from: 20, to: 30, depth: 16 };

export const UNITS: readonly ShopUnit[] = (() => {
  const units: ShopUnit[] = [];
  let named = 0;
  for (const run of FRONTAGES)
    for (const span of splitFrontage(run.from, run.to)) {
      const index = units.length;
      // Most are shuttered, some dark behind glass, a few to let.
      const state: UnitState =
        index % 5 === 3 ? 'to-let' : index % 3 === 1 ? 'dark' : 'shuttered';
      const name =
        state === 'to-let' ? 'To Let' : SHOP_NAMES[named++ % SHOP_NAMES.length];
      units.push({ ...run, ...span, name, state });
    }
  return units;
})();

/**
 * Light falling off along the concourse away from the pool entrance:
 * 1 near the entrance, fading to a dim floor at the far ends.
 */
export function dimming(z: number) {
  const distance = Math.abs(z - ENTRANCE.z);
  const near = 30;
  const far = 80;
  const floor = 0.14;
  if (distance <= near) return 1;
  if (distance >= far) return floor;
  const t = (distance - near) / (far - near);
  // Smoothstep, so the fade has no visible edge.
  return 1 - (1 - floor) * t * t * (3 - 2 * t);
}

/** A closed, windowless service bay seen through a low window. */
export interface ServiceBay extends PlanFootprint {
  height: number;
}

/**
 * Back-of-house bays outside the low windows: the changing village's
 * south windows, the boiler room's north window and the engineer's
 * office's east window look into the mall's service corridors.
 */
export const SERVICE_BAYS: readonly ServiceBay[] = [
  { minX: 80.1, maxX: 96, minZ: 40.12, maxZ: 44.5, height: 4 },
  { minX: 34, maxX: 60, minZ: -24.5, maxZ: -20.12, height: 4.5 },
  {
    minX: 104.12,
    maxX: 112 - UNIT_DEPTH - 0.2,
    minZ: -16,
    maxZ: -1,
    height: 3.5,
  },
];
