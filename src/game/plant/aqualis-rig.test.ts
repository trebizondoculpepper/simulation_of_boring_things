import { describe, expect, test } from 'vite-plus/test';
import { MOLAR, readings } from '../water/pool-chemistry';
import {
  RIG_DEVICE_MOST,
  RIG_POOL,
  RIG_SCENARIO_IDS,
  RIG_SCENARIOS,
  RIG_TICK,
  type Rig,
  newRig,
  resetWater,
  rigPorts,
  rigSample,
  setBathers,
  setDeviceConnected,
  setDeviceFault,
  setDeviceMode,
  setDevicePower,
  setFilterInService,
  setManualRate,
  setPumpRunning,
  setSampleFlow,
  stepRig,
} from './aqualis-rig';
import { newSampler, stepSampler } from './aqualis-sampler';
import type { ChannelId } from './aqualis-types';

/** The rig `seconds` on at a steady demand, in 10 s steps. */
const run = (
  rig: Rig,
  demands: Partial<Record<ChannelId, number>>,
  seconds: number,
  dt = 10,
) => {
  let r = rig;
  for (let t = 0; t < seconds; t += dt) r = stepRig(r, demands, dt);
  return r;
};

const quiet = (id: Parameters<typeof newRig>[0] = 'good') =>
  setBathers(newRig(id), 0);

describe('dosing moves the water the right way by the right amount', () => {
  test('hypochlorite: 1 l/h for an hour adds 140 g of chlorine to 150 m³', () => {
    const base = run(quiet(), {}, 3600);
    const dosed = run(quiet(), { hypochlorite: 0.5 }, 3600);
    const rise = dosed.water.freeChlorine - base.water.freeChlorine;
    expect(rise).toBeCloseTo(140 / RIG_POOL.volumeM3, 1);
    expect(rise).toBeGreaterThan(0.85);
  });

  test('acid: 3 l/h for an hour takes its alkalinity out and lowers the pH', () => {
    const base = run(quiet('ph-high'), {}, 3600);
    const dosed = run(quiet('ph-high'), { acid: 1 }, 3600);
    const drop = base.water.alkalinity - dosed.water.alkalinity;
    const expected =
      ((3 * 104.8) / MOLAR.HCl / RIG_POOL.volumeM3) * (MOLAR.CaCO3 / 2);
    expect(drop).toBeCloseTo(expected, 2);
    expect(dosed.water.ph).toBeLessThan(base.water.ph - 0.05);
  });

  test('CO₂: 300 g/h adds carbonate, leaves alkalinity, lowers the pH', () => {
    const base = run(quiet('ph-high'), {}, 3600);
    const dosed = run(quiet('ph-high'), { co2: 1 }, 3600);
    const added = dosed.water.carbonate - base.water.carbonate;
    expect(added).toBeGreaterThan(0.8 * (300 / MOLAR.CO2 / RIG_POOL.volumeM3));
    expect(added).toBeLessThan(300 / MOLAR.CO2 / RIG_POOL.volumeM3);
    expect(dosed.water.alkalinity).toBeCloseTo(base.water.alkalinity, 3);
    expect(dosed.water.ph).toBeLessThan(base.water.ph - 0.03);
  });

  test('bathers use chlorine and, left alone, the pH drifts up', () => {
    const busy = run(newRig('busy'), {}, 3600);
    expect(busy.water.freeChlorine).toBeLessThan(1.0);
    const good = run(newRig('good'), {}, 6 * 3600, 60);
    expect(good.water.ph).toBeGreaterThan(7.35);
  });

  test('the step size does not change the result (the 10 s tick)', () => {
    const a = run(newRig('busy'), { hypochlorite: 0.7, acid: 0.3 }, 1800, 1);
    const b = run(newRig('busy'), { hypochlorite: 0.7, acid: 0.3 }, 1800, 30);
    expect(a.water.freeChlorine).toBeCloseTo(b.water.freeChlorine, 4);
    expect(a.water.ph).toBeCloseTo(b.water.ph, 4);
    const c = stepRig(newRig('busy'), { hypochlorite: 0.7, acid: 0.3 }, 1800);
    expect(c.water.freeChlorine).toBeCloseTo(a.water.freeChlorine, 4);
  });

  test('chemistry steps only on whole ticks, the pending dose carried', () => {
    const start = quiet();
    const r = stepRig(start, { hypochlorite: 1 }, RIG_TICK / 2);
    expect(r.water).toBe(start.water);
    expect(r.pending.hypochlorite).toBeCloseTo((2 * 5) / 3600, 9);
    const r2 = stepRig(r, { hypochlorite: 1 }, RIG_TICK / 2);
    expect(r2.pending.seconds).toBe(0);
    expect(r2.water.freeChlorine).toBeGreaterThan(r.water.freeChlorine);
  });
});

