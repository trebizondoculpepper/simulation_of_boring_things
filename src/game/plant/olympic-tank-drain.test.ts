import { describe, expect, it } from 'vite-plus/test';
import { advance, applyAction, newWorld } from '../world';
import type { World } from '../world';
import { INSTALLED_VALVES, installedValveOpen } from './installed-valves';
import { olympicFlowsOf, PUMP_DRAIN_FLOW } from './olympic-battery';

/**
 * Draining the Olympic's balance tank (the owner, 2026-10-25): its pumps'
 * drain (PL2-P1-DV1) to the backwash floor channel and so to the wet
 * hall's holding tank, and the holding tank's own drains to the sewer
 * (WH-DR1-DV1).
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
    // The wet hall's backwash pit emptying to sewer by its discharge valve, so
    // the pumps' drain does not fill it to its high-high inhibit first.
    const w = advance(valve(draining(), 'WH-DR1-DV1', true), 3600, 5);
    expect(w.pools.pool_02.tripped).toBe(true);
  });

  it('empties the holding tank to the sewer by its discharge valve', () => {
    let w = advance(draining(), 600, 1);
    w = valve(w, 'PL2-P1-DV1', false);
    const held = w.wetHall.backwashTank;
    w = valve(w, 'WH-DR1-DV1', true);
    w = advance(w, 2400, 1);
    expect(held).toBeGreaterThan(15);
    expect(w.wetHall.backwashTank).toBe(0);
  });
});

describe('Olympic tank floor drain', () => {
  it('is closed by default, including older saves missing its new key', () => {
    const w = newWorld();
    expect(w.installedValves[id('PL2-T1-DV1')]).toBe(false);
    expect(installedValveOpen({}, 'PL2-T1-DV1')).toBe(false);
  });
  it('drains by gravity with circulation stopped and stops when shut', () => {
    let w = newWorld();
    w = applyAction(w, { type: 'olympic/makeup', mode: 'off' });
    w = applyAction(w, { type: 'motor/stop', pool: 'pool_02', stopped: true });
    const shut = advance(w, 600, 1);
    const open = advance(valve(w, 'PL2-T1-DV1', true), 600, 1);
    expect(open.pools.pool_02.balance).toBeLessThan(
      shut.pools.pool_02.balance - 0.05,
    );
    expect(open.pools.pool_02.balance).toBeGreaterThanOrEqual(0);
    const closed = valve(open, 'PL2-T1-DV1', false);
    const afterShut = advance(closed, 300, 1);
    // The stopped pool can still drain into the tank; compare the same returning water with its outlet open and shut.
    expect(afterShut.pools.pool_02.balance).toBeGreaterThanOrEqual(
      closed.pools.pool_02.balance,
    );
    expect(afterShut.pools.pool_02.balance).toBeGreaterThan(
      advance(open, 300, 1).pools.pool_02.balance,
    );
  });
});
