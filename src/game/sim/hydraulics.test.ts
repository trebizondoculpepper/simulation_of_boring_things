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
});
