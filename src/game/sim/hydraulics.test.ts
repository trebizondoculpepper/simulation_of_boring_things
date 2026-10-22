import { describe, expect, it } from 'vite-plus/test';
import { resistanceFor, solveNetwork } from './hydraulics';
import type { NetLink, NetNode } from './hydraulics';

const r = resistanceFor(4, 100);

describe('the water network solver', () => {
  it('drives flow downhill through a resistance by its square law', () => {
    const nodes: NetNode[] = [
      { id: 'high', head: 4 },
      { id: 'low', head: 0 },
    ];
    const s = solveNetwork(nodes, [
      { id: 'pipe', kind: 'resistance', from: 'high', to: 'low', r },
    ]);
    expect(s.flows.pipe).toBeCloseTo(100, 1);
  });

  it('shares a head drop between resistances in series, and flow between ones in parallel', () => {
    const nodes: NetNode[] = [
      { id: 'a', head: 8 },
      { id: 'm' },
      { id: 'b', head: 0 },
    ];
    const series = solveNetwork(nodes, [
      { id: 'one', kind: 'resistance', from: 'a', to: 'm', r },
      { id: 'two', kind: 'resistance', from: 'm', to: 'b', r },
    ]);
    expect(series.converged).toBe(true);
    expect(series.heads.m).toBeCloseTo(4, 3);
    expect(series.flows.one).toBeCloseTo(100, 1);
    const parallel = solveNetwork(
      [
        { id: 'a', head: 4 },
        { id: 'b', head: 0 },
      ],
      [
        { id: 'one', kind: 'resistance', from: 'a', to: 'b', r },
        { id: 'two', kind: 'resistance', from: 'a', to: 'b', r: r * 4 },
      ],
    );
    expect(parallel.flows.one).toBeCloseTo(100, 1);
    expect(parallel.flows.two).toBeCloseTo(50, 1);
  });

  it('runs a pump at the point where its curve meets the system', () => {
    // Shut-off head 20 m, falling to 12 m at 160 m³/h; lifting 2 m against
    // a system losing 10 m at 160 m³/h: the duty point is 160 m³/h.
    const links: NetLink[] = [
      {
        id: 'pump',
        kind: 'pump',
        from: 'tank',
        to: 'out',
        shutoff: 20,
        k: 8 / 160 ** 2,
      },
      {
        id: 'main',
        kind: 'resistance',
        from: 'out',
        to: 'pool',
        r: resistanceFor(10, 160),
      },
    ];
    const s = solveNetwork(
      [{ id: 'tank', head: -2 }, { id: 'out' }, { id: 'pool', head: 0 }],
      links,
    );
    expect(s.converged).toBe(true);
    expect(s.flows.pump).toBeCloseTo(160, 0);
    expect(s.heads.out).toBeCloseTo(10, 1);
  });

  it('passes nothing through a shut valve, a stopped pump, or a non-return valve the wrong way', () => {
    const nodes: NetNode[] = [
      { id: 'a', head: 5 },
      { id: 'b', head: 0 },
    ];
    const shut = solveNetwork(nodes, [
      { id: 'v', kind: 'closed', from: 'a', to: 'b' },
    ]);
    expect(Math.abs(shut.flows.v)).toBeLessThan(1e-3);
    const back = solveNetwork(nodes, [
      { id: 'nrv', kind: 'check', from: 'b', to: 'a', r },
    ]);
    expect(Math.abs(back.flows.nrv)).toBeLessThan(1e-3);
    const lift = solveNetwork(nodes, [
      { id: 'pump', kind: 'pump', from: 'b', to: 'a', shutoff: 3, k: 1e-3 },
    ]);
    // It cannot lift 5 m with 3 m of shut-off head.
    expect(Math.abs(lift.flows.pump)).toBeLessThan(1e-3);
  });

  it('settles a pump pushing through a chain of short joints and fittings', () => {
    // The make-up booster as the plant network builds it: break tank,
    // outlet valve, pump set, meter, mains and a float valve into a pool's
    // balance tank, each fitting joined by a short run of pipe. With the
    // Jacobian stepped by a share of the head this stalled short of balance.
    const pipe = resistanceFor(0.02, 20);
    const chain: [string, NetLink['kind'], number][] = [
      ['tank>iv', 'resistance', pipe],
      ['iv', 'resistance', 2.22e-4],
      ['iv>header', 'resistance', 4.44e-4],
      ['header>sv', 'resistance', pipe],
      ['sv', 'resistance', 2.22e-4],
      ['sv>pump', 'resistance', pipe],
      ['pump', 'pump', 0],
      ['pump>nrv', 'resistance', pipe],
      ['nrv', 'check', 1.33e-3],
      ['nrv>dv', 'resistance', pipe],
      ['dv', 'resistance', 2.22e-4],
      ['dv>header', 'resistance', pipe],
      ['header>meter', 'resistance', pipe],
      ['meter', 'resistance', 2.22e-3],
      ['meter>mv', 'resistance', pipe],
      ['mv', 'resistance', 2.22e-4],
      ['mv>main', 'resistance', 4.44e-3],
      ['main>branch', 'resistance', 4.44e-3],
      ['branch', 'resistance', 2.22e-4],
      ['branch>float', 'resistance', pipe],
      ['float', 'resistance', 4.53e-1],
      ['float>tank', 'resistance', pipe],
    ];
    const at = (i: number) =>
      i === 0 ? 'from' : i === chain.length ? 'to' : `n${i}`;
    const nodes: NetNode[] = [
      { id: 'from', head: 1.5 },
      { id: 'to', head: 2 },
      ...chain.slice(1).map((_, i) => ({ id: at(i + 1) })),
    ];
    const links = chain.map(([id, kind, r], i): NetLink =>
      kind === 'pump'
        ? { id, kind, from: at(i), to: at(i + 1), shutoff: 39, k: 0.04 }
        : {
            id,
            kind: kind as 'resistance' | 'check',
            from: at(i),
            to: at(i + 1),
            r,
          },
    );
    const s = solveNetwork(nodes, links);
    expect(s.converged).toBe(true);
    expect(s.flows.pump).toBeCloseTo(s.flows.float, 4);
    expect(s.flows.pump).toBeGreaterThan(5);
  });
});
