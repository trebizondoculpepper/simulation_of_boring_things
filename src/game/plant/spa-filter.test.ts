import { describe, expect, it } from 'vite-plus/test';
import {
  FIRST_WASH_AT,
  PROGRAMME,
  SPA_FILTERS,
  actOnSpaFilter,
  filtering,
  newSpaFilter,
  spaFilterFlows,
  spaFilterLine,
  stepSpaFilter,
  UV_WARM,
  washSignals,
} from './spa-filter';
import type { SpaFilter } from './spa-filter';

/** A packaged spa cabinet's filter and its automatic backwash (the jacuzzi's and the foot spa's). */
const run = (f: SpaFilter, seconds: number, pump = 8, dirt = 5, dt = 5) => {
  let s = f;
  for (let t = 0; t < seconds; t += dt) s = stepSpaFilter(s, pump, dirt, dt);
  return s;
};

describe('a spa cabinet’s filter', () => {
  it('filters down through its bed back to the spa, loading as it goes', () => {
    const f = run(newSpaFilter(SPA_FILTERS.jacuzzi), 12 * 3600, 8, 5, 30);
    expect(filtering(f)).toBe(true);
    const flows = spaFilterFlows(f, 8, 5);
    expect(flows.toSpa).toBe(8);
    expect(flows.outDirt).toBeLessThan(5);
    // Most of its capacity, a little under a 0.12 m³ bed's 0.36 kg.
    expect(f.bed.dirt).toBeGreaterThan(0.25);
  });

  it('backwashes itself on its schedule: stop, backwash to drain, rinse to drain, filter', () => {
    // Its first wash at 02:00, then every 6 hours.
    let f = run(
      newSpaFilter(SPA_FILTERS.jacuzzi, '6h'),
      FIRST_WASH_AT + 6 * 3600,
      8,
      5,
      30,
    );
    const loaded = f.bed.dirt;
    expect(f.phase).toBe('stopping');
    expect(spaFilterFlows(f, 8, 5).toSpa).toBe(0);
    f = run(f, PROGRAMME.stopping, 8, 5, 1);
    expect(f.phase).toBe('backwash');
    const washing = spaFilterFlows(f, 8, 5);
    expect(washing.bed).toBeLessThan(0);
    expect(washing.toWaste).toBe(8);
    expect(washing.wasteDirt).toBeGreaterThan(100);
    f = run(f, PROGRAMME.backwash, 8, 5, 1);
    expect(f.phase).toBe('rinse');
    expect(spaFilterFlows(f, 8, 5).toWaste).toBe(8);
    f = run(f, PROGRAMME.rinse, 8, 5, 1);
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
      // Its first wash at 02:00 the next night.
      'WASH 24H IN 26:00h',
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

describe('what a wash changes in its cabinet', () => {
  it('moves its servos, stops its pump then runs it lighter, stops its dosing, heater and jets, and puts out its UV until it warms again', () => {
    let f = actOnSpaFilter(newSpaFilter(SPA_FILTERS.jacuzzi), {
      act: 'wash-now',
    });
    expect(washSignals(newSpaFilter(SPA_FILTERS.jacuzzi))).toMatchObject({
      washing: false,
      servos: false,
      dosing: true,
      uvReady: true,
      gaugeBar: 0.7,
    });
    expect(washSignals(f)).toMatchObject({
      washing: true,
      servos: true,
      pumpAllowed: false,
      dosing: false,
      heating: false,
      jets: false,
      uvReady: false,
    });
    f = run(f, PROGRAMME.stopping + 20, 8, 5, 1);
    expect(washSignals(f)).toMatchObject({
      servos: false,
      pumpAllowed: true,
      pumpRate: 1.08,
      gaugeBar: 0.45,
    });
    expect(washSignals(f).murk).toBeGreaterThan(0.5);
    f = run(f, PROGRAMME.backwash + PROGRAMME.rinse - 20, 8, 5, 1);
    // Back to filtering: the servos move back, the UV warming up.
    expect(washSignals(f)).toMatchObject({
      washing: false,
      servos: true,
      dosing: true,
      uvReady: false,
    });
    f = run(f, UV_WARM, 8, 5, 1);
    expect(washSignals(f)).toMatchObject({ servos: false, uvReady: true });
  });
});
