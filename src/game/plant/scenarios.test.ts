import { describe, expect, it } from 'vite-plus/test';
import { createSystem, output, run, setInput } from '../sim/system';
import type { System } from '../sim/system';
import { BOILER, BOILER_EFFICIENCY, GAS_ENERGY, LOAD, PUMP } from './heat-loop';
import { GAS_HOUSE } from './gas-house';
import { BREAKER, MCC } from './electrical';

/**
 * Scenarios across the plant's domains, each built from blocks and from
 * blocks made of blocks (the gas house, the motor control centre), to show
 * the model working in gas and electricity as it does in water and heat.
 */

/** Two heating loops (A and B), each a pump, a boiler and a load. */
function loops(): {
  blocks: Parameters<typeof createSystem>[0];
  wires: Record<string, string>;
} {
  const blocks: Parameters<typeof createSystem>[0] = {};
  const wires: Record<string, string> = {};
  for (const x of ['A', 'B']) {
    blocks[`pump${x}`] = { kind: PUMP, params: { flow: 15 } };
    blocks[`boiler${x}`] = { kind: BOILER };
    blocks[`load${x}`] = { kind: LOAD };
    Object.assign(wires, {
      [`boiler${x}.flowIn`]: `pump${x}.flow`,
      [`boiler${x}.returnTemp`]: `load${x}.returnTemp`,
      [`load${x}.flowIn`]: `pump${x}.flow`,
      [`load${x}.flowTemp`]: `boiler${x}.flowTemp`,
    });
  }
  return { blocks, wires };
}

const both = (s: System, port: string) => [
  output(s, `boilerA.${port}`),
  output(s, `boilerB.${port}`),
];

// ---- Gas ------------------------------------------------------------------------

/** The gas house feeding both boilers. */
function gasPlant(): System {
  const { blocks, wires } = loops();
  return createSystem(
    { gas: { kind: GAS_HOUSE }, ...blocks },
    {
      ...wires,
      'boilerA.gas': 'gas.available',
      'boilerB.gas': 'gas.available',
      'boilerA.gasPressure': 'gas.pressure',
      'boilerB.gasPressure': 'gas.pressure',
      'gas.flowA': 'boilerA.gasFlow',
      'gas.flowB': 'boilerB.gasFlow',
    },
    {
      'gas.ecv': true,
      'gas.leak': 0,
      'gas.stop': false,
      'gas.reset': false,
      'gas.supply': 21,
      'pumpA.running': true,
      'pumpB.running': true,
      'boilerA.demand': true,
      'boilerB.demand': true,
      'boilerA.reset': false,
      'boilerB.reset': false,
    },
  );
}

describe('gas: a gas house, a cluster of blocks, feeding two boilers', () => {
  it('meters the gas both boilers burn, consistent with the heat they give', () => {
    const s = run(gasPlant(), 3600);
    const burnt = (both(s, 'gasFlow') as number[]).reduce((a, b) => a + b, 0);
    expect(output(s, 'gas.flow')).toBeCloseTo(burnt, 1);
    const heat = (both(s, 'heat') as number[]).reduce((a, b) => a + b, 0);
    expect(heat / burnt).toBeCloseTo(BOILER_EFFICIENCY * GAS_ENERGY, 6);
    // The meter's register: the gas that has passed, m³.
    const later = run(s, 3600);
    const passed =
      (output(later, 'gas.reading') as number) -
      (output(s, 'gas.reading') as number);
    expect(passed).toBeCloseTo(burnt, -1);
  });

  it('delivers less pressure the more gas flows, above the boilers’ minimum', () => {
    const s = run(gasPlant(), 3600);
    const pressure = output(s, 'gas.pressure') as number;
    expect(pressure).toBeLessThan(21);
    expect(pressure).toBeGreaterThan(BOILER.params.minGasPressure);
  });

  it('a weak governor: both boilers’ low-pressure switches stop them, until the supply recovers', () => {
    const weak = run(setInput(gasPlant(), 'gas.supply', 17.6), 600);
    expect(both(weak, 'status')).toEqual([
      'standby: low gas pressure',
      'standby: low gas pressure',
    ]);
    // Not a lockout: they start again by themselves once it is restored.
    const mended = run(setInput(weak, 'gas.supply', 21), 60);
    expect(both(mended, 'firing')).toEqual([true, true]);
  });

  it('gas detected: the safety valve shuts, both boilers stop on their low-pressure switches, and the gas house needs its reset', () => {
    const firing = run(gasPlant(), 3600);
    const leaking = run(setInput(firing, 'gas.leak', 35), 2);
    expect(output(leaking, 'gas.alarm')).toBe(true);
    expect(output(leaking, 'gas.available')).toBe(false);
    // With the pressure gone, each boiler's switch stops it: cleanly, as a
    // real boiler's low gas pressure switch does, not a lockout.
    expect(both(leaking, 'status')).toEqual([
      'standby: low gas pressure',
      'standby: low gas pressure',
    ]);
    expect(output(leaking, 'gas.flow')).toBe(0);
    // The leak cleared: the alarm and the valve stay latched.
    const clear = run(setInput(leaking, 'gas.leak', 0), 30);
    expect(output(clear, 'gas.available')).toBe(false);
    // The gas house reset: gas is back, and the boilers start again by
    // themselves (a low-pressure stop needs no reset of its own).
    let s = run(setInput(clear, 'gas.reset', true), 1);
    s = run(setInput(s, 'gas.reset', false), 30);
    expect(output(s, 'gas.available')).toBe(true);
    expect(both(s, 'firing')).toEqual([true, true]);
  });

  it('the emergency stop shuts off the gas the same way', () => {
    const firing = run(gasPlant(), 3600);
    const stopped = run(setInput(firing, 'gas.stop', true), 2);
    expect(both(stopped, 'status')).toEqual([
      'standby: low gas pressure',
      'standby: low gas pressure',
    ]);
    const before = output(stopped, 'gas.reading') as number;
    expect(output(run(stopped, 600), 'gas.reading')).toBeCloseTo(before, 9);
  });

  it('sleeps as a whole cluster once the plant is steady', () => {
    const steady = run(gasPlant(), 3 * 3600);
    let slept = 0;
    let s = steady;
    for (let i = 0; i < 600; i++) {
      s = run(s, 1);
      if (s.blocks.gas.slept) slept++;
    }
    expect(slept).toBeGreaterThan(540);
  });
});

