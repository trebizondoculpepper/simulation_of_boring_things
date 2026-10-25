import { describe, expect, it } from 'vite-plus/test';
import { equipmentCatalogue } from '../../../game/plant/equipment-catalogue';
import { UNWIRED, WORLD_BINDINGS } from './world-bindings';

describe('the real plant rooms’ machines, wired to the world', () => {
  const catalogue = equipmentCatalogue();

  it('has a binding for every catalogued machine', () => {
    const missing = [
      ...new Set(
        catalogue
          .map((asset) => asset.key.split(':')[0])
          .filter((kind) => !(kind in WORLD_BINDINGS)),
      ),
    ];
    expect(missing).toEqual([]);
  });

  it('says why each passive one need not be wired, and what each wired one reads', () => {
    for (const [kind, b] of Object.entries(WORLD_BINDINGS)) {
      if (b.binding === 'world')
        expect(b.reads.length, kind).toBeGreaterThan(3);
      if (b.binding === 'passive')
        expect(b.why.length, kind).toBeGreaterThan(3);
    }
  });

  it('only ever has fewer left to wire', () => {
    // Shrink this list as each is wired; never grow it.
    expect(UNWIRED).toEqual(
      [
        'bms-outstation',
        'calorifier',
        'contact-tank',
        'fire-repeater',
        'pressurisation',
      ].sort(),
    );
  });
});
