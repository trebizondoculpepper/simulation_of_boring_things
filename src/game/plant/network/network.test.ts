import { describe, expect, it } from 'vite-plus/test';
import { POOL_TARGET } from '../pools';
import { modelGaps } from './gaps';
import { PLANT_NETWORK, plantNode, plantNodeBySerial } from './plant-network';
import { SITE, deckOn } from './common';
import { LARGE_POOLS, PACKAGED_POOLS } from './pool-water';
import { normalState, withChanges } from './state';
import { registerProblems } from './serial-register';
import { RETIRED, SERIALS } from './serials';
import { networkProblems, reaches } from './validate';
import { solveWater } from './water';

const net = PLANT_NETWORK;
const normal = normalState(net);
const base = solveWater(net, normal);

describe('the plant network', () => {
  it('keeps its own rules: unique, well-formed names; every pipe between ports of its service; every port joined', () => {
    expect(networkProblems(net)).toEqual([]);
  });

  it.each(LARGE_POOLS.map((s) => [s.system, s] as const))(
    '%s: a circuit from its balance tank to its pool, and back',
    (_, s) => {
      const water = ['pool-water'] as const;
      expect(
        reaches(
          net,
          `${s.code.toLowerCase()}.t1.suction`,
          `${s.code.toLowerCase().replace('pl', 'ph')}.pool.inlets`,
          water,
        ),
      ).toBe(true);
      expect(
        reaches(
          net,
          `${s.code.toLowerCase().replace('pl', 'ph')}.pool.mainDrain`,
          `${s.code.toLowerCase()}.t1.mainDrain`,
          water,
        ),
      ).toBe(true);
    },
  );

  it('sends every drain to the backwash holding tank, and that to the sewer', () => {
    for (const n of net.nodes)
      for (const [port, service] of Object.entries(n.ports))
        if (service === 'drainage' && n.id !== 'wh.t2' && n.id !== SITE.sewer)
          expect(
            reaches(net, `${n.id}.${port}`, 'wh.t2.inlet', ['drainage']) ||
              reaches(net, `${n.id}.${port}`, `${SITE.sewer}.in`, ['drainage']),
            `${n.id}.${port}`,
          ).toBe(true);
    expect(reaches(net, 'wh.t2.outlet', `${SITE.sewer}.in`, ['drainage'])).toBe(
      true,
    );
  });

  it('brings make-up from the town main to the break tank, and from it to every pool’s plant', () => {
    expect(
      reaches(net, `${SITE.townMain}.out`, 'wh.t1.inlet', ['make-up']),
    ).toBe(true);
    for (const end of [
      'pl1.t1.makeUp',
      'pl2.t1.makeUp',
      'pl3.cab1.makeUp',
      'pl4.cab1.makeUp',
    ])
      expect(reaches(net, 'wh.t1.outlet', end, ['make-up']), end).toBe(true);
  });

  it('gives every filter its five valves and a drain', () => {
    for (const s of LARGE_POOLS)
      for (let f = 1; f <= s.filters; f++)
        for (const v of ['iv1', 'iv2', 'bv1', 'bv2', 'rnv1', 'wv1'])
          expect(plantNode(`${s.code.toLowerCase()}.f${f}.${v}`).kind).toBe(
            'valve',
          );
  });

  it('names each thing by its tag on the plate, room first', () => {
    expect(plantNode('pl2.f3.bv2').tag).toBe('PL2-F3-BV2');
    expect(plantNode('pl1.p2').tag).toBe('PL1-P2');
    expect(plantNode('pl4.cab1').tag).toBe('PL4-CAB1');
  });
});

describe('its two identities', () => {
  it('gives each thing a serial number from the register, never reused', () => {
    expect(
      registerProblems(net, { serials: SERIALS, retired: RETIRED }),
    ).toEqual([]);
  });

  it('keeps a serial when the network is rebuilt: it is recorded, not counted', () => {
    expect(plantNode('pl2.f3.bv2').serial).toBe(SERIALS['pl2.f3.bv2']);
    expect(plantNodeBySerial(SERIALS['pl1.p2']).id).toBe('pl1.p2');
  });
});

