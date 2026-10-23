import { describe, expect, it } from 'vite-plus/test';
import {
  FILTER_SPEC,
  filterFlows,
  moveLever,
  stepFilter,
} from './multiport-filter';
import type { FilterState } from './multiport-filter';

const clean: FilterState = { position: 'filter', dirt: 0, movedUnderFlow: 0 };
const dirty: FilterState = {
  position: 'filter',
  dirt: 1.6 * FILTER_SPEC.dirtRef,
  movedUnderFlow: 0,
};
const run = (s: FilterState, on: boolean, seconds: number) => {
  let state = s;
  for (let t = 0; t < seconds; t++) state = stepFilter(state, on, 1);
  return state;
};

describe('a multiport sand filter', () => {
  it('filters about 20 m³/h clean, back to the pool, the bed dropping a quarter of a bar', () => {
    const f = filterFlows(clean, true);
    expect(f.flow).toBeCloseTo(20, 0);
    expect(f.toReturn).toBe(f.flow);
    expect(f.toWaste).toBe(0);
    expect(f.bedBar).toBeCloseTo(0.25, 1);
  });

  it('passes less, and shows more on its gauge and across its bed, when dirty', () => {
    const c = filterFlows(clean, true);
    const d = filterFlows(dirty, true);
    expect(d.flow).toBeLessThan(c.flow);
    expect(d.bedBar).toBeGreaterThan(c.bedBar);
    expect(d.gaugeBar).toBeGreaterThan(c.gaugeBar);
  });

  it('takes dirt into the bed as it filters', () => {
    expect(run(clean, true, 600).dirt).toBeGreaterThan(0);
  });

  it('washes the dirt out in a backwash, to waste, murky at first and then clear', () => {
    let s = moveLever(dirty, 'backwash', false);
    const first = filterFlows(s, true);
    expect(first.toWaste).toBeGreaterThan(0);
    expect(first.toReturn).toBe(0);
    s = run(s, true, 240);
    const later = filterFlows(s, true);
    expect(s.dirt).toBeLessThan(dirty.dirt * 0.02);
    expect(later.wasteDirt).toBeLessThan(first.wasteDirt * 0.05);
  });

  it('rinses to waste, and passes nothing closed or with the supply off', () => {
    expect(
      filterFlows({ ...clean, position: 'rinse' }, true).toWaste,
    ).toBeGreaterThan(0);
    expect(filterFlows({ ...clean, position: 'closed' }, true).flow).toBe(0);
    expect(filterFlows(clean, false).flow).toBe(0);
  });

  it('counts moving the lever while water flows as a mistake, but not with the supply off', () => {
    expect(moveLever(dirty, 'backwash', true).movedUnderFlow).toBe(1);
    expect(moveLever(dirty, 'backwash', false).movedUnderFlow).toBe(0);
  });
});
