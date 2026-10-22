import { describe, expect, it } from 'vite-plus/test';
import { POOL_TARGET } from '../pools';
import { modelGaps } from './gaps';
import { PLANT_NETWORK, plantNode } from './plant-network';
import { LARGE_POOLS, PACKAGED_POOLS, SITE } from './pool-water';
import { normalState, withChanges } from './state';
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
          `${s.system}.balance-tank.suction`,
          `${s.system}.pool.inlets`,
          water,
        ),
      ).toBe(true);
      expect(
        reaches(
          net,
          `${s.system}.pool.mainDrain`,
          `${s.system}.balance-tank.mainDrain`,
          water,
        ),
      ).toBe(true);
    },
  );

  it('sends every drain to the drainage', () => {
    for (const n of net.nodes)
      for (const [port, service] of Object.entries(n.ports))
        if (service === 'drainage' && n.id !== SITE.drainage)
          expect(
            reaches(net, `${n.id}.${port}`, `${SITE.drainage}.in`, [
              'drainage',
            ]),
            `${n.id}.${port}`,
          ).toBe(true);
  });

  it('gives every filter its five valves and a drain', () => {
    for (const s of LARGE_POOLS)
      for (let f = 1; f <= s.filters; f++)
        for (const v of ['iv1', 'iv2', 'bv1', 'bv2', 'rnv1', 'wv1'])
          expect(plantNode(`${s.system}.filter${f}.${v}`).kind).toBe('valve');
  });

  it('names each thing by its tag on the plate, room first', () => {
    expect(plantNode('olympic.filter3.bv2').tag).toBe('PL2-F3-BV2');
    expect(plantNode('lounge.pump2').tag).toBe('PL1-P2');
    expect(plantNode('footbath.cab').tag).toBe('PL4-CAB1');
  });
});

describe('its water, solved', () => {
  it('converges', () => expect(base.converged).toBe(true));

  it.each(LARGE_POOLS.map((s) => [s.system, s] as const))(
    '%s: the duty pump gives the pool’s design flow, shared by its filters',
    (_, s) => {
      const q = POOL_TARGET[s.pool].flow;
      expect(Math.abs(base.through[`${s.system}.pump1`] - q) / q).toBeLessThan(
        0.05,
      );
      expect(base.through[`${s.system}.pump2`]).toBeCloseTo(0, 1);
      for (let f = 1; f <= s.filters; f++)
        expect(base.through[`${s.system}.filter${f}`]).toBeCloseTo(
          q / s.filters,
          -1,
        );
      expect(base.through[`${s.system}.uv`]).toBeCloseTo(
        base.through[`${s.system}.pump1`],
        3,
      );
    },
  );

  it.each(PACKAGED_POOLS.map((s) => [s.system, s] as const))(
    '%s: its packaged set gives its design flow',
    (_, s) => {
      const q = POOL_TARGET[s.pool].flow;
      expect(Math.abs(base.through[`${s.system}.cab`] - q) / q).toBeLessThan(
        0.05,
      );
    },
  );

  it('draws on the tank and pushes into the pool: suction below the discharge', () => {
    expect(base.head('olympic.pump1', 'discharge')).toBeGreaterThan(
      base.head('olympic.pump1', 'suction') + 5,
    );
  });

  it('runs the main drains back to the tank, and nothing to waste', () => {
    expect(base.through['olympic.pw.iv1']).toBeGreaterThan(0);
    expect(base.through['olympic.pw.wv1']).toBeCloseTo(0, 1);
    for (let f = 1; f <= 5; f++)
      expect(base.through[`olympic.filter${f}.bv2`]).toBeCloseTo(0, 1);
  });
});

describe('line-ups', () => {
  const solve = (changes: Record<string, number | boolean>) =>
    solveWater(net, withChanges(normal, changes));

  it('changes over to the standby pump', () => {
    const s = solve({ 'olympic.pump1': false, 'olympic.pump2': true });
    expect(s.through['olympic.pump1']).toBeCloseTo(0, 1);
    expect(s.through['olympic.pump2']).toBeCloseTo(
      base.through['olympic.pump1'],
      3,
    );
  });

  it('starves the pump when its suction valve is shut, and stops the flow', () => {
    const s = solve({ 'olympic.pump1.sv1': 0 });
    expect(s.through['olympic.uv']).toBeCloseTo(0, 1);
  });

  it('throttles the flow with a part-shut discharge valve', () => {
    const s = solve({ 'olympic.pump1.dv1': 0.15 });
    const q = s.through['olympic.pump1'];
    expect(q).toBeLessThan(POOL_TARGET.pool_02.flow * 0.8);
    expect(q).toBeGreaterThan(0);
  });

  it('isolates a filter: the others carry the flow', () => {
    const s = solve({ 'olympic.filter3.iv1': 0, 'olympic.filter3.iv2': 0 });
    expect(s.through['olympic.filter3']).toBeCloseTo(0, 1);
    const rest = [1, 2, 4, 5].reduce(
      (sum, f) => sum + s.through[`olympic.filter${f}`],
      0,
    );
    expect(rest).toBeCloseTo(s.through['olympic.uv'], 3);
    expect(s.through['olympic.filter1']).toBeGreaterThan(
      POOL_TARGET.pool_02.flow / 5,
    );
  });

  it('backwashes a filter: up through its bed to waste, the others still serving the pool', () => {
    const s = solve({
      'olympic.filter2.iv1': 0,
      'olympic.filter2.iv2': 0,
      'olympic.filter2.bv1': 1,
      'olympic.filter2.bv2': 1,
    });
    expect(s.through['olympic.filter2']).toBeLessThan(-10);
    expect(s.through['olympic.filter2.bv2']).toBeCloseTo(
      -s.through['olympic.filter2'],
      3,
    );
    expect(s.through['olympic.uv']).toBeGreaterThan(0);
  });

  it('drains the balance tank to waste', () => {
    const s = solve({ 'lounge.balance-tank.wv1': 1 });
    expect(s.through['lounge.balance-tank.wv1']).toBeGreaterThan(5);
  });

  it('drains the pool down: main drain shut to the tank, open to waste', () => {
    const s = solve({ 'olympic.pw.iv1': 0, 'olympic.pw.wv1': 1 });
    expect(s.through['olympic.pw.iv1']).toBeCloseTo(0, 1);
    expect(s.through['olympic.pw.wv1']).toBeCloseTo(60, -1);
  });

  it('leaves one pool’s plant alone when another’s changes', () => {
    const s = solve({ 'olympic.pump1': false });
    expect(s.through['lounge.pump1']).toBeCloseTo(
      base.through['lounge.pump1'],
      6,
    );
  });
});

describe('the gaps', () => {
  it('are every placeholder, each with what is missing', () => {
    const gaps = modelGaps(net);
    expect(gaps.length).toBeGreaterThan(0);
    for (const g of gaps) expect(g.missing.length).toBeGreaterThan(10);
  });

  it('only shrink: filling a gap lowers this number, and nothing may raise it unseen', () => {
    expect(modelGaps(net).length).toBeLessThanOrEqual(59);
  });
});
