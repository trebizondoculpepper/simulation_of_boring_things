import { describe, expect, it } from 'vite-plus/test';
import { newCo2Plant, stepCo2Plant } from './co2-plant';
import type { Co2Plant, Co2PlantInputs } from './co2-plant';
import {
  linePressure,
  masterOpen,
  resetMaster,
  setMaster,
  setPortLeak,
} from './co2-distribution';
import { CO2_PANEL, co2Feedback, setCo2Mode } from './co2-dosing';
import { channelStatus } from './aqualis-controller';
import { bankContents } from '../../toolkit/components/plant/logic/co2-supply';

const DRIVE: Co2PlantInputs = {
  rooms: {
    plant_pool_01: { demand: 0.5, connected: true, waterFlowing: true },
    plant_pool_02: { demand: 0.5, connected: true, waterFlowing: true },
  },
};

function run(p: Co2Plant, seconds: number, i = DRIVE, dt = 10) {
  const grams = { plant_pool_01: 0, plant_pool_02: 0 };
  for (let t = 0; t < seconds; t += dt) {
    const s = stepCo2Plant(p, i, dt);
    p = s.state;
    grams.plant_pool_01 += s.grams.plant_pool_01;
    grams.plant_pool_02 += s.grams.plant_pool_02;
  }
  return { p, grams };
}

describe('the CO₂ system, loading bay to injection point', () => {
  it('doses each room as its Trio asks, from the cylinders in the loading bay', () => {
    const { p, grams } = run(newCo2Plant(20), 3600);
    // The Lounge's solenoid: half of 300 g/h; the Olympic's mass flow controller: half of 2 kg/h.
    expect(grams.plant_pool_01).toBeCloseTo(150, 0);
    expect(grams.plant_pool_02).toBeCloseTo(1000, 0);
    const drawn = 4 * 34 - bankContents(p.distribution.supply, 'left');
    expect(drawn).toBeCloseTo(1.15, 2);
  });

  it('with the master valve shut, the line falls until both panels stop on NO SUPPLY PRESSURE', () => {
    const start = setMaster(newCo2Plant(20).distribution, false);
    const { p, grams } = run({ ...newCo2Plant(20), distribution: start }, 600);
    // Drawn down to their inlet switches, and held there: nothing draws below it.
    expect(linePressure(p.distribution)).toBeLessThan(CO2_PANEL.lowInlet);
    expect(linePressure(p.distribution)).toBeGreaterThan(1);
    // Only the line's few tens of grams got through.
    expect(grams.plant_pool_01 + grams.plant_pool_02).toBeLessThan(90);
    for (const id of ['plant_pool_01', 'plant_pool_02'] as const) {
      expect(p.dosers[id].fault).toBe('no-supply-pressure');
      expect(channelStatus(co2Feedback(p.dosers[id]), 0)).toMatchObject({
        kind: 'offline',
        reason: 'fault',
        fault: 'NO SUPPLY PRESSURE',
      });
    }
  });

  it('a leak with the extract stopped raises the room’s alarm, which shuts its dosing only', () => {
    const base = newCo2Plant(20);
    const leaking = {
      ...base,
      distribution: setPortLeak(base.distribution, 'plant_pool_01', 2000),
    };
    const stopped = { ...DRIVE, fans: { plant_pool_01: false } };
    const { p } = run(leaking, 6 * 3600, stopped, 30);
    expect(p.detectors.plant_pool_01.a1).toBe(true);
    expect(p.detectors.plant_pool_01.a2).toBe(false);
    expect(p.dosers.plant_pool_01.fault).toBe('gas-alarm');
    expect(p.dosers.plant_pool_02.fault).toBeNull();
    expect(masterOpen(p.distribution)).toBe(true);
  });

  it('a burst raises the high alarm, which trips the master valve for the whole building', () => {
    const base = newCo2Plant(20);
    // A broken joint: as much as the regulator can give (10 kg/h).
    const burst = {
      ...base,
      distribution: setPortLeak(base.distribution, 'plant_pool_01', 60000),
    };
    const stopped = { ...DRIVE, fans: { plant_pool_01: false } };
    const { p } = run(burst, 3 * 3600, stopped, 10);
    expect(p.detectors.plant_pool_01.a2).toBe(true);
    expect(p.distribution.master.tripped).toBe(true);
    // The leak has emptied the line.
    expect(linePressure(p.distribution)).toBeLessThan(0.01);
    expect(p.dosers.plant_pool_02.fault).toBe('no-supply-pressure');
    // It cannot be reset while the detector still holds it.
    expect(resetMaster(p.distribution, true).master.tripped).toBe(true);
  });

  it('a panel switched off doses nothing, and the other goes on', () => {
    const base = newCo2Plant(20);
    const off = {
      ...base,
      dosers: {
        ...base.dosers,
        plant_pool_02: setCo2Mode(base.dosers.plant_pool_02, 'off'),
      },
    };
    const { grams } = run(off, 600);
    expect(grams.plant_pool_02).toBe(0);
    expect(grams.plant_pool_01).toBeGreaterThan(0);
  });
});