// ---- Electricity ----------------------------------------------------------------

/** The incomer feeding the MCC, whose pump motors drive the two loops. */
function electricPlant(runP2 = false): System {
  const { blocks, wires } = loops();
  return createSystem(
    { incomer: { kind: BREAKER }, mcc: { kind: MCC }, ...blocks },
    {
      ...wires,
      'incomer.load': 'mcc.current',
      'mcc.supply': 'incomer.live',
      'pumpA.running': 'mcc.p1',
      'pumpB.running': 'mcc.p2',
    },
    {
      'incomer.reset': false,
      'mcc.runP1': true,
      'mcc.runP2': runP2,
      'mcc.fans': true,
      'boilerA.demand': true,
      'boilerB.demand': true,
      'boilerA.gas': true,
      'boilerB.gas': true,
      'boilerA.reset': false,
      'boilerB.reset': false,
    },
  );
}

describe('electricity: an incomer feeding a motor control centre, a cluster of motors', () => {
  it('carries the sum of its motors’ currents, and starts a second pump without tripping', () => {
    const one = run(electricPlant(), 60);
    // One pump motor (30 A) and two fans (5 A each).
    expect(output(one, 'mcc.current')).toBe(40);
    const two = run(setInput(one, 'mcc.runP2', true), 60);
    expect(output(two, 'mcc.current')).toBe(70);
    expect(output(two, 'incomer.tripped')).toBe(false);
  });

  it('trips when everything starts at once: the cluster’s inrush, not any one motor', () => {
    const s = run(electricPlant(true), 5);
    expect(output(s, 'incomer.tripped')).toBe(true);
    expect(output(s, 'mcc.current')).toBe(0);
  });

  it('across domains: the trip stops the pumps, so the boilers lose their flow', () => {
    const running = run(electricPlant(), 3600);
    expect(both(running, 'firing')).toEqual([true, false]);
    // Everything selected on at once: the incomer trips, the pumps stop,
    // and both boilers are left without flow.
    const tripped = run(electricPlant(true), 10);
    expect(output(tripped, 'incomer.tripped')).toBe(true);
    expect(both(tripped, 'status')).toEqual([
      'blocked: no flow',
      'blocked: no flow',
    ]);
  });

  it('refuses reset until it has cooled, trips again if everything is still selected on, and holds if started in turn', () => {
    const tripped = run(electricPlant(true), 5);
    // Straight away: refused.
    const tooSoon = run(setInput(tripped, 'incomer.reset', true), 1);
    expect(output(tooSoon, 'incomer.tripped')).toBe(true);
    // Cooled, reset with both pumps still selected: it trips again.
    let s = run(setInput(tooSoon, 'incomer.reset', false), 120);
    s = run(setInput(s, 'incomer.reset', true), 1);
    s = run(setInput(s, 'incomer.reset', false), 5);
    expect(output(s, 'incomer.tripped')).toBe(true);
    // Cooled again, the second pump deselected first: it holds.
    s = run(setInput(s, 'mcc.runP2', false), 120);
    s = run(setInput(s, 'incomer.reset', true), 1);
    s = run(setInput(s, 'incomer.reset', false), 60);
    expect(output(s, 'incomer.tripped')).toBe(false);
    expect(output(s, 'mcc.current')).toBe(40);
  });

  it('sleeps, incomer and MCC, once everything runs steadily', () => {
    const steady = run(electricPlant(), 3600);
    expect(steady.blocks.incomer.slept).not.toBeNull();
    expect(steady.blocks.mcc.slept).not.toBeNull();
  });
});
