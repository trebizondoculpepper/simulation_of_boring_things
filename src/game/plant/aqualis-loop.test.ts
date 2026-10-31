import { describe, expect, it } from 'vite-plus/test';
import { DEFAULT_TARGETS } from './aqualis-types';
import type {
  AqualisReadings,
  AqualisSettings,
  Selector,
} from './aqualis-types';
import { newSampler, stepSampler } from './aqualis-sampler';
import { newController, stepController } from './aqualis-controller';
import {
  RIG_POOL,
  newRig,
  rigPorts,
  rigSample,
  setDeviceConnected,
  setDeviceMode,
  stepRig,
} from './aqualis-rig';
import type { Rig } from './aqualis-rig';

/**
 * The Aqualis models closed round the test rig (mission 114): sampler,
 * controller and the rig's ideal pool, stepped together as the dev room
 * will step them.
 */

const SETTINGS: AqualisSettings = {
  dynamics: { volumeM3: RIG_POOL.volumeM3, flowM3h: RIG_POOL.flowM3h },
  targets: DEFAULT_TARGETS,
};

function run(
  rig: Rig,
  hours: number,
  selector: Selector = 'auto',
  settings = SETTINGS,
) {
  let sampler = newSampler(rigSample(rig));
  let control = newController();
  let readings: AqualisReadings | null = null;
  let out = null as ReturnType<typeof stepController>['out'] | null;
  const dt = 10;
  for (let t = 0; t < hours * 3600; t += dt) {
    const s = stepSampler(sampler, rigSample(rig), dt);
    sampler = s.state;
    readings = s.readings;
    const c = stepController(
      control,
      {
        readings,
        sample: s.status,
        selector,
        ports: rigPorts(rig),
        settings,
        hand: { hypochlorite: 0, acid: 0, co2: 0 },
      },
      dt,
    );
    control = c.state;
    out = c.out;
    rig = stepRig(rig, c.out.demands, dt);
  }
  return { rig, readings: readings!, out: out! };
}

describe('the Aqualis loop', () => {
  it('brings low chlorine up into its band in AUTO', () => {
    const { readings } = run(newRig('chlorine-low'), 4);
    expect(readings.freeChlorine).toBeGreaterThan(
      DEFAULT_TARGETS.freeChlorine.low,
    );
    expect(readings.freeChlorine).toBeLessThan(
      DEFAULT_TARGETS.freeChlorine.high,
    );
  });

  it('holds good water through a busy session', () => {
    const { readings } = run(newRig('busy'), 6);
    expect(readings.freeChlorine).toBeGreaterThan(0.9);
    expect(readings.ph).toBeLessThan(7.5);
  });

  it('brings a high pH down, with CO₂ first and acid for the rest', () => {
    const { readings, rig } = run(newRig('ph-high'), 12);
    expect(readings.ph).toBeLessThan(7.45);
    expect(rig.sources.co2).toBeGreaterThan(0);
  });

  it('leaves low chlorine low with the knob at OFF', () => {
    const { readings, out } = run(newRig('chlorine-low'), 2, 'off');
    expect(readings.freeChlorine).toBeLessThan(
      DEFAULT_TARGETS.freeChlorine.low,
    );
    expect(out.inhibit).toBe('selector-off');
  });

  it('shows hypochlorite OFFLINE in manual, still asking for chlorine', () => {
    const rig = setDeviceMode(newRig('chlorine-low'), 'hypochlorite', 'off');
    const { out } = run(rig, 0.5);
    expect(out.channels.hypochlorite.status).toMatchObject({
      kind: 'offline',
      reason: 'switched-off',
    });
    expect(out.channels.hypochlorite.demand).toBeGreaterThan(0.5);
  });

  it('carries on with acid alone when no CO₂ is connected', () => {
    const rig = setDeviceConnected(newRig('ph-high'), 'co2', false);
    const { out, readings } = run(rig, 12);
    expect(out.channels.co2.status.kind).toBe('unconnected');
    expect(readings.ph).toBeLessThan(7.5);
  });
});
