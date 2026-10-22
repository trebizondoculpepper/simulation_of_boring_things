/**
 * The dosing chemicals' stores, and what the building takes for given.
 *
 * Two chemicals are stocked and used up: sodium hypochlorite (14 %), in
 * the hypochlorite store's three bulk tanks, and acid for pH correction,
 * in the acid store's one IBC on its spill pallet. Each pool's dosing
 * draws on them while its water circulates; a store run dry stops that
 * chemical's dosing everywhere until a delivery refills it.
 *
 * Some supplies are not modelled but taken as steady (`SUPPLIES`): the
 * incoming electricity and the natural gas.
 */

/** What is assumed always there and always right. */
export const SUPPLIES = {
  /** The incoming supply: 400 V three-phase, 50 Hz (UK, BS 7671). */
  volts: 400,
  hertz: 50,
  /** Natural gas at the meter's outlet, mbar (UK low pressure, 21 mbar). */
  gasMbar: 21,
} as const;

export type Chemical = 'hypochlorite' | 'acid';
export const CHEMICALS: readonly Chemical[] = ['hypochlorite', 'acid'];

/** Each store's capacity, litres: 3 × 4,000 l tanks; one 1,000 l IBC. */
export const STORE_CAPACITY: Record<Chemical, number> = {
  hypochlorite: 12000,
  acid: 1000,
};

/**
 * What each pool's dosing uses, litres a day per m³ of water: about
 * 60 ml of 14 % hypochlorite, and four tenths as much acid, a typical
 * pool's daily demand at its usual bathing load.
 */
export const DOSE_PER_M3_DAY: Record<Chemical, number> = {
  hypochlorite: 0.06,
  acid: 0.024,
};

/** Litres in each store. */
export type ChemicalStores = Record<Chemical, number>;

export const newChemicalStores = (): ChemicalStores => ({
  ...STORE_CAPACITY,
});

/** Whether a store has any left to dose. */
export const inStock = (stores: ChemicalStores, chemical: Chemical) =>
  stores[chemical] > 0;

/**
 * The stores `dt` seconds on, each drawn on by the pools dosing from it:
 * `dosing` lists the volumes of water (m³) being dosed with each.
 */
export function stepChemicalStores(
  stores: ChemicalStores,
  dosing: Record<Chemical, number>,
  dt: number,
): ChemicalStores {
  const days = dt / 86400;
  const out = { ...stores };
  for (const c of CHEMICALS)
    out[c] = Math.max(0, stores[c] - DOSE_PER_M3_DAY[c] * dosing[c] * days);
  return out;
}

/** A tanker's or an IBC's delivery: topped up, never over the store's capacity. */
export const deliver = (
  stores: ChemicalStores,
  chemical: Chemical,
  litres: number,
): ChemicalStores => ({
  ...stores,
  [chemical]: Math.min(STORE_CAPACITY[chemical], stores[chemical] + litres),
});

/**
 * Where a pool's pH heads, given what is dosed into it: both chemicals
 * hold it at 7.4; hypochlorite alone (it is alkaline, and carbon dioxide
 * leaves the water) lets it rise toward 8.2; acid alone, its pump still
 * dosing at the rate that balanced the hypochlorite, drives it down
 * toward 6.5; neither, it drifts up toward 7.9 as the water degasses.
 */
export function phTarget(hypochlorite: boolean, acid: boolean): number {
  if (hypochlorite && acid) return 7.4;
  if (hypochlorite) return 8.2;
  if (acid) return 6.5;
  return 7.9;
}
