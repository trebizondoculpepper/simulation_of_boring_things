import { describe, expect, it } from 'vite-plus/test';
import { dose } from '../water/pool-chemistry';
import { DEFAULT_TARGETS } from './aqualis-types';
import type { AqualisSettings, ChannelPorts } from './aqualis-types';
import { newSampler, stepSampler } from './aqualis-sampler';
import { newController, stepController } from './aqualis-controller';
import {
  RIG_POOL,
  newRig,
  rigFlow,
  rigPorts,
  rigSample,
  setDeviceConnected,
  stepRig,
} from './aqualis-rig';
import { co2Feedback } from './co2-dosing';
import { newCo2Plant, stepCo2Plant } from './co2-plant';
import type { Co2Plant } from './co2-plant';
import { setMaster } from './co2-distribution';

/**
 * The CO₂ system closed round the Trio (CO₂ dosing): the Aqualis test rig's
 * ideal pool at the Lounge's size, its own CO₂ valve and acid pump
 * unplugged, and the Lounge's real CO₂ valve controller, fed from the
 * loading bay's cylinders through the building line, on the cabinet's CO₂
 * port. The grams the panel delivers go into the rig's water.
 */

const SETTINGS: AqualisSettings = {
  dynamics: { volumeM3: RIG_POOL.volumeM3, flowM3h: RIG_POOL.flowM3h },
  targets: DEFAULT_TARGETS,
};

function run(hours: number, co2: Co2Plant = newCo2Plant(20)) {
  let rig = setDeviceConnected(
    setDeviceConnected(newRig('ph-high'), 'co2', false),
    'acid',
    false,
  );
  let sampler = newSampler(rigSample(rig));
  let control = newController();
  let plant = co2;
  let grams = 0;
  let out = null as ReturnType<typeof stepController>['out'] | null;
  const dt = 10;
  for (let t = 0; t < hours * 3600; t += dt) {
    const s = stepSampler(sampler, rigSample(rig), dt);
    sampler = s.state;
    const ports: ChannelPorts = {
      ...rigPorts(rig),
      co2: co2Feedback(plant.dosers.plant_pool_01),
    };
    const c = stepController(
      control,
      {
        readings: s.readings,
        sample: s.status,
        selector: 'auto',
        ports,
        settings: SETTINGS,
        hand: { hypochlorite: 0, acid: 0, co2: 0 },
      },
      dt,
    );
    control = c.state;
    out = c.out;
    const step = stepCo2Plant(
      plant,
      {
        rooms: {
          plant_pool_01: {
            demand: c.out.demands.co2,
            connected: true,
            waterFlowing: rigFlow(rig) > 0,
          },
          plant_pool_02: { demand: 0, connected: true, waterFlowing: true },
        },
      },
      dt,
    );
    plant = step.state;
    grams += step.grams.plant_pool_01;
    rig = stepRig(rig, c.out.demands, dt);
    if (step.grams.plant_pool_01 > 0)
      rig = {
        ...rig,
        water: dose(
          rig.water,
          { co2: step.grams.plant_pool_01 },
          RIG_POOL.volumeM3,
          rig.temperature,
        ),
      };
  }
  return { rig, grams, out: out!, plant };
}

describe('the CO₂ system with the Trio', () => {
  it('brings a high pH down with CO₂ alone, from the cylinders, through the Lounge’s panel', () => {
    const start = newRig('ph-high').water.ph;
    const { rig, grams, out } = run(12);
    expect(out.channels.co2.status).toEqual({ kind: 'online' });
    expect(out.channels.acid.status).toEqual({ kind: 'unconnected' });
    expect(grams).toBeGreaterThan(100);
    expect(rig.water.ph).toBeLessThan(start - 0.3);
    expect(rig.water.ph).toBeLessThan(DEFAULT_TARGETS.ph.high + 0.05);
    // CO₂ adds carbonate, not acid: the alkalinity is unchanged.
    expect(rig.water.alkalinity).toBeCloseTo(
      newRig('ph-high').water.alkalinity,
      0,
    );
  });

  it('leaves the pH high with the master valve shut, the channel OFFLINE for its supply', () => {
    const shut = newCo2Plant(20);
    const { rig, grams, out } = run(3, {
      ...shut,
      distribution: setMaster(shut.distribution, false),
    });
    expect(grams).toBeLessThan(90);
    expect(rig.water.ph).toBeGreaterThan(7.7);
    expect(out.channels.co2.status).toMatchObject({
      kind: 'offline',
      reason: 'fault',
      fault: 'NO SUPPLY PRESSURE',
    });
  });
});
