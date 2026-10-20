import { describe, expect, it } from 'vite-plus/test';
import { compose } from './composite';
import { createSystem, output, run, setInput } from './system';
import { BOILER, LOAD, PUMP } from '../plant/heat-loop';

/** The heating loop, flat: pump, boiler and load as three blocks. */
const flat = () =>
  createSystem(
    {
      pump: { kind: PUMP, params: { flow: 15 } },
      boiler: { kind: BOILER },
      load: { kind: LOAD },
    },
    {
      'boiler.flowIn': 'pump.flow',
      'boiler.returnTemp': 'load.returnTemp',
      'load.flowIn': 'pump.flow',
      'load.flowTemp': 'boiler.flowTemp',
    },
    {
      'pump.running': true,
      'boiler.demand': true,
      'boiler.gas': true,
      'boiler.reset': false,
    },
  );

/** The same loop as one block: a heating circuit with a switch and a demand. */
const CIRCUIT = compose({
  kind: 'heating-circuit',
  blocks: {
    pump: { kind: PUMP, params: { flow: 15 } },
    boiler: { kind: BOILER },
    load: { kind: LOAD },
  },
  wires: {
    'boiler.flowIn': 'pump.flow',
    'boiler.returnTemp': 'load.returnTemp',
    'load.flowIn': 'pump.flow',
    'load.flowTemp': 'boiler.flowTemp',
  },
  inputs: { on: ['pump.running', 'boiler.demand'], gas: ['boiler.gas'] },
  outputs: {
    temperature: 'load.returnTemp',
    heat: 'boiler.heat',
    status: 'boiler.status',
  },
  set: { 'boiler.reset': false },
});
const nested = () =>
  createSystem(
    { circuit: { kind: CIRCUIT } },
    {},
    { 'circuit.on': true, 'circuit.gas': true },
  );

describe('a block made of blocks', () => {
  it('shows only its own ports', () => {
    expect(CIRCUIT.inputs.map((p) => p.name)).toEqual(['on', 'gas']);
    expect(() =>
      createSystem(
        { circuit: { kind: CIRCUIT } },
        { 'circuit.returnTemp': 'circuit.heat' },
      ),
    ).toThrow();
  });

  it('behaves as its parts do laid out flat', () => {
    // Before anything sleeps, exactly.
    expect(output(run(nested(), 600), 'circuit.temperature')).toBe(
      output(run(flat(), 600), 'load.returnTemp'),
    );
    // Once its parts sleep, within sleeping's own tolerance (the parts
    // sleep and wake a little differently inside a composite).
    const a = run(flat(), 2 * 3600);
    const b = run(nested(), 2 * 3600);
    const ta = output(a, 'load.returnTemp') as number;
    expect(
      Math.abs((output(b, 'circuit.temperature') as number) - ta),
    ).toBeLessThan(0.01);
    const ha = output(a, 'boiler.heat') as number;
    expect(
      Math.abs((output(b, 'circuit.heat') as number) - ha) / ha,
    ).toBeLessThan(0.01);
  });

  it('sleeps as a whole once all its parts are asleep, and wakes when one stirs', () => {
    const steady = run(nested(), 4 * 3600);
    const before = steady.stats.slept;
    const quiet = run(steady, 600);
    expect(quiet.stats.slept - before).toBeGreaterThan(400);
    // Switched off from outside: woken at once, its boiler stops.
    const off = run(setInput(quiet, 'circuit.on', false), 2);
    expect(output(off, 'circuit.heat')).toBe(0);
  });
});
