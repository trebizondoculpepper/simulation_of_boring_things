import { describe, expect, it } from 'vite-plus/test';
import {
  FAULTS,
  HALL9_MODEL,
  actOnHall9,
  allClear,
  drawFault,
  faultCleared,
  runHall9,
  scoreboard,
  stationClock,
} from './museum-9-faults';
import type { FaultNo, Hall9 } from './museum-9-faults';
import { hall9Alarms } from './museum-9-plant';
import { FIXES, settle } from './museum-9-faults.test-support';
import { hallSession } from '../../toolkit/gallery/logic/museum-time';

const base = runHall9(HALL9_MODEL.reset(36000), 300);
const cause = (h: Hall9, n: FaultNo) =>
  actOnHall9(
    actOnHall9(actOnHall9(h, { type: 'key', on: true }), {
      type: 'select',
      fault: n,
    }),
    { type: 'cause', r: 0 },
  );

/** Each fault's first-out window (none for the drifted probe), and the plant time it comes within. */
const FIRST: Record<FaultNo, [string | null, number]> = {
  1: ['suction-low', 600],
  2: ['filter-dp-high', 5],
  3: ['pump-tripped', 5],
  4: ['low-flow', 5],
  5: [null, 1200],
  6: ['boiler-lockout', 600],
  7: ['day-tank-low', 5],
  8: ['dosing-pump-fault', 600],
  9: ['sample-flow-low', 5],
  10: [null, 1200],
};

describe('Hall 9’s faults (Try it 2)', () => {
  it('starts dark, every fault cleared', () => {
    expect(allClear(base)).toBe(true);
    for (const f of FAULTS)
      expect(faultCleared(base.plant, f.n), f.name).toBe(true);
  });

  for (const f of FAULTS)
    it(`${f.n}, ${f.name}: shows itself first-out, and its fix at ${f.where} puts it right`, () => {
      let h = cause(base, f.n);
      expect(faultCleared(h.plant, f.n)).toBe(false);
      const [first, within] = FIRST[f.n];
      h = runHall9(h, within);
      expect(h.annunciator.firstOut).toBe(first);
      h = settle(FIXES[f.n](h));
      expect(faultCleared(h.plant, f.n)).toBe(true);
      expect(hall9Alarms(h.plant)).toEqual([]);
      expect(allClear(h)).toBe(true);
      expect(h.score!.fixedAt).not.toBeNull();
      expect(h.best).not.toBeNull();
    });
});

describe('Hall 9’s fault pedestal and scoreboard', () => {
  it('never draws the last fault again', () => {
    for (let last = 1; last <= 10; last++)
      for (let r = 0; r < 1; r += 0.01)
        expect(drawFault(last as FaultNo, r)).not.toBe(last);
    const all = new Set(
      Array.from({ length: 100 }, (_, k) => drawFault(null, k / 100)),
    );
    expect(all.size).toBe(10);
  });

  it('gives one fault at a time, timed from the fault in plant time', () => {
    let h = actOnHall9(base, { type: 'cause', r: 0.5 });
    const n = h.fault!;
    expect(actOnHall9(h, { type: 'cause', r: 0.1 }).fault).toBe(n);
    expect(scoreboard(h).fault.trim()).toBe(String(n));
    h = runHall9(h, 120);
    expect(scoreboard(h).toFix).toBe('00:02');
  });

  it('RESET and walking in are the same: dark, empty scoreboard, clock at now', () => {
    const used = actOnHall9(runHall9(cause(base, 3), 60), {
      type: 'reset',
      now: 36000,
    });
    expect(used).toEqual(hallSession(HALL9_MODEL, 36000).state);
    expect(scoreboard(used)).toEqual({
      fault: '--',
      toAccept: '--:--',
      toFix: '--:--',
      best: '--:--',
    });
    expect(stationClock(used)).toEqual({ time: '10:00', day: 1 });
  });
});
