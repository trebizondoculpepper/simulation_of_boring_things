import { describe, expect, it } from 'vite-plus/test';
import { SCHEMATICS, schematicExpansion } from './schematics';
import { MODEL_VALVES } from './model-valves';
import { INSTALLED_VALVES } from './installed-valves';
import {
  EQUIPMENT_VALVES,
  bulkTankValves,
  dayTankValves,
  distributionPaths,
  selectorValves,
  transferPumpValves,
} from './chemical-valves';
import {
  DAY_TANKS,
  newChemicalDistribution,
  stepDistribution,
} from './chemical-distribution';
import { STORE_CAPACITY } from './chemicals';
import {
  OLYMPIC_CHEMICAL_LINKS,
  olympicChemicalExpansion,
} from './olympic-chemical-schematic';

/**
 * Every chemical valve in the schematics (plan 085, prompt 085's gap 1):
 * each chemical link's valves given by its room's schematic with what it
 * is for, its normal state and a tag derived from the model; the plumber
 * adds nothing; and the hand valves change what the distribution can do.
 */
const ROOMS = [
  'loading_bay',
  'hypo_store',
  'acid_store',
  'wet_hall',
  'plant_pool_01',
  'plant_pool_03',
  'plant_pool_04',
];

describe('the chemical valves, in the model (plan 085)', () => {
  for (const room of ROOMS)
    it(`${room}: every chemical link has its valves, given, and the plumber adds nothing`, () => {
      const x = schematicExpansion(room)!;
      expect(x.added).toEqual([]);
      const chemical = SCHEMATICS[room]!.links.filter(
        (l) => l.medium === 'chemical',
      );
      for (const l of chemical.filter(
        // A store's main and the bay's through mains pass straight on; a
        // lounge quill's line was given its valves with the quill (089).
        (l) => !/main( through the bay| to its selector)?$/.test(l.id),
      ))
        expect(
          x.fittings.some((f) => f.edge === l.id || f.serves === l.targetId),
          `${room}: ${l.id}`,
        ).toBe(true);
    });

  it('plant_pool_02: the Olympic’s chemical lines are a schematic too, every link valved, the plumber adding nothing (gap 3)', () => {
    const x = olympicChemicalExpansion();
    expect(x.added).toEqual([]);
    for (const l of OLYMPIC_CHEMICAL_LINKS)
      expect(
        x.fittings.some((f) => f.edge === l.id),
        l.id,
      ).toBe(true);
    const hypo = dayTankValves('hypochlorite', 'pool_02');
    expect(hypo.actuated?.keptBy).toBe('distribution');
    expect(hypo.inlet?.tag).toBe('PL2-DT1-IV2');
    expect(dayTankValves('acid', 'pool_02').inlet?.tag).toBe('PL2-DT2-IV1');
    expect(
      MODEL_VALVES.filter((v) => v.room === 'plant_pool_02').map((v) => v.tag),
    ).toContain('PL2-DP2-NRV1');
  });

  it('tags every chemical valve from the model: room, machine, kind and number', () => {
    const chemical = MODEL_VALVES.filter((v) =>
      ['sodium hypochlorite', 'hydrochloric acid'].includes(v.route.medium),
    );
    expect(chemical.length).toBeGreaterThan(50);
    for (const v of chemical) {
      expect(v.tag, v.id).toMatch(/^[A-Z]{2}\d?-[A-Z]+\d-(IV|NRV)\d+$/);
      expect(v.role, v.id).not.toBe('');
    }
    // Unique, across the building.
    expect(new Set(chemical.map((v) => v.tag)).size).toBe(chemical.length);
    expect(bulkTankValves('hypochlorite', 2).fill.tag).toBe('HS-T2-IV1');
    expect(bulkTankValves('hypochlorite', 2).outlet.tag).toBe('HS-T2-IV3');
    expect(transferPumpValves('acid').suction.tag).toBe('AS-P1-IV1');
    expect(transferPumpValves('acid').check.tag).toBe('AS-P1-NRV1');
    expect(selectorValves('acid', 3).isolation.tag).toBe('WH-XS2-IV7');
    expect(selectorValves('acid', 3).actuated.keptBy).toBe('distribution');
  });

  it('keeps the hand valves in the world, at their normal positions; the actuated ones the distribution’s', () => {
    expect(
      INSTALLED_VALVES[
        'loading_bay|Acid delivery line|Acid delivery line valve'
      ],
    ).toMatchObject({
      tag: 'LB-CAB1-IV2',
      normal: 'closed',
    });
    const actuated = MODEL_VALVES.filter((v) => v.keptBy === 'distribution');
    // Each selector outlet's, and the Olympic's framed day tank's inlet.
    expect(actuated.length).toBe(8 + 1);
    for (const v of actuated)
      expect(
        Object.values(INSTALLED_VALVES).some((i) => i.assetId === v.id),
      ).toBe(false);
  });

  it('lists the valves the machines draw themselves, each in the model', () => {
    const ids = new Set(MODEL_VALVES.map((v) => v.id));
    for (const id of EQUIPMENT_VALVES) expect(ids.has(id), id).toBe(true);
  });

  it('moves chemical only where the hand valves let it', () => {
    const open = distributionPaths({});
    expect(open.hypochlorite.store).toBe(true);
    expect(open.acid.outlets.every(Boolean)).toBe(true);
    const pump = transferPumpValves('hypochlorite');
    const shut = distributionPaths({ [pump.discharge.id]: false });
    expect(shut.hypochlorite.store).toBe(false);
    expect(shut.acid.store).toBe(true);
    const outlet = selectorValves('acid', 0).isolation.id;
    expect(distributionPaths({ [outlet]: false }).acid.outlets[0]).toBe(false);

    // The Olympic's hypochlorite calls at the start; with its pump's
    // discharge shut it gets nothing, with it open it fills.
    let d = newChemicalDistribution();
    const stores = { ...STORE_CAPACITY };
    const step = (valves: Record<string, boolean>) => {
      const r = stepDistribution(
        d,
        stores,
        STORE_CAPACITY,
        {},
        60,
        undefined,
        distributionPaths(valves),
      );
      d = r.distribution;
      return r.taken.hypochlorite;
    };
    step({});
    const i = DAY_TANKS.hypochlorite.findIndex((t) => t.site === 'pool_02');
    expect(d.hypochlorite.serving).toBe(i);
    expect(step({ [pump.discharge.id]: false })).toBe(0);
    expect(step({})).toBeGreaterThan(0);
  });
});
