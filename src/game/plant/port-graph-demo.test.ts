import { describe, expect, it } from 'vite-plus/test';
import {
  createPortGraphDemo,
  demoGraph,
  demoGraphProblems,
  demoVisualBindings,
} from './port-graph-demo';
import { celsius, gramsPerHour } from './control-quantity';

describe('dev19 pool plant graph', () => {
  it('twins every visible node and connects every required typed port', () => {
    expect(demoGraphProblems()).toEqual([]);
    const visible = demoGraph.nodes.filter((node) => node.data.visible);
    expect(
      new Set(demoVisualBindings.map((binding) => binding.nodeId)).size,
    ).toBe(visible.length);
    for (const node of visible)
      expect(
        demoVisualBindings.find((binding) => binding.nodeId === node.id)?.kind,
      ).toBe(node.data.kind);
  });

  it('meters mains gas and electrical energy while heating the tank and pool', () => {
    const demo = createPortGraphDemo();
    const poolC = demo.state.poolC;
    demo.step(120);
    expect(demo.state.gasKg).toBeGreaterThan(0);
    expect(demo.readMimic('signal-gas-used')).toBeCloseTo(
      demo.state.gasCubicMetres,
      8,
    );
    expect(demo.readMimic('signal-gas-flow')).toBeGreaterThan(0);
    expect(demo.state.electricKWh).toBeGreaterThan(0);
    expect(demo.state.poolC).toBeGreaterThan(poolC);
    expect(demo.state.poolFlowKgPerSecond).toBeGreaterThan(0);
    expect(demo.tankLedgerErrorKWh()).toBeCloseTo(0, 8);
    expect(demo.poolLedgerErrorKWh()).toBeCloseTo(0, 8);
  });

  it('pool valve and pump commands interrupt filtration and dosing', () => {
    const demo = createPortGraphDemo();
    demo.step(1);
    expect(demo.readMimic('signal-pool-pump-running')).toBe(true);
    expect(demo.readMimic('signal-filter-differential')).toBeGreaterThan(0);
    demo.commandMimic('command-suction-valve', false);
    demo.step(1);
    expect(demo.state.poolFlowKgPerSecond).toBe(0);
    expect(demo.state.dosing).toBe(false);
    demo.commandMimic('command-suction-valve', true);
    demo.commandMimic('command-pool-pump', false);
    demo.step(1);
    expect(demo.state.poolPumpA).toBe(0);
    demo.commandMimic('command-pool-pump', true);
    demo.step(1);
    expect(demo.state.poolPumpA).toBeGreaterThan(0);
  });

  it('feeds the post-mounted water quality sign through typed control edges', () => {
    const demo = createPortGraphDemo();
    demo.step(1);
    expect(demo.readMimic('sign-pool-temperature')).toBe(demo.state.poolC);
    expect(demo.readMimic('sign-chlorine')).toBe(demo.state.poolChlorineMgL);
    expect(demo.readMimic('sign-ph')).toBe(demo.state.poolPH);
  });

  it('mains loss stops pumps, closes safety valves, and stops meters', () => {
    const demo = createPortGraphDemo();
    demo.step(2);
    demo.command('demo.mains', 'toggle');
    demo.step(1);
    expect(demo.state.pumpA).toBe(0);
    expect(demo.state.poolPumpA).toBe(0);
    expect(demo.readMimic('signal-remote-gas')).toBe(false);
    expect(demo.readMimic('signal-suction-valve')).toBe(false);
    const electricity = demo.state.electricKWh;
    const gas = demo.state.gasCubicMetres;
    demo.step(10);
    expect(demo.state.electricKWh).toBe(electricity);
    expect(demo.state.gasCubicMetres).toBe(gas);
    demo.command('demo.mains', 'toggle');
    demo.step(1);
    expect(demo.state.poolPumpA).toBeGreaterThan(0);
  });

  it('lets each motorized device override its remote command locally, then release it', () => {
    const demo = createPortGraphDemo();
    for (const [id, signal] of [
      ['demo.remoteGas', 'signal-remote-gas'],
      ['demo.remoteWater', 'signal-remote-water'],
      ['demo.remoteSuction', 'signal-suction-valve'],
      ['demo.remoteReturn', 'signal-return-valve'],
      ['demo.remoteMakeup', 'signal-makeup-valve'],
      ['demo.remotePower', 'signal-remote-power'],
    ] as const) {
      demo.toggleLocalOverride(id);
      demo.step(1);
      expect(demo.state.remote[id].localOverride).toBe(false);
      expect(demo.readMimic(signal)).toBe(false);
      demo.toggleLocalOverride(id);
      demo.step(1);
      expect(demo.state.remote[id].localOverride).toBeNull();
      expect(demo.readMimic(signal)).toBe(true);
    }
    expect(() => demo.toggleLocalOverride('demo.boiler')).toThrow();
  });

  it('keeps typed boiler control ports and local panel behavior', () => {
    const demo = createPortGraphDemo();
    demo.writeControlPort('demo.boiler', 'setpoint', celsius(68));
    expect(demo.state.boilerControl.state.setpoint).toBe(68);
    demo.step(1);
    expect(
      demo.readControlPort('demo.boiler', 'temperature').value,
    ).toBeGreaterThan(20);
    expect(() => {
      // @ts-expect-error wrong quantity for temperature
      demo.writeControlPort('demo.boiler', 'setpoint', gramsPerHour(20));
    }).toThrow();
    demo.commandMimic('command-remote-gas', false);
    demo.step(1);
    expect(demo.state.boilerMode).toBe('gas-isolated');
    demo.commandMimic('command-remote-gas', true);
    demo.step(1);
    expect(demo.state.boilerMode).toBe('firing');
  });
});
