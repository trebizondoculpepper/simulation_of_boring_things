import { describe, expect, it } from 'vite-plus/test';
import {
  CHANGEOVER,
  actOnChangeover,
  changeoverFlow,
  changeoverPressure,
  newBoosterChangeover,
  stepChangeover,
} from './booster-changeover';
import { SET_PRESSURE } from './booster-set';
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

  it('on STOP coasts to rest, then shuts its valves; on RUN opens them, then runs up', () => {
    let s = run(newBoosterChangeover(), 2);
    s = run(actOnChangeover(s, { act: 'stop' }), 15, (x) => {
      // Never shut on a pump still turning.
      if (x.speed[0] > 0) expect(x.valve[0]).toBe(1);
    });
    expect(s.phase).toBe('stopped');
    expect(s.speed[0]).toBe(0);
    expect(s.valve).toEqual([0, 0]);
    expect(changeoverFlow(s)).toBe(0);
    s = run(actOnChangeover(s, { act: 'run' }), 15, (x) => {
      // Never turning against shut valves.
      if (x.speed[0] > 0) expect(x.valve[0]).toBe(1);
    });
    expect(s.phase).toBe('running');
    expect(s.speed[0]).toBe(1);
    expect(s.valve[0]).toBe(1);
  });

  it('shuts the assist pump’s valves too on STOP while boosting', () => {
    let s = run(
      actOnChangeover(run(newBoosterChangeover(), 2), { act: 'boost' }),
      20,
    );
    s = run(actOnChangeover(s, { act: 'stop' }), 15);
    expect(s.valve).toEqual([0, 0]);
    expect(s.speed).toEqual([0, 0]);
  });

  it('holds the outgoing pump’s valves open until it has coasted to rest', () => {
    let s = run(newBoosterChangeover(), 2);
    s = actOnChangeover(s, { act: 'duty', pump: 1 });
    run(s, 40, (x) => {
      if (x.speed[0] > 0) expect(x.valve[0]).toBe(1);
    });
  });

  it('runs both pumps in parallel on BOOST, for about 1.7 times the flow', () => {
    let s = run(newBoosterChangeover(), 2);
    s = run(actOnChangeover(s, { act: 'boost' }), 20, (x) => {
      // The assist pump never turns against its own shut valves.
      if (x.speed[1] > 0) expect(x.valve[1]).toBe(1);
    });
    expect(s.speed).toEqual([1, 1]);
    expect(s.valve).toEqual([1, 1]);
    expect(changeoverFlow(s) / CHANGEOVER.rate).toBeCloseTo(1.7);
  });

  it('takes the assist pump off on BOOST again: it coasts to rest, then its valves shut', () => {
    let s = run(
      actOnChangeover(run(newBoosterChangeover(), 2), { act: 'boost' }),
      20,
    );
    s = run(actOnChangeover(s, { act: 'boost' }), 20, (x) => {
      if (x.speed[1] > 0) expect(x.valve[1]).toBe(1);
    });
    expect(s.speed).toEqual([1, 0]);
    expect(s.valve).toEqual([1, 0]);
    expect(changeoverFlow(s)).toBeCloseTo(CHANGEOVER.rate);
  });

  it('ends BOOST on STOP or a change of duty', () => {
    const boosted = run(
      actOnChangeover(run(newBoosterChangeover(), 2), { act: 'boost' }),
      20,
    );
    expect(actOnChangeover(boosted, { act: 'stop' }).boost).toBe(false);
    expect(actOnChangeover(boosted, { act: 'duty', pump: 1 }).boost).toBe(
      false,
    );
  });

  it('holds its set pressure on one pump or two, none once stopped', () => {
    let s = run(newBoosterChangeover(), 2);
    expect(changeoverPressure(s)).toBeCloseTo(SET_PRESSURE);
    const boosted = run(actOnChangeover(s, { act: 'boost' }), 20);
    // More flow, the same pressure: a constant-pressure set.
    expect(changeoverFlow(boosted)).toBeGreaterThan(changeoverFlow(s));
    expect(changeoverPressure(boosted)).toBeCloseTo(SET_PRESSURE);
    s = run(actOnChangeover(s, { act: 'stop' }), 15);
    expect(changeoverPressure(s)).toBe(0);
  });
});
