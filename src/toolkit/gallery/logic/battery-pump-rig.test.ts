import { describe, expect, it } from 'vite-plus/test';
import { pipeClashes } from '../../components/core/logic/pipe-route';
import {
  RIG_PIPES,
  createBatteryPumpModel,
  plumbBatteryPumpRig,
} from './battery-pump-rig';

const rig = plumbBatteryPumpRig();
const run = (m: ReturnType<typeof createBatteryPumpModel>, seconds: number) => {
  for (let t = 0; t < seconds; t++) m.step(1);
};

describe('the battery-backed pump rig, plumbed', () => {
  it('routes every line, none through another', () => {
    expect(rig.problems).toEqual([]);
    expect(rig.lines).toHaveLength(6);
    expect(
      pipeClashes(
        rig.lines.map((l) => ({
          name: l.id,
          points: l.points,
          od: RIG_PIPES[l.medium].od,
          joint: RIG_PIPES[l.medium].joint,
        })),
      ),
    ).toEqual([]);
  });

  it('sets an isolator between the supply and the rectifier and between the inverter and the pump, and none inside the UPS', () => {
    const isolators = rig.fittings.filter((f) => f.kind === 'power-isolator');
    expect(isolators.map((f) => f.edge).sort()).toEqual([
      'pump-feed',
      'supply-feed',
    ]);
  });

  it('isolates the pump: a suction valve, and a non-return and isolating valve on its discharge', () => {
    expect(
      rig.fittings.filter((f) => f.edge === 'suction').map((f) => f.kind),
    ).toEqual(['isolating-valve']);
    expect(
      rig.fittings.filter((f) => f.edge === 'delivery').map((f) => f.kind),
    ).toEqual(['non-return-valve', 'isolating-valve']);
  });

  it('puts every fitting where a person can reach it', () => {
    for (const f of rig.fittings) {
      expect(f.at[1], f.id).toBeGreaterThanOrEqual(0.3);
      expect(f.at[1], f.id).toBeLessThanOrEqual(1.8);
    }
  });
});

describe('the battery-backed pump rig, working', () => {
  const supplyIsolator = () =>
    rig.fittings.find((f) => f.edge === 'supply-feed')!.id;
  const pumpIsolator = () =>
    rig.fittings.find((f) => f.edge === 'pump-feed')!.id;

  it('runs the pump on the supply, its battery full', () => {
    const m = createBatteryPumpModel(rig);
    run(m, 300);
    const r = m.readings();
    expect(r.pumpRunning).toBe(true);
    expect(r.flow).toBeCloseTo(300, 6);
    expect(r.charge).toBe(1);
    expect(m.sink.received()).toBeCloseTo((300 * 300) / 3600, 3);
  });

  it('runs on for about 7.7 minutes when the supply is isolated, then stops the pump', () => {
    const m = createBatteryPumpModel(rig);
    run(m, 10);
    m.setOpen(supplyIsolator(), false);
    let stopped = -1;
    for (let t = 0; t < 900; t++) {
      m.step(1);
      if (stopped < 0 && !m.readings().pumpRunning) stopped = t;
    }
    const expected = (4.32 / (32 / 0.95)) * 3600;
    expect(stopped).toBeGreaterThan(expected - 3);
    expect(stopped).toBeLessThan(expected + 3);
    expect(m.readings().flow).toBe(0);
    expect(m.readings().charge).toBeLessThan(0.01);
  });

  it('starts again when the supply is restored, and recharges', () => {
    const m = createBatteryPumpModel(rig);
    m.setOpen(supplyIsolator(), false);
    run(m, 900);
    m.setOpen(supplyIsolator(), true);
    run(m, 60);
    expect(m.readings().pumpRunning).toBe(true);
    expect(m.readings().batteryKW).toBeGreaterThan(0);
  });

  it('stops the pump, and draws nothing from the battery, with the pump isolated', () => {
    const m = createBatteryPumpModel(rig);
    m.setOpen(supplyIsolator(), false);
    m.setOpen(pumpIsolator(), false);
    run(m, 300);
    expect(m.readings().pumpRunning).toBe(false);
    expect(m.readings().charge).toBe(1);
  });
});
