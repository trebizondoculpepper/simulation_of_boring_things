import { describe, expect, it } from 'vite-plus/test';
import { advance, applyAction, newWorld } from '../world';
import type { World } from '../world';
import { INSTALLED_VALVES } from './installed-valves';
import { olympicFlowsOf, PUMP_DRAIN_FLOW } from './olympic-battery';

/**
 * Draining the Olympic's balance tank (the owner, 2026-10-25): its pumps'
 * drain (PL2-P1-DV1) to the backwash floor channel and so to the wet
 * hall's holding tank, and the holding tank's own drains to the sewer
 * (WH-DR1-DV1, WH-T2-DV1).
 */
const id = (tag: string) =>
  Object.values(INSTALLED_VALVES).find((v) => v.tag === tag)!.assetId;
const valve = (w: World, tag: string, open: boolean) =>
  applyAction(w, { type: 'plant/valve', id: id(tag), open });

/** The make-up shut and the filters' inlets shut: the pumps' only way out is their drain. */
function draining(): World {
  let w = newWorld();
  w = applyAction(w, { type: 'olympic/makeup', mode: 'off' });
  w = applyAction(w, { type: 'pool/make-up', pool: 'pool_02', open: false });
  for (let n = 1; n <= 5; n++) w = valve(w, `PL2-F${n}-V1`, false);
  return valve(w, 'PL2-P1-DV1', true);
}

describe('draining the Olympic’s balance tank', () => {
  it('is shut in service', () => {
    expect(olympicFlowsOf(newWorld()).drain).toBe(0);
  });

  it('pumps the tank down to the wet hall’s holding tank', () => {
    const before = newWorld().pools.pool_02.balance;
    const w = advance(draining(), 1200, 1);
    expect(olympicFlowsOf(w).drain).toBe(PUMP_DRAIN_FLOW);
    expect(w.pools.pool_02.balance).toBeLessThan(before - 0.1);
    expect(w.wetHall.backwashTank).toBeGreaterThan(20);
  });

  it('stops at the tank’s low-low level, the pumps held off', () => {
    const w = advance(draining(), 3600, 1);
    expect(w.pools.pool_02.tripped).toBe(true);
  });

  it('empties the holding tank to the sewer by its own drains', () => {
    let w = advance(draining(), 600, 1);
    w = valve(w, 'PL2-P1-DV1', false);
    const held = w.wetHall.backwashTank;
    w = valve(valve(w, 'WH-DR1-DV1', true), 'WH-T2-DV1', true);
    w = advance(w, 1500, 1);
    expect(held).toBeGreaterThan(15);
    expect(w.wetHall.backwashTank).toBe(0);
  });
});
