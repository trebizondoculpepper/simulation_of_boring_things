import { describe, expect, it } from 'vite-plus/test';
import { checkMimic } from '../../components/industrial-control/logic/mimic';
import {
  IDEAL_PLANT_MIMIC,
  REPEATED,
  idealPlantMimicState,
  instrumentReading,
  mimicAction,
} from './ideal-pool-plant-mimic';
import {
  actOnPlant,
  newIdealPlant,
  solvePlant,
} from '../../../game/plant/ideal-pool-plant';

describe('the ideal pool plant’s mimic', () => {
  const s = newIdealPlant();
  const f = solvePlant(s);
  const state = idealPlantMimicState(s, f);

  it('is a sound board: everything on it, every lamp driven, every readout showing', () => {
    expect(checkMimic(IDEAL_PLANT_MIMIC, state)).toEqual([]);
  });

  it('repeats every instrument in the room, reading what the instrument reads', () => {
    const ids = new Set(IDEAL_PLANT_MIMIC.readouts.map((r) => r.id));
    for (const id of REPEATED) expect(ids.has(id), id).toBe(true);
    expect(state.readouts['filter.outlet.meter'].live.value).toBe(
      f.meter['filter.outlet.meter'],
    );
    expect(state.readouts['pump.discharge.pi'].live.value).toBe(
      f.gauge['pump.discharge.pi'],
    );
    expect(instrumentReading('suction.ti', s, f)!.value).toBe(
      s.thermometer['suction.ti'],
    );
  });

  it('lights the valves by where they stand: the bypass throttled shows neither open nor shut', () => {
    expect(state.lamps['pump.suction.iso-open']).toBe(true);
    expect(state.lamps['heat.out-1.valve-shut']).toBe(true);
    expect(state.lamps['bypass.valve-open']).toBe(false);
    expect(state.lamps['bypass.valve-shut']).toBe(false);
  });

  it('chases the flows, and stills them with the pump stopped', () => {
    expect(state.flows!.discharge).toBe('forward');
    const off = actOnPlant(s, { type: 'pump', run: false });
    const still = idealPlantMimicState(off, solvePlant(off));
    expect(still.flows!.discharge).toBe('still');
    expect(still.lamps['pump-run']).toBe(false);
  });

  it('starts and stops the pump, and sets the time', () => {
    expect(mimicAction('pump/stop')).toEqual({ type: 'pump', run: false });
    expect(mimicAction('speed/600')).toEqual({ type: 'speed', speed: 600 });
    expect(mimicAction('speed/7')).toBeNull();
  });

  it('lights TRIPPED for a tripped pump, and the interlock valve’s lens by where it stands', () => {
    const tripped = { ...s, tripped: true, pumpRunning: false, interlock: 0 };
    const t = idealPlantMimicState(tripped, solvePlant(tripped));
    expect(t.lamps['pump-tripped']).toBe(true);
    expect(t.lamps['mv-shut']).toBe(true);
    expect(state.lamps['mv-open']).toBe(true);
    expect(state.lamps['pump-tripped']).toBe(false);
    expect(mimicAction('speed/3600')).toEqual({ type: 'speed', speed: 3600 });
  });
});
