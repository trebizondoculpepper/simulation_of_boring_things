import { describe, expect, it } from 'vite-plus/test';
import { createGraph } from '../../core/logic/world/graph';
import {
  HEAD_OPENS_AT,
  INVESTIGATION_SECONDS,
  createFireAlarmSystem,
} from './fire-alarm-system';

/** A host with a fire it sets by hand: its smoke and its heat. */
function host(finds = 0.2) {
  const g = createGraph();
  const mains = g.input('mains', true);
  const smokeMade = g.input('host.smoke', 0);
  const heat = g.input('host.heat', 20);
  const alight = g.derive('host.alight', [smokeMade], (s) => s > 0);
  const temperatures = g.derive('host.heads', [heat], (t) => [t, t - 30]);
  const fire = createFireAlarmSystem(g, {
    heads: 2,
    mains,
    smokeTarget: smokeMade,
    alight,
    headTemperatures: temperatures,
  });
  const run = (seconds: number) => {
    for (let t = 0; t < seconds; t += 0.5) g.tick(0.5, () => finds);
  };
  return { g, fire, smokeMade, heat, run };
}

describe('the fire alarm system', () => {
  it('detects smoke, investigates, and evacuates on a real fire', () => {
    const { fire, smokeMade, run } = host();
    smokeMade.set(0.8);
    run(10);
    expect(fire.detector.value).toBe(true);
    expect(fire.stage.value).toBe('alert');
    expect(fire.voice.value).toBe('alert');
    expect(fire.doorsHeld.value).toBe(false);
    run(INVESTIGATION_SECONDS);
    expect(fire.stage.value).toBe('evacuate');
    expect(fire.panelLamps.value.brigade).toBe(true);
  });

  it('opens the heads by heat alone, whatever the panel says', () => {
    const { fire, smokeMade, heat, run } = host();
    smokeMade.set(0.8);
    run(10);
    fire.panelKey.set(true);
    fire.silence();
    expect(fire.sounding.value).toBe(false);
    heat.set(HEAD_OPENS_AT - 1);
    run(2);
    expect(fire.discharging.value).toBe(false);
    heat.set(HEAD_OPENS_AT + 1);
    run(1);
    // Only the hotter head bursts; the water sends everyone out.
    expect(fire.heads.value.map((h) => h.spraying)).toEqual([true, false]);
    expect(fire.stage.value).toBe('evacuate');
    // A burst bulb stays burst as the gas cools; the main valve stops it.
    heat.set(20);
    run(1);
    expect(fire.discharging.value).toBe(true);
    fire.riserValve.set(false);
    expect(fire.discharging.value).toBe(false);
  });

  it('resets only once the fire is out and the smoke has cleared', () => {
    const { fire, smokeMade, run } = host();
    smokeMade.set(0.8);
    run(10);
    fire.panelKey.set(true);
    expect(fire.reset()).toBe(false);
    smokeMade.set(0);
    run(30);
    expect(fire.reset()).toBe(true);
    expect(fire.stage.value).toBe('all-clear');
    expect(fire.announcement.value.kind).toBe('all-clear');
  });
});
