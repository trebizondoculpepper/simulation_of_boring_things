import { describe, expect, it } from 'vite-plus/test';
import { createSystem, output, run, setInput, stepSystem } from '../sim/system';
import type { System } from '../sim/system';
import { BOILER, WATER_HEAT } from './heat-loop';
import { DRAIN, SUPPLY, WATER_PATH } from './bench';

/**
 * The boiler on a test bench: an endless supply at 60 °C and 1.25 bar, the
 * boiler's own water path (0.25 bar at 10 m³/h), and an endless drain at
 * 1 bar, so 10 m³/h flows through it for ever. Its controls (demand,
 * setpoint, RESET), the gas at its valve, the bench's valve and the
 * supply's pressure and temperature are worked from outside, and what it
 * does is checked against what it should.
 */
function bench(): System {
  return createSystem(
    {
      supply: { kind: SUPPLY },
      drain: { kind: DRAIN },
      path: { kind: WATER_PATH },
      boiler: { kind: BOILER },
    },
    {
      'path.pressureIn': 'supply.pressure',
      'path.pressureOut': 'drain.pressure',
      'boiler.flowIn': 'path.flow',
      'boiler.returnTemp': 'supply.temperature',
      'boiler.waterPressure': 'supply.pressure',
      'drain.temperature': 'boiler.flowTemp',
    },
    {
      'boiler.demand': false,
      'boiler.gas': true,
      'boiler.reset': false,
      'path.open': 1,
    },
  );
}

const status = (s: System) => output(s, 'boiler.status');
const outlet = (s: System) => output(s, 'drain.temperature') as number;
const flow = (s: System) => output(s, 'path.flow') as number;
const press = (s: System, input: string, value: unknown) =>
  setInput(s, input, value as never);
/** Press and release a key: on for a tick, then off. */
const key = (s: System, input: string) =>
  run(press(run(press(s, input, true), 1), input, false), 1);

describe('a boiler on a bench, between an endless supply and an endless drain', () => {
  it('passes 10 m³/h straight through while off, its outlet the supply’s temperature', () => {
    const s = run(bench(), 60);
    expect(flow(s)).toBeCloseTo(10, 6);
    expect(outlet(s)).toBe(60);
    expect(output(s, 'boiler.heat')).toBe(0);
    expect(status(s)).toBe('standby');
  });

  it('on demand: purges, ignites, fires, and holds its outlet at its setpoint', () => {
    let s = press(run(bench(), 10), 'boiler.demand', true);
    const seen: unknown[] = [];
    for (let i = 0; i < 15; i++) {
      s = stepSystem(s, 1);
      seen.push(status(s));
    }
    // Its purge, then ignition, then firing, in their lengths.
    expect(seen.indexOf('ignition')).toBe(BOILER.params.purge);
    expect(seen.indexOf('firing')).toBe(
      BOILER.params.purge + BOILER.params.ignition,
    );
    s = run(s, 180);
    expect(outlet(s)).toBeCloseTo(80, 0);
    // The heat it takes: 1.163 kW per m³/h per kelvin, 10 m³/h raised 20 K.
    expect(output(s, 'boiler.heat')).toBeCloseTo(WATER_HEAT * 10 * 20, -1);
  });

  it('follows its setpoint down, and runs flat out when asked for more than it has', () => {
    const firing = run(press(bench(), 'boiler.demand', true), 200);
    const lower = run(press(firing, 'boiler.setpoint', 70), 180);
    expect(outlet(lower)).toBeCloseTo(70, 0);
    // 95 °C would need 407 kW; it has 300: full fire, 300/11.63 K above 60.
    const higher = run(press(firing, 'boiler.setpoint', 92), 180);
    expect(output(higher, 'boiler.heat')).toBeCloseTo(300, 0);
    expect(outlet(higher)).toBeCloseTo(60 + 300 / (WATER_HEAT * 10), 0);
  });

  it('stops when the bench’s valve is throttled below its flow switch, and fires when it opens', () => {
    const firing = run(press(bench(), 'boiler.demand', true), 200);
    const throttled = run(press(firing, 'path.open', 0.25), 2);
    expect(flow(throttled)).toBeLessThan(BOILER.params.minFlow);
    expect(status(throttled)).toBe('blocked: no flow');
    expect(output(throttled, 'boiler.heat')).toBe(0);
    const opened = run(press(throttled, 'path.open', 1), 15);
    expect(status(opened)).toBe('firing');
  });

  it('will not fire on low water pressure, and fires when it is restored', () => {
    const low = run(
      press(press(bench(), 'supply.pressure', 0.6), 'boiler.demand', true),
      30,
    );
    expect(status(low)).toBe('blocked: low water pressure');
    const restored = run(press(low, 'supply.pressure', 1.25), 15);
    expect(status(restored)).toBe('firing');
  });

  it('locks out when its gas is shut while it burns, and RESET (with gas back) relights it', () => {
    const firing = run(press(bench(), 'boiler.demand', true), 200);
    const lost = run(press(firing, 'boiler.gas', false), 2);
    expect(output(lost, 'boiler.fault')).toBe('flame failure');
    // Gas back: still locked out.
    const back = run(press(lost, 'boiler.gas', true), 30);
    expect(output(back, 'boiler.fault')).toBe('flame failure');
    const reset = run(key(back, 'boiler.reset'), 15);
    expect(status(reset)).toBe('firing');
  });

  it('locks out on overheat, set above its high limit with hot water arriving', () => {
    // 85 °C arriving and asked for 99 °C: past its 95 °C high limit.
    let s = run(
      press(
        press(press(bench(), 'supply.temperature', 85), 'boiler.setpoint', 99),
        'boiler.demand',
        true,
      ),
      120,
    );
    expect(output(s, 'boiler.fault')).toBe('overheat');
    // Its setpoint brought back down does not clear it; RESET does.
    s = run(press(s, 'boiler.setpoint', 80), 30);
    expect(output(s, 'boiler.fault')).toBe('overheat');
    s = run(key(s, 'boiler.reset'), 15);
    expect(output(s, 'boiler.fault')).toBeNull();
  });

  it('stops when its demand is switched off, passing the water through again', () => {
    const firing = run(press(bench(), 'boiler.demand', true), 200);
    const off = run(press(firing, 'boiler.demand', false), 2);
    expect(status(off)).toBe('standby');
    expect(outlet(off)).toBe(60);
  });
});
