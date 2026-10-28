import { describe, expect, it } from 'vite-plus/test';
import { newWorld, stepWorld } from '../world';
import type { World } from '../world';
import {
  cabinetFeeds,
  doseDemand,
  doseRates,
  dosingNow,
  feedMessages,
  lowChemicals,
} from './pool-dosing';
import { bottlePumpWords, bottleReadout } from './dose-bottle';
import { DAY_TANKS } from './chemical-distribution';

const settled = (): World => {
  let w = newWorld();
  for (let t = 0; t < 30; t++) w = stepWorld(w, 1);
  return w;
};
const shut = (w: World, fitting: string): World => ({
  ...w,
  installedValves: { ...w.installedValves, [fitting]: false },
});
const footbathTank = (w: World, c: 'hypochlorite' | 'acid') =>
  w.distribution[c].tanks[DAY_TANKS[c].findIndex((t) => t.site === 'pool_04')];

describe('a pool’s dosing from its day tanks', () => {
  it('doses the footbath slowly from both its tanks while its water moves', () => {
    const w = settled();
    const r = doseRates(w, 'pool_04');
    expect(r.hypochlorite).toBeGreaterThan(0);
    expect(r.acid).toBeGreaterThan(0);
    expect(dosingNow(w, 'pool_04')).toEqual({ hypochlorite: true, acid: true });
    // A head shows it dosing, at millilitres an hour.
    const o = bottleReadout({
      capacity: 30,
      litres: 20,
      calling: false,
      pumping: true,
      asked: r.hypochlorite,
      given: r.hypochlorite,
    });
    expect(o.pump).toBe('dosing');
    expect(bottlePumpWords(o)).toMatch(/^Dosing at [0-9.]+ ml\/h$/);
  });

  it('starves the cabinet with its day tank shut off: a feed fault, its pump faulty-looking, its tank no longer drawn', () => {
    let w = shut(settled(), 'PL4.hypochlorite-day.out.iso');
    expect(doseRates(w, 'pool_04').hypochlorite).toBe(0);
    expect(doseDemand(w, 'pool_04').hypochlorite).toBeGreaterThan(0);
    expect(doseRates(w, 'pool_04').acid).toBeGreaterThan(0);
    const feeds = cabinetFeeds(w, 'pool_04', true);
    expect(feeds.fault).toEqual(['hypochlorite']);
    expect(feedMessages(feeds)).toEqual(['HYPO FEED FAULT']);
    const o = bottleReadout({
      capacity: 30,
      litres: 20,
      calling: false,
      pumping: true,
      asked: doseDemand(w, 'pool_04').hypochlorite,
      given: 0,
    });
    expect(o.pump).toBe('fault');
    const before = footbathTank(w, 'hypochlorite').litres;
    for (let t = 0; t < 600; t++) w = stepWorld(w, 1);
    expect(footbathTank(w, 'hypochlorite').litres).toBeCloseTo(before, 9);
  });

  it('shuts the cabinet’s dosing end too, and says nothing while its water is still', () => {
    const w = shut(settled(), 'PL4.cabinet.acid.iso');
    expect(feedMessages(cabinetFeeds(w, 'pool_04', true))).toEqual([
      'ACID FEED FAULT',
    ]);
    expect(cabinetFeeds(w, 'pool_04', false)).toEqual({ fault: [], low: [] });
  });

  it('calls a tank down to its dry-run cut-out low, and empty a feed fault', () => {
    const w = settled();
    const i = DAY_TANKS.acid.findIndex((t) => t.site === 'pool_04');
    const at = (litres: number): World => ({
      ...w,
      distribution: {
        ...w.distribution,
        acid: {
          ...w.distribution.acid,
          tanks: w.distribution.acid.tanks.map((t, k) =>
            k === i ? { ...t, litres } : t,
          ),
        },
      },
    });
    expect(lowChemicals(at(0.2), 'pool_04')).toEqual(['acid']);
    expect(feedMessages(cabinetFeeds(at(0.2), 'pool_04', true))).toEqual([
      'LOW ACID',
    ]);
    expect(feedMessages(cabinetFeeds(at(0), 'pool_04', true))).toEqual([
      'ACID FEED FAULT',
    ]);
  });
});
