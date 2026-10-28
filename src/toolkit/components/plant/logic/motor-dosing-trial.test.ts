import { describe, expect, it } from 'vite-plus/test';
import { diaphragmOutput, newDiaphragmState } from './diaphragm-pump';
import {
  OLYMPIC_SIZED_LH,
  askedLh,
  dmxDemand,
  dmhInputs,
  newDosingTrial,
  resetTotals,
  setDischarge,
  stepDosingTrial,
  turnYout,
} from './motor-dosing-trial';
import type { DosingTrial } from './motor-dosing-trial';

/** An hour of the trial, a second a step, the DMX dosing as its controller does. */
const hour = (t: DosingTrial) => {
  const dmx = diaphragmOutput('solenoid', newDiaphragmState(), dmxDemand(t));
  for (let i = 0; i < 3600; i++) t = stepDosingTrial(t, dmx.rate, 1).trial;
  return t;
};

describe('dev44’s trial of the DMX 1602 against the DMH 21-10', () => {
  it('asks both for the Olympic’s dose: Yout × 12.5 l/h, and 4–20 mA', () => {
    const t = turnYout(turnYout(newDosingTrial(), 1), 1);
    expect(t.yout).toBeCloseTo(0.35);
    expect(askedLh(t)).toBeCloseTo(0.35 * OLYMPIC_SIZED_LH);
    expect(dmhInputs(t).signalMa).toBeCloseTo(9.6);
    expect(dmxDemand(t)).toEqual({ running: true, rate: askedLh(t) });
  });

  it('shows the DMX falling short at the Olympic’s average draw, the DMH keeping up', () => {
    const t = hour(newDosingTrial());
    expect(t.askedL).toBeCloseTo(3.125, 2);
    expect(t.dmxL).toBeCloseTo(2.1, 2);
    // Its degassing head returns 7 % of each stroke; its 60 % dial's most
    // is 12.6 l/h, so it gives a little under what is asked.
    expect(t.dmhL / t.askedL).toBeGreaterThan(0.9);
    expect(t.dmhL / t.askedL).toBeLessThan(1);
  });

  it('delivers nothing from the DMH against its closed discharge valve, which trips its flow monitor', () => {
    const t = hour(setDischarge(newDosingTrial(), false));
    expect(t.dmhL).toBe(0);
    expect(t.dmh.error).toBe('flow');
  });

  it('starts its totals again', () => {
    const t = resetTotals(hour(newDosingTrial()));
    expect([t.askedL, t.dmxL, t.dmhL]).toEqual([0, 0, 0]);
  });
});
