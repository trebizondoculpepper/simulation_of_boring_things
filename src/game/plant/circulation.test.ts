import { describe, expect, it } from 'vite-plus/test';
import { write } from '../sim/blocks';
import {
  DESIGN_FLOW,
  newCirculation,
  pumpGauges,
  solveCirculation,
} from './circulation';

describe('the main pool’s circulation', () => {
  it('runs at its design flow on one duty pump, the standby passing nothing back', () => {
    const r = solveCirculation(newCirculation());
    expect(r.solution.converged).toBe(true);
    expect(r.flow).toBeCloseTo(DESIGN_FLOW, -1);
    expect(r.through['P-101']).toBeCloseTo(r.flow, 3);
    expect(Math.abs(r.through['P-102'])).toBeLessThan(0.01);
    // The four filters share it.
    for (const f of ['F-1', 'F-2', 'F-3', 'F-4'])
      expect(r.through[f]).toBeCloseTo(DESIGN_FLOW / 4, -1);
  });

  it('gives more, but not twice as much, with both pumps running', () => {
    const both = solveCirculation(
      write(newCirculation(), 'P-102/motor:running', true),
    );
    expect(both.flow).toBeGreaterThan(DESIGN_FLOW * 1.1);
    expect(both.flow).toBeLessThan(DESIGN_FLOW * 1.6);
  });

  it('stops when the duty pump trips, or its discharge valve is shut', () => {
    const tripped = solveCirculation(
      write(newCirculation(), 'P-101/motor:tripped', true),
    );
    expect(Math.abs(tripped.flow)).toBeLessThan(0.01);
    const shut = solveCirculation(
      write(newCirculation(), 'P-101/dischargeValve:open', 0),
    );
    expect(Math.abs(shut.flow)).toBeLessThan(0.01);
    // Dead-headed, its discharge gauge reads its shut-off head.
    expect(pumpGauges(shut, 'P-101').discharge).toBeGreaterThan(
      pumpGauges(solveCirculation(newCirculation()), 'P-101').discharge,
    );
  });

  it('shares the flow among the filters left in service when one is isolated', () => {
    const r = solveCirculation(
      write(newCirculation(), 'F-1/inletValve:open', 0),
    );
    expect(Math.abs(r.through['F-1'])).toBeLessThan(0.01);
    expect(r.through['F-2']).toBeGreaterThan(DESIGN_FLOW / 4);
    expect(r.flow).toBeLessThan(DESIGN_FLOW);
  });

  it('loses flow and shows a higher pressure drop as the filters clog', () => {
    let c = newCirculation();
    for (const f of ['F-1', 'F-2', 'F-3', 'F-4'])
      c = write(c, `${f}/filter:clog`, 1);
    const clean = solveCirculation(newCirculation());
    const dirty = solveCirculation(c);
    expect(dirty.flow).toBeLessThan(clean.flow * 0.9);
    expect(dirty.filterDp['F-1']).toBeGreaterThan(clean.filterDp['F-1'] * 2);
  });

  it('pulls the suction gauge down as the strainer fouls', () => {
    const clean = pumpGauges(solveCirculation(newCirculation()), 'P-101');
    const fouled = pumpGauges(
      solveCirculation(write(newCirculation(), 'P-101/strainer:fouling', 1)),
      'P-101',
    );
    expect(fouled.suction).toBeLessThan(clean.suction);
  });
});
