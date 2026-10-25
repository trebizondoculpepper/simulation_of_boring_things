import type { BrandId } from '../../toolkit/components/core/logic/brands';
import type { KindId } from './equipment-kinds';

/**
 * Installed equipment drawn outside a room's equipment layout: by its
 * packaged cabinet's services, its plumbing or a hall of its own. Each
 * has a permanent asset id and its plate's tag, as the layout's items do
 * (`installed-asset-ids.ts`), so the inventory, the console's `status` and
 * the information overlay all know it (the owner, 2026-10-25: everything
 * registered; `registration.test.ts` finds any tag written in the code
 * that no register holds). Asset ids are never reused.
 */
export interface InstalledFixture {
  assetId: string;
  room: string;
  name: string;
  kind: KindId;
  brand: BrandId | 'unbranded';
  /** What it is for, as engineering documentation; its description is inferred (prompt 060). */
  purpose: string;
}

export const INSTALLED_FIXTURES: Readonly<Record<string, InstalledFixture>> = {
  'PL3-BT1': {
    assetId: 'asset-0107',
    room: 'plant_pool_03',
    name: 'Jacuzzi balance tank',
    kind: 'balance-tank',
    brand: 'lidoluxe',
    purpose:
      "Takes the spa's overflow and holds the water the bathers and jets displace, for the circulation pump to draw from.",
  },
  'PL2-T1': {
    assetId: 'asset-0108',
    room: 'plant_pool_02',
    name: 'Olympic pool balance tank',
    kind: 'balance-tank',
    brand: 'unbranded',
    purpose:
      "Takes the Olympic pool's overflow and main drains, for its circulation pumps to draw from, topped up by its make-up.",
  },
  'PL2-P1-FT1': {
    assetId: 'asset-0109',
    room: 'plant_pool_02',
    name: 'Olympic pumps discharge flowmeter',
    kind: 'flowmeter',
    brand: 'kessler-moody',
    purpose: "Measures the circulation pumps' total discharge to the filters.",
  },
  // The circulation pumps, each its own motor and starter
  // (`motor-starters.ts`), within their rooms' pump sets (PL1-P1, PL2-P1):
  // registered one by one so each can be described and found (prompt 060).
  'P-101A': {
    assetId: 'asset-0115',
    room: 'plant_pool_02',
    name: 'Olympic pool duty circulation pump',
    kind: 'pump',
    brand: 'grundflow',
    purpose: 'Circulates the Olympic pool, the duty pump of PL2-P1.',
  },
  'P-101B': {
    assetId: 'asset-0116',
    room: 'plant_pool_02',
    name: 'Olympic pool standby circulation pump',
    kind: 'pump',
    brand: 'grundflow',
    purpose: 'Circulates the Olympic pool, the standby pump of PL2-P1.',
  },
  'P-201A': {
    assetId: 'asset-0117',
    room: 'plant_pool_01',
    name: 'Lounge pool duty circulation pump',
    kind: 'pump',
    brand: 'grundflow',
    purpose: 'Circulates the lounge pool, the duty pump of PL1-P1.',
  },
  'P-201B': {
    assetId: 'asset-0118',
    room: 'plant_pool_01',
    name: 'Lounge pool standby circulation pump',
    kind: 'pump',
    brand: 'grundflow',
    purpose: 'Circulates the lounge pool, the standby pump of PL1-P1.',
  },
  ...Object.fromEntries(
    [1, 2, 3, 4, 5].map((n) => [
      `PL2-F${n}-FT1`,
      {
        assetId: `asset-0${109 + n}`,
        room: 'plant_pool_02',
        name: `Olympic filter ${n} outlet flowmeter`,
        kind: 'flowmeter',
        brand: 'kessler-moody',
        purpose: `Measures the flow through filter ${n}: up its outlet in service, down it while backwashing.`,
      },
    ]),
  ),
};
