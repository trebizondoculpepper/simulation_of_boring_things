import { describe, expect, it } from 'vite-plus/test';
import { timeToEmpty } from '../../../game/plant/gravity-drain';
import {
  GULLY,
  createJacuzziDrainModel,
  drainModelParts,
  drainRun,
  layoutJacuzziDrain,
  tankOutlet,
} from './jacuzzi-drain';

describe('draining a jacuzzi', () => {
  it('lays the drain run from the valve to the gully, never rising', () => {
    const run = drainRun();
    expect(run[0]).toEqual(tankOutlet());
    for (let k = 1; k < run.length; k++)
      expect(run[k][1]).toBeLessThanOrEqual(run[k - 1][1]);
    const end = run[run.length - 1];
    expect(end[1]).toBe(GULLY.airGap);
    const gully = layoutJacuzziDrain().places[1];
    expect([end[0], end[2]]).toEqual([gully.x, gully.z]);
  });

  it('holds its water with the valve shut', () => {
    const m = createJacuzziDrainModel();
    for (let t = 0; t < 600; t++) m.step(1);
    expect(m.readings().level).toBe(1);
    expect(m.readings().drained).toBe(0);
  });

  it('empties all of its water to the drain when opened, slowing as it goes', () => {
    const m = createJacuzziDrainModel();
    const full = m.readings().litres;
    m.setOpen(true);
    m.step(1);
    const first = m.readings().flow;
    let t = 1;
    let later = 0;
    while (m.readings().level > 0 && t < 3600) {
      m.step(1);
      t++;
      if (t === 120) later = m.readings().flow;
    }
    expect(m.readings().level).toBe(0);
    expect(m.readings().drained).toBeCloseTo(full, 3);
    expect(later).toBeLessThan(first);
    const { tank, pipe } = drainModelParts();
    expect(t).toBeCloseTo(timeToEmpty(tank, pipe, 1), -1);
  });
});
