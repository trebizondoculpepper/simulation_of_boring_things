import { describe, expect, it } from 'vite-plus/test';
import {
  PROGRAMME,
  SPA_FILTERS,
  actOnSpaFilter,
  filtering,
  newSpaFilter,
  spaFilterFlows,
  spaFilterLine,
  stepSpaFilter,
} from './spa-filter';
import type { SpaFilter } from './spa-filter';

/** A packaged spa cabinet's filter and its automatic backwash (the jacuzzi's and the foot spa's). */
const run = (f: SpaFilter, seconds: number, pump = 24, dirt = 5, dt = 5) => {
  let s = f;
  for (let t = 0; t < seconds; t += dt) s = stepSpaFilter(s, pump, dirt, dt);
  return s;
};

describe('a spa cabinet’s filter', () => {
  it('filters down through its bed back to the spa, loading as it goes', () => {
    const f = run(newSpaFilter(SPA_FILTERS.jacuzzi), 12 * 3600, 24, 5, 30);
    expect(filtering(f)).toBe(true);
    const flows = spaFilterFlows(f, 24, 5);
    expect(flows.toSpa).toBe(24);
    expect(flows.outDirt).toBeLessThan(5);
    expect(f.bed.dirt).toBeGreaterThan(0.5);
  });

  it('backwashes itself on its schedule: stop, backwash to drain, rinse to drain, filter', () => {
    let f = run(newSpaFilter(SPA_FILTERS.jacuzzi, '6h'), 6 * 3600, 24, 5, 30);
    const loaded = f.bed.dirt;
    expect(f.phase).toBe('stopping');
    expect(spaFilterFlows(f, 24, 5).toSpa).toBe(0);
    f = run(f, PROGRAMME.stopping, 24, 5, 1);
    expect(f.phase).toBe('backwash');
    const washing = spaFilterFlows(f, 24, 5);
    expect(washing.bed).toBeLessThan(0);
    expect(washing.toWaste).toBe(24);
    expect(washing.wasteDirt).toBeGreaterThan(100);
    f = run(f, PROGRAMME.backwash, 24, 5, 1);
    expect(f.phase).toBe('rinse');
    expect(spaFilterFlows(f, 24, 5).toWaste).toBe(24);
    f = run(f, PROGRAMME.rinse, 24, 5, 1);
    expect(f.phase).toBe('filter');
    expect(f.bed.dirt).toBeLessThan(loaded * 0.1);
    expect(f.sinceWash).toBe(0);
  });

  it('is set by MODE, washes at once on WASH NOW, and never washes when off', () => {
    let f = newSpaFilter(SPA_FILTERS.footSpa);
    f = actOnSpaFilter(f, { act: 'mode' });
    expect(f.schedule).toBe('12h');
    f = actOnSpaFilter(actOnSpaFilter(f, { act: 'mode' }), { act: 'mode' });
    expect(f.schedule).toBe('off');
    expect(spaFilterLine(f)).toBe('WASH OFF');
    expect(run(f, 2 * 86400, 12, 5, 60).phase).toBe('filter');
    expect(actOnSpaFilter(f, { act: 'wash-now' }).phase).toBe('stopping');
  });

  it('says the same on both cabinets', () => {
    expect(spaFilterLine(newSpaFilter(SPA_FILTERS.jacuzzi))).toBe(
      'WASH 24H IN 24:00h',
    );
    const washing = run(
      actOnSpaFilter(newSpaFilter(SPA_FILTERS.footSpa), { act: 'wash-now' }),
      20,
      12,
      5,
      1,
    );
    expect(spaFilterLine(washing)).toMatch(/^BACKWASH 2:\d\d$/);
  });
});