describe('the devices', () => {
  test('remote: demand × its most, clamped to 0 and 1', () => {
    const r = stepRig(newRig(), { hypochlorite: 0.25, acid: 2, co2: -1 }, 1);
    const p = rigPorts(r);
    expect(p.hypochlorite).toEqual({
      mode: 'remote',
      powered: true,
      running: true,
      fault: null,
      delivering: 0.5,
      most: RIG_DEVICE_MOST.hypochlorite,
    });
    expect(p.acid?.delivering).toBe(3);
    expect(p.co2?.delivering).toBe(0);
    expect(p.co2?.running).toBe(false);
  });

  test('manual runs at its own rate whatever the demand; off runs not at all', () => {
    let r = setManualRate(setDeviceMode(newRig(), 'acid', 'manual'), 'acid', 9);
    r = setDeviceMode(r, 'co2', 'off');
    r = stepRig(r, { acid: 0, co2: 1 }, 1);
    const p = rigPorts(r);
    expect(p.acid?.mode).toBe('manual');
    expect(p.acid?.delivering).toBe(3);
    expect(p.co2).toMatchObject({ mode: 'off', delivering: 0, running: false });
  });

  test('unpowered or faulted, it delivers nothing and says why', () => {
    let r = setDevicePower(newRig(), 'hypochlorite', false);
    r = setDeviceFault(r, 'acid', 'Loss of prime');
    r = stepRig(r, { hypochlorite: 1, acid: 1 }, 1);
    const p = rigPorts(r);
    expect(p.hypochlorite).toMatchObject({ powered: false, delivering: 0 });
    expect(p.acid).toMatchObject({
      powered: true,
      fault: 'Loss of prime',
      delivering: 0,
      running: false,
    });
    r = stepRig(setDeviceFault(r, 'acid', null), { acid: 1 }, 1);
    expect(rigPorts(r).acid?.delivering).toBe(3);
  });

  test('disconnected: no feedback, deaf to demand, but its own manual still runs', () => {
    let r = setDeviceConnected(newRig(), 'co2', false);
    r = stepRig(r, { co2: 1 }, 1);
    expect(rigPorts(r).co2).toBeNull();
    expect(r.devices.co2.delivering).toBe(0);
    r = setDeviceMode(r, 'co2', 'manual');
    r = stepRig(r, { co2: 0 }, 1);
    expect(r.devices.co2.delivering).toBe(150);
    r = stepRig(setDeviceConnected(r, 'co2', true), {}, 1);
    expect(rigPorts(r).co2?.mode).toBe('manual');
  });
});

