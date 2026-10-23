import { describe, expect, it } from 'vite-plus/test';
import { GULLY } from './jacuzzi-drain';
import { backwashRuns, createFilterBackwashModel } from './filter-backwash';

const run = (
  m: ReturnType<typeof createFilterBackwashModel>,
  seconds: number,
) => {
  for (let t = 0; t < seconds; t++) m.step(1);
};

describe('backwashing a sand filter', () => {
  it('lays the waste run falling all the way to the gully', () => {
    const { waste } = backwashRuns();
    for (let k = 1; k < waste.length; k++)
      expect(waste[k][1]).toBeLessThanOrEqual(waste[k - 1][1]);
    expect(waste.at(-1)![1]).toBe(GULLY.airGap);
  });

  it('goes through the whole cycle: filter dirty, stop, backwash, stop, rinse, stop, filter clean', () => {
    const m = createFilterBackwashModel();
    m.setSupply(true);
    run(m, 10);
    const dirtyFlow = m.readings().flow;
    const dirtyBar = m.readings().bedBar;
    // Stop, turn to BACKWASH, start.
    m.setSupply(false);
    m.turn();
    expect(m.position()).toBe('backwash');
    m.setSupply(true);
    run(m, 1);
    expect(m.readings().toWaste).toBeGreaterThan(0);
    const murky = m.readings().wasteDirt;
    run(m, 240);
    expect(m.readings().wasteDirt).toBeLessThan(murky * 0.05);
    // Stop, RINSE, stop, past CLOSED back to FILTER.
    m.setSupply(false);
    m.turn();
    expect(m.position()).toBe('rinse');
    m.setSupply(true);
    run(m, 30);
    m.setSupply(false);
    m.turn();
    m.turn();
    expect(m.position()).toBe('filter');
    m.setSupply(true);
    run(m, 5);
    expect(m.readings().flow).toBeGreaterThan(dirtyFlow);
    expect(m.readings().bedBar).toBeLessThan(dirtyBar);
    expect(m.readings().movedUnderFlow).toBe(0);
  });

  it('warns when the lever is moved with water flowing', () => {
    const m = createFilterBackwashModel();
    m.setSupply(true);
    m.turn();
    expect(m.readings().movedUnderFlow).toBe(1);
    expect(m.readings().warning).toBe(true);
    run(m, 6);
    expect(m.readings().warning).toBe(false);
  });
});
