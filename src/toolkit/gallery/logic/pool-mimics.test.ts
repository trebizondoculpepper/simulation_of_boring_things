import { describe, expect, it } from 'vite-plus/test';
import { checkMimic } from '../../components/industrial-control/logic/mimic';
import { DEMO_LOOP, plantAt } from './control-room-demo';
import {
  AIR_MIMIC,
  HEATING_MIMIC,
  MAIN_POOL_MIMIC,
  airState,
  heatingState,
  mainPoolState,
} from './pool-mimics';

const boards = [
  ['main pool', MAIN_POOL_MIMIC, mainPoolState],
  ['heating', HEATING_MIMIC, heatingState],
  ['air handling', AIR_MIMIC, airState],
] as const;

describe.each(boards)('the %s mimic', (_name, spec, state) => {
  it('fits its board, and drives every lamp and readout', () => {
    for (let s = 0; s < DEMO_LOOP; s += 10)
      expect(checkMimic(spec, state(plantAt(s)))).toEqual([]);
  });

  it('shows something on every readout in its first mode, or says nothing', () => {
    const shown = state(plantAt(0));
    const first = spec.modes[0].id;
    const blank = spec.readouts.filter((r) => !shown.readouts[r.id]?.[first]);
    expect(blank.length).toBeLessThan(spec.readouts.length);
  });
});

describe('the main pool mimic', () => {
  it('lights filter 2’s lamp when its pressure difference is high', () => {
    for (let s = 0; s < DEMO_LOOP; s += 5) {
      const reading = plantAt(s);
      expect(mainPoolState(reading).lamps['f2-dp']).toBe(
        reading.filterDp[1] > 0.7,
      );
    }
  });
});
