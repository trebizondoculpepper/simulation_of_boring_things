import { describe, expect, it } from 'vite-plus/test';
import {
  FITTINGS,
  OVERFLOW_L,
  PUMP_NOS,
  TAGS,
  TANK,
  actOnHall6,
  deliveries,
  deliveryAlone,
  fillSeconds,
  fillSentence,
  friendlyDuration,
  hall6Expansion,
  hall6Readings,
  newHall6,
  pumpOf,
  runHall6,
} from './museum-6-pumps';
import type { Hall6Action, Hall6State } from './museum-6-pumps';

const act = (s: Hall6State, ...a: Hall6Action[]) => a.reduce(actOnHall6, s);

describe('Hall 6’s schematic', () => {
  it('derives its tags, room code M6', () => {
    expect(TAGS['p2']).toBe('M6-P2');
    expect(TAGS['p2.suction.iso']).toBe('M6-P2-V1');
    expect(TAGS['p2.nrv']).toBe('M6-P2-NRV1');
    expect(TAGS['p2.discharge.iso']).toBe('M6-P2-V2');
    expect(TAGS['p2.cv']).toBe('M6-P2-V3');
    expect(TAGS['p1.fi']).toBe('M6-FI1');
    expect(TAGS['p2.fi']).toBe('M6-FI2');
    expect(TAGS['tank.drain.mv']).toBe('M6-TK1-V1');
    expect(TAGS['tank.lsh']).toBe('M6-LSH1');
    expect(TAGS['tank.li']).toBe('M6-LI1');
    expect(TAGS['tank.lt']).toBe('M6-LT1');
  });

  it('gives every fitting, so the plumber adds nothing', () => {
    const e = hall6Expansion();
    expect(e.added).toEqual([]);
    expect(e.fittings.map((f) => f.id).sort()).toEqual(
      FITTINGS.map((f) => f.id).sort(),
    );
  });
});

describe('Hall 6’s pumps', () => {
  it('runs each centrifugal pump alone at its rated duty (commissioning valve set)', () => {
    for (const n of PUMP_NOS) {
      const p = pumpOf(n);
      if (p.family === 'centrifugal')
        expect(deliveryAlone(n)).toBeCloseTo(p.dutyFlow, 3);
      else {
        expect(deliveryAlone(n) * 1000).toBeLessThan(p.ratedLh);
        expect(deliveryAlone(n) * 1000).toBeGreaterThan(p.ratedLh * 0.99);
      }
    }
  });

  it('pins the signs’ fill times', () => {
    expect(friendlyDuration(fillSeconds(1))).toBe('10 minutes');
    expect(friendlyDuration(fillSeconds(2))).toBe('5.8 seconds');
    expect(fillSentence(2)).toBe(
      'At this rate it would take 5.8 seconds to fill the tank.',
    );
    expect(fillSeconds(1) / fillSeconds(2)).toBeGreaterThan(100);
  });

  it('adds pumps run together, each a little less than alone', () => {
    const q = deliveries(() => true);
    expect(q[1]).toBeLessThan(6);
    expect(q[2]).toBeLessThan(625);
    expect(q[1]).toBeGreaterThan(0);
  });

  it('throttles a big pump by its butterfly', () => {
    let s = act(newHall6(), { type: 'run', no: 2 });
    const open = hall6Readings(s).flow[2];
    s = act(s, { type: 'notch', id: 'p2.discharge.iso', by: -3 });
    expect(hall6Readings(s).flow[2]).toBeLessThan(open);
    expect(fillSeconds(2)).toBeCloseTo(3600 / 625, 6);
  });
});

describe('Hall 6’s RUN buttons', () => {
  it('run one pump at a time: starting one stops the last', () => {
    let s = act(newHall6(), { type: 'run', no: 2 });
    s = act(s, { type: 'run', no: 1 });
    expect(PUMP_NOS.filter((n) => s.running[n])).toEqual([1]);
    s = act(s, { type: 'run', no: 1 });
    expect(PUMP_NOS.some((n) => s.running[n])).toBe(false);
  });
});

describe('Hall 6’s tank', () => {
  it('fills from the showpiece in about six seconds, then trips every pump', () => {
    let s = act(newHall6(), { type: 'run', no: 2 });
    s = runHall6(s, 5);
    expect(s.tripped).toBe(false);
    s = runHall6(s, 1.5);
    expect(s.tripped).toBe(true);
    expect(s.litres).toBe(TANK.fullL);
    expect(PUMP_NOS.every((n) => !s.running[n])).toBe(true);
    expect(s.overflowedL).toBe(0);
    const pressed = act(s, { type: 'run', no: 1 });
    expect(pressed.refused).toBe(s.refused + 1);
    expect({ ...pressed, refused: s.refused }).toEqual(s);
  });

  it('keeps one level, cumulative', () => {
    let s = runHall6(act(newHall6(), { type: 'run', no: 1 }), 60);
    const after = s.litres;
    expect(after).toBeCloseTo((6000 / 3600) * 60, 0);
    s = act(s, { type: 'run', no: 1 }, { type: 'run', no: 2 });
    s = runHall6(s, 1);
    expect(s.litres).toBeGreaterThan(after + 40);
  });

  it('overflows to the drain if the switch fails', () => {
    let s = act(newHall6(), { type: 'fail-switch' }, { type: 'run', no: 2 });
    s = runHall6(s, 10);
    expect(s.tripped).toBe(false);
    expect(s.litres).toBeCloseTo(OVERFLOW_L, 6);
    expect(s.overflowedL).toBeGreaterThan(0);
  });

  it('RESET drains it through the IBC’s outlet in under a minute and ends where entry starts', () => {
    let s = runHall6(act(newHall6(), { type: 'run', no: 2 }), 8);
    s = act(s, { type: 'reset' });
    expect(s.draining).toBe(true);
    expect(s.tripped).toBe(false);
    s = runHall6(s, 60);
    expect({ ...s, sinceReset: 0, refused: 0 }).toEqual(newHall6());
  });
});
