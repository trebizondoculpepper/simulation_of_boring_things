import { describe, expect, it } from 'vite-plus/test';
import { advance, applyAction, newWorld } from '../world';
import { GAS_ZONE_IDS, extractRunning, gasAlarmsOf } from './gas';
import {
  CHLORINE,
  OZONE,
} from '../../toolkit/components/general-safety/logic/gas-detection';

describe('the building’s gas detection', () => {
  it('starts clear, with every extract running', () => {
    const w = newWorld();
    for (const id of GAS_ZONE_IDS) {
      expect(w.gas[id].state.reading).toBe(0);
      expect(extractRunning(w.plant, id), id).toBe(true);
    }
    expect(gasAlarmsOf(w.gas, CHLORINE)).toEqual({ a1: false, a2: false });
  });

  it('alarms on acid put into the hypochlorite, and resets only once the store is clear', () => {
    let w = applyAction(newWorld(), {
      type: 'gas/act',
      zone: 'hypo_store',
      act: 'misdeliver',
    });
    w = advance(w, 300, 1);
    expect(w.gas.hypo_store.state.a2).toBe(true);
    expect(w.gas.acid_store.state.reading).toBe(0);
    expect(gasAlarmsOf(w.gas, CHLORINE).a2).toBe(true);
    expect(gasAlarmsOf(w.gas, OZONE).a1).toBe(false);
    const stuck = applyAction(w, {
      type: 'gas/act',
      zone: 'hypo_store',
      act: 'reset',
    });
    expect(stuck.gas.hypo_store.state.a2).toBe(true);
    w = advance(w, 3600, 1);
    w = applyAction(w, { type: 'gas/act', zone: 'hypo_store', act: 'reset' });
    expect(w.gas.hypo_store.state.a2).toBe(false);
  });
});
