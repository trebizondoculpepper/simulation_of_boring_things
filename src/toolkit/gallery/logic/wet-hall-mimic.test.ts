import { describe, expect, it } from 'vite-plus/test';
import { checkMimic } from '../../components/industrial-control/logic/mimic';
import { wetHallMimicSpec, wetHallMimicState } from './wet-hall-mimic';
import { WET_HALL_PLANT, newWetHall } from '../../../game/plant/wet-hall';

describe('the wet hall’s mimic', () => {
  it('fits its board, and drives every lamp and readout', () => {
    const state = wetHallMimicState({ wetHall: newWetHall(), mains: true });
    expect(checkMimic(wetHallMimicSpec, state)).toEqual([]);
  });

  it('lights the booster set’s LOW WATER and the break tank’s LOW once the main has failed', () => {
    const wetHall = {
      ...newWetHall(),
      breakTank: WET_HALL_PLANT.breakTank * 0.1,
      boosterTripped: true,
    };
    const state = wetHallMimicState({ wetHall, mains: false });
    expect(state.lamps.mains).toBe(false);
    expect(state.lamps['break-low']).toBe(true);
    expect(state.lamps['booster-trip']).toBe(true);
    expect(state.lamps['booster-run']).toBe(false);
    expect(state.readouts.break.level.value).toBeCloseTo(10, 6);
  });

  it('reads the make-up’s flow and the meter', () => {
    const wetHall = {
      ...newWetHall(),
      boosterRunning: true,
      flow: 12,
      meter: 431.6,
    };
    const state = wetHallMimicState({ wetHall, mains: true });
    expect(state.lamps['booster-run']).toBe(true);
    expect(state.readouts.makeup.level.value).toBe(12);
    expect(state.readouts.makeup.volume.value).toBeCloseTo(431.6, 6);
  });
});
