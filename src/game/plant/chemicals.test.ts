import { describe, expect, it } from 'vite-plus/test';
import {
  deliver,
  inStock,
  newChemicalStores,
  STORE_CAPACITY,
  stepChemicalStores,
} from './chemicals';

const day = 86400;

describe('the dosing chemicals’ stores', () => {
  it('start full', () => {
    expect(newChemicalStores()).toEqual(STORE_CAPACITY);
  });

  it('are drawn on by the water dosed, and run dry', () => {
    // The pools' water together, about 3,000 m³: 180 l of hypochlorite
    // and 72 l of acid a day.
    let stores = newChemicalStores();
    const dosing = { hypochlorite: 3000, acid: 3000 };
    stores = stepChemicalStores(stores, dosing, day);
    expect(stores.hypochlorite).toBeCloseTo(12000 - 180, 6);
    expect(stores.acid).toBeCloseTo(4000 - 72, 6);
    // The acid's 4,000 l tank runs dry in eight weeks; the hypochlorite
    // lasts longer.
    for (let d = 1; d < 56; d++)
      stores = stepChemicalStores(stores, dosing, day);
    expect(inStock(stores, 'acid')).toBe(false);
    expect(stores.acid).toBe(0);
    expect(inStock(stores, 'hypochlorite')).toBe(true);
  });

  it('use nothing where nothing is dosed', () => {
    const stores = newChemicalStores();
    expect(
      stepChemicalStores(stores, { hypochlorite: 0, acid: 0 }, day),
    ).toEqual(stores);
  });

  it('are refilled by a delivery, never past full', () => {
    const empty = { hypochlorite: 0, acid: 0 };
    expect(deliver(empty, 'acid', 1000).acid).toBe(1000);
    expect(
      deliver(newChemicalStores(), 'hypochlorite', 5000).hypochlorite,
    ).toBe(12000);
  });
});
