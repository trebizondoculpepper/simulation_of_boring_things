import { condensingBoilerModel } from '../../toolkit/components/plant/logic/boiler-house';
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
  /** Model identifier only when recorded on the actual equipment. */
  model?: string;
  /** What it is for, as engineering documentation; its description is inferred (prompt 060). */
  purpose: string;
}

export const INSTALLED_FIXTURES: Readonly<Record<string, InstalledFixture>> = {
  // Individual boilers within the three installed cascades, under their existing plates.
  ...Object.fromEntries(
    [1, 2, 3, 4, 5, 6].map((n) => [
      `B-50${n}`,
      {
        assetId: `asset-0${120 + n}`,
        room: 'boiler_house',
        name: `Condensing boiler B-50${n}`,
        kind: 'boiler',
        brand: 'hamwarmy',
        model: condensingBoilerModel(),
        purpose: 'Heats the shared low-temperature heating circuit.',
      },
    ]),
  ),
  'PL1-GD1': {
    assetId: 'asset-0115',
    room: 'plant_pool_01',
    name: 'Lounge pool ozone-in-air monitor',
    kind: 'ozone-monitor',
    brand: 'warden',
    purpose:
      'Detects ozone leaking into the lounge plant room and operates its alarm station.',
  },
  'PL2-GD1': {
    assetId: 'asset-0116',
    room: 'plant_pool_02',
    name: 'Olympic pool ozone-in-air monitor',
    kind: 'ozone-monitor',
    brand: 'warden',
    purpose:
      'Detects ozone leaking into the Olympic plant room and operates its alarm station.',
  },
  'PL3-BT1': {
    assetId: 'asset-0107',
    room: 'plant_pool_03',
    name: 'Jacuzzi balance tank',
    kind: 'balance-tank',
    brand: 'lidoluxe',
    purpose:
      "Takes the spa's overflow and holds the water the bathers and jets displace, for the circulation pump to draw from.",
  },
  'PL2-T1-LT1': {
    assetId: 'asset-0127',
    room: 'plant_pool_02',
    name: 'Olympic balance tank ultrasonic level transmitter',
    kind: 'level-transmitter',
    brand: 'trager-feinstein',
    purpose:
      'Measures the water depth in the Olympic balance tank and sends its level signal to the pool control panel.',
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
  // The lounge's two (prompt 066), one on each filter's outlet.
  ...Object.fromEntries(
    [1, 2].map((n) => [
      `PL1-F${n}-FT1`,
      {
        assetId: `asset-0${116 + n}`,
        room: 'plant_pool_01',
        name: `Lounge filter ${n} outlet flowmeter`,
        kind: 'flowmeter',
        brand: 'kessler-moody',
        purpose: `Measures the flow through filter ${n}: up its outlet in service, down it while backwashing.`,
      },
    ]),
  ),
};
