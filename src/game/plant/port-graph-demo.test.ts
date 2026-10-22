import { describe, expect, it } from 'vite-plus/test';
import {
  createPortGraphDemo,
  demoGraph,
  demoGraphProblems,
  demoVisualBindings,
} from './port-graph-demo';
import { celsius, gramsPerHour } from './control-quantity';

describe('dev19 port graph twins', () => {
  it('binds every installed node to one visual of the right kind and connects every port', () => {
    expect(demoGraphProblems()).toEqual([]);
    const visible = demoGraph.nodes.filter((node) => node.data.visible);
    expect(
      new Set(demoVisualBindings.map((binding) => binding.nodeId)).size,
    ).toBe(visible.length);
    for (const node of visible)
      expect(
        demoVisualBindings.find((binding) => binding.nodeId === node.id)?.kind,
      ).toBe(node.data.kind);
    for (const node of demoGraph.nodes.filter((node) => !node.data.visible))
      expect(
        demoVisualBindings.find((binding) => binding.nodeId === node.id),
      ).toBeUndefined();
  });

  it('uses finite fuel, heats the tank, meters electrical energy, and balances tank heat', () => {
    const demo = createPortGraphDemo();
    demo.state.batteryKWh = 1;
    demo.step(60);
    expect(demo.state.fuelKg).toBeLessThan(1);
    expect(demo.state.tankC).toBeGreaterThan(20);
    expect(demo.state.electricKWh).toBeGreaterThan(0);
    expect(demo.state.boilerMode).toBe('firing');
    expect(demo.tankLedgerErrorKWh()).toBeCloseTo(0, 8);
    demo.step(500);
    expect(demo.state.fuelKg).toBe(0);
    demo.step(1);
    expect(demo.state.boilerMode).toBe('fuel-exhausted');
    expect(demo.state.boilerKW).toBe(0);
  });

  it('runs the pump from a finite battery until its charge is exhausted', () => {
    const demo = createPortGraphDemo();
    const capacity = demo.state.batteryKWh;
    demo.step(30);
    expect(demo.state.pumpA).toBeGreaterThan(0);
    expect(demo.readMimic('signal-battery-charge')).toBeLessThan(capacity);
    demo.step(1000);
    expect(demo.state.batteryKWh).toBe(0);
    expect(demo.state.electricKWh).toBeCloseTo(capacity, 8);
    expect(demo.state.pumpA).toBe(0);
    expect(demo.state.boilerMode).toBe('unpowered');
    expect(demo.readMimic('signal-remote-gas')).toBe(false);
    const meter = demo.state.electricKWh;
    demo.step(30);
    expect(demo.state.electricKWh).toBe(meter);
  });

  it('routes commands through graph identities and stops the electric meter when supply is off', () => {
    const demo = createPortGraphDemo();
    demo.command('demo.battery', 'toggle');
    demo.step(60);
    expect(demo.state.electricKWh).toBe(0);
    expect(demo.state.pumpA).toBe(0);
    expect(demo.state.boilerMode).toBe('unpowered');
    expect(() => demo.command('demo.tank', 'toggle')).toThrow();
    demo.command('demo.battery', 'toggle');
    demo.step(60);
    expect(demo.state.electricKWh).toBeGreaterThan(0);
  });

  it('uses mimic commands to operate the motorized gas, water and power devices', () => {
    const demo = createPortGraphDemo();
    demo.commandMimic('command-remote-gas', false);
    demo.step(30);
    expect(demo.state.boilerMode).toBe('gas-isolated');
    expect(demo.state.fuelKg).toBe(1);
    expect(demo.readMimic('signal-remote-gas')).toBe(false);
    demo.commandMimic('command-remote-gas', true);
    demo.commandMimic('command-remote-water', false);
    demo.step(30);
    expect(demo.state.boilerMode).toBe('no-flow');
    expect(demo.state.pumpA).toBe(0);
    expect(demo.readMimic('signal-remote-water')).toBe(false);
    demo.commandMimic('command-remote-water', true);
    demo.commandMimic('command-remote-power', false);
    demo.step(30);
    expect(demo.state.boilerMode).toBe('unpowered');
    expect(demo.readMimic('signal-remote-power')).toBe(false);
    demo.commandMimic('command-remote-power', true);
    demo.step(30);
    expect(demo.state.boilerMode).toBe('firing');
    expect(demo.readMimic('signal-remote-power')).toBe(true);
    expect(demo.state.pumpA).toBeGreaterThan(0);
  });

  it('drops the pump and fails the gas and water valves closed on power loss', () => {
    const demo = createPortGraphDemo();
    demo.step(1);
    expect(demo.state.pumpA).toBeGreaterThan(0);
    demo.command('demo.battery', 'toggle');
    demo.step(1);
    expect(demo.state.pumpA).toBe(0);
    expect(demo.readMimic('signal-remote-gas')).toBe(false);
    expect(demo.readMimic('signal-remote-water')).toBe(false);
    demo.command('demo.battery', 'toggle');
    demo.step(1);
    expect(demo.state.pumpA).toBeGreaterThan(0);
  });

  it('keeps optional typed control ports on the control model', () => {
    const demo = createPortGraphDemo();
    expect(demoGraphProblems()).toEqual([]);
    expect(demoGraph.edges.some((edge) => edge.targetPort === 'setpoint')).toBe(
      false,
    );
    demo.writeControlPort('demo.boiler', 'setpoint', celsius(68));
    expect(demo.state.boilerControl.state.setpoint).toBe(68);
    demo.pressBoiler('plus');
    expect(demo.state.boilerControl.state.setpoint).toBe(69);
    demo.step(1);
    expect(
      demo.readControlPort('demo.boiler', 'temperature').value,
    ).toBeGreaterThan(20);
    expect(demo.state.boilerControl.state.code).toBe(3);
    demo.pressBoiler('mode');
    expect(demo.state.boilerControl.state.mode).toBe('status');
    demo.pressBoiler('manual');
    demo.pressBoiler('manual');
    expect(demo.state.boilerControl.state.forcing).toBe('low');
    demo.step(1);
    expect(demo.state.boilerControl.state.rate).toBeCloseTo(0.2, 1);
    expect(() => {
      // @ts-expect-error temperature is read-only
      demo.writeControlPort('demo.boiler', 'temperature', celsius(50));
    }).toThrow();
    expect(() => {
      // @ts-expect-error setpoint is write-only
      demo.readControlPort('demo.boiler', 'setpoint');
    }).toThrow();
    expect(() => {
      // @ts-expect-error a mass flow cannot set a temperature
      demo.writeControlPort('demo.boiler', 'setpoint', gramsPerHour(20));
    }).toThrow();
    expect(() =>
      demo.writeControlPort('demo.boiler', 'setpoint', celsius(Number.NaN)),
    ).toThrow();
    demo.pressBoiler('manual');
    demo.state.tankC = 70;
    demo.step(1);
    expect(demo.state.boilerMode).toBe('standby');
    demo.writeControlPort('demo.boiler', 'setpoint', celsius(80));
    demo.step(1);
    expect(demo.state.boilerMode).toBe('firing');
  });

  it('feeds the mimic through typed graph edges and sends commands back', () => {
    const demo = createPortGraphDemo();
    demo.step(10);
    expect(demo.readMimic('signal-fuel-level')).toBeLessThan(1);
    expect(demo.readMimic('signal-fuel-flow')).toBeGreaterThan(0);
    expect(demo.readMimic('signal-boiler-running')).toBe(true);
    expect(demo.readMimic('signal-boiler-temperature')).toBeGreaterThan(20);
    expect(demo.readMimic('signal-tank-temperature')).toBeGreaterThan(20);
    expect(demo.readMimic('signal-pump-running')).toBe(true);
    expect(demo.readMimic('signal-electricity')).toBeGreaterThan(0);
    demo.commandMimic('command-boiler', false);
    demo.step(1);
    expect(demo.state.boilerMode).toBe('off');
    demo.commandMimic('command-pump', false);
    demo.step(1);
    expect(demo.readMimic('signal-pump-running')).toBe(false);
    expect(() => demo.readMimic('command-boiler')).toThrow();
  });
});
