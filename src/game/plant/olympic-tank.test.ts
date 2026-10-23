import { describe, expect, it } from 'vite-plus/test';
import { advance, applyAction, newWorld } from '../world';
import type { World } from '../world';
import { BALANCE_TANK } from './balance-tank';
import { installedValveByCommandId } from './installed-valves';
import { olympicTankLevel } from './pools';
import {
  makeUpCalls,
  newOlympicTank,
  olympicTankView,
  tankFloats,
} from './olympic-tank';

const level = (w: World) => olympicTankLevel(w.pools.pool_02.balance);

/** Every filter backwashing at once: a way to draw the tank down hard. */
const backwashAll = (w: World) =>
  [1, 2, 3, 4, 5].reduce(
    (x, n) =>
      Object.entries({ V1: false, V2: false, V3: true, V4: true }).reduce(
        (y, [v, open]) =>
          applyAction(y, {
            type: 'plant/valve',
            id: installedValveByCommandId(`PL2-F${n}-${v}`)!.assetId,
            open,
          }),
        x,
      ),
    w,
  );

describe('the Olympic’s balance tank’s make-up', () => {
  it('opens below its band, holds within it, and shuts above it, in AUTO', () => {
    const open = { ...newOlympicTank(), open: true };
    const shut = newOlympicTank();
    expect(makeUpCalls(shut, 2.8)).toBe(true);
    expect(makeUpCalls(shut, 2.95)).toBe(false);
    expect(makeUpCalls(open, 2.95)).toBe(true);
    expect(makeUpCalls(open, 3.1)).toBe(false);
    expect(makeUpCalls({ makeup: 'hand', open: false }, 3.9)).toBe(true);
    expect(makeUpCalls({ makeup: 'off', open: true }, 0.5)).toBe(false);
  });

  it('says what its float switches say', () => {
    expect(tankFloats(3.9)).toEqual({ high: true, low: false, lowLow: false });
    expect(tankFloats(1.5)).toEqual({ high: false, low: true, lowLow: false });
    expect(tankFloats(0.9)).toEqual({ high: false, low: true, lowLow: true });
  });
});

describe('the Olympic’s balance tank in the world', () => {
  it('starts at its working depth, its filler still', () => {
    const w = newWorld();
    expect(level(w)).toBeCloseTo(3.1, 3);
    const v = olympicTankView(w);
    expect(v.makeupOpen).toBe(false);
    expect(v.pumps).toBe('run');
  });

  it('fills by HAND to its weir, and spills over it', () => {
    let w = applyAction(newWorld(), { type: 'olympic/makeup', mode: 'hand' });
    w = advance(w, 3 * 3600, 5);
    expect(olympicTankView(w).makeupOpen).toBe(true);
    expect(level(w)).toBeGreaterThan(BALANCE_TANK.weir - 0.01);
    expect(tankFloats(level(w)).high).toBe(true);
  });

  it('runs down with its make-up OFF and a backwash drawing on it, until LOW LOW trips the pumps', () => {
    let w = applyAction(newWorld(), { type: 'olympic/makeup', mode: 'off' });
    w = backwashAll(w);
    let low = -1;
    let tripped = -1;
    for (let m = 1; m <= 120 && tripped < 0; m++) {
      w = advance(w, 60, 1);
      if (low < 0 && tankFloats(level(w)).low) low = m;
      if (w.pools.pool_02.tripped) tripped = m;
    }
    expect(low).toBeGreaterThan(0);
    expect(tripped).toBeGreaterThan(low);
    expect(level(w)).toBeLessThan(BALANCE_TANK.lowLow + 0.05);
    expect(olympicTankView(w).pumps).toBe('tripped');
  });

  it('tops itself up in AUTO after a backwash has drawn it down', () => {
    let w = backwashAll(newWorld());
    w = advance(w, 6 * 60, 1);
    const after = level(w);
    expect(after).toBeLessThan(BALANCE_TANK.makeupOn);
    expect(olympicTankView(w).makeupOpen).toBe(true);
  });
});
