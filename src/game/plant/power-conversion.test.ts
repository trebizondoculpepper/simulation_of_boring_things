import { describe, expect, it } from 'vite-plus/test';
import {
  BATTERY_40,
  INVERTER_40,
  MOTOR_PF,
  NK_150_315,
  acAmps,
  batteryEnergy,
  dcAmps,
  pumpDrive,
  stepPowerChain,
} from './power-conversion';
import type { PowerChainState } from './power-conversion';

/** Run the chain with a pump on it for `seconds`, the supply at `volts`. */
function run(state: PowerChainState, volts: number, seconds: number, dt = 1) {
  let s = state;
  let last = stepPowerChain(s, volts, 0, 0);
  let pumpVolts = s.inverterOn ? INVERTER_40.outputVolts : 0;
  let stoppedAt = -1;
  for (let t = 0; t < seconds; t += dt) {
    const pump = pumpDrive(NK_150_315, pumpVolts);
    last = stepPowerChain(s, volts, pump.kW, dt);
    s = last.state;
    pumpVolts = last.outputVolts;
    if (stoppedAt < 0 && !pumpDrive(NK_150_315, pumpVolts).running)
      stoppedAt = t;
  }
  return { state: s, last, stoppedAt };
}

describe('currents, as the panels show them', () => {
  it('gives the pump about 54 A at 400 V and its 0.86 power factor', () => {
    expect(acAmps(32, 400, MOTOR_PF)).toBeCloseTo(53.7, 1);
  });
  it('gives the battery about 78 A when it carries the pump', () => {
    expect(dcAmps(32 / 0.95, 432)).toBeCloseTo(78, 0);
  });
  it('gives nothing at no voltage', () => {
    expect(acAmps(32, 0)).toBe(0);
    expect(dcAmps(32, 0)).toBe(0);
  });
});

describe('the rectifier, battery and inverter', () => {
  it('holds 4.32 kWh: 36 blocks of 12 V, 10 Ah', () => {
    expect(batteryEnergy(BATTERY_40)).toBeCloseTo(4.32, 9);
  });

  it('runs the pump from the 450 V supply, the battery staying full', () => {
    const { state, last } = run({ charge: 1, inverterOn: true }, 450, 600);
    expect(state.charge).toBe(1);
    expect(last.inverterKW).toBe(32);
    expect(last.outputVolts).toBe(400);
    expect(last.batteryKW).toBeCloseTo(0, 9);
    // The rectifier carries it: 32 kW over the inverter's 95 %.
    expect(last.rectifierKW).toBeCloseTo(32 / 0.95, 6);
  });

  it('carries the pump on battery when the supply is switched off, then stops it when flat', () => {
    const { state, stoppedAt } = run({ charge: 1, inverterOn: true }, 0, 1200);
    // 4.32 kWh at 32 / 0.95 kW: about 7.7 minutes.
    const expected = (4.32 / (32 / 0.95)) * 3600;
    expect(stoppedAt).toBeGreaterThan(expected - 2);
    expect(stoppedAt).toBeLessThan(expected + 2);
    expect(state.charge).toBeLessThan(0.01);
    expect(state.inverterOn).toBe(false);
  });

  it('stays off once flat, without hunting on and off, until the supply returns', () => {
    let s: PowerChainState = { charge: 1, inverterOn: true };
    let volts = 400;
    const ons: boolean[] = [];
    for (let t = 0; t < 1200; t++) {
      const step = stepPowerChain(s, 0, pumpDrive(NK_150_315, volts).kW, 1);
      s = step.state;
      volts = step.outputVolts;
      ons.push(s.inverterOn);
    }
    const first = ons.indexOf(false);
    expect(ons.slice(first).every((on) => !on)).toBe(true);
  });

  it('restarts when the supply comes back, and recharges at its charge limit', () => {
    const flat = run({ charge: 1, inverterOn: true }, 0, 1200).state;
    const back = run(flat, 450, 600);
    expect(back.state.inverterOn).toBe(true);
    // 10 minutes at 4 kW is 0.67 kWh, about 15 % of 4.32 kWh.
    expect(back.state.charge).toBeCloseTo(
      flat.charge + (4 * 600) / 3600 / 4.32,
      3,
    );
  });

  it('takes no input outside its range: 500 V is too high, 300 V too low', () => {
    expect(
      stepPowerChain({ charge: 1, inverterOn: true }, 500, 0, 1).rectifierOn,
    ).toBe(false);
    expect(
      stepPowerChain({ charge: 1, inverterOn: true }, 300, 0, 1).rectifierOn,
    ).toBe(false);
    expect(
      stepPowerChain({ charge: 1, inverterOn: true }, 450, 0, 1).rectifierOn,
    ).toBe(true);
  });

  it('gives the pump nothing with its isolator off, and the battery is not drawn', () => {
    const step = stepPowerChain({ charge: 0.5, inverterOn: true }, 0, 0, 60);
    expect(step.batteryKW).toBe(0);
    expect(step.state.charge).toBe(0.5);
  });
});