describe('the loop and the sample', () => {
  test('the sample is the pool water at its temperature and flow', () => {
    const r = newRig('ph-high');
    const s = rigSample(r);
    expect(s.water).toBe(r.water);
    expect(s.temperature).toBe(28);
    expect(s.flowLh).toBe(RIG_POOL.sampleFlowLh);
    expect(rigSample(setSampleFlow(r, 0)).flowLh).toBe(0);
  });

  test('with the pump stopped or the filter isolated, the sample stops and the doses wait in the line', () => {
    expect(rigSample(setPumpRunning(newRig(), false)).flowLh).toBe(0);
    expect(rigSample(setFilterInService(newRig(), false)).flowLh).toBe(0);
    let r = setPumpRunning(quiet(), false);
    const before = r.water.freeChlorine;
    r = run(r, { hypochlorite: 1 }, 600);
    expect(r.water.freeChlorine).toBeLessThanOrEqual(before);
    expect(r.line.hypochlorite).toBeCloseTo((2 * 600) / 3600, 6);
    r = run(setPumpRunning(r, true), {}, RIG_TICK);
    expect(r.line.hypochlorite).toBe(0);
    expect(r.water.freeChlorine).toBeGreaterThan(before + 0.25);
  });

  test('the sampler reads the rig, and loses its flow when the sample is cut', () => {
    let r = newRig('chlorine-low');
    const s = newSampler(rigSample(r));
    let out = stepSampler(s, rigSample(r), 10);
    expect(out.readings.freeChlorine).toBeCloseTo(0.3, 1);
    expect(out.status.flowing).toBe(true);
    r = setSampleFlow(r, 0);
    for (let i = 0; i < 6; i++) {
      r = stepRig(r, {}, 10);
      out = stepSampler(out.state, rigSample(r), 10);
    }
    expect(out.status.flowing).toBe(false);
    expect(out.status.lostFor).toBeGreaterThan(0);
  });
});

describe('the scenarios and the sources', () => {
  test('every scenario loads, with a name and a one-line description', () => {
    expect(RIG_SCENARIO_IDS).toHaveLength(11);
    for (const id of RIG_SCENARIO_IDS) {
      const s = RIG_SCENARIOS[id];
      expect(s.id).toBe(id);
      expect(s.name.length).toBeGreaterThan(0);
      expect(s.description).not.toContain('\n');
      const r = newRig(id);
      expect(Number.isFinite(r.water.ph)).toBe(true);
      expect(r.scenario).toBe(id);
    }
  });

  test('each scenario is wrong in the way it says', () => {
    const r = (id: Parameters<typeof newRig>[0]) => {
      const w = newRig(id).water;
      return { w, rd: readings(w, 28) };
    };
    expect(r('chlorine-low').w.freeChlorine).toBeLessThan(1.0);
    expect(r('chlorine-high').w.freeChlorine).toBeGreaterThan(1.5);
    expect(r('ph-high').w.ph).toBeGreaterThan(7.4);
    expect(r('ph-low').w.ph).toBeLessThan(7.2);
    expect(r('alkalinity-low').w.alkalinity).toBeLessThan(80);
    expect(r('combined-high').rd.combinedChlorine).toBeGreaterThan(0.5);
    expect(r('hardness-low').rd.langelier).toBeLessThan(-0.5);
    expect(r('scaling').rd.langelier).toBeGreaterThan(0.5);
    expect(r('tds-high').w.tds).toBeGreaterThan(1500);
    expect(RIG_SCENARIOS.busy.bathers).toBeGreaterThan(
      RIG_SCENARIOS.good.bathers,
    );
    const good = r('good');
    expect(good.w.freeChlorine).toBeCloseTo(1.3);
    expect(Math.abs(good.rd.langelier)).toBeLessThan(0.5);
  });

  test('resetting the water keeps the devices', () => {
    const r = resetWater(
      setDeviceMode(newRig('good'), 'acid', 'off'),
      'ph-low',
    );
    expect(r.scenario).toBe('ph-low');
    expect(r.water.ph).toBeCloseTo(6.9);
    expect(r.devices.acid.mode).toBe('off');
  });

  test('the sources never run dry, and count what they gave', () => {
    const r = run(
      newRig(),
      { hypochlorite: 1, acid: 1, co2: 1 },
      48 * 3600,
      600,
    );
    expect(r.sources.hypochlorite).toBeCloseTo(96, 6);
    expect(r.sources.acid).toBeCloseTo(144, 6);
    expect(r.sources.co2).toBeCloseTo(14400, 3);
    expect(rigPorts(r).acid?.delivering).toBe(3);
  });

  test('cheap: an hour at 60× in 1 s frames runs in well under a frame budget', () => {
    let r = newRig('busy');
    const t0 = performance.now();
    for (let i = 0; i < 3600; i++) r = stepRig(r, { hypochlorite: 0.5 }, 1);
    expect(performance.now() - t0).toBeLessThan(500);
  });
});
