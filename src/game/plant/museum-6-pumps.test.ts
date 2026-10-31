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
    expect(TAGS['p6']).toBe('M6-P6');
    expect(TAGS['p6.suction.iso']).toBe('M6-P6-V1');
    expect(TAGS['p6.nrv']).toBe('M6-P6-NRV1');
    expect(TAGS['p6.discharge.iso']).toBe('M6-P6-V2');
    expect(TAGS['p6.cv']).toBe('M6-P6-V3');
    expect(TAGS['p1.fi']).toBe('M6-FI1');
    expect(TAGS['p6.fi']).toBe('M6-FI6');
    expect(TAGS['tank.drain.mv']).toBe('M6-TK1-V1');
    expect(TAGS['tank.lsh']).toBe('M6-LSH1');
    expect(TAGS['tank.li']).toBe('M6-LI1');
    expect(TAGS['tank.lt']).toBe('M6-LT1');
    expect(TAGS['mimic']).toBe('M6-MP1');
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
    expect(friendlyDuration(fillSeconds(1))).toBe('20 days');
    expect(friendlyDuration(fillSeconds(2))).toBe('5.6 days');
    expect(friendlyDuration(fillSeconds(4))).toBe('33 hours');
    expect(friendlyDuration(fillSeconds(5))).toBe('23 seconds');
    expect(friendlyDuration(fillSeconds(6))).toBe('12 seconds');
    expect(fillSentence(6)).toBe(
      'At this rate it would take 12 seconds to fill the tank.',
    );
    expect(fillSeconds(1) / fillSeconds(6)).toBeGreaterThan(100000);
  });

  it('adds pumps run together, each a little less than alone', () => {
    const q = deliveries((n) => n === 5 || n === 6);
    expect(q[5]).toBeLessThan(160);
    expect(q[6]).toBeLessThan(300);
    expect(q[5] + q[6]).toBeGreaterThan(300);
  });

  it('throttles a big pump by its butterfly', () => {
    let s = act(newHall6(), { type: 'run', no: 6 });
    const open = hall6Readings(s).flow[6];
    s = act(s, { type: 'notch', id: 'p6.discharge.iso', by: -3 });
    expect(hall6Readings(s).flow[6]).toBeLessThan(open);
    expect(fillSeconds(5)).toBeCloseTo(3600 / 160, 6);
  });
});

describe('Hall 6’s RUN buttons', () => {
  it('run one pump at a time: starting one stops the last', () => {
    let s = act(newHall6(), { type: 'run', no: 6 });
    s = act(s, { type: 'run', no: 1 });
    expect(PUMP_NOS.filter((n) => s.running[n])).toEqual([1]);
    s = act(s, { type: 'run', no: 1 });
    expect(PUMP_NOS.some((n) => s.running[n])).toBe(false);
  });
});

describe('Hall 6’s tank', () => {
  it('fills from the biggest pump in about twelve seconds, then trips every pump', () => {
    let s = act(newHall6(), { type: 'run', no: 6 });
    s = runHall6(s, 11);
    expect(s.tripped).toBe(false);
    s = runHall6(s, 2);
    expect(s.tripped).toBe(true);
    expect(s.litres).toBe(TANK.fullL);
    expect(PUMP_NOS.every((n) => !s.running[n])).toBe(true);
    expect(s.overflowedL).toBe(0);
    const pressed = act(s, { type: 'run', no: 3 });
    expect(pressed.refused).toBe(s.refused + 1);
    expect({ ...pressed, refused: s.refused }).toEqual(s);
  });

  it('keeps one level, cumulative', () => {
    let s = runHall6(act(newHall6(), { type: 'run', no: 5 }), 5);
    const after = s.litres;
    expect(after).toBeCloseTo((160000 / 3600) * 5, -1);
    s = act(s, { type: 'run', no: 5 }, { type: 'run', no: 6 });
    s = runHall6(s, 1);
    expect(s.litres).toBeGreaterThan(after + 40);
  });

  it('overflows to the drain if the switch fails', () => {
    let s = act(newHall6(), { type: 'fail-switch' }, { type: 'run', no: 6 });
    s = runHall6(s, 20);
    expect(s.tripped).toBe(false);
    expect(s.litres).toBeCloseTo(OVERFLOW_L, 6);
    expect(s.overflowedL).toBeGreaterThan(0);
  });

  it('RESET drains it through the IBC’s outlet in under a minute and ends where entry starts', () => {
    let s = runHall6(act(newHall6(), { type: 'run', no: 6 }), 14);
    s = act(s, { type: 'reset' });
    expect(s.draining).toBe(true);
    expect(s.tripped).toBe(false);
    s = runHall6(s, 60);
    expect({ ...s, sinceReset: 0, refused: 0 }).toEqual(newHall6());
  });
});
