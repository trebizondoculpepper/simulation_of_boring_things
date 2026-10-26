import { describe, expect, it } from 'vite-plus/test';
import {
  CHANGEOVER,
  actOnChangeover,
  changeoverFlow,
  newBoosterChangeover,
  stepChangeover,
} from './booster-changeover';
import type { BoosterChangeover } from './booster-changeover';

const run = (
  s: BoosterChangeover,
  seconds: number,
  each?: (s: BoosterChangeover) => void,
) => {
  for (let t = 0; t < seconds; t += 0.1) {
    s = stepChangeover(s, 0.1);
    each?.(s);
  }
  return s;
};

describe('the booster set’s duty changeover', () => {
  it('runs on its duty pump, its valves only open', () => {
    const s = run(newBoosterChangeover(), 5);
    expect(s.phase).toBe('running');
    expect(s.valve).toEqual([1, 0]);
    expect(changeoverFlow(s)).toBeCloseTo(CHANGEOVER.rate);
  });

  it('changes over in order: stops, shuts, opens the other, starts', () => {
    let s = run(newBoosterChangeover(), 2);
    s = actOnChangeover(s, { act: 'duty', pump: 1 });
    const phases: string[] = [];
    s = run(s, 40, (x) => {
      if (phases.at(-1) !== x.phase) phases.push(x.phase);
    });
    expect(phases).toEqual([
      'stopping',
      'closing',
      'opening',
      'starting',
      'running',
    ]);
    expect(s.duty).toBe(1);
    expect(s.valve).toEqual([0, 1]);
    expect(s.speed).toEqual([0, 1]);
    expect(changeoverFlow(s)).toBeCloseTo(CHANGEOVER.rate);
  });

  it('never has both pumps’ valves open, so none can run back through the standby', () => {
    let s = run(newBoosterChangeover(), 2);
    for (const pump of [1, 0, 1] as const) {
      s = actOnChangeover(s, { act: 'duty', pump });
      s = run(s, 40, (x) => {
        expect(Math.min(x.valve[0], x.valve[1])).toBe(0);
        // Nor does a pump turn against a shut valve.
        for (const p of [0, 1] as const)
          if (x.speed[p] > 0 && x.phase === 'starting')
            expect(x.valve[p]).toBe(1);
      });
    }
  });

  it('coasts down on STOP, its valves left open, and starts again on RUN', () => {
    let s = run(newBoosterChangeover(), 2);
    s = run(actOnChangeover(s, { act: 'stop' }), 5);
    expect(s.phase).toBe('stopped');
    expect(s.speed[0]).toBe(0);
    expect(s.valve[0]).toBe(1);
    expect(changeoverFlow(s)).toBe(0);
    s = run(actOnChangeover(s, { act: 'run' }), 5);
    expect(s.phase).toBe('running');
    expect(s.speed[0]).toBe(1);
  });

  it('holds the outgoing pump’s valves open until it has coasted to rest', () => {
    let s = run(newBoosterChangeover(), 2);
    s = actOnChangeover(s, { act: 'duty', pump: 1 });
    run(s, 40, (x) => {
      if (x.speed[0] > 0) expect(x.valve[0]).toBe(1);
    });
  });
});
