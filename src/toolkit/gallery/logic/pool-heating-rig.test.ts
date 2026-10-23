import { describe, expect, it } from 'vite-plus/test';
import { boilerPorts, exchangerPorts, heatingRuns } from './pool-heating-rig';

describe('the heat exchange rig', () => {
  it('joins every run to the right connection at each end', () => {
    const r = heatingRuns();
    const b = boilerPorts();
    const x = exchangerPorts();
    expect(r.flowToPump[0]).toEqual(b.flow);
    expect(r.returnToBoiler.at(-1)).toEqual(b.return);
    expect(r.valveToExchanger.at(-1)).toEqual(x.primaryIn);
    expect(r.exchangerToTee[0]).toEqual(x.primaryOut);
    expect(r.poolIn.at(-1)).toEqual(x.poolIn);
    expect(r.poolOut[0]).toEqual(x.poolOut);
    expect(r.gas.at(-1)).toEqual(b.gas);
    expect(r.power.at(-1)).toEqual(b.power);
  });

  it('closes the primary circuit: the valve feeds the exchanger and the bypass, both back to one tee', () => {
    const r = heatingRuns();
    expect(r.flowToValve.at(-1)).toEqual(r.valveToExchanger[0]);
    expect(r.bypass[0]).toEqual(r.valveToExchanger[0]);
    expect(r.bypass.at(-1)).toEqual(r.exchangerToTee.at(-1));
    expect(r.returnToBoiler[0]).toEqual(r.exchangerToTee.at(-1));
  });

  it('lays every run square: each leg along one axis', () => {
    for (const run of Object.values(heatingRuns()))
      for (let k = 1; k < run.length; k++) {
        const moved = [0, 1, 2].filter(
          (i) => Math.abs(run[k][i] - run[k - 1][i]) > 1e-6,
        );
        expect(moved.length).toBeLessThanOrEqual(1);
      }
  });
});
