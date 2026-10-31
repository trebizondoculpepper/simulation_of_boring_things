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
import {
  FIRST_AID_RULES,
  firstAidHolds,
  firstAidNoHypochlorite,
  firstAidSettings,
  startFirstAid,
  stepFirstAid,
} from './aqualis-first-aid';
import type { FirstAidState } from './aqualis-first-aid';

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

describe('the Aqualis loop under First Aid', () => {
  it('raises a formed-stool incident’s chlorine to 2 mg/l, holds it half an hour, then ends', () => {
    let rig = newRig('incident-formed');
    let sampler = newSampler(rigSample(rig));
    let control = newController();
    let fa: FirstAidState | null = startFirstAid(
      'formed-stool',
      null,
      SETTINGS,
    );
    let reached: number | null = null;
    let endedAt: number | null = null;
    let most = 0;
    const dt = 10;
    for (let t = 0; t < 4 * 3600 && endedAt === null; t += dt) {
      const s = stepSampler(sampler, rigSample(rig), dt);
      sampler = s.state;
      if (fa) {
        fa = stepFirstAid(fa, s.readings, SETTINGS, dt);
        if (fa?.phase === 'holding' && reached === null) reached = t;
        if (!fa) endedAt = t;
      }
      if (s.readings) most = Math.max(most, s.readings.freeChlorine);
      const c = stepController(
        control,
        {
          readings: s.readings,
          sample: s.status,
          selector: 'auto',
          ports: rigPorts(rig),
          settings: firstAidSettings(fa, SETTINGS),
          hand: { hypochlorite: 0, acid: 0, co2: 0 },
          pause: firstAidHolds(fa),
          noHypochlorite: firstAidNoHypochlorite(fa),
        },
        dt,
      );
      control = c.state;
      rig = stepRig(rig, c.out.demands, dt);
    }
    // Up to 2 mg/l within the hour, held 30 minutes, then the programme ends.
    expect(reached).not.toBe(null);
    expect(reached!).toBeLessThan(3600);
    expect(endedAt).not.toBe(null);
    expect(endedAt! - reached!).toBeGreaterThanOrEqual(
      FIRST_AID_RULES.formed.hold - dt,
    );
    expect(endedAt! - reached!).toBeLessThan(FIRST_AID_RULES.formed.hold + 60);
    expect(most).toBeGreaterThan(1.94);
    expect(most).toBeLessThan(2.6);
  });

  it('doses nothing through a dosing pause', () => {
    let rig = newRig('chlorine-low');
    let sampler = newSampler(rigSample(rig));
    const fa = startFirstAid('dosing-pause', null, SETTINGS);
    for (let t = 0; t < 1800; t += 10) {
      const s = stepSampler(sampler, rigSample(rig), 10);
      sampler = s.state;
      const c = stepController(
        newController(),
        {
          readings: s.readings,
          sample: s.status,
          selector: 'auto',
          ports: rigPorts(rig),
          settings: SETTINGS,
          hand: { hypochlorite: 0, acid: 0, co2: 0 },
          pause: firstAidHolds(fa),
        },
        10,
      );
      expect(c.out.inhibit).toBe('first-aid-pause');
      rig = stepRig(rig, c.out.demands, 10);
    }
    expect(rig.sources.hypochlorite).toBe(0);
  });
});
