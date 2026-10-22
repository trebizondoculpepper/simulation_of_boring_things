import { describe, expect, it } from 'vite-plus/test';
import { newBoiler } from '../../components/plant/logic/boiler-house';
import { checkMimic } from '../../components/industrial-control/logic/mimic';
import { layoutRoom } from './room-equipment';
import { BOILER_HEAT_MIMIC, boilerHeatState } from './boiler-heat-mimic';

describe('boiler heat mimic', () => {
  it('shows the live firing output of each boiler and their combined kW', () => {
    const a = { ...newBoiler(), code: 3 as const, rate: 0.5, flow: 76 };
    const b = { ...newBoiler(), code: 3 as const, rate: 0.8, flow: 78 };
    const state = boilerHeatState([
      a,
      b,
      newBoiler(),
      newBoiler(),
      newBoiler(),
      newBoiler(),
    ]);
    expect(checkMimic(BOILER_HEAT_MIMIC, state)).toEqual([]);
    expect(state.lamps['b1-fire']).toBe(true);
    expect(state.lamps['b2-fire']).toBe(true);
    expect(state.readouts.b1.output.value).toBe(150);
    expect(state.readouts.b2.output.value).toBe(240);
    expect(state.readouts.total.output.value).toBe(390);
  });

  it('drops stopped or faulted boilers to zero, and places the board in the boiler house', () => {
    const firing = { ...newBoiler(), code: 3 as const, rate: 0.6 };
    const faulted = {
      ...newBoiler(),
      code: 3 as const,
      rate: 0.8,
      lockout: 'flame-loss' as const,
    };
    const state = boilerHeatState([
      firing,
      faulted,
      newBoiler(),
      newBoiler(),
      newBoiler(),
      newBoiler(),
    ]);
    expect(state.readouts.total.output.value).toBe(180);
    expect(state.readouts.b2.output.value).toBe(0);
    expect(state.lamps['b2-fault']).toBe(true);
    expect(state.readouts.b6.output.value).toBe(0);
    expect(
      layoutRoom('boiler_house')?.placed.some(
        (p) => p.item.key === 'mimic-boiler-heat',
      ),
    ).toBe(true);
  });
});
