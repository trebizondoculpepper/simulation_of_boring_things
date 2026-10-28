import { describe, expect, it } from 'vite-plus/test';
import {
  actOnHall3,
  farSide,
  hall3Readings,
  newHall3,
  runHall3,
} from './museum-3-dosing';
import type { Hall3Action, Hall3State } from './museum-3-dosing';

/** Hall 3's Try it steps, pinned with its own controller and pumps (107c). */

const act = (s: Hall3State, ...a: Hall3Action[]) => a.reduce(actOnHall3, s);

/** Run `hours` on, sampling the far side's free chlorine every quarter hour. */
function sampled(s0: Hall3State, hours: number) {
  let s = s0;
  const far: number[] = [];
  const dc: number[] = [];
  for (let k = 0; k < hours * 4; k++) {
    s = runHall3(s, 900, 1);
    far.push(farSide(s).freeChlorine);
    dc.push(hall3Readings(s).free);
  }
  return { s, far, dc };
}
const lo = (xs: number[]) => Math.min(...xs);
const hi = (xs: number[]) => Math.max(...xs);
const firstBelow = (xs: number[], v: number) =>
  (xs.findIndex((x) => x < v) + 1) / 4;

describe('Hall 3, Try it', () => {
  it('1: holds the chlorine through a normal day from 08:00', () => {
    const { far, s } = sampled(newHall3(8 * 3600), 24);
    expect(lo(far)).toBeGreaterThan(0.75);
    expect(hi(far)).toBeLessThan(1.9);
    expect(
      s.controller.alarms.filter((a) => a.code !== 'chlorine-low'),
    ).toEqual([]);
  });

  it('2: a crowd takes the chlorine down within the hour, and the controller brings it back', () => {
    const quiet = sampled(newHall3(10 * 3600), 1).dc.at(-1)!;
    const crowd = sampled(
      act(newHall3(10 * 3600), { type: 'swimmers', swimmers: 'crowd' }),
      4,
    );
    expect(crowd.dc[3]).toBeLessThan(quiet - 0.1);
    expect(crowd.dc.at(-1)!).toBeGreaterThan(1.2);
    expect(crowd.s.controller.timedOut.hypochlorite).toBe(false);
  });

  it('4: air in the hypochlorite pump: the chlorine falls below the low alarm, and comes back once the pump is acknowledged', () => {
    const run = sampled(act(newHall3(10 * 3600), { type: 'air' }), 5);
    const below = firstBelow(run.dc, 0.8);
    expect(below).toBeGreaterThan(2.5);
    expect(below).toBeLessThan(4);
    const s = act(
      run.s,
      { type: 'pump-ack', channel: 'hypochlorite' },
      {
        type: 'controller-act',
        action: { kind: 'ack' },
      },
    );
    const back = sampled(s, 3);
    expect(back.dc.findIndex((x) => x >= 1.3) / 4).toBeLessThan(2);
  });

  it('5: a weak delivery: nothing alarms beyond what a normal day does, but the tank empties faster', () => {
    const day = (weak: boolean) => {
      let s = newHall3(8 * 3600);
      if (weak) s = act(s, { type: 'weak' });
      // Drain the day tank to a third, then fill it from the store.
      s = {
        ...s,
        tanks: {
          ...s.tanks,
          hypochlorite: { ...s.tanks.hypochlorite, litres: 5 },
        },
      };
      s = runHall3(
        act(s, { type: 'valve', id: 'hypoTank.fill', open: true }),
        360,
        1,
      );
      s = act(s, { type: 'valve', id: 'hypoTank.fill', open: false });
      const d0 = s.pumps.hypochlorite.deliveredL;
      const run = sampled(s, 24);
      return {
        litres: run.s.pumps.hypochlorite.deliveredL - d0,
        run,
        strength: s.tanks.hypochlorite.strength,
      };
    };
    const weak = day(true);
    const normal = day(false);
    expect(weak.strength).toBeCloseTo(103.3, 0);
    expect(weak.litres / normal.litres).toBeGreaterThan(1.25);
    expect(lo(weak.run.far)).toBeGreaterThan(0.7);
  });
});
