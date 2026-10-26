import { describe, expect, it } from 'vite-plus/test';
import { newPlantServices } from './services';
import {
  WET_HALL_PLANT,
  actOnPitPumps,
  newWetHall,
  pitPumpsRunning,
  stepWetHall,
} from './wet-hall';
import type { PitPumps } from './wet-hall';

const plant = newPlantServices();
const both: PitPumps = {
  modes: ['auto', 'auto'],
  duty: 0,
  running: [false, false],
};

describe('the backwash pit’s sump pumps', () => {
  it('runs the duty pump in AUTO when the floats call, none otherwise', () => {
    expect(pitPumpsRunning(both, true, true)).toEqual([true, false]);
    expect(pitPumpsRunning(both, false, true)).toEqual([false, false]);
    expect(pitPumpsRunning(both, true, false)).toEqual([false, false]);
  });

  it('lets the standby take the call when the duty pump is not in AUTO', () => {
    const off = actOnPitPumps(both, { act: 'mode', pump: 0, mode: 'off' });
    expect(pitPumpsRunning(off, true, true)).toEqual([false, true]);
  });

  it('runs a pump in HAND whatever the floats', () => {
    const hand = actOnPitPumps(both, { act: 'mode', pump: 1, mode: 'hand' });
    expect(pitPumpsRunning(hand, false, true)).toEqual([false, true]);
  });

  it('pumps the pit down and passes the duty to the other pump after', () => {
    let s = {
      ...newWetHall(),
      backwashTank: WET_HALL_PLANT.backwashTank * 0.6,
    };
    s = stepWetHall(s, plant, { drawn: 0, backwashed: 0 }, 1);
    expect(s.pitPumps.running).toEqual([true, false]);
    for (let t = 0; t < 12 * 3600 && s.discharging; t += 10)
      s = stepWetHall(s, plant, { drawn: 0, backwashed: 0 }, 10);
    expect(s.discharging).toBe(false);
    expect(s.pitPumps.duty).toBe(1);
  });
});