describe('its water, solved', () => {
  it('converges', () => expect(base.converged).toBe(true));

  it.each(LARGE_POOLS.map((s) => [s.system, s] as const))(
    '%s: the duty pump gives the pool’s design flow, shared by its filters',
    (_, s) => {
      const q = POOL_TARGET[s.pool].flow;
      expect(
        Math.abs(base.through[`${s.code.toLowerCase()}.p1`] - q) / q,
      ).toBeLessThan(0.05);
      expect(base.through[`${s.code.toLowerCase()}.p2`]).toBeCloseTo(0, 1);
      for (let f = 1; f <= s.filters; f++)
        expect(base.through[`${s.code.toLowerCase()}.f${f}`]).toBeCloseTo(
          q / s.filters,
          -1,
        );
      expect(base.through[`${s.code.toLowerCase()}.uv1`]).toBeCloseTo(
        base.through[`${s.code.toLowerCase()}.p1`],
        3,
      );
    },
  );

  it.each(PACKAGED_POOLS.map((s) => [s.system, s] as const))(
    '%s: its packaged set gives its design flow',
    (_, s) => {
      const q = POOL_TARGET[s.pool].flow;
      expect(
        Math.abs(base.through[`${s.code.toLowerCase()}.cab1`] - q) / q,
      ).toBeLessThan(0.05);
    },
  );

  it('draws on the tank and pushes into the pool: suction below the discharge', () => {
    expect(base.head('pl2.p1', 'discharge')).toBeGreaterThan(
      base.head('pl2.p1', 'suction') + 5,
    );
  });

  it('runs the main drains back to the tank, and nothing to waste', () => {
    expect(base.through['pl2.pw.iv1']).toBeGreaterThan(0);
    expect(base.through['pl2.pw.wv1']).toBeCloseTo(0, 1);
    for (let f = 1; f <= 5; f++)
      expect(base.through[`pl2.f${f}.bv2`]).toBeCloseTo(0, 1);
  });
});

describe('line-ups', () => {
  const solve = (changes: Record<string, number | boolean>) =>
    solveWater(net, withChanges(normal, changes));

  it('changes over to the standby pump', () => {
    const s = solve({ 'pl2.p1': false, 'pl2.p2': true });
    expect(s.through['pl2.p1']).toBeCloseTo(0, 1);
    expect(s.through['pl2.p2']).toBeCloseTo(base.through['pl2.p1'], 3);
  });

  it('starves the pump when its suction valve is shut, and stops the flow', () => {
    const s = solve({ 'pl2.p1.sv1': 0 });
    expect(s.through['pl2.uv1']).toBeCloseTo(0, 1);
  });

  it('throttles the flow with a part-shut discharge valve', () => {
    const s = solve({ 'pl2.p1.dv1': 0.15 });
    const q = s.through['pl2.p1'];
    expect(q).toBeLessThan(POOL_TARGET.pool_02.flow * 0.8);
    expect(q).toBeGreaterThan(0);
  });

  it('isolates a filter: the others carry the flow', () => {
    const s = solve({ 'pl2.f3.iv1': 0, 'pl2.f3.iv2': 0 });
    expect(s.through['pl2.f3']).toBeCloseTo(0, 1);
    const rest = [1, 2, 4, 5].reduce(
      (sum, f) => sum + s.through[`pl2.f${f}`],
      0,
    );
    expect(rest).toBeCloseTo(s.through['pl2.uv1'], 3);
    expect(s.through['pl2.f1']).toBeGreaterThan(POOL_TARGET.pool_02.flow / 5);
  });

  it('backwashes a filter: up through its bed to waste, the others still serving the pool', () => {
    const s = solve({
      'pl2.f2.iv1': 0,
      'pl2.f2.iv2': 0,
      'pl2.f2.bv1': 1,
      'pl2.f2.bv2': 1,
    });
    expect(s.through['pl2.f2']).toBeLessThan(-10);
    expect(s.through['pl2.f2.bv2']).toBeCloseTo(-s.through['pl2.f2'], 3);
    expect(s.through['pl2.uv1']).toBeGreaterThan(0);
  });

  it('drains the balance tank to waste', () => {
    const s = solve({ 'pl1.t1.wv1': 1 });
    expect(s.through['pl1.t1.wv1']).toBeGreaterThan(5);
  });

  it('drains the pool down: main drain shut to the tank, open to waste', () => {
    const s = solve({ 'pl2.pw.iv1': 0, 'pl2.pw.wv1': 1 });
    expect(s.through['pl2.pw.iv1']).toBeCloseTo(0, 1);
    expect(s.through['pl2.pw.wv1']).toBeCloseTo(60, -1);
  });

  it('leaves one pool’s plant alone when another’s changes', () => {
    const s = solve({ 'pl2.p1': false });
    expect(s.through['pl1.p1']).toBeCloseTo(base.through['pl1.p1'], 6);
  });
});

describe('make-up and drainage', () => {
  const solve = (changes: Record<string, number | boolean>) =>
    solveWater(net, withChanges(normal, changes));

  it('tops up a balance tank through the booster set and the meter', () => {
    const s = solve({ 'pl1.t1.lcv1': 1 });
    const fill = s.through['pl1.t1.lcv1'];
    expect(fill).toBeGreaterThan(3);
    expect(s.through['wh.p1']).toBeCloseTo(fill, 3);
    expect(s.through['wh.fm1']).toBeCloseTo(fill, 3);
  });

  it('reaches the highest pool’s plant, the jacuzzi’s on the top level', () => {
    expect(base.head('pl3.mu.iv1', 'b')).toBeGreaterThan(deckOn(2) + 10);
  });

  it('tops up nothing with the booster set stopped, or the room’s branch valve shut', () => {
    expect(
      solve({ 'pl1.t1.lcv1': 1, 'wh.p1': false }).through['pl1.t1.lcv1'],
    ).toBeCloseTo(0, 2);
    expect(
      solve({ 'pl1.t1.lcv1': 1, 'pl1.mu.iv1': 0 }).through['pl1.t1.lcv1'],
    ).toBeCloseTo(0, 2);
  });

  it('changes over to the standby booster', () => {
    const s = solve({ 'pl2.t1.lcv1': 1, 'wh.p1': false, 'wh.p2': true });
    expect(s.through['wh.p2']).toBeGreaterThan(3);
  });

  it('refills the break tank from the town main, and not with its stop valve shut', () => {
    expect(base.through['wh.t1.lcv1']).toBeGreaterThan(5);
    expect(solve({ 'wh.mu.iv1': 0 }).through['wh.t1.lcv1']).toBeCloseTo(0, 2);
  });

  it('takes a backwash into the holding tank', () => {
    const s = solve({
      'pl2.f2.iv1': 0,
      'pl2.f2.iv2': 0,
      'pl2.f2.bv1': 1,
      'pl2.f2.bv2': 1,
    });
    expect(s.pipe['wh.dr.main.main>wh.t2.inlet']).toBeCloseTo(
      s.through['pl2.f2.bv2'],
      3,
    );
  });

  it('lifts the holding tank to the sewer, at about the consented rate, only with its pump running', () => {
    expect(base.through['wh.p3']).toBeCloseTo(0, 2);
    const s = solve({ 'wh.p3': true });
    expect(s.through['wh.p3']).toBeGreaterThan(8);
    expect(s.through['wh.p3']).toBeLessThan(12);
  });
});

describe('the gaps', () => {
  it('are every placeholder, each with what is missing', () => {
    const gaps = modelGaps(net);
    expect(gaps.length).toBeGreaterThan(0);
    for (const g of gaps) expect(g.missing.length).toBeGreaterThan(10);
  });

  it('only shrink: filling a gap lowers this number, and nothing may raise it unseen', () => {
    expect(modelGaps(net).length).toBeLessThanOrEqual(65);
  });
});
